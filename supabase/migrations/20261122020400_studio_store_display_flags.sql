create table public.studio_store_display_flags (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.stores(id) on delete cascade,
    surface text not null check (char_length(surface) between 1 and 180),
    note text not null check (char_length(note) between 1 and 4000),
    status text not null default 'open' check (status in ('open','resolved')),
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    content_hash text not null,
    unique (created_by,store_id,content_hash)
);
create index studio_store_flags_recent on public.studio_store_display_flags(store_id,created_at desc);
alter table public.studio_store_display_flags enable row level security;
revoke all on public.studio_store_display_flags from public,anon,authenticated,service_role;
grant select on public.studio_store_display_flags to authenticated,service_role;
create policy studio_store_flags_owner_read on public.studio_store_display_flags for select to authenticated
using ((select private.studio_is_publisher()) and created_by=(select auth.uid()));

create function private.studio_flag_store_display(p_store_id uuid,p_surface text,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor();
    surface_name text:=btrim(p_surface); body text:=btrim(p_note);
    fingerprint text; saved public.studio_store_display_flags%rowtype;
begin
    if nullif(surface_name,'') is null or char_length(surface_name)>180 or
       nullif(body,'') is null or char_length(body)>4000 then
        raise exception using errcode='22023',message='Enter a surface and a repair note.';
    end if;
    if not exists(select 1 from public.stores s where s.id=p_store_id and s.is_live) then
        raise exception using errcode='PT404',message='Store is unavailable.';
    end if;
    fingerprint:=encode(extensions.digest(convert_to(jsonb_build_array(surface_name,body)::text,'UTF8'),'sha256'),'hex');
    insert into public.studio_store_display_flags(store_id,surface,note,created_by,content_hash)
        values (p_store_id,surface_name,body,actor,fingerprint)
        on conflict (created_by,store_id,content_hash) do update set status='open',
        updated_at=case when studio_store_display_flags.status='resolved' then clock_timestamp() else studio_store_display_flags.updated_at end
        returning * into saved;
    return to_jsonb(saved)-'content_hash';
end $$;
create function public.studio_flag_store_display(p_store_id uuid,p_surface text,p_note text)
returns jsonb language sql security invoker set search_path='' as $$
    select private.studio_flag_store_display(p_store_id,p_surface,p_note)
$$;
create function private.studio_resolve_store_display_flag(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_grocery_require_editor(); saved public.studio_store_display_flags%rowtype;
begin
    update public.studio_store_display_flags set status='resolved',
        updated_at=case when status='open' then clock_timestamp() else updated_at end
        where id=p_id and created_by=actor returning * into saved;
    if not found then raise exception using errcode='PT404',message='Flag not found.'; end if;
    return to_jsonb(saved)-'content_hash';
end $$;
create function public.studio_resolve_store_display_flag(p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
    select private.studio_resolve_store_display_flag(p_id)
$$;
revoke all on function private.studio_flag_store_display(uuid,text,text),public.studio_flag_store_display(uuid,text,text),
    private.studio_resolve_store_display_flag(uuid),public.studio_resolve_store_display_flag(uuid) from public,anon,authenticated,service_role;
grant execute on function private.studio_flag_store_display(uuid,text,text),public.studio_flag_store_display(uuid,text,text),
    private.studio_resolve_store_display_flag(uuid),public.studio_resolve_store_display_flag(uuid) to authenticated;
notify pgrst,'reload schema';
