-- Preserve every live storefront in its original shopper position when placing an advertisement.
create or replace function private.studio_validate_street(j jsonb,ids uuid[]) returns void
language plpgsql stable security invoker set search_path='' as $$
declare ambient jsonb;
begin
 if j?'ambient' then
  ambient:=j->'ambient';
  if jsonb_typeof(ambient)<>'object' or (ambient-array['streams','messages'])<>'{}'::jsonb
     or (ambient?'streams' and jsonb_typeof(ambient->'streams')<>'boolean')
     or (ambient?'messages' and jsonb_typeof(ambient->'messages')<>'boolean') then
    raise exception using errcode='22023',message='Ambient switches accept only streams and messages booleans.';
  end if;
 end if;
 perform private.studio_validate_street_scene(j-'ambient',ids);
 if j?'ads' and exists (
   with original_stops as (
     select v.store_id, lead(v.store_id) over (order by v.sort_order nulls last,v.store_id) as following
     from public.valhalla_stores v where v.is_active
   )
   select 1 from jsonb_array_elements(j->'ads') as a(value)
   where not exists (
     select 1 from original_stops s
     where s.store_id=(a.value->>'after_store_id')::uuid and s.following=(a.value->>'before_store_id')::uuid
   )
 ) then
   raise exception using errcode='22023',message='These storefronts have an intervening stop on the shopper street.';
 end if;
end $$;
revoke all on function private.studio_validate_street(jsonb,uuid[]) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
