begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('studio-job-artifacts','studio-job-artifacts',false,26214400,array['image/png','image/webp','application/json']);
create policy studio_job_artifact_read on storage.objects for select to authenticated
using(bucket_id='studio-job-artifacts' and (select private.studio_is_publisher()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy studio_job_artifact_insert on storage.objects for insert to authenticated
with check(bucket_id='studio-job-artifacts' and (select private.studio_is_publisher()) and (storage.foldername(name))[1]=(select auth.uid())::text
and exists(select 1 from public.studio_work_jobs j where j.id::text=(storage.foldername(name))[2] and j.owner_id=(select auth.uid())));
commit;
