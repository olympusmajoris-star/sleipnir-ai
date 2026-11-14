begin;
-- Explicitly prepared, immutable presentation-only device test copies.
-- No production channel ever reads this table.
create table public.studio_app_candidates (
 id uuid primary key default gen_random_uuid(),
 page_key text not null,
 label text not null check(length(btrim(label)) between 1 and 120),
 document jsonb not null,
 renderer_version text not null,
 created_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),
 check(private.studio_valid_document(document,page_key,renderer_version)),
 check(private.studio_frozen_assets_valid(document))
);
alter table public.studio_app_candidates enable row level security;
revoke all on public.studio_app_candidates from public,anon,authenticated;
grant select on public.studio_app_candidates to anon,authenticated;
grant insert on public.studio_app_candidates to authenticated;
create policy studio_app_candidates_read on public.studio_app_candidates for select to anon,authenticated using(true);
create policy studio_app_candidates_owner_insert on public.studio_app_candidates for insert to authenticated
 with check((select private.studio_is_publisher()) and created_by=(select auth.uid()));
create function public.prepare_studio_app_candidate(p_page_key text,p_label text,p_document jsonb,p_renderer_version text)
returns public.studio_app_candidates language plpgsql security invoker set search_path='' as $$
declare r public.studio_app_candidates;
begin
 if not private.studio_is_publisher() then raise exception 'Only the studio owner may prepare a device test' using errcode='42501'; end if;
 if not private.studio_valid_document(p_document,p_page_key,p_renderer_version) or not private.studio_frozen_assets_valid(p_document) then
  raise exception 'Invalid, unsafe or unfrozen test design' using errcode='22023'; end if;
 if p_document->>'page'='store' and not exists(select 1 from public.stores where id=(p_document->>'storeId')::uuid) then
  raise exception 'Store does not exist' using errcode='22023'; end if;
 if exists(select 1 from jsonb_each_text(p_document->'assets') a
  where a.value like 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/studio-published-media/%'
  and not exists(select 1 from storage.objects o where o.bucket_id='studio-published-media'
  and o.name=split_part(a.value,'/studio-published-media/',2))) then
  raise exception 'Frozen media upload is incomplete' using errcode='22023'; end if;
 insert into public.studio_app_candidates(page_key,label,document,renderer_version,created_by)
 values(p_page_key,btrim(p_label),p_document,p_renderer_version,auth.uid()) returning * into r;
 return r;
end $$;
revoke all on function public.prepare_studio_app_candidate(text,text,jsonb,text) from public,anon;
grant execute on function public.prepare_studio_app_candidate(text,text,jsonb,text) to authenticated;
comment on table public.studio_app_candidates is 'Deliberately shared, presentation-only device test copies. Immutable. Never used by a production channel. No private user data.';
commit;
