create table private.studio_menu_design_heads (
 store_id uuid not null references public.stores(id) on delete cascade,
 target_kind text not null check(target_kind in ('menu','page','product')),
 target_key text not null, product_id uuid references public.products(id) on delete cascade,
 owner_id uuid not null references auth.users(id), revision integer not null default 0, published_revision integer,
 primary key(store_id,target_kind,target_key),
 check((target_kind='product')=(product_id is not null))
);
create index studio_menu_design_product on private.studio_menu_design_heads(product_id) where product_id is not null;
create index studio_menu_design_owner on private.studio_menu_design_heads(owner_id,store_id);
create table private.studio_menu_design_versions (
 store_id uuid not null,target_kind text not null,target_key text not null, revision integer not null,settings jsonb not null,
 action text not null,restored_from integer,changed_at timestamptz not null default now(),
 primary key(store_id,target_kind,target_key,revision),
 foreign key(store_id,target_kind,target_key) references private.studio_menu_design_heads on delete cascade
);
alter table private.studio_menu_design_heads enable row level security;
alter table private.studio_menu_design_versions enable row level security;
revoke all on private.studio_menu_design_heads,private.studio_menu_design_versions from public,anon,authenticated,service_role;

-- Original, approved Palm Coast stores, further limited to live menus that open in the shopper.
create function private.studio_menu_design_store(sid uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.studio_palm_coast_editor_locations(array[sid]) s
 where s.id=sid and (s.app_surface='valhalla' or s.menu_type in ('fast_food','fast_casual','sit_down')))
 and sid=any(array[
'2d8bbe31-50a6-4565-b7e7-911130bfa4fa'::uuid,
'35ef70d0-3d20-4599-96a3-648ee3c7c340'::uuid,
'5909c7b8-fedb-4d28-b6aa-64cd80e23c1f'::uuid,
'189581c9-d728-4e5d-9e02-ae4de19a15af'::uuid,
'fea775c8-8612-4f2e-bfc6-70d8e6ace6be'::uuid,
'e466b922-93f8-4126-bf2d-20a1368e84a0'::uuid,
'81e05549-bb90-4e1f-ad32-3dd21f1b7a14'::uuid,
'51c3a671-26ba-4d66-9716-de34f393eef7'::uuid,
'0600cb61-45f9-402b-a209-134abdaef10f'::uuid,
'fdb925c1-8dd3-4e46-b98e-87c0658e6ed7'::uuid,
'1940c914-9174-4e2e-b15f-8044ad018644'::uuid,
'0acd38cb-82d6-4635-aa43-5dab357bbd3e'::uuid,
'97ee0302-4e97-4e74-aaca-9fd64d3cd35f'::uuid,
'168323a0-1eb9-44c4-9769-b40b8dfbe72a'::uuid,
'03dbd8fa-ed64-4236-85be-206c952da024'::uuid,
'5d091d4a-b0dd-4de1-9fe3-5ce974d3d22e'::uuid,
'7f3b0214-bfcb-43da-83cd-b7c24cba51cb'::uuid,
'9d8b5e41-aba3-42c1-9250-956e585230e0'::uuid,
'e5a01340-424a-4a41-b0e6-99cb9e944733'::uuid,
'26cf8931-69ba-47f8-a471-61a1250a0ded'::uuid,
'30fcc2c8-e1d7-4351-b2f2-56d0eab7086b'::uuid,
'ee9f9732-5287-43e5-bf68-3d124b2ff09d'::uuid,
'26b05ad5-1d42-40de-8d1a-f204443c8565'::uuid,
'd7b73397-bc46-450b-a2f0-0990a66902d5'::uuid,
'41fefb5a-42d2-4eff-829e-d30661711259'::uuid,
'4bb8cb5d-c64d-4efd-a0dd-9ee397cc61a4'::uuid,
'd18dedd7-7d90-4b73-be85-21b6e1a697af'::uuid,
'e242e324-4b0c-4ff8-ae09-982aac884cea'::uuid,
'79377a42-fde7-40a4-b8d1-4bfc78d76bcb'::uuid,
'46ece11c-d9ef-4f61-b40d-895c1d5ac450'::uuid,
'71ceefd9-1afe-41b6-82bc-43dabfe0f9eb'::uuid,
'89ff69c2-59b2-4c47-870f-00309ff0e0b9'::uuid,
'ffd58857-dd29-4da2-b115-c2ec5ad5551c'::uuid,
'7fa8bc01-81ca-4f96-8799-ec93128a5196'::uuid,
'ecc12829-1534-48a5-9ebd-01279c3d1195'::uuid,
'9ad1500e-886a-42db-9523-9813862f1fcf'::uuid,
'a3358438-9b8d-4c8f-9a24-615924d32e50'::uuid,
'c7c44238-b870-4bad-a293-d399eb334672'::uuid,
'21eeb181-e333-4d45-ab10-563efb1500d3'::uuid,
'2b145836-6d20-43dc-b01e-373c88c5aead'::uuid,
'5ada4f71-6a2c-470a-aa99-8df2550cbcca'::uuid,
'64ebe91a-2508-4e8f-b078-27eae69237c1'::uuid,
'69a53984-05ee-47a8-ae1d-282c65033dec'::uuid,
'a5b1f9cd-5114-4dae-bb3e-381ed912c8db'::uuid,
'610a66ac-c917-41cb-81a2-7ec4b7672c8d'::uuid,
'fcddec3d-afbb-4033-8cb7-92e68584ad80'::uuid,
'89e20d57-c44e-4718-9ebc-1bf671f3955d'::uuid,
'3c9adfe6-8060-427e-9d08-9677cbe0ade6'::uuid,
'6e53eb95-502f-4521-b43c-924d86d00239'::uuid,
'0b9be320-2db0-4458-b94e-476cbc50d5f9'::uuid,
'ba38967a-45b0-49b4-9830-5e5bdc2ba04b'::uuid,
'd220fd84-31c7-4710-a48c-6d10b73ed5b7'::uuid,
'0a7a3411-3c6a-4a43-9b87-e48b22b05cf3'::uuid,
'9dbeba74-d411-4289-920f-00b6c24fb5b7'::uuid,
'404feaf2-d40d-4d1c-81a0-b357cbb2d5fb'::uuid,
'3efc3392-020b-43c9-822c-85a8309bb705'::uuid,
'282f9564-1b1d-4cb8-9c2e-ba9c962a1ef7'::uuid,
'8d687884-4576-4fb2-a9bb-03df08a2c5bc'::uuid,
'daf5b3e3-d19d-4409-ae9f-e6e499bce227'::uuid,
'ee313df1-44c2-4549-af87-3c1e5c762d08'::uuid,
'fc3938ea-13a4-4382-a98c-13dd945ded68'::uuid,
'f8f2c007-4e73-4f82-ab36-72c1026de112'::uuid,
'e878a96d-a744-4d2a-a16f-67b97fb5183d'::uuid,
'07fd76aa-9a3e-460d-8ead-4d4ec807d978'::uuid,
'a5f6604f-9ac0-4819-9822-f6f71abb1c9b'::uuid,
'5ed16fbc-7c88-434b-82e2-aa2ab0513ac9'::uuid,
'e7fd5d71-0cbb-4423-ad1c-60ce92e84c12'::uuid,
'8f94c0df-d958-4a5f-973e-1a76ddfc050e'::uuid,
'15540994-9d0f-4f0d-a371-6bec13c1fbf3'::uuid,
'3eb517cb-1328-4e94-a73e-68ed48398c7d'::uuid,
'2e1cbe2d-ef15-42f4-9ea4-c5b6e9d99a6f'::uuid,
'86a231cb-1138-44f0-877e-7c9e002523db'::uuid,
'b1da9e55-f933-470a-a863-21ad27492166'::uuid,
'9931a6d5-d20f-4e4c-9c69-4b80f5468cfa'::uuid,
'bdca006b-9241-4cc6-817a-3aad9c947dab'::uuid,
'0aa79ffb-a72a-491d-9baa-ca5a7bfb71c6'::uuid,
'8f6550fd-4bcc-4f4e-9b42-dfd1297a257b'::uuid,
'3d6f7e41-3638-4b43-a838-beefe1ca8f5c'::uuid,
'58da7064-b310-4886-81c6-6fa841f34a54'::uuid,
'e70b08e2-75f7-480f-ac14-2bc70f6abdbc'::uuid,
'74e24014-a822-45f5-ac3b-9f24ea71488d'::uuid,
'a05ff3fe-1a45-4f6d-a1e5-170094f9b3e7'::uuid,
'5e3bd22e-d702-4752-b07a-5ead492d7764'::uuid,
'fb570030-97cf-4b46-b426-9974796adb06'::uuid,
'd3ad1ec5-bd09-4579-94b8-d85622d687cb'::uuid,
'a3495ce5-d61e-435d-979a-cc7d76b90e61'::uuid,
'2f1f83e5-7440-444f-9fce-4a569281becd'::uuid,
'019a74b8-78c9-495b-9212-20da3f0d54eb'::uuid,
'e0d25d4e-81c7-4f72-8427-37602cfaaf7a'::uuid,
'81449e6f-fe90-4b14-8531-781c99f15892'::uuid,
'c33a56ce-b74d-4cb2-8fb6-2b9d4f43e206'::uuid,
'8387b060-6308-4fb3-9c41-386d73f53e19'::uuid,
'63c2a490-15ea-4d3d-8d09-69c2a0f60dfb'::uuid,
'4976e761-5e89-4a9e-805b-e36b3cab7a6e'::uuid,
'30dd81a7-bb35-4d97-bb37-51291524312c'::uuid,
'c6ce15b5-05b8-4129-a50e-24bbc9736519'::uuid,
'b53131eb-dec6-4f39-bdf6-3586eb20094c'::uuid,
'6c976bce-b53f-4cc2-a112-c7b1ae37a5d3'::uuid,
'a8d0285d-043e-4be3-b39b-58f78857b59b'::uuid,
'fa7af0ad-2a1f-4ad1-8ec2-36ad94c10e25'::uuid,
'36d1ada2-3633-4148-b025-679f62d6e0f4'::uuid,
'cd4abecc-d151-420f-bcfa-7479edd2c0a9'::uuid,
'4d38c045-9790-4f0d-8aec-5c7df9c2a6df'::uuid,
'e94d91f3-c0c9-474c-91ba-8795bbfd6680'::uuid,
'1c0deab1-39b8-43a9-8f2f-d4d4c324fee8'::uuid,
'5c8c0004-1668-439f-a4b0-d955c1d7a5f5'::uuid,
'72b8b162-6795-439b-bf29-634ad5f839ab'::uuid,
'1b11c0ec-87a2-4ec7-8a9d-e8f1a83f0057'::uuid,
'7bc6802d-ff8c-4239-a5ea-e49a7c8d0651'::uuid,
'c141f0dc-e3e7-410a-b9ab-bc2f9219c640'::uuid,
'6097455d-e5f2-4758-aeff-5575c34c44c4'::uuid,
'25ecabff-a920-4a40-8154-ddc611fee9a1'::uuid,
'4faacdd3-0b03-4562-83d9-aa9e455aa0a4'::uuid,
'0cf51aa1-a6ce-40e4-bf46-77dce0cf8fc2'::uuid,
'9b21b5ab-47e8-46bf-9761-5ad1681ad9f4'::uuid,
'1a7783b9-8401-4775-a636-00ee9ce794cc'::uuid,
'b47563fd-d29f-4982-a105-ae3ed317a85f'::uuid,
'b03a4a06-c30b-414c-97e5-67cd1f9f083e'::uuid,
'00726d7d-d415-482e-93bf-e76f56ec4c39'::uuid,
'07212d88-d34c-4444-b1b6-d042f8cf56c2'::uuid,
'baef9153-11ed-4a50-a521-9fd459bac647'::uuid,
'94057899-1f2e-41e6-b2db-f2e059cba0da'::uuid]);
$$;

