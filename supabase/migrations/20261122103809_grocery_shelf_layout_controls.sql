-- One versioned layout per store aisle. A shelf edit and all selected products commit together.
create table private.studio_grocery_shelf_layouts (
  store_id uuid not null references public.stores(id) on delete cascade,
  aisle_key text not null check (length(aisle_key) between 1 and 140 and btrim(aisle_key)=aisle_key),
  layout jsonb,
  revision integer not null check (revision>0),
  updated_at timestamptz not null default now(),
  primary key (store_id,aisle_key)
);
alter table private.studio_grocery_shelf_layouts enable row level security;
revoke all on private.studio_grocery_shelf_layouts from public,anon,authenticated,service_role;

create function private.studio_read_grocery_shelf_layout(p_store_id uuid,p_aisle_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((
    select jsonb_build_object('revision',s.revision,'layout',s.layout)
    from private.studio_grocery_shelf_layouts s
    where s.store_id=p_store_id and s.aisle_key=p_aisle_key
      and private.studio_authored_store(s.store_id)
      and (s.aisle_key not like 'studio:%' or exists (
        select 1 from private.studio_authored_aisles a
        where a.store_id=s.store_id and 'studio:'||a.aisle_id::text=s.aisle_key and a.published_revision is not null
      ))
  ),jsonb_build_object('revision',0,'layout',null))
$$;
create function public.studio_grocery_shelf_layout(p_store_id uuid,p_aisle_key text)
returns jsonb language sql stable security invoker set search_path=''
begin atomic
  select private.studio_read_grocery_shelf_layout(p_store_id,p_aisle_key);
end;

create function private.studio_write_grocery_shelf_layout(p_store_id uuid,p_aisle_key text,p_layout jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  existing private.studio_grocery_shelf_layouts%rowtype;
  authored private.studio_authored_aisles%rowtype;
  changed_ids uuid[];
  sku_pattern constant text := '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$';
begin
  perform private.studio_grocery_require_editor();
  if not coalesce(private.studio_authored_store(p_store_id),false)
      or p_aisle_key is null or length(p_aisle_key) not between 1 and 140 or p_aisle_key<>btrim(p_aisle_key)
      or p_expected_revision is null or p_expected_revision<0 then
    raise exception using errcode='22023',message='Choose an available grocery aisle.';
  end if;
  if p_aisle_key like 'studio:%' then
    if substring(p_aisle_key from 8) !~ sku_pattern then
      raise exception using errcode='22023',message='Invalid authored aisle.';
    end if;
    select a.* into authored from private.studio_authored_aisles a
      where a.store_id=p_store_id and a.aisle_id=substring(p_aisle_key from 8)::uuid and a.published_revision is not null for share;
    if not found then raise exception using errcode='22023',message='This authored aisle is unavailable in the store.'; end if;
  elsif not private.studio_authored_native_source(p_store_id,p_aisle_key) then
    raise exception using errcode='22023',message='This aisle is unavailable in the store.';
  end if;

  -- Serialize the first save too. Checking the revision after taking the lock avoids lost edits.
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':'||p_aisle_key,0));
  select s.* into existing from private.studio_grocery_shelf_layouts s where s.store_id=p_store_id and s.aisle_key=p_aisle_key;
  if coalesce(existing.revision,0)<>p_expected_revision then
    if existing.revision=p_expected_revision+1 and existing.layout is not distinct from p_layout then
      return jsonb_build_object('revision',existing.revision,'layout',existing.layout);
    end if;
    raise exception using errcode='PT409',message='This aisle layout changed. Reload its latest revision before saving.';
  end if;
  if existing.layout is not distinct from p_layout then
    return jsonb_build_object('revision',coalesce(existing.revision,0),'layout',existing.layout);
  end if;
  if p_layout is not null then
    if jsonb_typeof(p_layout)<>'object' or octet_length(p_layout::text)>8388608 then
      raise exception using errcode='22023',message='Invalid shelf layout.';
    end if;
    if not (p_layout ?& array['rows','rail','tabHeight','products']) or
       p_layout - array['rows','rail','tabHeight','products','groupBy']<>'{}'::jsonb or
       (p_layout ? 'groupBy' and (jsonb_typeof(p_layout->'groupBy')<>'string' or p_layout->>'groupBy' not in ('type','original'))) or
       jsonb_typeof(p_layout->'rows')<>'number' or jsonb_typeof(p_layout->'rail')<>'number' or
       jsonb_typeof(p_layout->'tabHeight')<>'number' or jsonb_typeof(p_layout->'products')<>'object' then
      raise exception using errcode='22023',message='Set shelf count, rail thickness, tab height and product positions.';
    end if;
    if (p_layout->>'rows')::numeric not between 1 and 8 or (p_layout->>'rows')::numeric<>trunc((p_layout->>'rows')::numeric) or
       (p_layout->>'rail')::numeric not between 1 and 15 or (p_layout->>'tabHeight')::numeric not between 18 and 48 then
      raise exception using errcode='22023',message='Shelf count, rail thickness or tab height is outside its supported range.';
    end if;
    if exists (select 1 from jsonb_each(p_layout->'products') t where t.key !~ sku_pattern or jsonb_typeof(t.value)<>'object') then
      raise exception using errcode='22023',message='Invalid shelf product.';
    end if;
    if exists (select 1 from jsonb_each(p_layout->'products') t
      where not (t.value ?& array['scale','x','y']) or t.value - array['scale','x','y','group']<>'{}'::jsonb or
        (t.value ? 'group' and (jsonb_typeof(t.value->'group')<>'string' or length(t.value->>'group') not between 1 and 80 or btrim(t.value->>'group')<>t.value->>'group')) or
        jsonb_typeof(t.value->'scale')<>'number' or jsonb_typeof(t.value->'x')<>'number' or jsonb_typeof(t.value->'y')<>'number') then
      raise exception using errcode='22023',message='Invalid product size or position.';
    end if;
    if exists (select 1 from jsonb_each(p_layout->'products') t where
       (t.value->>'scale')::numeric not between 0.1 and 6 or (t.value->>'x')::numeric not between -1 and 1 or
       (t.value->>'y')::numeric not between -1 and 1) then
      raise exception using errcode='22023',message='Product size or position is outside its supported range.';
    end if;
    select array_agg(t.key::uuid) into changed_ids from jsonb_each(p_layout->'products') t
      where t.value is distinct from (existing.layout->'products'->t.key);
    if changed_ids is not null then
      if authored.aisle_id is not null then
        if exists (select id from unnest(changed_ids) id except
          select s.product_id from private.studio_authored_aisle_slots s join public.products p on p.id=s.product_id and p.store_id=p_store_id
          where s.aisle_id=authored.aisle_id and s.revision=authored.published_revision) then
          raise exception using errcode='22023',message='A selected product is outside this authored aisle.';
        end if;
      else
        -- Most Target catalog products have no floor/pallet placements. Check those by ID
        -- using the same photo and identity rules as original stock, then defer exceptions to that reader.
        if p_store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' and
            p_aisle_key not in ('Canned Goods & Soups','Condiments & Sauces','Dairy & Eggs') then
          select array(select id from unnest(changed_ids) id except
            select p.id from public.products p
            left join public.retail_product_presentations pr on pr.product_id=p.id and pr.store_id=p_store_id
            cross join lateral (select coalesce(nullif(trim(p.image_url),''),nullif(trim(p.image_url_orig),''),'') photo) im
            where p.id=any(changed_ids) and p.store_id=p_store_id and p.category=p_aisle_key
              and coalesce(pr.identity_status,'')<>'needs_review'
              and ((im.photo<>'' and im.photo not like '%target-%photo-sliced%') or
                case when jsonb_typeof(pr.gallery)='array' then jsonb_array_length(pr.gallery)>0 else false end)
              and not exists(select 1 from public.target_render_slots f join public.target_renders r using(render_no)
                where f.product_id=p.id and r.status='done' and r.display in ('floor_showroom','pallet'))
          ) into changed_ids;
        end if;
        if cardinality(changed_ids)>0 and exists (select id from unnest(changed_ids) id except
        select s.product_id from private.studio_authored_original_stock(p_store_id,p_aisle_key) s) then
          raise exception using errcode='22023',message='A selected product is outside this store aisle.';
        end if;
      end if;
    end if;
  end if;
  insert into private.studio_grocery_shelf_layouts(store_id,aisle_key,revision,layout)
  values(p_store_id,p_aisle_key,p_expected_revision+1,p_layout)
  on conflict (store_id,aisle_key) do update set revision=excluded.revision,layout=excluded.layout,updated_at=clock_timestamp();
  return jsonb_build_object('revision',p_expected_revision+1,'layout',p_layout);
end $$;
create function public.studio_save_grocery_shelf_layout(p_store_id uuid,p_aisle_key text,p_layout jsonb,p_expected_revision integer)
returns jsonb language sql volatile security invoker set search_path=''
begin atomic
  select private.studio_write_grocery_shelf_layout(p_store_id,p_aisle_key,p_layout,p_expected_revision);
end;

revoke all on function public.studio_grocery_shelf_layout(uuid,text),private.studio_read_grocery_shelf_layout(uuid,text),
  public.studio_save_grocery_shelf_layout(uuid,text,jsonb,integer),private.studio_write_grocery_shelf_layout(uuid,text,jsonb,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.studio_grocery_shelf_layout(uuid,text),private.studio_read_grocery_shelf_layout(uuid,text) to anon,authenticated;
grant execute on function public.studio_save_grocery_shelf_layout(uuid,text,jsonb,integer),private.studio_write_grocery_shelf_layout(uuid,text,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
