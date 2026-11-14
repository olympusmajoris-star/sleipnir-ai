-- Additive workspace tools; no catalog rows, live designs or existing policies change.
begin;
create function public.studio_product_categories(p_store_id uuid)
returns table(category text,product_count bigint)
language sql stable security invoker set search_path='' as $$
 select coalesce(nullif(p.category,''),'Uncategorized'),count(*)
 from public.products p where p.store_id=p_store_id
 group by 1 order by 1;
$$;
revoke all on function public.studio_product_categories(uuid) from public;
grant execute on function public.studio_product_categories(uuid) to anon,authenticated;

create table public.studio_forge_workers (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 name text not null check(length(name) between 1 and 100),
 capabilities text[] not null default '{}',
 heartbeat_at timestamptz not null default now(),
 version text not null default '1',
 details jsonb not null default '{}' check(octet_length(details::text)<16384)
);
create table public.studio_work_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 store_id uuid references public.stores(id),
 kind text not null check(kind in ('scrape','render','image_inspection')),
 label text not null check(length(label) between 1 and 160),
 status text not null default 'queued' check(status in ('queued','running','awaiting_browser','paused','review_ready','failed','cancelled')),
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<2097152),
 progress jsonb not null default '{}' check(jsonb_typeof(progress)='object' and octet_length(progress::text)<65536),
 result jsonb not null default '{}' check(jsonb_typeof(result)='object' and octet_length(result::text)<2097152),
 requested_action text check(requested_action in ('pause','resume','cancel')),
 worker_id uuid references public.studio_forge_workers(id),
 lease_until timestamptz,
 idempotency_key uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,idempotency_key)
);
create index studio_work_jobs_queue_idx on public.studio_work_jobs(owner_id,status,created_at);
create index studio_work_jobs_store_idx on public.studio_work_jobs(store_id,created_at desc);
alter table public.studio_forge_workers enable row level security;
alter table public.studio_work_jobs enable row level security;
revoke all on public.studio_work_jobs,public.studio_forge_workers from public,anon,authenticated;
grant select,insert,update on public.studio_work_jobs,public.studio_forge_workers to authenticated;
create policy studio_worker_owner on public.studio_forge_workers for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.studio_is_publisher()))
 with check(owner_id=(select auth.uid()) and (select private.studio_is_publisher()));
create policy studio_job_owner on public.studio_work_jobs for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.studio_is_publisher()))
 with check(owner_id=(select auth.uid()) and (select private.studio_is_publisher()));
create function public.claim_studio_work_job(p_worker_id uuid)
returns setof public.studio_work_jobs language plpgsql security invoker set search_path='' as $$
declare job uuid; capabilities text[];
begin
 select w.capabilities into capabilities from public.studio_forge_workers w
 where w.id=p_worker_id and w.owner_id=auth.uid() and w.heartbeat_at>now()-interval '90 seconds';
 if capabilities is null then raise exception 'Worker is offline or unauthorized';end if;
 select j.id into job from public.studio_work_jobs j where j.owner_id=auth.uid()
 and j.kind=any(capabilities) and j.status='queued'
 and j.requested_action is distinct from 'cancel'
 order by j.created_at for update skip locked limit 1;
 if job is null then return;end if;
 return query update public.studio_work_jobs set status='running',worker_id=p_worker_id,
 lease_until=now()+interval '3 minutes',updated_at=now() where id=job returning *;
end $$;
revoke all on function public.claim_studio_work_job(uuid) from public,anon;
grant execute on function public.claim_studio_work_job(uuid) to authenticated;
commit;
