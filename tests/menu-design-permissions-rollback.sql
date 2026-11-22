begin;
do $test$
declare actor uuid; store uuid; sku uuid; other_sku uuid;
begin
 select user_id into strict actor from private.studio_publishers limit 1;
 -- A real in-app Palm Coast restaurant; the test rolls back both its settings and Storage metadata.
 store:='3eb517cb-1328-4e94-a73e-68ed48398c7d';
 select id into strict sku from public.products where store_id=store order by id limit 1;
 select id into strict other_sku from public.products where store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' order by id limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('menutest.store',store::text,true);perform set_config('menutest.sku',sku::text,true);
 perform set_config('menutest.other_sku',other_sku::text,true);perform set_config('menutest.actor',actor::text,true);
end $test$;
set local role authenticated;
do $test$
declare sid uuid:=current_setting('menutest.store')::uuid; sku text:=current_setting('menutest.sku'); other_sku text:=current_setting('menutest.other_sku');
 path text:=sid::text||'/product/'||sku||'/'||repeat('a',64)||'.png';
 url text:='https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/studio-menu-published/'||path;
 actor uuid:=current_setting('menutest.actor')::uuid; r jsonb;
begin
 begin perform public.studio_menu_design_save(sid,'product',other_sku,0,'{"mode":"hidden"}');raise 'Foreign SKU accepted';exception when sqlstate '22023' then null;end;
 begin perform public.studio_menu_design_save('35ef70d0-3d20-4599-96a3-648ee3c7c340','menu','menu',0,'{}');raise 'Grocery admitted to menu';exception when sqlstate '22023' then null;end;
 begin perform public.studio_menu_design_save(sid,'page','category:No such menu section',0,'{}');raise 'Missing native section';exception when sqlstate '22023' then null;end;
 begin perform public.studio_menu_design_save(sid,'product',sku,0,'{"mode":"custom","photo_url":"https://example.com/soup.jpg"}');raise 'External photo accepted';exception when sqlstate '22023' then null;end;
 begin perform public.studio_menu_design_save(sid,'product',sku,0,'{"price":4.15}');raise 'Catalog price override accepted';exception when sqlstate '22023' then null;end;
 if private.studio_menu_upload_allowed('studio-menu-published',path) then raise 'Orphan public upload allowed';end if;
 if private.studio_menu_upload_allowed('studio-menu-drafts',replace(path,sku,other_sku)) then raise 'Foreign SKU upload allowed';end if;
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('studio-menu-drafts',path,actor::text,'{"mimetype":"image/png","size":123}');
 r:=public.studio_menu_design_save(sid,'product',sku,0,jsonb_build_object('mode','custom','photo_url',url,'fit','contain','x',0.3,'y',-0.2,'zoom',1.3));
 if (r->>'revision')::int<>1 or not private.studio_menu_upload_allowed('studio-menu-published',path) then raise 'Private draft or promotion gate failed';end if;
 if exists(select 1 from public.studio_menu_designs(sid) p where p.target_key=sku) then raise 'Draft settings public before publish';end if;
 begin perform public.studio_menu_design_publish(sid,'product',sku,1);raise 'Missing verified release asset';exception when sqlstate '22023' then null;end;
 begin perform public.studio_menu_design_save(sid,'product',sku,0,'{}');raise 'Stale save';exception when sqlstate 'PT409' then null;end;
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('studio-menu-published',path,actor::text,'{"mimetype":"image/png","size":123}');
 r:=public.studio_menu_design_publish(sid,'product',sku,1);
 if (r->>'published_revision')::int<>2 or (select settings->>'photo_url' from public.studio_menu_designs(sid) where target_key=sku)<>url then raise 'Photo release failed';end if;
 r:=public.studio_menu_design_save(sid,'product',sku,2,'{"mode":"hidden"}');
 if (select settings->>'mode' from public.studio_menu_designs(sid) where target_key=sku)<>'custom' then raise 'Draft overwrote published photo';end if;
 r:=public.studio_menu_design_revert(sid,'product',sku,3,2);
 if r->'settings'->>'mode'<>'custom' or (r->>'revision')::integer<>4 then raise 'Version restore failed';end if;
 r:=public.studio_menu_design_unpublish(sid,'product',sku,4);
 if exists(select 1 from public.studio_menu_designs(sid) p where p.target_key=sku) then raise 'Photo still published';end if;
 r:=public.studio_menu_design_save(sid,'menu','menu',0,'{"title":"Rollback only","background_color":"#223355","accent":"#669988"}');
 perform public.studio_menu_design_publish(sid,'menu','menu',1);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.studio_menu_design_drafts(sid);raise 'Nonpublisher reads drafts';exception when insufficient_privilege then null;end;
 begin perform public.studio_menu_design_publish(sid,'product',sku,5);raise 'Nonpublisher published';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects o where o.bucket_id='studio-menu-drafts' and o.name=path) then raise 'Foreign draft bytes exposed';end if;
end $test$;
set local role anon;
do $test$
declare sid uuid:=current_setting('menutest.store')::uuid;
begin
 if not exists(select 1 from public.studio_menu_designs(sid) d where d.target_key='menu' and d.settings->>'title'='Rollback only') then raise 'Cannot read published menu';end if;
 if has_function_privilege(current_user,'public.studio_menu_design_draft(uuid,text,text)','execute') or has_function_privilege(current_user,'public.studio_menu_design_save(uuid,text,text,int,jsonb)','execute') then raise 'Anonymous editor grant';end if;
 if exists(select 1 from storage.objects where bucket_id='studio-menu-drafts' and name like sid::text||'/%') then raise 'Anonymous draft bytes exposed';end if;
end $test$;
rollback;
