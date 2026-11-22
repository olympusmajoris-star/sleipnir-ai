-- Match the native street's active Palm Coast entrances to their own orderable menu.
-- Let Postgres count the menu so opening Studio does not download every menu item.
create view public.studio_palm_coast_street_menu_counts_v
with (security_invoker = true) as
select s.store_id,count(*)::integer as orderable_items
from public.valhalla_stores s
join public.valhalla_live_menu m on m.store_id=s.store_id
where s.is_active and lower(btrim(s.city))='palm coast' and m.is_orderable
group by s.store_id;
revoke all on public.studio_palm_coast_street_menu_counts_v from public,anon,authenticated;
grant select on public.studio_palm_coast_street_menu_counts_v to anon,authenticated;
notify pgrst,'reload schema';
