-- This test ends in ROLLBACK. No draft, published placement or sample media is committed.
begin;
do $$
declare uid uuid; ids uuid[]; media text;
begin
 select user_id into strict uid from private.studio_publishers limit 1;
 ids:=private.studio_valhalla_street_ids();
 if cardinality(ids)<3 then raise 'Three eligible storefronts are needed for the adjacent-gap test';end if;
 select '/storage/v1/object/public/'||a.bucket||'/'||a.image_path into strict media
 from public.valhalla_assets a join storage.objects o on o.bucket_id=a.bucket and o.name=a.image_path
 where a.kind='storefront' limit 1;
 perform set_config('valhallatest.publisher',uid::text,true);
 perform set_config('valhallatest.ids',array_to_json(ids)::text,true);
 perform set_config('valhallatest.media',media,true);
end $$;
set local role anon;
do $$
begin
 if public.studio_valhalla_street_published()->>'version'<>'1' then raise 'Public approved reader denied';end if;
 if has_function_privilege(current_user,'public.studio_valhalla_street_draft()','execute')
 or has_function_privilege(current_user,'public.studio_save_valhalla_street_draft(jsonb,bigint)','execute')
 or has_function_privilege(current_user,'public.studio_publish_valhalla_street(bigint,bigint)','execute') then raise 'Anonymous draft access';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 begin perform public.studio_valhalla_street_draft();raise 'Unlisted reader';exception when insufficient_privilege then null;end;
 begin perform public.studio_save_valhalla_street_draft('{}',0);raise 'Unlisted writer';exception when insufficient_privilege then null;end;
 begin perform public.studio_publish_valhalla_street(0,0);raise 'Unlisted publisher';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('valhallatest.publisher'),true);
set local role authenticated;
do $$
declare d jsonb; p jsonb; draft jsonb; result jsonb; bad jsonb; u text:=current_setting('valhallatest.media');
ids jsonb:=current_setting('valhallatest.ids')::jsonb; w jsonb; ad jsonb; testsets jsonb[];
begin
 d:=public.studio_valhalla_street_draft();p:=public.studio_valhalla_street_published();
 w:=jsonb_build_object('id','window-one','image_url',u,'label','Rollback','x',.1,'y',.2,'w',.3,'h',.2);
 ad:=jsonb_build_object('id','gap-one','after_store_id',ids->>0,'before_store_id',ids->>1,'image_url',u,'label','Rollback');
 draft:=jsonb_build_object('sky',jsonb_build_object('day_url',u,'day_start',7,'night_start',18),'curb_y',.81,
 'ambient',jsonb_build_object('streams',true,'messages',false),
 'fronts',jsonb_build_object(ids->>0,jsonb_build_object('scale',1.2,'offset_x',-.05,'source_curb_y',.8,'windows',jsonb_build_array(w))),'ads',jsonb_build_array(ad));
 result:=public.studio_save_valhalla_street_draft(draft,(d->>'revision')::bigint);
 if result->'settings'<>draft or public.studio_valhalla_street_published()<>p then raise 'Draft leaked into publication';end if;
 if public.studio_save_valhalla_street_draft(draft,(result->>'revision')::bigint)<>result then raise 'No-op changed revision';end if;
 begin perform public.studio_save_valhalla_street_draft('{}',(result->>'revision')::bigint-1);raise 'Stale draft accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.studio_publish_valhalla_street((result->>'revision')::bigint-1,(p->>'revision')::bigint);raise 'Stale draft published';exception when sqlstate 'PT409' then null;end;
 begin perform public.studio_publish_valhalla_street((result->>'revision')::bigint,(p->>'revision')::bigint-1);raise 'Stale public revision accepted';exception when sqlstate 'PT409' then null;end;
 testsets:=array[
  '{"curb_y":1.1}'::jsonb,
  '{"sky":{"day_start":6.5}}'::jsonb,
  '{"unknown":true}'::jsonb,
  '{"ambient":{"messages":"true"}}'::jsonb,
  '{"ambient":{"streams":1}}'::jsonb,
  '{"ambient":{"thread_id":"private"}}'::jsonb,
  '{"growth":{}}'::jsonb,
  '{"sky":{"day_url":"https://outside.example/sky.webp"}}'::jsonb,
  '{"sky":{"day_url":"/storage/v1/object/public/menu-images/%2e%2e/private.webp"}}'::jsonb,
  '{"sky":{"day_url":"/storage/v1/object/public/studio-published-media/a-missing-rollback-object.webp"}}'::jsonb,
  jsonb_build_object('fronts',jsonb_build_object(gen_random_uuid()::text,'{}'::jsonb)),
  jsonb_set(draft,array['fronts',ids->>0,'windows','0','w'],'1'::jsonb),
  jsonb_set(draft,array['fronts',ids->>0,'windows'],jsonb_build_array(w,w)),
  jsonb_set(draft,'{ads,0,before_store_id}',ids->2),
  jsonb_set(draft,'{ads}',jsonb_build_array(ad,ad))
 ];
 foreach bad in array testsets loop
  begin perform public.studio_save_valhalla_street_draft(bad,(result->>'revision')::bigint);raise 'Invalid scene accepted';exception when invalid_parameter_value then null;end;
 end loop;
 result:=public.studio_publish_valhalla_street((result->>'revision')::bigint,(p->>'revision')::bigint);
 if result->'settings'<>draft or public.studio_valhalla_street_published()<>result then raise 'Approved settings differ';end if;
 perform set_config('valhallatest.revision',result->>'revision',true);
end $$;
reset role;
set local role anon;
do $$begin
 if public.studio_valhalla_street_published()->>'revision'<>current_setting('valhallatest.revision') then raise 'Approved result unavailable to public';end if;
end $$;
rollback;
