-- Authored layouts are additive. Product identities and prices remain in the store catalog.
create table private.studio_authored_aisles (
  aisle_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  revision integer not null default 0 check (revision >= 0),
  published_revision integer,
  published_source text
);
create index studio_authored_aisles_store on private.studio_authored_aisles(store_id);
create unique index studio_authored_aisles_one_native_override on private.studio_authored_aisles(store_id,published_source)
  where published_source is not null;
create table private.studio_authored_aisle_versions (
  aisle_id uuid not null references private.studio_authored_aisles(aisle_id) on delete cascade,
  revision integer not null,
  title text not null,
  fixture text not null,
  source_aisle text,
  appearance jsonb not null default '{}',
  action text not null,
  restored_from integer,
  changed_at timestamptz not null default now(),
  primary key(aisle_id,revision)
);
create table private.studio_authored_aisle_slots (
  aisle_id uuid not null,
  revision integer not null,
  position integer not null,
  -- Preserve historical identity when a merchant retires its SKU. Active reads recheck the current store.
  original_product_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  primary key(aisle_id,revision,position),
  unique(aisle_id,revision,original_product_id),
  foreign key(aisle_id,revision) references private.studio_authored_aisle_versions(aisle_id,revision) on delete cascade,
  check(product_id is null or product_id=original_product_id)
);
create index studio_authored_aisle_slots_product on private.studio_authored_aisle_slots(product_id) where product_id is not null;
alter table private.studio_authored_aisles enable row level security;
alter table private.studio_authored_aisle_versions enable row level security;
alter table private.studio_authored_aisle_slots enable row level security;
revoke all on private.studio_authored_aisles,private.studio_authored_aisle_versions,private.studio_authored_aisle_slots from public,anon,authenticated,service_role;

create function private.studio_authored_store(p_store_id uuid) returns boolean
language sql stable set search_path='' as $$
  select p_store_id in ('35ef70d0-3d20-4599-96a3-648ee3c7c340','189581c9-d728-4e5d-9e02-ae4de19a15af',
                        'e5a01340-424a-4a41-b0e6-99cb9e944733','03dbd8fa-ed64-4236-85be-206c952da024')
      and exists(select 1 from public.stores s where s.id=p_store_id and s.is_live
        and s.address ~* ',[[:space:]]*Palm[[:space:]]+Coast[[:space:]]*,[[:space:]]*(FL|Florida)([^[:alpha:]]|$)');
$$;

create function private.studio_authored_native_source(p_store_id uuid,p_source text) returns boolean
language plpgsql stable set search_path='' as $$
begin
  if p_source is null then return true;end if;
  if p_store_id='189581c9-d728-4e5d-9e02-ae4de19a15af' then
    return p_source=any(array['Fresh Fruits','Bagged Fruits','Packaged Fruits','Fresh Veggies','Bagged Veggies','Prepared Produce',
      'Deli','Bakery','Meat & Poultry','Seafood','Dairy & Eggs','Frozen Foods','Freezer Bins','Beer & Wine','Floral',
      'Snacks','Beverages','Breakfast','Canned Goods & Soups','Dry Goods & Pasta','Condiments & Sauces','Personal Care','Health Care','Household','Baby','Pet Care','Bread & Rolls']);
  elsif p_store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' then
    return exists(select 1 from public.target_catalog_categories() c where c.category=p_source and c.product_count>0);
  elsif p_store_id='e5a01340-424a-4a41-b0e6-99cb9e944733' then
    return exists(select 1 from public.store_entrances e where e.store_id=p_store_id and e.is_active and e.label=p_source);
  else
    return exists(select 1 from public.products p where p.store_id=p_store_id and p.category=p_source);
  end if;
end $$;

create function private.studio_authored_image(p_url text) returns boolean
language plpgsql stable set search_path='' as $$
declare
  prefix constant text:='https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/';
  path text; bucket text; object_name text;