create function private.studio_menu_target(sid uuid,kind text,key text) returns boolean language plpgsql stable set search_path='' as $$
begin
 if kind='menu' then return key='menu';end if;
 if kind='product' then
  return key ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' and exists(select 1 from public.products p where p.id=key::uuid and p.store_id=sid);
 end if;
 if kind='page' and key like 'category:%' then
  return exists(select 1 from public.products p where p.store_id=sid and p.category=substr(key,10))
     or exists(select 1 from public.valhalla_live_menu m where m.store_id=sid and m.category=substr(key,10));
 elsif kind='page' and key like 'board:%' then
  return exists(select 1 from public.store_board_panels b where b.store_id=sid and key='board:'||b.daypart||':'||b.panel_no::text and b.image_url<>'');
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;

-- Private draft bytes. Files are promoted to the public bucket only during an explicit publish.
insert into storage.buckets(id,name,public,allowed_mime_types) values
 ('studio-menu-drafts','studio-menu-drafts',false,array['image/png','image/jpeg','image/webp','image/avif']),
 ('studio-menu-published','studio-menu-published',true,array['image/png','image/jpeg','image/webp','image/avif']);
create function private.studio_menu_photo_prefix() returns text language sql immutable set search_path='' as $$
 select 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/studio-menu-published/'::text
