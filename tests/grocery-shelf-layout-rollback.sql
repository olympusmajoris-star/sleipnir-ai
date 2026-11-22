begin;
do $test$
declare
  shop uuid:='35ef70d0-3d20-4599-96a3-648ee3c7c340';
  item_ids uuid[];
begin
  select array_agg(x.product_id) into item_ids from (
    select * from public.studio_grocery_aisle_original_stock(shop,'Dry Goods & Pasta') order by position limit 2
  ) x;
  if cardinality(item_ids)<>2 then raise 'Pasta fixture unavailable';end if;
  perform set_config('request.jwt.claim.sub',(select user_id::text from private.studio_publishers limit 1),true);
  perform set_config('qa.shelf_ids',item_ids::text,true);
  perform set_config('qa.shelf_foreign',(select id::text from public.products where store_id<>shop order by id limit 1),true);
  perform set_config('qa.shelf_own_aisle',gen_random_uuid()::text,true);
end $test$;
set local role authenticated;
do $test$
declare
  shop uuid:='35ef70d0-3d20-4599-96a3-648ee3c7c340';
  aisle text:='Dry Goods & Pasta';
  ids uuid[]:=current_setting('qa.shelf_ids')::uuid[];
  custom uuid:=current_setting('qa.shelf_own_aisle')::uuid;
  shape jsonb:='{"rows":4,"rail":3.5,"tabHeight":22,"groupBy":"type","products":{}}';
  pose jsonb:='{"scale":1.5,"x":-0.3,"y":0.36,"group":"Penne"}';
  answer jsonb; ver integer;
begin
  answer:=public.studio_grocery_shelf_layout(shop,aisle);ver:=(answer->>'revision')::integer;
  shape:=jsonb_set(shape,'{products}',jsonb_build_object(ids[1],pose,ids[2],pose));
  answer:=public.studio_save_grocery_shelf_layout(shop,aisle,shape,ver);
  if answer->'layout'<>shape or (answer->>'revision')::integer<>ver+1 then raise 'Two-item save mismatch';end if;
  if public.studio_save_grocery_shelf_layout(shop,aisle,shape,ver)<>answer then raise 'Network retry did not return original result';end if;
  if public.studio_grocery_shelf_layout(shop,aisle)<>answer then raise 'Readback mismatch';end if;
  begin perform public.studio_save_grocery_shelf_layout(shop,aisle,jsonb_set(shape,'{rows}','5'),ver);raise 'Stale write succeeded';exception when sqlstate 'PT409' then null; end;
  begin perform public.studio_save_grocery_shelf_layout(shop,aisle,jsonb_set(shape,'{rows}','9'),ver+1);raise 'Invalid rows succeeded';exception when sqlstate '22023' then null; end;
  begin perform public.studio_save_grocery_shelf_layout(shop,aisle,jsonb_set(shape,array['products',ids[1]::text,'group'],'""'),ver+1);raise 'Empty group succeeded';exception when sqlstate '22023' then null; end;
  begin perform public.studio_save_grocery_shelf_layout(shop,aisle,jsonb_set(shape,array['products',current_setting('qa.shelf_foreign')],pose),ver+1);raise 'Foreign product succeeded';exception when sqlstate '22023' then null; end;
  if public.studio_grocery_shelf_layout(shop,aisle)<>answer then raise 'Failed bulk edit changed a product';end if;
  perform public.studio_grocery_aisle_save(shop,custom,0,'QA layout','shelf',array[ids[1]],null,'{}');
  perform public.studio_grocery_aisle_publish(shop,custom,1);
  begin perform public.studio_save_grocery_shelf_layout(shop,'studio:'||custom,shape,0);raise 'Foreign authored slot accepted';exception when sqlstate '22023' then null;end;
  perform public.studio_save_grocery_shelf_layout(shop,'studio:'||custom,jsonb_set(shape,'{products}',jsonb_build_object(ids[1],pose)),0);
  begin perform public.studio_save_grocery_shelf_layout(shop,'QA nonexistent aisle',shape,0);raise 'Unknown aisle accepted';exception when sqlstate '22023' then null;end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform public.studio_save_grocery_shelf_layout(shop,aisle,shape,ver+1);raise 'Nonpublisher wrote layout';exception when insufficient_privilege then null;end;
end $test$;
set local role anon;
do $test$
declare saved jsonb;
begin
  saved:=public.studio_grocery_shelf_layout('35ef70d0-3d20-4599-96a3-648ee3c7c340','Dry Goods & Pasta');
  if (saved->'layout'->>'rows')::integer<>4 or saved->'layout'->>'groupBy'<>'type' then raise 'Public reader lost saved fixture';end if;
  if has_function_privilege(current_user,'public.studio_save_grocery_shelf_layout(uuid,text,jsonb,integer)','execute') then raise 'Anonymous has update access';end if;
  if has_schema_privilege(current_user,'private','usage') then raise 'Private schema was exposed';end if;
end $test$;
rollback;
