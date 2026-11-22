-- The shopper roster supplies UUIDs. City and live catalog counts stay current
-- without aggregating the national catalog when a new Studio page opens.
create function public.studio_palm_coast_editor_locations(p_store_ids uuid[])
returns table(id uuid,name text,address text,category text,subcategory text,menu_type text,
              is_live boolean,is_valhalla boolean,logo_url text,product_count integer,image_count integer,
              app_surface text,native_renderer text,valhalla_menu_count integer)
language sql stable security invoker set search_path='' as $$
  with requested as materialized (
    select s.id,s.name,s.address,s.category,s.subcategory,s.menu_type,s.is_live,s.is_valhalla,s.logo_url
    from public.stores s
    where cardinality(p_store_ids) between 1 and 600 and s.id=any(p_store_ids) and s.is_live
      and (s.address ~* ',[[:space:]]*Palm[[:space:]]+Coast[[:space:]]*,[[:space:]]*(FL|Florida)([^[:alpha:]]|$)'
        or (s.id='3eb517cb-1328-4e94-a73e-68ed48398c7d'::uuid and s.address ~* '^5234 (East|E) Highway 100[.]?$'))
      and s.menu_type in ('grocery','retail','convenience','fast_food','fast_casual','sit_down')
  ), street as materialized (
    select v.store_id, v.orderable_items from public.studio_palm_coast_street_menu_counts_v v
    join requested r on r.id=v.store_id
  )
  select r.id,r.name,r.address,r.category,r.subcategory,r.menu_type,r.is_live,r.is_valhalla,r.logo_url,
    counts.n,counts.images,case when v.store_id is null then 'ordinary' else 'valhalla' end,
    case when v.store_id is not null then 'ValhallaStreet' end,coalesce(v.orderable_items,0)
  from requested r left join street v on v.store_id=r.id
  cross join lateral (
    select count(*)::integer n, count(*) filter(where nullif(btrim(p.image_url),'') is not null)::integer images
    from public.products p where p.store_id=r.id
  ) counts
  where (v.orderable_items>0 or (counts.n>0 and (not coalesce(r.is_valhalla,false) or r.category in ('Bar & Grill','Casual Dining'))))
  order by r.name,r.id
$$;
revoke all on function public.studio_palm_coast_editor_locations(uuid[]) from public,anon,authenticated;
grant execute on function public.studio_palm_coast_editor_locations(uuid[]) to anon,authenticated;
notify pgrst,'reload schema';