$$;
create function private.studio_menu_photo_path(sid uuid,kind text,key text,url text) returns text language plpgsql immutable set search_path='' as $$
declare prefix text:=private.studio_menu_photo_prefix(); path text; folder text:=sid::text||case when kind='product' then '/product/'||key||'/' else '/menu/' end;
begin
 if not starts_with(url,prefix) then return null;end if;
 path:=substr(url,length(prefix)+1);
 if not starts_with(path,folder) or substr(path,length(folder)+1) !~ '^[a-f0-9]{64}[.](png|jpg|webp|avif)$' then return null;end if;
 return path;
end $$;
create function private.studio_menu_upload_allowed(bucket text,path text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare pieces text[]:=string_to_array(path,'/');sid uuid; key text; kind text;actor uuid:=auth.uid(); url text;
begin
 if actor is null or not private.studio_is_publisher() or bucket not in ('studio-menu-drafts','studio-menu-published') then return false;end if;
 sid:=pieces[1]::uuid;kind:=pieces[2];key:=case when kind='product' then pieces[3] else 'menu' end;
 url:=private.studio_menu_photo_prefix()||path;
 if kind not in ('product','menu') or private.studio_menu_photo_path(sid,kind,key,url) is null or not private.studio_menu_design_store(sid)
   or not private.studio_menu_target(sid,kind,key) then return false;end if;
 if bucket='studio-menu-drafts' then return true;end if;
 return exists(select 1 from storage.objects o where o.bucket_id='studio-menu-drafts' and o.name=path and o.owner_id=actor::text)
   and exists(select 1 from private.studio_menu_design_heads h join private.studio_menu_design_versions v using(store_id,target_kind,target_key)
     where h.store_id=sid and h.owner_id=actor and v.revision=h.revision and (v.settings->>'photo_url'=url or v.settings->>'background_url'=url));
exception when invalid_text_representation then return false;
end $$;
create policy studio_menu_upload on storage.objects for insert to authenticated
 with check(bucket_id in ('studio-menu-drafts','studio-menu-published') and private.studio_menu_upload_allowed(bucket_id,name));
create policy studio_menu_upload_boundary on storage.objects as restrictive for insert to anon,authenticated
 with check(bucket_id not in ('studio-menu-drafts','studio-menu-published') or private.studio_menu_upload_allowed(bucket_id,name));
create policy studio_menu_draft_bytes_owner on storage.objects for select to authenticated
 using(bucket_id='studio-menu-drafts' and owner_id=(select auth.uid())::text and (select private.studio_is_publisher()));
create policy studio_menu_public_bytes on storage.objects for select to authenticated,anon using(bucket_id='studio-menu-published');
create policy studio_menu_draft_bytes_boundary on storage.objects as restrictive for select to anon,authenticated
 using(bucket_id<>'studio-menu-drafts' or owner_id=(select auth.uid())::text);
create policy studio_menu_objects_immutable on storage.objects as restrictive for update to anon,authenticated
 using(bucket_id not in ('studio-menu-drafts','studio-menu-published')) with check(bucket_id not in ('studio-menu-drafts','studio-menu-published'));
create policy studio_menu_objects_keep on storage.objects as restrictive for delete to anon,authenticated
 using(bucket_id not in ('studio-menu-drafts','studio-menu-published'));

create function private.studio_menu_settings(sid uuid,kind text,key text,settings jsonb,releasing boolean) returns void
language plpgsql stable set search_path='' as $$
declare k text;v jsonb;t text;path text;bound numeric;
begin
 if jsonb_typeof(settings) is distinct from 'object' then raise exception using errcode='22023',message='Menu settings must be an object.';end if;
 for k,v in select * from jsonb_each(settings) loop
  t:=v#>>'{}';
  if (kind='product' and k not in ('mode','photo_url','fit','x','y','zoom')) or
    (kind<>'product' and k not in ('background_url','background_color','ink_color','heading_color','accent','title','body','fit','x','y','zoom')) then
    raise exception using errcode='22023',message='This setting does not apply to this menu component.';end if;
  if k in ('x','y','zoom') then
    if jsonb_typeof(v)<>'number' then raise exception using errcode='22023',message='Invalid photo placement.';end if;
    bound:=t::numeric;
    if (k='zoom' and bound not between .5 and 4) or (k<>'zoom' and bound not between -1 and 1) then raise exception using errcode='22023',message='Photo placement is outside its range.';end if;
  elsif jsonb_typeof(v)<>'string' or (k in ('background_color','ink_color','heading_color','accent') and t !~ '^#[0-9a-fA-F]{6}$')
    or (k='mode' and t not in ('catalog','custom','hidden')) or(k='fit' and t not in ('cover','contain')) or(k='title' and length(t)>200) or(k='body' and length(t)>2000)
    then raise exception using errcode='22023',message='Invalid menu appearance setting.';end if;
  if k in ('photo_url','background_url') and t<>'' then
   path:=private.studio_menu_photo_path(sid,kind,key,t);
   if path is null or not exists(select 1 from storage.objects o where o.name=path and
      (o.bucket_id='studio-menu-published' or (not releasing and o.bucket_id='studio-menu-drafts' and o.owner_id=auth.uid()::text))) then
     raise exception using errcode='22023',message='Upload and verify the scoped menu image before applying it.';end if;
  end if;
 end loop;
 if kind='product' and settings->>'mode'='custom' and coalesce(settings->>'photo_url','')='' then raise exception using errcode='22023',message='Choose the custom dish photo.';end if;
end $$;

create function private.studio_menu_state(sid uuid,kind text,key text) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('store_id',h.store_id,'target_kind',h.target_kind,'target_key',h.target_key,'product_id',h.product_id,'revision',h.revision,
  'published_revision',h.published_revision,'settings',v.settings,'history',(select jsonb_agg(jsonb_build_object('revision',r.revision,'action',r.action,
  'changed_at',r.changed_at,'restored_from',r.restored_from) order by r.revision desc) from private.studio_menu_design_versions r where (r.store_id,r.target_kind,r.target_key)=(sid,kind,key)))
 from private.studio_menu_design_heads h join private.studio_menu_design_versions v using(store_id,target_kind,target_key)
 where (h.store_id,h.target_kind,h.target_key)=(sid,kind,key) and h.revision=v.revision;
$$;
create function private.studio_menu_change(op text,sid uuid,kind text,key text,expected integer,settings jsonb default null,restore integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h private.studio_menu_design_heads%rowtype; actor uuid:=auth.uid();next_revision integer;
begin
 if actor is null or not private.studio_is_publisher() then raise exception using errcode='42501',message='Publisher access required.';end if;
 if expected is null or expected<0 or not private.studio_menu_design_store(sid) or not coalesce(private.studio_menu_target(sid,kind,key),false)
    or op is null or op not in ('save','publish','unpublish','revert') then raise exception using errcode='22023',message='Unknown store or menu component.';end if;
 if op='save' and expected=0 then insert into private.studio_menu_design_heads(store_id,target_kind,target_key,product_id,owner_id)
  values(sid,kind,key,case when kind='product' then key::uuid end,actor) on conflict do nothing;end if;
 select * into h from private.studio_menu_design_heads where (store_id,target_kind,target_key)=(sid,kind,key) and owner_id=actor for update;
 if not found then raise exception using errcode='42501',message='The menu design is unavailable to this publisher.';end if;
 if h.revision<>expected then raise exception using errcode='PT409',message='A newer menu revision exists. Reload the draft.';end if;
 if (op='publish' and h.revision=h.published_revision) or (op='unpublish' and h.published_revision is null) then return private.studio_menu_state(sid,kind,key);end if;
 if op<>'save' then
   select v.settings into settings from private.studio_menu_design_versions v where (v.store_id,v.target_kind,v.target_key)=(sid,kind,key)
     and v.revision=case when op='revert' then restore else h.revision end;
   if not found then raise exception using errcode='22023',message='Unknown menu revision.';end if;
 end if;
 if op<>'unpublish' then perform private.studio_menu_settings(sid,kind,key,settings,op='publish');end if;
 next_revision:=h.revision+1;
 insert into private.studio_menu_design_versions(store_id,target_kind,target_key,revision,settings,action,restored_from)
 values(sid,kind,key,next_revision,settings,op,case when op='revert' then restore end);
 update private.studio_menu_design_heads set revision=next_revision,published_revision=case when op='publish' then next_revision when op='unpublish' then null else h.published_revision end
 where (store_id,target_kind,target_key)=(sid,kind,key);
 return private.studio_menu_state(sid,kind,key);
end $$;
create function private.studio_menu_visible(sid uuid) returns table(store_id uuid,target_kind text,target_key text,product_id uuid,settings jsonb,published_revision integer)
language sql stable security definer set search_path='' as $$
 select h.store_id,h.target_kind,h.target_key,h.product_id,v.settings,h.published_revision
 from private.studio_menu_design_heads h join private.studio_menu_design_versions v using(store_id,target_kind,target_key)
 where h.store_id=sid and v.revision=h.published_revision and private.studio_menu_design_store(sid)
 and (h.product_id is null or exists(select 1 from public.products p where p.id=h.product_id and p.store_id=h.store_id))
 order by h.target_kind,h.target_key;
$$;
create function private.studio_menu_owned(sid uuid) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.studio_is_publisher() then raise exception using errcode='42501',message='Publisher access required.';end if;
 return query select private.studio_menu_state(sid,h.target_kind,h.target_key) from private.studio_menu_design_heads h
   where h.store_id=sid and h.owner_id=auth.uid() and private.studio_menu_design_store(sid) order by h.target_kind,h.target_key;
end $$;
create function public.studio_menu_designs(p_store_id uuid) returns table(store_id uuid,target_kind text,target_key text,product_id uuid,settings jsonb,published_revision integer)
language sql stable security invoker set search_path='' begin atomic select * from private.studio_menu_visible(p_store_id);end;
create function public.studio_menu_design_drafts(p_store_id uuid) returns setof jsonb
language sql stable security invoker set search_path='' begin atomic select * from private.studio_menu_owned(p_store_id);end;
create function public.studio_menu_design_save(p_store_id uuid,p_target_kind text,p_target_key text,p_expected_revision integer,p_settings jsonb) returns jsonb
language sql security invoker set search_path='' begin atomic select private.studio_menu_change('save',p_store_id,p_target_kind,p_target_key,p_expected_revision,p_settings);end;
create function public.studio_menu_design_publish(p_store_id uuid,p_target_kind text,p_target_key text,p_expected_revision integer) returns jsonb
language sql security invoker set search_path='' begin atomic select private.studio_menu_change('publish',p_store_id,p_target_kind,p_target_key,p_expected_revision);end;
create function public.studio_menu_design_unpublish(p_store_id uuid,p_target_kind text,p_target_key text,p_expected_revision integer) returns jsonb
language sql security invoker set search_path='' begin atomic select private.studio_menu_change('unpublish',p_store_id,p_target_kind,p_target_key,p_expected_revision);end;
create function public.studio_menu_design_revert(p_store_id uuid,p_target_kind text,p_target_key text,p_expected_revision integer,p_target_revision integer) returns jsonb
language sql security invoker set search_path='' begin atomic select private.studio_menu_change('revert',p_store_id,p_target_kind,p_target_key,p_expected_revision,null,p_target_revision);end;
revoke all on function private.studio_menu_design_store(uuid),private.studio_menu_target(uuid,text,text),private.studio_menu_photo_prefix(),
 private.studio_menu_photo_path(uuid,text,text,text),private.studio_menu_upload_allowed(text,text),private.studio_menu_settings(uuid,text,text,jsonb,boolean),
 private.studio_menu_state(uuid,text,text),private.studio_menu_change(text,uuid,text,text,integer,jsonb,integer),private.studio_menu_owned(uuid),private.studio_menu_visible(uuid),
 public.studio_menu_designs(uuid),public.studio_menu_design_drafts(uuid),public.studio_menu_design_save(uuid,text,text,integer,jsonb),public.studio_menu_design_publish(uuid,text,text,integer),
 public.studio_menu_design_unpublish(uuid,text,text,integer),public.studio_menu_design_revert(uuid,text,text,integer,integer)
 from public,anon,authenticated,service_role;
grant execute on function private.studio_menu_visible(uuid),public.studio_menu_designs(uuid),private.studio_menu_upload_allowed(text,text) to anon,authenticated;
grant execute on function private.studio_menu_change(text,uuid,text,text,integer,jsonb,integer),private.studio_menu_owned(uuid),public.studio_menu_design_drafts(uuid),
 public.studio_menu_design_save(uuid,text,text,integer,jsonb),public.studio_menu_design_publish(uuid,text,text,integer),
 public.studio_menu_design_unpublish(uuid,text,text,integer),public.studio_menu_design_revert(uuid,text,text,integer,integer) to authenticated;
notify pgrst,'reload schema';
