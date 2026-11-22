-- The public reader only projects the approved Palm Coast scene. Drafts and publication history are private.
create table private.studio_valhalla_street_design (
    singleton boolean primary key default true check (singleton),
    draft jsonb not null default '{}'::jsonb,
    draft_revision bigint not null default 0 check (draft_revision >= 0),
    draft_by uuid,
    draft_at timestamptz,
    published jsonb not null default '{}'::jsonb,
    published_revision bigint not null default 0 check (published_revision >= 0),
    published_by uuid,
    published_at timestamptz
);
create table private.studio_valhalla_street_releases (
    revision bigint primary key,
    settings jsonb not null,
    published_by uuid not null,
    published_at timestamptz not null default clock_timestamp()
);
alter table private.studio_valhalla_street_design enable row level security;
alter table private.studio_valhalla_street_releases enable row level security;
revoke all on private.studio_valhalla_street_design,private.studio_valhalla_street_releases from public,anon,authenticated;

create function private.studio_valhalla_street_ids() returns uuid[]
language sql stable security invoker set search_path='' as $$
    select coalesce(array_agg(v.store_id order by v.sort_order nulls last,v.store_id),'{}'::uuid[])
    from public.valhalla_stores v
    join public.studio_palm_coast_street_menu_counts_v m on m.store_id=v.store_id
    join public.stores s on s.id=v.store_id and s.is_live
    where v.is_active and lower(btrim(v.city))='palm coast' and m.orderable_items>0
$$;
create function private.studio_street_number(j jsonb,k text,lo numeric,hi numeric,whole boolean default false) returns boolean
language sql immutable security invoker set search_path='' as $$
 select case when not j?k then true when jsonb_typeof(j->k)<>'number' then false
             else (j->>k)::numeric between lo and hi and (not whole or trunc((j->>k)::numeric)=(j->>k)::numeric) end
$$;
create function private.studio_street_media(j jsonb,optional boolean default false) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare raw text; key text; bucket_name text; object_name text;
        origin constant text:='https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/';
        prefix constant text:='/storage/v1/object/public/';
begin
 if j is null then return optional;end if;
 if jsonb_typeof(j)<>'string' then return false;end if;
 raw:=j#>>'{}';
 if raw='' then return optional;end if;
 if length(raw)>2000 or raw~'[[:cntrl:]?#]' or position(chr(92) in raw)>0 then return false;end if;
 if starts_with(raw,origin) then key:=substr(raw,length(origin)+1);
 elsif starts_with(raw,prefix) then key:=substr(raw,length(prefix)+1);
 elsif starts_with(raw,substr(prefix,2)) then key:=substr(raw,length(prefix));
 elsif raw!~'^(/|[a-zA-Z][a-zA-Z0-9+.-]*:)' then key:=raw;
 else return false;end if;
 -- Decode ordinary filename characters only. Encoded separators, traversal and nested encodings never resolve.
 key:=replace(replace(replace(replace(replace(key,'%20',' '),'%28','('),'%29',')'),'%2C',','),'%2c',',');
 if key~'(^|/)[.]{1,2}(/|$)' or key~'//|%' or key!~*'[.](png|jpe?g|webp|avif|gif)$' then return false;end if;
 bucket_name:=split_part(key,'/',1);object_name:=substr(key,length(bucket_name)+2);
 if not bucket_name=any(array['studio-published-media','studio','menu-images','Vahalla bg','Vahalla icons','asgard','asgard_ui','raven_earth','business logos','logos','Homepage logos','slei-logo'])
    or object_name='' then return false;end if;
 return exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id and b.public
               where o.bucket_id=bucket_name and o.name=object_name);
end $$;
create function private.studio_street_tag(j jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_typeof(j)='object' and jsonb_typeof(j->'id')='string' and (j->>'id')~'^[A-Za-z0-9_-]{1,96}$'
    and (not j?'label' or (jsonb_typeof(j->'label')='string' and length(j->>'label')<=300)),false)
