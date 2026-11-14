-- Incremental hardening after initial release schema. No app releases are changed.
begin;

create or replace function private.studio_is_pinned_asset_url(s text) returns boolean
language sql immutable security invoker set search_path='' as $$
  select coalesce(
    s ~ '^https://raw\.githubusercontent\.com/olympusmajoris-star/sleipnir-ai/[a-f0-9]{40}/[^?#]+$'
    and s !~ '(^|/)\.\.?(/|$)' and s !~* '%2e|%2f|%5c' and position(chr(92) in s)=0,
    false);
$$;
revoke all on function private.studio_is_pinned_asset_url(text) from public,anon;
grant execute on function private.studio_is_pinned_asset_url(text) to authenticated;

create or replace function private.studio_frozen_media_refs(v jsonb,a jsonb,media_hint boolean default false) returns boolean
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

create or replace function private.studio_frozen_assets_valid(d jsonb) returns boolean
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

update storage.buckets set allowed_mime_types = array_append(allowed_mime_types,'image/avif')
where id='studio-published-media' and allowed_mime_types is not null
  and not ('image/avif'=any(allowed_mime_types));
commit;