begin
  if left(p_url,length(prefix))<>prefix or p_url ~ '[?#[:cntrl:]]' then return false;end if;
  path:=substr(p_url,length(prefix)+1);
  bucket:=split_part(path,'/',1);path:=substr(path,length(bucket)+2);
  if path='' or path ~ '%([^a-fA-F0-9]|$)|%[a-fA-F0-9]([^a-fA-F0-9]|$)' then return false;end if;
  select convert_from(decode(string_agg(case when left(piece[1],1)='%' then substr(piece[1],2)
     else encode(convert_to(piece[1],'UTF8'),'hex') end,'' order by n),'hex'),'UTF8')
  into object_name from regexp_matches(path,'(%[a-fA-F0-9]{2}|.)','g') with ordinality as x(piece,n);
  if object_name !~* '[.](png|jpe?g|webp|avif)$' or object_name ~ '(^|/)[.]{1,2}(/|$)' then return false;end if;
  return exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id and b.public
    where o.bucket_id=bucket and o.name=object_name);
exception when character_not_in_repertoire or untranslatable_character then return false;
end $$;

create function private.studio_authored_style(style jsonb) returns void
language plpgsql stable set search_path='' as $$
declare k text; v jsonb; t text;
begin
  if jsonb_typeof(style) is distinct from 'object' then raise exception using errcode='22023',message='Appearance must be an object.';end if;
  for k,v in select * from jsonb_each(style) loop
    t:=v#>>'{}';
    if jsonb_typeof(v)<>'string' or k not in ('entrance_url','surface_url','entrance_title','board_title','board_body','board_color','ink_color','shelf_sign','ticket_color','ticket_ink')
      or (k in ('board_color','ink_color','ticket_color','ticket_ink') and t !~ '^#[0-9a-fA-F]{6}$')
      or (k in ('entrance_title','board_title','shelf_sign') and length(t)>200)
      or (k='board_body' and length(t)>2000) then raise exception using errcode='22023',message='Invalid aisle appearance setting.';end if;
    if k in ('entrance_url','surface_url') and t<>'' and not private.studio_authored_image(t)
      then raise exception using errcode='22023',message='Choose an existing public Studio image.';end if;
  end loop;
end $$;

