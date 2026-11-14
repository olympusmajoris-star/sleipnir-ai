-- Applied to the shared project on 2026-11-14. Retained for migration history.
-- Additive only. Does not alter studio_designs, app tables, products or existing settings.
-- Publication requires the same verified owner account as raven_scene_owner_update.
-- No release/channel rows are seeded: installing this schema does not publish a design.
begin;

create schema if not exists private;
create table private.studio_publishers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.studio_publishers enable row level security;
revoke all on private.studio_publishers from public, anon, authenticated;
grant usage on schema private to authenticated;
grant select on private.studio_publishers to authenticated;
create policy studio_publishers_self_read on private.studio_publishers
  for select to authenticated using (user_id = (select auth.uid()));
-- This is an existing identity observed in raven_scene_settings RLS, not a generated id.
insert into private.studio_publishers(user_id)
select id from auth.users where id='533a05da-fed8-4c92-ba94-7e4867ebce8f'::uuid;
do $$ begin
  if not exists(select 1 from private.studio_publishers) then
    raise exception 'Existing studio owner is missing; do not provision a substitute account';
  end if;
end $$;

create function private.studio_is_publisher() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and exists
    (select 1 from private.studio_publishers where user_id = auth.uid());
$$;
revoke all on function private.studio_is_publisher() from public, anon;
grant execute on function private.studio_is_publisher() to authenticated;

