-- Adds one bounded media job; existing ownership, lease and artifact policies remain.
begin;
alter table public.studio_work_jobs drop constraint studio_work_jobs_kind_check;
alter table public.studio_work_jobs add constraint studio_work_jobs_kind_check
 check (kind in ('scrape','render','image_inspection','cloud_prepare'));
commit;
