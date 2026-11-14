-- Read-only editor inventory. Obeys existing stores/products RLS; changes no catalog rows.
create view public.studio_store_summary_v
with (security_invoker = true)
as
with inventory as (
  select store_id, count(*)::integer as product_count,
    count(*) filter (where nullif(btrim(image_url), '') is not null)::integer as image_count
  from public.products group by store_id
)
select s.id, s.name, s.address, s.category, s.menu_type, s.subcategory,
  s.is_valhalla, s.is_live, s.website_url, s.logo_url, s.hours,
  coalesce(i.product_count, 0) as product_count,
  coalesce(i.image_count, 0) as image_count
from public.stores s left join inventory i on i.store_id = s.id;
revoke all on public.studio_store_summary_v from public, anon, authenticated;
grant select on public.studio_store_summary_v to anon, authenticated;
comment on view public.studio_store_summary_v is 'Studio-only read-only store inventory. Image counts indicate a nonempty URL, not verified image quality. Empty means no canonical products/menu items.';