$$;
create function private.studio_validate_street(j jsonb,ids uuid[]) returns void
language plpgsql stable security invoker set search_path='' as $$
declare f record; w jsonb; sky jsonb; ad jsonb; seen text[]; i integer;
begin
 if j is null or jsonb_typeof(j)<>'object' or octet_length(j::text)>524288 or (j-array['sky','curb_y','fronts','ads'])<>'{}'::jsonb
    or not private.studio_street_number(j,'curb_y',.4,.95) then
    raise exception using errcode='22023',message='Invalid Palm Coast street settings or curb position.';end if;
 if j?'sky' then
    sky:=j->'sky';
    if jsonb_typeof(sky)<>'object' or (sky-array['day_url','night_url','day_start','night_start'])<>'{}'::jsonb
       or not private.studio_street_number(sky,'day_start',0,23,true) or not private.studio_street_number(sky,'night_start',0,23,true)
       or not private.studio_street_media(sky->'day_url',true) or not private.studio_street_media(sky->'night_url',true) then
       raise exception using errcode='22023',message='Use a published sky image and local hours between 0 and 23.';end if;
 end if;
 if j?'fronts' then
  if jsonb_typeof(j->'fronts')<>'object' then raise exception using errcode='22023',message='Facade settings require a store ID.';end if;
  for f in select * from jsonb_each(j->'fronts') loop
   if not f.key=any(ids::text[]) or jsonb_typeof(f.value)<>'object'
      or (f.value-array['scale','offset_x','offset_y','source_curb_y','windows'])<>'{}'::jsonb
      or not private.studio_street_number(f.value,'scale',.5,2)
      or not private.studio_street_number(f.value,'offset_x',-.4,.4)
      or not private.studio_street_number(f.value,'offset_y',-.4,.4)
      or not private.studio_street_number(f.value,'source_curb_y',0,1) then
      raise exception using errcode='22023',message='The facade must be an eligible Palm Coast store with valid placement.';end if;
   if f.value?'windows' then
    if jsonb_typeof(f.value->'windows')<>'array' then raise exception using errcode='22023',message='Window ads must be an array.';end if;
    seen:='{}'::text[];
    for w in select value from jsonb_array_elements(f.value->'windows') loop
     if not private.studio_street_tag(w) or (w->>'id')=any(seen) or not(w?&array['id','image_url','x','y','w','h'])
        or (w-array['id','image_url','label','x','y','w','h'])<>'{}'::jsonb
        or not private.studio_street_media(w->'image_url')
        or not private.studio_street_number(w,'x',0,1) or not private.studio_street_number(w,'y',0,1)
        or not private.studio_street_number(w,'w',0,1) or not private.studio_street_number(w,'h',0,1) then
        raise exception using errcode='22023',message='Window ads require a unique ID, a published image and a normalized rectangle.';end if;
     if (w->>'w')::numeric=0 or (w->>'h')::numeric=0 or (w->>'x')::numeric+(w->>'w')::numeric>1 or (w->>'y')::numeric+(w->>'h')::numeric>1 then
        raise exception using errcode='22023',message='The window ad must fit within its facade.';end if;
     seen:=array_append(seen,w->>'id');
    end loop;
   end if;
  end loop;
 end if;
 if j?'ads' then
  if jsonb_typeof(j->'ads')<>'array' then raise exception using errcode='22023',message='Street ads must be an ordered array.';end if;
  seen:='{}'::text[];
  for ad in select value from jsonb_array_elements(j->'ads') loop
   i:=array_position(ids::text[],ad->>'after_store_id');
   if not private.studio_street_tag(ad) or (ad->>'id')=any(seen) or (ad-array['id','after_store_id','before_store_id','image_url','label'])<>'{}'::jsonb
      or not(ad?&array['id','after_store_id','before_store_id','image_url'])
      or jsonb_typeof(ad->'after_store_id')<>'string' or jsonb_typeof(ad->'before_store_id')<>'string'
      or i is null or ids[i+1]::text is distinct from ad->>'before_store_id' or not private.studio_street_media(ad->'image_url') then
      raise exception using errcode='22023',message='Each street ad requires two adjacent eligible merchants, a unique ID and a published image.';end if;
   seen:=array_append(seen,ad->>'id');
  end loop;
 end if;