-- Publication data must be presentation settings, not login/session credentials.
create function private.studio_document_values_safe(v jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare item record; s text;
begin
  if jsonb_typeof(v) = 'object' then
    for item in select key,value from jsonb_each(v) loop
      if lower(regexp_replace(item.key,'[^a-zA-Z0-9]','','g')) = any
        (array['accesstoken','refreshtoken','authorization','apikey','servicerole',
               'password','clientsecret','privatekey','jwt','contacts','contactsjson',
               'proto','prototype','constructor']) then return false; end if;
      if not private.studio_document_values_safe(item.value) then return false; end if;
    end loop;
  elsif jsonb_typeof(v) = 'array' then
    for item in select value from jsonb_array_elements(v) loop
      if not private.studio_document_values_safe(item.value) then return false; end if;
    end loop;
  elsif jsonb_typeof(v) = 'string' then
    s := v #>> '{}';
    if s ~* '^\s*(javascript:|blob:|idb:|http:)' then return false; end if;
    if s ~* '^\s*data:' and s !~* '^data:(image/(png|jpeg|webp)|video/(mp4|webm));base64,' then
      return false;
    end if;
    if s ~* '/(rest/v1/studio_(designs|board)|auth/v1)' then return false; end if;
    if s ~ 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' then return false; end if;
  end if;
  return true;
end $$;
revoke all on function private.studio_document_values_safe(jsonb) from public, anon;
grant execute on function private.studio_document_values_safe(jsonb) to authenticated;

create function private.studio_valid_document(d jsonb, k text, rv text) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare p text; sid text; bt text; expected text;
begin
  if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>8388608 then return false; end if;
  if d->'schemaVersion' is distinct from '1'::jsonb then return false; end if;
  if d->>'designId' is distinct from k then return false; end if;
  if jsonb_typeof(d->'settings') is distinct from 'object'
    or jsonb_typeof(d->'navigation') is distinct from 'object'
    or jsonb_typeof(d->'bindingContract') is distinct from 'object'
    or d->'bindingContract'->'version' is distinct from '1'::jsonb then return false; end if;
  if rv is null or rv !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'
    or d->>'rendererVersion' is distinct from rv then return false; end if;
  p:=d->>'page';
  if p is null or p <> all(array['raven','navigation','home','shome','browse','store',
    'convo','share','heimdall','track','swap','ads','shoppost','deals']) then return false; end if;
  if p='store' then
    sid:=d->>'storeId';
    if sid is null or sid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
    expected:='page_store_'||sid;
  elsif p='browse' then
    bt:=d->>'pageType';
    if bt is null or bt <> all(array['grocery','fast_food','restaurant','retail','valhalla']) then return false; end if;
    expected:='page_browse_'||bt;
  elsif p in ('raven','navigation') then expected:=p;
  else expected:='page_'||p;
  end if;
  return k=expected and private.studio_document_values_safe(d);
end $$;
revoke all on function private.studio_valid_document(jsonb,text,text) from public, anon;
grant execute on function private.studio_valid_document(jsonb,text,text) to authenticated;

create function private.studio_is_pinned_asset_url(s text) returns boolean
language sql immutable security invoker set search_path='' as $$
  select coalesce(
    s ~ '^https://raw\.githubusercontent\.com/olympusmajoris-star/sleipnir-ai/[a-f0-9]{40}/[^?#]+$'
    and s !~ '(^|/)\.\.?(/|$)' and s !~* '%2e|%2f|%5c' and position(chr(92) in s)=0,
    false);
$$;
revoke all on function private.studio_is_pinned_asset_url(text) from public,anon;
grant execute on function private.studio_is_pinned_asset_url(text) to authenticated;

create function private.studio_frozen_media_refs(v jsonb,a jsonb,media_hint boolean default false) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item record; s text; looks_like_media boolean;
begin
  if jsonb_typeof(v)='object' then
    for item in select key,value from jsonb_each(v) loop
      if not private.studio_frozen_media_refs(item.value,a,
        media_hint or item.key ~* '(^|_)(src|image|img|texture|thumb|bust|face|photo|background|media|video|asset|fonturl)$'
        or item.key ~* '(image|video|asset|media|texture|font|img)(url|src)$') then return false; end if;
    end loop;
  elsif jsonb_typeof(v)='array' then
    for item in select value from jsonb_array_elements(v) loop
      if not private.studio_frozen_media_refs(item.value,a,media_hint) then return false; end if;
    end loop;
  elsif jsonb_typeof(v)='string' then
    s:=v #>> '{}';
    looks_like_media := s ~* '^data:(image|video|font)/' or s ~* '/storage/v1/object/'
      or s ~* '\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|woff|woff2)(\?|$)'
      or (media_hint and s ~* '^(https?://|\.?/)');
    if looks_like_media then
      return a ? s
        or s ~ '^https://afnihsdxtisneuyehatw\.supabase\.co/storage/v1/object/public/studio-published-media/sha256/[a-f0-9]{64}\.[a-z0-9]{1,10}$'
        or private.studio_is_pinned_asset_url(s);
    end if;
  end if;
  return true;
end $$;
revoke all on function private.studio_frozen_media_refs(jsonb,jsonb,boolean) from public,anon;
grant execute on function private.studio_frozen_media_refs(jsonb,jsonb,boolean) to authenticated;

create function private.studio_frozen_assets_valid(d jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare a jsonb; item record;
begin
  if d->'assetsFrozen' is distinct from 'true'::jsonb or jsonb_typeof(d->'assets') is distinct from 'object' then return false; end if;
  a:=d->'assets';
  for item in select key,value from jsonb_each(a) loop
    if jsonb_typeof(item.value) is distinct from 'string'
      or ((item.value #>> '{}') !~ '^https://afnihsdxtisneuyehatw\.supabase\.co/storage/v1/object/public/studio-published-media/sha256/[a-f0-9]{64}\.[a-z0-9]{1,10}$'
        and not private.studio_is_pinned_asset_url(item.value #>> '{}'))
      or item.key ~* '(access_token=|refresh_token=|signature=|x-amz-|x-goog-|/storage/v1/object/sign/|[?&](token|sig|key|credential|auth|api_key|apikey)=)'
      or item.key ~ 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' then return false; end if;
  end loop;
  return private.studio_frozen_media_refs(d->'settings',a)
    and private.studio_frozen_media_refs(d->'navigation',a);
end $$;
revoke all on function private.studio_frozen_assets_valid(jsonb) from public,anon;
grant execute on function private.studio_frozen_assets_valid(jsonb) to authenticated;

create table public.studio_app_drafts (
  page_key text primary key check (page_key ~ '^[a-z][a-z0-9_-]{0,119}$'),
  revision bigint not null check(revision>0),
  document jsonb not null,
  renderer_version text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  check(private.studio_valid_document(document,page_key,renderer_version))
);
create table public.studio_app_releases (
  id uuid primary key default gen_random_uuid(),
  page_key text not null check(page_key ~ '^[a-z][a-z0-9_-]{0,119}$'),
  revision bigint not null check(revision>0),
  label text not null check(length(btrim(label)) between 1 and 120),
  document jsonb not null,
  renderer_version text not null,
  restored_from uuid references public.studio_app_releases(id),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  unique(page_key,revision),
  unique(page_key,id,revision),
  check(private.studio_valid_document(document,page_key,renderer_version)),
  check(private.studio_frozen_assets_valid(document))
);
create table public.studio_app_channels (
  page_key text primary key check(page_key ~ '^[a-z][a-z0-9_-]{0,119}$'),
  active_release_id uuid,
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  foreign key(page_key,active_release_id,revision)
    references public.studio_app_releases(page_key,id,revision)
    deferrable initially deferred,
  check((revision=0 and active_release_id is null) or (revision>0 and active_release_id is not null))
);
alter table public.studio_app_drafts enable row level security;
alter table public.studio_app_releases enable row level security;
alter table public.studio_app_channels enable row level security;
revoke all on public.studio_app_drafts,public.studio_app_releases,public.studio_app_channels from public,anon,authenticated;
grant select,insert,update on public.studio_app_drafts to authenticated;
grant select on public.studio_app_releases,public.studio_app_channels to anon,authenticated;
grant insert on public.studio_app_releases to authenticated;
grant insert,update on public.studio_app_channels to authenticated;

create policy studio_app_drafts_owner_read on public.studio_app_drafts
  for select to authenticated using((select private.studio_is_publisher()));
create policy studio_app_drafts_owner_insert on public.studio_app_drafts
  for insert to authenticated with check((select private.studio_is_publisher()) and updated_by=(select auth.uid()));
create policy studio_app_drafts_owner_update on public.studio_app_drafts
  for update to authenticated using((select private.studio_is_publisher()))
  with check((select private.studio_is_publisher()) and updated_by=(select auth.uid()));
-- Every row in releases is already explicitly approved; history may be pinned by exported widgets.
create policy studio_app_releases_approved_read on public.studio_app_releases
  for select to anon,authenticated using(true);
create policy studio_app_releases_owner_insert on public.studio_app_releases
  for insert to authenticated with check((select private.studio_is_publisher()) and created_by=(select auth.uid()));
create policy studio_app_channels_public_read on public.studio_app_channels
  for select to anon,authenticated using(true);
create policy studio_app_channels_owner_insert on public.studio_app_channels
  for insert to authenticated with check((select private.studio_is_publisher()) and (updated_by is null or updated_by=(select auth.uid())));
create policy studio_app_channels_owner_update on public.studio_app_channels
  for update to authenticated using((select private.studio_is_publisher()))
  with check((select private.studio_is_publisher()) and updated_by=(select auth.uid()));

create function public.save_studio_app_draft(
  p_page_key text,p_document jsonb,p_renderer_version text,p_expected_revision bigint
) returns public.studio_app_drafts
language plpgsql security invoker set search_path='' as $$
declare r public.studio_app_drafts;
begin
  if not private.studio_is_publisher() then raise exception 'Only the studio owner may save protected app drafts' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'Expected revision is required' using errcode='22023'; end if;
  if p_expected_revision=0 then
    insert into public.studio_app_drafts(page_key,revision,document,renderer_version,updated_by)
    values(p_page_key,1,p_document,p_renderer_version,auth.uid()) on conflict(page_key) do nothing returning * into r;
  else
    update public.studio_app_drafts set revision=revision+1,document=p_document,renderer_version=p_renderer_version,
      updated_at=now(),updated_by=auth.uid()
    where page_key=p_page_key and revision=p_expected_revision returning * into r;
  end if;
  if r.page_key is null then raise exception 'Draft changed; reload before saving' using errcode='40001'; end if;
  return r;
end $$;

create function public.publish_studio_app_release(
  p_page_key text,p_label text,p_document jsonb,p_renderer_version text,p_expected_revision bigint
) returns public.studio_app_releases
language plpgsql security invoker set search_path='' as $$
declare ch public.studio_app_channels; r public.studio_app_releases;
begin
  if not private.studio_is_publisher() then raise exception 'Only the studio owner may approve an app release' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'Expected revision is required' using errcode='22023'; end if;
  if not private.studio_valid_document(p_document,p_page_key,p_renderer_version)
    or not private.studio_frozen_assets_valid(p_document) then
    raise exception 'Invalid, unsafe or unfrozen app design document' using errcode='22023';
  end if;
  if p_document->>'page'='store' and not exists(select 1 from public.stores where id=(p_document->>'storeId')::uuid) then
    raise exception 'Store does not exist' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_each_text(p_document->'assets') a
    where a.value like 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/studio-published-media/%'
      and not exists(select 1 from storage.objects o
      where o.bucket_id='studio-published-media'
        and o.name=split_part(a.value,'/studio-published-media/',2))
  ) then raise exception 'Frozen media upload is incomplete' using errcode='22023'; end if;
  insert into public.studio_app_channels(page_key,updated_by) values(p_page_key,auth.uid()) on conflict(page_key) do nothing;
  select * into ch from public.studio_app_channels where page_key=p_page_key for update;
  if ch.revision is distinct from p_expected_revision then raise exception 'Approved design changed; reload before applying' using errcode='40001'; end if;
  insert into public.studio_app_releases(page_key,revision,label,document,renderer_version,created_by)
    values(p_page_key,ch.revision+1,btrim(p_label),p_document,p_renderer_version,auth.uid()) returning * into r;
  update public.studio_app_channels set active_release_id=r.id,revision=r.revision,updated_at=now(),updated_by=auth.uid()
    where page_key=p_page_key;
  return r;
end $$;

create function public.restore_studio_app_release(
  p_page_key text,p_release_id uuid,p_label text,p_expected_revision bigint
) returns public.studio_app_releases
language plpgsql security invoker set search_path='' as $$
declare ch public.studio_app_channels; old public.studio_app_releases; r public.studio_app_releases;
begin
  if not private.studio_is_publisher() then raise exception 'Only the studio owner may restore an app release' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'Expected revision is required' using errcode='22023'; end if;
  select * into old from public.studio_app_releases where id=p_release_id and page_key=p_page_key;
  if old.id is null then raise exception 'Approved version not found for this page' using errcode='22023'; end if;
  select * into ch from public.studio_app_channels where page_key=p_page_key for update;
  if ch.revision is distinct from p_expected_revision then raise exception 'Approved design changed; reload before restoring' using errcode='40001'; end if;
  insert into public.studio_app_releases(page_key,revision,label,document,renderer_version,restored_from,created_by)
    values(p_page_key,ch.revision+1,btrim(p_label),old.document,old.renderer_version,old.id,auth.uid()) returning * into r;
  update public.studio_app_channels set active_release_id=r.id,revision=r.revision,updated_at=now(),updated_by=auth.uid()
    where page_key=p_page_key;
  return r;
end $$;

revoke all on function public.save_studio_app_draft(text,jsonb,text,bigint) from public,anon;
revoke all on function public.publish_studio_app_release(text,text,jsonb,text,bigint) from public,anon;
revoke all on function public.restore_studio_app_release(text,uuid,text,bigint) from public,anon;
grant execute on function public.save_studio_app_draft(text,jsonb,text,bigint) to authenticated;
grant execute on function public.publish_studio_app_release(text,text,jsonb,text,bigint) to authenticated;
grant execute on function public.restore_studio_app_release(text,uuid,text,bigint) to authenticated;

comment on table public.studio_app_releases is 'Only explicitly approved presentation snapshots; never a live view of studio_designs. Anonymous reads permitted for app runtime and pinned approved versions.';
comment on table public.studio_app_drafts is 'Private owner-only app draft snapshots. Never read by customer app runtime.';

-- Immutable media: only the verified owner may create new content-addressed objects.
-- Public read serves deliberately approved app UI artwork. Never copy private user media here.
insert into storage.buckets(id,name,public,allowed_mime_types)
values('studio-published-media','studio-published-media',true,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','video/webm','font/woff','font/woff2']);
create policy studio_published_media_read on storage.objects for select to anon,authenticated
  using(bucket_id='studio-published-media');
create policy studio_published_media_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='studio-published-media' and (select private.studio_is_publisher())
    and name ~ '^sha256/[a-f0-9]{64}\.[a-z0-9]{1,10}$');
-- Restrictive guards also protect this bucket if a broader permissive policy is added later.
create policy studio_published_media_insert_guard on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'studio-published-media' or
    ((select auth.uid())='533a05da-fed8-4c92-ba94-7e4867ebce8f'::uuid
      and name ~ '^sha256/[a-f0-9]{64}\.[a-z0-9]{1,10}$'));
create policy studio_published_media_no_client_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'studio-published-media') with check(bucket_id<>'studio-published-media');
create policy studio_published_media_no_client_delete on storage.objects as restrictive for delete to anon,authenticated
  using(bucket_id<>'studio-published-media');
commit;
