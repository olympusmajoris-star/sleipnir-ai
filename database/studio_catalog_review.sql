begin;
create table public.studio_catalog_changes (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id),
 store_id uuid not null references public.stores(id),
 before_rows jsonb not null,
 after_rows jsonb not null,
 created_at timestamptz not null default now(),
 restored_at timestamptz
);
alter table public.studio_catalog_changes enable row level security;
revoke all on public.studio_catalog_changes from public,anon,authenticated;
grant select,insert,update on public.studio_catalog_changes to authenticated;
create policy studio_catalog_owner on public.studio_catalog_changes for all to authenticated
using(owner_id=(select auth.uid()) and (select private.studio_is_publisher()))
with check(owner_id=(select auth.uid()) and (select private.studio_is_publisher()));

create function public.apply_studio_catalog_review(p_store_id uuid,p_request_id uuid,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; patch jsonb; expected jsonb; k text; prior public.products; saved public.products;
before_data jsonb='{}';after_data jsonb='{}';existing public.studio_catalog_changes; n integer=0;
begin
 if not private.studio_is_publisher() then raise exception 'App owner required';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 or octet_length(p_items::text)>4194304 then raise exception 'Review 1 to 500 products at a time';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into existing from public.studio_catalog_changes where id=p_request_id;
 if found then
  if existing.store_id<>p_store_id or existing.restored_at is not null then raise exception 'This review was already used or restored';end if;
  return jsonb_build_object('id',existing.id,'applied',(select count(*) from jsonb_object_keys(existing.after_rows)),'alreadyApplied',true);
 end if;
 perform 1 from public.stores where id=p_store_id;if not found then raise exception 'Store not found';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  patch=item->'patch';expected=item->'expected';
  if not (item?'expected') or jsonb_typeof(patch) is distinct from 'object' or jsonb_typeof(expected) not in ('object','null') then raise exception 'Invalid reviewed product';end if;
  for k in select jsonb_object_keys(patch) loop
   if k<>all(array['name','description','price','image_url','category','section','shelf_group','full_name']) then raise exception 'Unsupported product field: %',k;end if;
   if k<>'price' and jsonb_typeof(patch->k) not in ('string','null') then raise exception 'Invalid text field';end if;
   if k<>'price' and length(patch->>k)>10000 then raise exception 'Text is too long';end if;
  end loop;
  if patch?'name' and (jsonb_typeof(patch->'name')<>'string' or length(btrim(patch->>'name')) not between 1 and 500) then raise exception 'Product name required';end if;
  if patch?'price' and patch->'price'<>'null'::jsonb and (jsonb_typeof(patch->'price')<>'number' or (patch->>'price')::numeric<0) then raise exception 'Invalid price';end if;
  if coalesce(patch->>'image_url','')<>'' and patch->>'image_url' !~ '^https://[^[:space:]]+$' then raise exception 'Product image must use HTTPS';end if;
  if after_data ? (item->>'id') then raise exception 'Duplicate product in review';end if;
  select * into prior from public.products where id=(item->>'id')::uuid for update;
  if found then
   if prior.store_id is distinct from p_store_id or jsonb_typeof(expected) is distinct from 'object' then raise exception 'Product belongs to another store or needs a fresh review';end if;
   for k in select jsonb_object_keys(expected) loop
    if to_jsonb(prior)->k is distinct from expected->k then raise exception 'Product changed after review: %',prior.name;end if;
   end loop;
   if not (expected ?& array['name','description','price','image_url','category','section','shelf_group','full_name']) then raise exception 'Incomplete current-value review';end if;
   saved=jsonb_populate_record(prior,patch);
   update public.products set name=saved.name,description=saved.description,price=saved.price,image_url=saved.image_url,
    category=saved.category,section=saved.section,shelf_group=saved.shelf_group,full_name=saved.full_name,
    image_url_orig=case when prior.image_url is distinct from saved.image_url then coalesce(prior.image_url_orig,prior.image_url) else prior.image_url_orig end
    where id=prior.id returning * into saved;
   if not found then raise exception 'Catalog update denied';end if;
   before_data=before_data||jsonb_build_object(prior.id::text,to_jsonb(prior));
  else
   if expected is distinct from 'null'::jsonb then raise exception 'A reviewed product was removed';end if;
   if coalesce(btrim(patch->>'name'),'')='' then raise exception 'New product name required';end if;
   saved=jsonb_populate_record(null::public.products,patch);
   insert into public.products(id,store_id,name,description,price,image_url,category,section,shelf_group,full_name)
    values((item->>'id')::uuid,p_store_id,saved.name,saved.description,saved.price,saved.image_url,saved.category,saved.section,saved.shelf_group,saved.full_name) returning * into saved;
   before_data=before_data||jsonb_build_object(saved.id::text,null);
  end if;
  after_data=after_data||jsonb_build_object(saved.id::text,to_jsonb(saved));n=n+1;
 end loop;
 insert into public.studio_catalog_changes(id,store_id,before_rows,after_rows) values(p_request_id,p_store_id,before_data,after_data);
 return jsonb_build_object('id',p_request_id,'applied',n,'alreadyApplied',false);
end $$;
revoke all on function public.apply_studio_catalog_review(uuid,uuid,jsonb) from public,anon;
grant execute on function public.apply_studio_catalog_review(uuid,uuid,jsonb) to authenticated;

create function public.restore_studio_catalog_review(p_change_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare change public.studio_catalog_changes; entry record; current_row public.products; previous_row public.products;n integer=0;
begin
 if not private.studio_is_publisher() then raise exception 'App owner required';end if;
 select * into change from public.studio_catalog_changes where id=p_change_id for update;
 if not found or change.restored_at is not null then raise exception 'Review unavailable or already restored';end if;
 if exists(select 1 from jsonb_each(change.before_rows) e where e.value='null'::jsonb) then raise exception 'This review added new products. Automatic restore cannot delete products that may now be used by orders or displays.';end if;
 for entry in select key,value from jsonb_each(change.before_rows) loop
  select * into current_row from public.products where id=entry.key::uuid for update;
  if not found or to_jsonb(current_row) is distinct from change.after_rows->entry.key then raise exception 'A product changed since this review. Restore would overwrite newer work.';end if;
  previous_row=jsonb_populate_record(null::public.products,entry.value);
  update public.products set name=previous_row.name,description=previous_row.description,price=previous_row.price,image_url=previous_row.image_url,
   category=previous_row.category,section=previous_row.section,shelf_group=previous_row.shelf_group,full_name=previous_row.full_name,image_url_orig=previous_row.image_url_orig where id=current_row.id;
  if not found then raise exception 'Catalog restore denied';end if;n=n+1;
 end loop;
 update public.studio_catalog_changes set restored_at=now() where id=p_change_id;
 return jsonb_build_object('restored',n);
end $$;
revoke all on function public.restore_studio_catalog_review(uuid) from public,anon;
grant execute on function public.restore_studio_catalog_review(uuid) to authenticated;

create function public.create_studio_store(p_details jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;title text;address_value text;
begin
 if not private.studio_is_publisher() then raise exception 'App owner required';end if;
 title=btrim(p_details->>'name');address_value=nullif(btrim(p_details->>'address'),'');
 if title is null or length(title) not between 1 and 200 then raise exception 'Store name required';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(title)||coalesce(lower(address_value),''),0));
 if exists(select 1 from public.stores where lower(name)=lower(title) and coalesce(lower(address),'')=coalesce(lower(address_value),'')) then raise exception 'This store and address already exist. Open the existing store.';end if;
 if coalesce(p_details->>'website_url','')<>'' and p_details->>'website_url' !~ '^https://[^[:space:]]+$' then raise exception 'Official website must use HTTPS';end if;
 insert into public.stores(name,address,website_url,menu_type,is_live)
 values(title,address_value,nullif(p_details->>'website_url',''),nullif(p_details->>'menu_type',''),false) returning id into result;
 return result;
end $$;
revoke all on function public.create_studio_store(jsonb) from public,anon;
grant execute on function public.create_studio_store(jsonb) to authenticated;
commit;
