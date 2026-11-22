-- The shopper sees current sizes. Source files, repair notes and editor identity stay private.
create table public.studio_grocery_product_scales (
    store_id uuid not null references public.stores(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    scale numeric not null check (scale between 0.10 and 4.00),
    revision bigint not null check (revision > 0),
    updated_at timestamptz not null default now(),
    primary key (store_id, product_id)
);
create table private.studio_grocery_scale_history (
    store_id uuid not null,
    product_id uuid not null,
    revision bigint not null,
    previous_scale numeric,
    scale numeric not null,
    changed_by uuid not null,
    changed_at timestamptz not null default now(),
    primary key (store_id, product_id, revision)
);
create table public.studio_grocery_product_flags (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.stores(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    aisle text not null check (char_length(aisle) between 1 and 180),
    version text check (char_length(version) <= 256),
    page_key text check (char_length(page_key) <= 256),
    note text not null check (char_length(note) <= 4000),
    status text not null default 'open' check (status in ('open','resolved')),
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    content_hash text not null,
    unique (created_by,store_id,product_id,content_hash)
);
create index studio_grocery_flags_store_recent on public.studio_grocery_product_flags (store_id, created_at desc);

create table public.studio_grocery_dart_versions (
    id uuid primary key default gen_random_uuid(),
    sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
    filename text not null,
    source text not null,
    byte_size integer not null check (byte_size between 1 and 8388608),
    created_at timestamptz not null default now(),
    created_by uuid not null references auth.users(id) on delete cascade,
    preview_url text,
    preview_sha256 text,
    preview_status text not null default 'uncompiled',
    check ((preview_status='uncompiled' and preview_url is null and preview_sha256 is null)
        or (preview_status='verified' and preview_url is not null and preview_url ~ '^https://'
            and preview_sha256 is not null and preview_sha256 ~ '^[a-f0-9]{64}$')),
    unique (created_by,sha256)
);

alter table public.studio_grocery_product_scales enable row level security;
alter table private.studio_grocery_scale_history enable row level security;
alter table public.studio_grocery_product_flags enable row level security;
alter table public.studio_grocery_dart_versions enable row level security;
revoke all on public.studio_grocery_product_scales, private.studio_grocery_scale_history,
    public.studio_grocery_product_flags, public.studio_grocery_dart_versions from public, anon, authenticated, service_role;
grant select on public.studio_grocery_product_scales to anon, authenticated, service_role;
grant select on public.studio_grocery_product_flags, public.studio_grocery_dart_versions to authenticated, service_role;
grant select on private.studio_grocery_scale_history to service_role;
grant update(preview_url,preview_sha256,preview_status) on public.studio_grocery_dart_versions to service_role;
create policy grocery_scale_catalog_read on public.studio_grocery_product_scales for select to anon,authenticated
using (exists (select 1 from public.products p where p.id=studio_grocery_product_scales.product_id and p.store_id=studio_grocery_product_scales.store_id));
create policy grocery_flags_owner_read on public.studio_grocery_product_flags for select to authenticated
using ((select private.studio_is_publisher()) and created_by=(select auth.uid()));
create policy grocery_source_owner_read on public.studio_grocery_dart_versions for select to authenticated
using ((select private.studio_is_publisher()) and created_by=(select auth.uid()));

create function public.studio_grocery_editor_access() returns boolean
language sql stable security invoker set search_path='' as $$
    select private.studio_is_publisher()
$$;

-- Definer functions stay outside exposed schemas. Every entry checks the session's publisher allowlist.
-- Public RPC wrappers below have invoker security; table grants independently forbid direct writes.
create function private.studio_grocery_require_editor() returns uuid
language plpgsql stable security invoker set search_path='' as $$
declare actor uuid := auth.uid();
begin
    if actor is null or not private.studio_is_publisher() then
       raise exception using errcode='42501', message='A Studio publisher account is required.';
    end if;
    return actor;
end $$;
create function private.studio_grocery_require_product(p_store_id uuid,p_product_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
    perform 1 from public.products p where p.id=p_product_id and p.store_id=p_store_id for share;
    if not found then raise exception using errcode='22023',message='Product does not belong to the selected store.'; end if;
end $$;

create function private.studio_grocery_save_scale(p_store_id uuid,p_product_id uuid,p_scale numeric,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor(); oldrow public.studio_grocery_product_scales%rowtype;
        saved public.studio_grocery_product_scales%rowtype;
begin
    if p_scale is null or p_scale not between 0.10 and 4.00
       or p_expected_revision is null or p_expected_revision<0 then
        raise exception using errcode='22023',message='Scale must be between 0.10 and 4.00 and revision must be nonnegative.';
    end if;
    perform private.studio_grocery_require_product(p_store_id,p_product_id);
    if p_expected_revision=0 then
        insert into public.studio_grocery_product_scales(store_id,product_id,scale,revision)
          values(p_store_id,p_product_id,p_scale,1)
          on conflict (store_id,product_id) do nothing returning * into saved;
    else
        select * into oldrow from public.studio_grocery_product_scales s where s.store_id=p_store_id and s.product_id=p_product_id for update;
        if found and oldrow.revision=p_expected_revision then
            if oldrow.scale=p_scale then return to_jsonb(oldrow); end if;
            update public.studio_grocery_product_scales s set scale=p_scale,revision=oldrow.revision+1,updated_at=clock_timestamp()
              where s.store_id=p_store_id and s.product_id=p_product_id returning * into saved;
        end if;
    end if;
    if saved.revision is null then raise exception using errcode='PT409',message='This product scale changed. Reload its revision before saving.'; end if;
    insert into private.studio_grocery_scale_history(store_id,product_id,revision,previous_scale,scale,changed_by)
        values(p_store_id,p_product_id,saved.revision,oldrow.scale,saved.scale,actor);
    return to_jsonb(saved);
end $$;
create function public.studio_save_grocery_product_scale(p_store_id uuid,p_product_id uuid,p_scale numeric,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path='' as $$
  select private.studio_grocery_save_scale(p_store_id,p_product_id,p_scale,p_expected_revision)
$$;

create function private.studio_grocery_flag(p_store_id uuid,p_product_id uuid,p_aisle text,p_version text,p_page_key text,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor(); saved public.studio_grocery_product_flags%rowtype;
        aisle_name text:=btrim(p_aisle); version_tag text:=nullif(btrim(p_version),''); page_tag text:=nullif(btrim(p_page_key),'');
        body text:=btrim(coalesce(p_note,'')); fingerprint text;
begin
    if nullif(aisle_name,'') is null or char_length(aisle_name)>180 or char_length(version_tag)>256
       or char_length(page_tag)>256 or char_length(body)>4000 then
        raise exception using errcode='22023',message='A flag must have an aisle and fit the supported context and note lengths.';
    end if;
    perform private.studio_grocery_require_product(p_store_id,p_product_id);
    fingerprint:=encode(extensions.digest(convert_to(jsonb_build_array(aisle_name,version_tag,page_tag,body)::text,'UTF8'),'sha256'),'hex');
    insert into public.studio_grocery_product_flags(store_id,product_id,aisle,version,page_key,note,created_by,content_hash)
      values(p_store_id,p_product_id,aisle_name,version_tag,page_tag,body,actor,fingerprint)
      on conflict (created_by,store_id,product_id,content_hash) do update set status='open',
        updated_at=case when studio_grocery_product_flags.status='resolved' then clock_timestamp() else studio_grocery_product_flags.updated_at end
      returning * into saved;
    return to_jsonb(saved)-'content_hash';
end $$;
create function public.studio_flag_grocery_product(p_store_id uuid,p_product_id uuid,p_aisle text,p_version text default null,p_page_key text default null,p_note text default '')
returns jsonb language sql security invoker set search_path='' as $$
  select private.studio_grocery_flag(p_store_id,p_product_id,p_aisle,p_version,p_page_key,p_note)
$$;
create function private.studio_grocery_resolve_flag(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor(); saved public.studio_grocery_product_flags%rowtype;
begin
    update public.studio_grocery_product_flags set status='resolved',
        updated_at=case when status='open' then clock_timestamp() else updated_at end
      where id=p_id and created_by=actor returning * into saved;
    if not found then raise exception using errcode='PT404',message='Flag not found.'; end if;
    return to_jsonb(saved)-'content_hash';
end $$;
create function public.studio_resolve_grocery_product_flag(p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.studio_grocery_resolve_flag(p_id)$$;

create function private.studio_grocery_register_dart(p_filename text,p_source text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor(); file_hash text; bytes bytea; file_name text:=btrim(p_filename);
        id_out uuid; saved_meta jsonb;
begin
    if file_name is null or char_length(file_name)>180 or file_name !~* '^[^/\\[:cntrl:]]+\.dart$'
       or p_source is null or octet_length(p_source) not between 1 and 8388608
       or p_source !~ '\mclass\s+GroceryAisle\M' then
        raise exception using errcode='22023',message='Select a UTF-8 .dart file containing class GroceryAisle (up to 8 MiB).';
    end if;
    bytes:=convert_to(p_source,'UTF8');
    file_hash:=encode(extensions.digest(bytes,'sha256'),'hex');
    insert into public.studio_grocery_dart_versions(sha256,filename,source,byte_size,created_by)
        values(file_hash,file_name,p_source,octet_length(bytes),actor)
        on conflict (created_by,sha256) do nothing returning id into id_out;
    select jsonb_build_object('id',v.id,'sha256',v.sha256,'filename',v.filename,'byte_size',v.byte_size,
        'created_at',v.created_at,'preview_status',v.preview_status,'preview_url',v.preview_url,'preview_sha256',v.preview_sha256)
      into saved_meta from public.studio_grocery_dart_versions v where v.created_by=actor and v.sha256=file_hash;
    return saved_meta;
end $$;
create function public.studio_register_grocery_dart(p_filename text,p_source text) returns jsonb
language sql security invoker set search_path='' as $$select private.studio_grocery_register_dart(p_filename,p_source)$$;

revoke all on function private.studio_grocery_require_editor(),private.studio_grocery_require_product(uuid,uuid),
    private.studio_grocery_save_scale(uuid,uuid,numeric,bigint),private.studio_grocery_flag(uuid,uuid,text,text,text,text),
    private.studio_grocery_resolve_flag(uuid),private.studio_grocery_register_dart(text,text),
    public.studio_grocery_editor_access(),public.studio_save_grocery_product_scale(uuid,uuid,numeric,bigint),
    public.studio_flag_grocery_product(uuid,uuid,text,text,text,text),public.studio_resolve_grocery_product_flag(uuid),
    public.studio_register_grocery_dart(text,text) from public,anon,authenticated,service_role;
grant execute on function private.studio_grocery_save_scale(uuid,uuid,numeric,bigint),private.studio_grocery_flag(uuid,uuid,text,text,text,text),
    private.studio_grocery_resolve_flag(uuid),private.studio_grocery_register_dart(text,text),
    public.studio_grocery_editor_access(),public.studio_save_grocery_product_scale(uuid,uuid,numeric,bigint),
    public.studio_flag_grocery_product(uuid,uuid,text,text,text,text),public.studio_resolve_grocery_product_flag(uuid),
    public.studio_register_grocery_dart(text,text) to authenticated;
notify pgrst, 'reload schema';
