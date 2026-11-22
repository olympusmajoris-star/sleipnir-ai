-- Resolve the private helper at definition time. Public readers have its EXECUTE grant,
-- and do not need schema USAGE for unrelated private objects.
create or replace function public.studio_grocery_aisles(p_store_id uuid)
returns table(aisle_id uuid,store_id uuid,title text,fixture text,product_ids uuid[],published_revision integer,source_aisle text,appearance jsonb,stock_mode text)
language sql stable security invoker set search_path=''
begin atomic
  select * from private.studio_authored_public(p_store_id);
end;
notify pgrst,'reload schema';