create function private.studio_authored_draft_json(p_id uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('aisle_id',a.aisle_id,'store_id',a.store_id,'revision',a.revision,'published_revision',a.published_revision,
   'title',v.title,'fixture',v.fixture,'source_aisle',v.source_aisle,'appearance',v.appearance,
   'stock_mode',case when v.source_aisle is not null and cardinality(items.ids)=0 then 'native' else 'custom' end,'product_ids',items.ids,
   'history',(select jsonb_agg(jsonb_build_object('revision',h.revision,'title',h.title,'fixture',h.fixture,'action',h.action,'changed_at',h.changed_at,'restored_from',h.restored_from)
      order by h.revision desc) from private.studio_authored_aisle_versions h where h.aisle_id=a.aisle_id))
 from private.studio_authored_aisles a join private.studio_authored_aisle_versions v on (v.aisle_id,v.revision)=(a.aisle_id,a.revision)
 cross join lateral (select coalesce(array_agg(s.original_product_id order by s.position),'{}'::uuid[]) ids from private.studio_authored_aisle_slots s
    where (s.aisle_id,s.revision)=(v.aisle_id,v.revision)) items where a.aisle_id=p_id;
$$;

create function private.studio_authored_change(op text,p_store_id uuid,p_aisle_id uuid,p_expected_revision integer,
  p_title text default null,p_fixture text default null,p_product_ids uuid[] default null,p_source_aisle text default null,
  p_appearance jsonb default null,p_target_revision integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); a private.studio_authored_aisles%rowtype; v private.studio_authored_aisle_versions%rowtype;
  source_revision integer; next_revision integer; n integer;
begin
  if actor is null or not private.studio_is_publisher() then raise exception using errcode='42501',message='Publisher access required.';end if;
  if p_aisle_id is null or p_expected_revision is null or p_expected_revision<0 or not coalesce(private.studio_authored_store(p_store_id),false)
     or op not in ('save','publish','revert','unpublish') or op is null then raise exception using errcode='22023',message='Invalid store, aisle or revision.';end if;
  if op='save' and p_expected_revision=0 then
    insert into private.studio_authored_aisles(aisle_id,store_id,owner_id) values(p_aisle_id,p_store_id,actor) on conflict(aisle_id) do nothing;
  end if;
  select * into a from private.studio_authored_aisles where aisle_id=p_aisle_id and store_id=p_store_id and owner_id=actor for update;
  if not found then raise exception using errcode='42501',message='This aisle is unavailable to the publisher.';end if;
  if a.revision<>p_expected_revision then raise exception using errcode='PT409',message='A newer aisle revision exists. Reload the draft.';end if;
  if op='publish' and a.published_revision=a.revision then return private.studio_authored_draft_json(p_aisle_id);end if;
  if op='unpublish' and a.published_revision is null then return private.studio_authored_draft_json(p_aisle_id);end if;
  if op<>'save' then
    source_revision:=case when op='revert' then p_target_revision else a.revision end;
    select * into v from private.studio_authored_aisle_versions where aisle_id=p_aisle_id and revision=source_revision;
    if not found then raise exception using errcode='22023',message='That aisle revision does not exist.';end if;
    p_title:=v.title;p_fixture:=v.fixture;p_source_aisle:=v.source_aisle;p_appearance:=v.appearance;
    select coalesce(array_agg(s.original_product_id order by s.position),'{}'::uuid[]) into p_product_ids
      from private.studio_authored_aisle_slots s where s.aisle_id=p_aisle_id and s.revision=source_revision;
  end if;
  p_title:=btrim(p_title);p_source_aisle:=nullif(btrim(p_source_aisle),'');
  if p_title is null or length(p_title) not between 1 and 120 or p_fixture is null or p_fixture not in ('shelf','cooler','freezer','pegboard','pallet','tile') or p_product_ids is null
    or coalesce(array_ndims(p_product_ids),1)<>1 then raise exception using errcode='22023',message='Enter a title, supported fixture and ordered SKU list.';end if;
  if op<>'unpublish' then
    if not private.studio_authored_native_source(p_store_id,p_source_aisle) then raise exception using errcode='22023',message='The original aisle is unavailable at this store.';end if;
    perform private.studio_authored_style(p_appearance);
    select count(*) into n from public.products p where p.store_id=p_store_id and p.id=any(p_product_ids);
    if n<>cardinality(p_product_ids) then raise exception using errcode='22023',message='Each SKU must exist once and belong to this store.';end if;
    if op='publish' and n=0 and p_source_aisle is null then raise exception using errcode='22023',message='Stock the aisle before publishing.';end if;
  end if;
  next_revision:=a.revision+1;
  insert into private.studio_authored_aisle_versions(aisle_id,revision,title,fixture,source_aisle,appearance,action,restored_from)
    values(p_aisle_id,next_revision,p_title,p_fixture,p_source_aisle,p_appearance,op,case when op='revert' then source_revision end);
  insert into private.studio_authored_aisle_slots(aisle_id,revision,position,original_product_id,product_id)
    select p_aisle_id,next_revision,x.ordinality,x.id,p.id from unnest(p_product_ids) with ordinality x(id,ordinality) left join public.products p on p.id=x.id and p.store_id=p_store_id;
  update private.studio_authored_aisles set revision=next_revision,
    published_revision=case when op='publish' then next_revision when op='unpublish' then null else a.published_revision end,
    published_source=case when op='publish' then p_source_aisle when op='unpublish' then null else a.published_source end
    where aisle_id=p_aisle_id;
  return private.studio_authored_draft_json(p_aisle_id);
exception when unique_violation then raise exception using errcode='PT409',message='Another published edit already uses this original aisle.';
end $$;

create function private.studio_authored_owned(p_store_id uuid) returns setof jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.studio_is_publisher() then raise exception using errcode='42501',message='Publisher access required.';end if;
  return query select private.studio_authored_draft_json(a.aisle_id) from private.studio_authored_aisles a
    where a.store_id=p_store_id and a.owner_id=auth.uid() and private.studio_authored_store(p_store_id) order by a.aisle_id;
end $$;

create function private.studio_authored_public(p_store_id uuid)
returns table(aisle_id uuid,store_id uuid,title text,fixture text,product_ids uuid[],published_revision integer,source_aisle text,appearance jsonb,stock_mode text)
language sql stable security definer set search_path='' as $$
  select a.aisle_id,a.store_id,v.title,v.fixture,items.ids,a.published_revision,v.source_aisle,v.appearance,
    case when v.source_aisle is not null and not items.has_slots then 'native' else 'custom' end
  from private.studio_authored_aisles a join private.studio_authored_aisle_versions v on (v.aisle_id,v.revision)=(a.aisle_id,a.published_revision)
  cross join lateral (select coalesce(array_agg(p.id order by s.position) filter(where p.id is not null),'{}'::uuid[]) ids,count(s.position)>0 has_slots
    from private.studio_authored_aisle_slots s left join public.products p on p.id=s.product_id and p.store_id=a.store_id
    where (s.aisle_id,s.revision)=(v.aisle_id,v.revision)) items
  where private.studio_authored_store(p_store_id) and a.store_id=p_store_id and (cardinality(items.ids)>0 or (not items.has_slots and v.source_aisle is not null))
  order by lower(v.title),a.aisle_id;
$$;

create function public.studio_grocery_aisles(p_store_id uuid)
returns table(aisle_id uuid,store_id uuid,title text,fixture text,product_ids uuid[],published_revision integer,source_aisle text,appearance jsonb,stock_mode text)
language sql stable security invoker set search_path='' as $$select * from private.studio_authored_public(p_store_id)$$;
create function public.studio_grocery_aisle_drafts(p_store_id uuid) returns setof jsonb
language sql stable security invoker set search_path='' as $$select * from private.studio_authored_owned(p_store_id)$$;
create function public.studio_grocery_aisle_save(p_store_id uuid,p_aisle_id uuid,p_expected_revision integer,p_title text,p_fixture text,p_product_ids uuid[],p_source_aisle text default null,p_appearance jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$
 select private.studio_authored_change('save',p_store_id,p_aisle_id,p_expected_revision,p_title,p_fixture,p_product_ids,p_source_aisle,p_appearance)
$$;
create function public.studio_grocery_aisle_publish(p_store_id uuid,p_aisle_id uuid,p_expected_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select private.studio_authored_change('publish',p_store_id,p_aisle_id,p_expected_revision)$$;
create function public.studio_grocery_aisle_unpublish(p_store_id uuid,p_aisle_id uuid,p_expected_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select private.studio_authored_change('unpublish',p_store_id,p_aisle_id,p_expected_revision)$$;
create function public.studio_grocery_aisle_revert(p_store_id uuid,p_aisle_id uuid,p_expected_revision integer,p_target_revision integer) returns jsonb
language sql security invoker set search_path='' as $$
 select private.studio_authored_change('revert',p_store_id,p_aisle_id,p_expected_revision,p_target_revision=>p_target_revision)
$$;

revoke all on function private.studio_authored_store(uuid),private.studio_authored_native_source(uuid,text),private.studio_authored_image(text),
 private.studio_authored_style(jsonb),private.studio_authored_draft_json(uuid),
 private.studio_authored_change(text,uuid,uuid,integer,text,text,uuid[],text,jsonb,integer),private.studio_authored_owned(uuid),private.studio_authored_public(uuid),
 public.studio_grocery_aisles(uuid),public.studio_grocery_aisle_drafts(uuid),public.studio_grocery_aisle_save(uuid,uuid,integer,text,text,uuid[],text,jsonb),
 public.studio_grocery_aisle_publish(uuid,uuid,integer),public.studio_grocery_aisle_unpublish(uuid,uuid,integer),public.studio_grocery_aisle_revert(uuid,uuid,integer,integer)
 from public,anon,authenticated,service_role;
grant execute on function private.studio_authored_public(uuid),public.studio_grocery_aisles(uuid) to anon,authenticated;
grant execute on function private.studio_authored_change(text,uuid,uuid,integer,text,text,uuid[],text,jsonb,integer),private.studio_authored_owned(uuid),
 public.studio_grocery_aisle_drafts(uuid),public.studio_grocery_aisle_save(uuid,uuid,integer,text,text,uuid[],text,jsonb),
 public.studio_grocery_aisle_publish(uuid,uuid,integer),public.studio_grocery_aisle_unpublish(uuid,uuid,integer),public.studio_grocery_aisle_revert(uuid,uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