end $$;
create function private.studio_street_active_settings(j jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ids text[]; active jsonb;
begin
 if not(j?'fronts' or j?'ads') then return j;end if;
 ids:=private.studio_valhalla_street_ids()::text[];
 if j?'fronts' then
  select coalesce(jsonb_object_agg(f.key,f.value),'{}'::jsonb) into active from jsonb_each(j->'fronts') f where f.key=any(ids);
  j:=jsonb_set(j,'{fronts}',active);
 end if;
 if j?'ads' then
  select coalesce(jsonb_agg(a.value order by a.ordinality),'[]'::jsonb) into active from jsonb_array_elements(j->'ads') with ordinality a
   where array_position(ids,a.value->>'after_store_id') is not null
     and ids[array_position(ids,a.value->>'after_store_id')+1]=a.value->>'before_store_id';
  j:=jsonb_set(j,'{ads}',active);
 end if;
 return j;
end $$;
create function private.studio_street_read(p_draft boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r private.studio_valhalla_street_design%rowtype;
begin
 if p_draft then perform private.studio_grocery_require_editor();end if;
 select * into r from private.studio_valhalla_street_design where singleton;
 if p_draft then return jsonb_build_object('version',1,'revision',coalesce(r.draft_revision,0),'published_revision',coalesce(r.published_revision,0),'settings',coalesce(r.draft,'{}'::jsonb));end if;
 return jsonb_build_object('version',1,'revision',coalesce(r.published_revision,0),'settings',private.studio_street_active_settings(coalesce(r.published,'{}'::jsonb)));
end $$;
create function public.studio_valhalla_street_published() returns jsonb
language sql stable security invoker set search_path='' begin atomic select private.studio_street_read(false); end;
create function public.studio_valhalla_street_draft() returns jsonb
language sql stable security invoker set search_path='' begin atomic select private.studio_street_read(true); end;
create function private.studio_save_valhalla_street_draft(p_settings jsonb,p_expected_revision bigint) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare who uuid:=private.studio_grocery_require_editor();r private.studio_valhalla_street_design%rowtype;
begin
 perform private.studio_validate_street(p_settings,private.studio_valhalla_street_ids());
 insert into private.studio_valhalla_street_design(singleton) values(true) on conflict do nothing;
 select * into strict r from private.studio_valhalla_street_design where singleton for update;
 if p_expected_revision is distinct from r.draft_revision then raise exception using errcode='PT409',message='The street draft changed. Load its current revision before saving.';end if;
 if p_settings is distinct from r.draft then
  update private.studio_valhalla_street_design set draft=p_settings,draft_revision=r.draft_revision+1,draft_by=who,draft_at=clock_timestamp() where singleton returning * into r;
 end if;
 return jsonb_build_object('version',1,'revision',r.draft_revision,'published_revision',r.published_revision,'settings',r.draft);
end $$;
create function private.studio_publish_valhalla_street(p_expected_draft_revision bigint,p_expected_published_revision bigint) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare who uuid:=private.studio_grocery_require_editor();r private.studio_valhalla_street_design%rowtype;
begin
 select * into r from private.studio_valhalla_street_design where singleton for update;
 if not found then raise exception using errcode='PT409',message='Save the street draft before publishing.';end if;
 if r.draft_revision is distinct from p_expected_draft_revision or r.published_revision is distinct from p_expected_published_revision then
  raise exception using errcode='PT409',message='The street draft or publication changed. Reload before publishing.';end if;
 perform private.studio_validate_street(r.draft,private.studio_valhalla_street_ids());
 if r.published is distinct from r.draft then
  update private.studio_valhalla_street_design set published=r.draft,published_revision=r.published_revision+1,published_by=who,published_at=clock_timestamp() where singleton returning * into r;
  insert into private.studio_valhalla_street_releases(revision,settings,published_by,published_at) values(r.published_revision,r.published,who,r.published_at);
 end if;
 return jsonb_build_object('version',1,'revision',r.published_revision,'settings',r.published);
end $$;

create function public.studio_save_valhalla_street_draft(p_settings jsonb,p_expected_revision bigint) returns jsonb
language sql volatile security invoker set search_path='' begin atomic select private.studio_save_valhalla_street_draft(p_settings,p_expected_revision); end;
create function public.studio_publish_valhalla_street(p_expected_draft_revision bigint,p_expected_published_revision bigint) returns jsonb
language sql volatile security invoker set search_path='' begin atomic select private.studio_publish_valhalla_street(p_expected_draft_revision,p_expected_published_revision); end;

revoke all on function private.studio_valhalla_street_ids(),private.studio_street_number(jsonb,text,numeric,numeric,boolean),private.studio_street_media(jsonb,boolean),
 private.studio_street_tag(jsonb),private.studio_validate_street(jsonb,uuid[]),private.studio_street_active_settings(jsonb),private.studio_street_read(boolean),
 private.studio_save_valhalla_street_draft(jsonb,bigint),private.studio_publish_valhalla_street(bigint,bigint),
 public.studio_valhalla_street_published(),public.studio_valhalla_street_draft(),public.studio_save_valhalla_street_draft(jsonb,bigint),public.studio_publish_valhalla_street(bigint,bigint) from public,anon,authenticated,service_role;
grant execute on function private.studio_street_read(boolean),public.studio_valhalla_street_published() to anon,authenticated;
grant execute on function private.studio_save_valhalla_street_draft(jsonb,bigint),private.studio_publish_valhalla_street(bigint,bigint),public.studio_valhalla_street_draft(),public.studio_save_valhalla_street_draft(jsonb,bigint),public.studio_publish_valhalla_street(bigint,bigint) to authenticated;
notify pgrst,'reload schema';
