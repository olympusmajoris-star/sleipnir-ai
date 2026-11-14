begin;
create function public.studio_forge_review(p_store_id uuid,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; store_name_value text;
begin
 if not private.studio_is_publisher() then raise exception 'Owner access required'; end if;
 select name into store_name_value from public.stores where id=p_store_id;
 if store_name_value is null then raise exception 'Unknown store';end if;
 with matching as (
 select f.* from public.forge_staging_items f
 where f.store_id=p_store_id or f.payload->>'store_id'=p_store_id::text
 or (f.store_id is null and coalesce(f.payload->>'store_id','')='' and f.store_name=store_name_value)
 ), page as (
 select * from matching order by created_at desc,id offset greatest(p_offset,0) limit least(greatest(p_limit,1),100)
 )
 select jsonb_build_object('total',(select count(*) from matching),'items',coalesce(jsonb_agg(jsonb_build_object(
 'id',id,'storeId',p_store_id,'name',coalesce(nullif(official_title,''),candidate_name),
 'price',case when price is not null then price when (payload->>'price')~'^[0-9]+([.][0-9]+)?$' then (payload->>'price')::numeric else null end,
 'image_url',coalesce(nullif(image_url,''),payload->>'image_url'),
 'category',coalesce(category,payload->>'category'),'description',payload->>'description',
 'sourceId',payload->>'source_id','variant',payload->>'variant_label',
 'status',forge_status,'reviewReason',review_reason,'createdAt',created_at,
 'identityVerified',store_id=p_store_id or coalesce(payload->>'store_id','')=p_store_id::text
 )),'[]'::jsonb)) into result from page;
 return result;
end $$;
revoke all on function public.studio_forge_review(uuid,integer,integer) from public,anon;
grant execute on function public.studio_forge_review(uuid,integer,integer) to authenticated;
commit;
