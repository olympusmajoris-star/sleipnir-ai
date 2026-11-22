-- Read the original shopper stock without changing any aisle, SKU, or current price.
create function private.studio_authored_original_stock(p_store_id uuid,p_source_aisle text)
returns table("position" integer,product_id uuid)
language plpgsql stable security definer set search_path='' as $$
declare
  inventory uuid[]; occupied uuid[]:='{}'; tile_rows jsonb:='[]'; scene record; zones text[];
begin
  if not coalesce(private.studio_authored_store(p_store_id),false) or nullif(btrim(p_source_aisle),'') is null
    or not private.studio_authored_native_source(p_store_id,p_source_aisle) then return;end if;
  if p_store_id='e5a01340-424a-4a41-b0e6-99cb9e944733' then
    select array_agg(s.product_id order by r.render_no,s.slot) into inventory
    from public.aisle_renders r join public.aisle_slots s using(store_id,aisle,render_no)
    where r.store_id=p_store_id and r.aisle=p_source_aisle and r.publish_status='ready'
      and r.width>0 and r.height>0 and r.image_path<>'' and s.slot between 1 and case r.layout when '2x3' then 6 when '3x3' then 9 else 0 end
      and s.tag_w>0 and s.tag_h>0 and s.tag_x>=0 and s.tag_y>=0 and s.tag_x+s.tag_w<=1 and s.tag_y+s.tag_h<=1;
  elsif p_store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' and p_source_aisle in ('Canned Goods & Soups','Condiments & Sauces','Dairy & Eggs') then
    with panels as (
      select r.render_no,r.items,r.note from public.target_renders r where r.aisle=p_source_aisle and r.status='done' and r.facings=2 and r.items between 1 and 12
        and r.display=case p_source_aisle when 'Dairy & Eggs' then 'glass_cooler' else 'dark_shelf' end
        and r.image_path ~ ('^target-renders/'||trim(both '-' from regexp_replace(lower(r.aisle),'[^a-z]+','-','g'))||'/(r'||r.render_no||'|[0-9a-f]{64})[.]png$')
    ), valid as (
      select r.render_no from panels r join public.target_render_slots s using(render_no) group by r.render_no,r.items
      having count(*)=r.items and count(distinct s.product_id)=r.items and count(distinct s.slot)=r.items and min(s.slot)>=1 and max(s.slot)<=12
    )
    select array_agg(s.product_id order by r.render_no,s.slot) into inventory from valid v join panels r using(render_no) join public.target_render_slots s using(render_no)
    left join public.retail_product_presentations pr on pr.product_id=s.product_id and pr.store_id=p_store_id
    where coalesce(r.note,'') !~* ('\mslot\s+'||s.slot||'\s+empty\s*:') and coalesce(pr.identity_status,'')<>'needs_review';
  elsif p_store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' then
    -- The native tile parser retains the newest non-overlapping whole scene. Group its SKUs at
    -- their first catalog position instead of adding them twice to the stock list.
    for scene in
      select r.render_no,r.aisle,array_agg(s.product_id order by s.slot) filter(where coalesce(r.note,'') !~* ('\mslot\s+'||s.slot||'\s+empty\s*:')) ids
      from public.target_renders r join public.target_render_slots s using(render_no) where r.status='done' and r.display in ('floor_showroom','pallet')
        and r.items between 1 and 2 and r.image_path ~ ('^target-renders/'||trim(both '-' from regexp_replace(lower(r.aisle),'[^a-z]+','-','g'))||'/(r'||r.render_no||'|[0-9a-f]{64})[.]png$')
      group by r.render_no,r.aisle,r.items having count(*)=r.items and count(distinct s.product_id)=r.items
        and count(distinct s.slot)=r.items and min(s.slot)>=1 and max(s.slot)<=2 order by r.render_no desc
    loop
      if coalesce(cardinality(scene.ids),0)>0 and not scene.ids && occupied then
        occupied:=occupied||scene.ids;
        tile_rows:=tile_rows||jsonb_build_array(jsonb_build_object('render_no',scene.render_no,'aisle',scene.aisle,'ids',scene.ids));
      end if;
    end loop;
    with tiles as materialized (
      select t.render_no,t.aisle,q.id,q.ord
      from jsonb_to_recordset(tile_rows) t(render_no integer,aisle text,ids uuid[])
      cross join lateral unnest(t.ids) with ordinality q(id,ord)
    ), candidates as (
      select p.id,p.category,p.shelf_rank,p.name,t.render_no,t.ord,
        coalesce(nullif(trim(p.image_url),''),nullif(trim(p.image_url_orig),''),'') photo,pr.gallery,pr.identity_status
      from public.products p left join tiles t on t.id=p.id
      left join public.retail_product_presentations pr on pr.store_id=p.store_id and pr.product_id=p.id
      where p.store_id=p_store_id and coalesce(t.aisle,p.category)=p_source_aisle
    ), ranked as (
      select c.*,row_number() over(order by (c.category<>p_source_aisle),c.shelf_rank,c.name,c.id) idx
      from candidates c where coalesce(c.identity_status,'')<>'needs_review'
        and (c.render_no is not null or (c.photo<>'' and c.photo not like '%target-%photo-sliced%')
          or (jsonb_typeof(c.gallery)='array' and jsonb_array_length(c.gallery)>0))
    ), grouped as (
      select x.*,case when x.render_no is null then x.idx else min(x.idx) over(partition by x.render_no) end first_idx from ranked x
    )
    select array_agg(g.id order by g.first_idx,g.ord,g.idx) into inventory from grouped g;
  elsif p_store_id='189581c9-d728-4e5d-9e02-ae4de19a15af' and p_source_aisle in ('Fresh Fruits','Bagged Fruits','Packaged Fruits','Fresh Veggies','Bagged Veggies','Prepared Produce') then
    zones:=case p_source_aisle when 'Fresh Fruits' then array['loose-fruit'] when 'Bagged Fruits' then array['bag-fruit'] when 'Packaged Fruits' then array['pkg-fruit']
      when 'Fresh Veggies' then array['veg-bins','wall'] when 'Bagged Veggies' then array['bag-veg'] else array['pkg-veg'] end;
    select array_agg(r.product_id order by array_position(zones,r.zone),r.block_order,r.grid_row,r.grid_col,r.item_no) into inventory
      from public.produce_render_plan r where r.zone=any(zones) and r.image_path<>'';
  elsif p_store_id='189581c9-d728-4e5d-9e02-ae4de19a15af' and exists(select 1 from public.door_sections d where d.door=p_source_aisle) then
    with sections as materialized (select d.* from public.door_sections d where d.door=p_source_aisle),
    photographs as (
      select d.ord sec,s.product_id id,s.image_order im,s.spot_no spot,s.image_url,row_number() over(partition by d.ord,s.image_url order by s.image_order,s.spot_no) as face
      from sections d join public.station_render_v s on s.store_id=p_store_id and s.station=case d.station
        when 'Frozen Foods' then 'Publix Frozen Foods Priced 20261120' when 'Frozen Seafood' then 'Publix Frozen Seafood Priced 20261120'
        when 'Freezer Bins' then 'Publix Freezer Bins Priced 20261120' else d.station end
      where d.kind='render' or d.station in ('Frozen Foods','Frozen Seafood','Freezer Bins')
    ), fixtures as (
      select d.ord sec,i.product_id id,i.ord,i.shelf_rank,i.name,def.ord folder_rank,
          min(i.ord) over(partition by d.ord,coalesce(i.shelf_group,'Other')) group_ord,
          min(coalesce(i.shelf_rank,0)) over(partition by d.ord,coalesce(i.shelf_group,'Other')) group_rank
      from sections d join public.fixture_items_v i on d.kind='fixture' and i.station=d.station and i.store_id=p_store_id
      join public.fixture_defs def on def.station=i.station and def.folder=i.folder
      where (d.station='Beer & Wine' and i.folder in ('beer-photo-sliced','wine-photo-sliced'))
        or (d.station='Packaged Deli Meat' and i.folder='packaged-deli-products') or (d.station='Specialty Cheese' and i.folder='specialty-cheese-products')
    ), ordered as (
      select s.sec,s.id,row_number() over(partition by s.sec order by s.im,s.spot) ix from photographs s
        where p_source_aisle<>'Dairy & Eggs' or (s.image_url is not null and s.face<=20)
      union all select f.sec,f.id,row_number() over(partition by f.sec order by f.group_ord,f.group_rank,f.folder_rank,f.ord,f.shelf_rank,f.name,f.id) from fixtures f
      union all select d.ord,m.product_id,row_number() over(partition by d.ord order by m.col,m.ord,m.product_id)
        from sections d join public.menu_items_v m on m.store_id=p_store_id and m.station=d.station where d.kind='menu' and d.station='Subs'
    )
    select array_agg(o.id order by o.sec,o.ix) into inventory from ordered o;
  else
    select array_agg(p.id order by p.shelf_rank,p.name,p.id) into inventory from public.products p
    where p.store_id=p_store_id and p.price>=0 and p.price::text not in ('NaN','Infinity') and
      (case when p_store_id='189581c9-d728-4e5d-9e02-ae4de19a15af' and p_source_aisle='Bread & Rolls'
        then p.category='Bakery' and p.shelf_group='Bread & Rolls' else p.category=p_source_aisle end);
  end if;
  return query select row_number() over(order by first_seen)::int,owned_id from (
    select p.id owned_id,min(q.n) first_seen from unnest(inventory) with ordinality q(id,n)
    join public.products p on p.id=q.id and p.store_id=p_store_id group by p.id
  ) scoped order by first_seen;
end $$;

create function public.studio_grocery_aisle_original_stock(p_store_id uuid,p_source_aisle text) returns table("position" integer,product_id uuid)
language sql stable security invoker set search_path=''
begin atomic
 select * from private.studio_authored_original_stock(p_store_id,p_source_aisle);
end;
revoke all on function private.studio_authored_original_stock(uuid,text),public.studio_grocery_aisle_original_stock(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.studio_authored_original_stock(uuid,text),public.studio_grocery_aisle_original_stock(uuid,text) to authenticated,anon;
notify pgrst,'reload schema';
