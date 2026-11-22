begin;
do $test$
declare p uuid;
begin
  select user_id into strict p from private.studio_publishers limit 1;
  perform set_config('request.jwt.claim.sub',p::text,true);
  perform set_config('qa.authored_owner',p::text,true);
  perform set_config('qa.authored_id',gen_random_uuid()::text,true);
  perform set_config('qa.authored_original',gen_random_uuid()::text,true);
  perform set_config('qa.authored_sku',(select id::text from public.products where store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' order by id limit 1),true);
  perform set_config('qa.authored_sku2',(select id::text from public.products where store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' order by id limit 1 offset 1),true);
  perform set_config('qa.foreign_sku',(select id::text from public.products where store_id='189581c9-d728-4e5d-9e02-ae4de19a15af' order by id limit 1),true);
end $test$;
set local role authenticated;
do $test$
declare
  shop constant uuid:='35ef70d0-3d20-4599-96a3-648ee3c7c340'; aisle uuid:=current_setting('qa.authored_id')::uuid; native uuid:=current_setting('qa.authored_original')::uuid;
  a uuid:=current_setting('qa.authored_sku')::uuid; b uuid:=current_setting('qa.authored_sku2')::uuid; foreign_id uuid:=current_setting('qa.foreign_sku')::uuid;
  alternative uuid:='189581c9-d728-4e5d-9e02-ae4de19a15af'; r jsonb; got integer;
begin
  r:=public.studio_grocery_aisle_save(shop,aisle,0,'Rollback draft','cooler',array[b,a],null,'{"board_title":"Weekly choices","board_color":"#213335"}');
  if (r->>'revision')::int<>1 or r->'product_ids'<>to_jsonb(array[b,a]) then raise 'Draft identity/order mismatch.';end if;
  if exists(select 1 from public.studio_grocery_aisles(shop) where aisle_id=aisle) then raise 'Draft became public.';end if;
  begin perform public.studio_grocery_aisle_save(shop,aisle,0,'Stale','shelf',array[a]);raise 'Stale revision allowed.';exception when sqlstate 'PT409' then null;end;
  begin perform public.studio_grocery_aisle_save(shop,aisle,1,'Duplicate','shelf',array[a,a]);raise 'Duplicate SKU allowed.';exception when sqlstate '22023' then null;end;
  begin perform public.studio_grocery_aisle_save(shop,aisle,1,'Foreign','shelf',array[foreign_id]);raise 'Wrong-store SKU allowed.';exception when sqlstate '22023' then null;end;
  begin perform public.studio_grocery_aisle_save(shop,aisle,1,'Foreign source','shelf',array[a],'Unwired QA department');raise 'Wrong-store source allowed.';exception when sqlstate '22023' then null;end;
  begin perform public.studio_grocery_aisle_save(shop,aisle,1,'External','shelf',array[a],null,'{"entrance_url":"https://example.com/photo.png"}');raise 'Unknown image allowed.';exception when sqlstate '22023' then null;end;
  begin perform public.studio_grocery_aisle_save(shop,aisle,1,'Unknown object','shelf',array[a],null,'{"entrance_url":"https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/no-such-aisle-qa.png"}');raise 'Missing Storage object allowed.';exception when sqlstate '22023' then null;end;
  r:=public.studio_grocery_aisle_publish(shop,aisle,1);
  if (r->>'revision')::int<>2 or (r->>'published_revision')::int<>2 then raise 'Publish revision mismatch.';end if;
  if (select product_ids from public.studio_grocery_aisles(shop) where aisle_id=aisle) is distinct from array[b,a] then raise 'Live SKU order mismatch.';end if;
  if exists(select 1 from public.studio_grocery_aisles(alternative) where aisle_id=aisle) then raise 'Other store reads a published aisle.';end if;
  r:=public.studio_grocery_aisle_save(shop,aisle,2,'Draft after publication','freezer',array[a]);
  if (select title from public.studio_grocery_aisles(shop) where aisle_id=aisle)<>'Rollback draft' then raise 'Unsaved release changed.';end if;
  r:=public.studio_grocery_aisle_revert(shop,aisle,3,1);
  if (r->>'revision')::int<>4 or r->>'title'<>'Rollback draft' or jsonb_array_length(r->'history')<>4 then raise 'Revert or history failed.';end if;
  r:=public.studio_grocery_aisle_unpublish(shop,aisle,4);
  if exists(select 1 from public.studio_grocery_aisles(shop) where aisle_id=aisle) or (r->>'revision')::int<>5 then raise 'Unpublish failed.';end if;
  r:=public.studio_grocery_aisle_save(shop,native,0,'Original Canned','shelf','{}','Canned Goods & Soups','{"board_body":"First line\nSecond line","ink_color":"#ffffff"}');
  r:=public.studio_grocery_aisle_publish(shop,native,1);
  if not exists(select 1 from public.studio_grocery_aisles(shop) where aisle_id=native and stock_mode='native' and cardinality(product_ids)=0) then raise 'Existing stock incorrectly replaced.';end if;
  if not exists(select 1 from public.studio_grocery_aisle_drafts(shop) d where d->>'aisle_id'=native::text) then raise 'Own draft not readable.';end if;
  begin perform public.studio_grocery_aisle_save(gen_random_uuid(),gen_random_uuid(),0,'Out of town','shelf',array[a]);raise 'Unverified store allowed.';exception when sqlstate '22023' then null;end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform public.studio_grocery_aisle_drafts(shop);raise 'Nonpublisher reads draft.';exception when insufficient_privilege then null;end;
  begin perform public.studio_grocery_aisle_publish(shop,aisle,5);raise 'Nonpublisher writes.';exception when insufficient_privilege then null;end;
end $test$;
set local role anon;
do $test$
begin
  if exists(select 1 from public.studio_grocery_aisles('35ef70d0-3d20-4599-96a3-648ee3c7c340') where aisle_id=current_setting('qa.authored_id')::uuid) then raise 'Unpublished leaked.';end if;
  if not exists(select 1 from public.studio_grocery_aisles('35ef70d0-3d20-4599-96a3-648ee3c7c340') where aisle_id=current_setting('qa.authored_original')::uuid) then raise 'Public snapshot missing.';end if;
  if has_function_privilege(current_user,'public.studio_grocery_aisle_drafts(uuid)','execute') then raise 'Anonymous can read draft.';end if;
  if has_function_privilege(current_user,'public.studio_grocery_aisle_publish(uuid,uuid,int)','execute') then raise 'Anonymous has publish grant.';end if;
  if has_schema_privilege(current_user,'private','usage') then raise 'Exposed the private namespace.';end if;
end $test$;
rollback;
