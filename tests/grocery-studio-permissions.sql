begin;
-- Integration regression on a real product, with rollback.
do $$
declare publisher_id uuid; product_id uuid;
begin
  select user_id into strict publisher_id from private.studio_publishers limit 1;
  select p.id into strict product_id from public.products p
    where p.store_id='35ef70d0-3d20-4599-96a3-648ee3c7c340' and not exists
       (select 1 from public.studio_grocery_product_scales s where s.product_id=p.id)
    order by p.id limit 1;
  perform set_config('grocerytest.product',product_id::text,true);
  perform set_config('grocerytest.publisher',publisher_id::text,true);
  perform set_config('request.jwt.claim.sub',publisher_id::text,true);
end $$;
set local role authenticated;
do $$
declare store_id constant uuid:='35ef70d0-3d20-4599-96a3-648ee3c7c340'; prod uuid:=current_setting('grocerytest.product')::uuid;
  uploaded text:=chr(65279)||'// café'||chr(13)||chr(10)||'class GroceryAisle {}'||chr(10);
  raw jsonb; next_row jsonb; flagged jsonb; second_flag jsonb; source_row jsonb; second_source jsonb;
begin
  if not public.studio_grocery_editor_access() then raise 'Publisher was refused';end if;
  raw:=public.studio_save_grocery_product_scale(store_id,prod,1.25,0);
  if (raw->>'scale')::numeric<>1.25 or (raw->>'revision')::int<>1 then raise 'Initial scale is wrong';end if;
  next_row:=public.studio_save_grocery_product_scale(store_id,prod,1.5,1);
  if (next_row->>'revision')::int<>2 then raise 'Update did not advance revision';end if;
  if public.studio_save_grocery_product_scale(store_id,prod,1.5,2)<>next_row then raise 'No-op caused drift';end if;
  begin perform public.studio_save_grocery_product_scale(store_id,prod,1.9,1);raise 'Stale revision accepted';exception when sqlstate 'PT409' then null;end;
  begin perform public.studio_save_grocery_product_scale(gen_random_uuid(),prod,1.2,0);raise 'Wrong store accepted';exception when sqlstate '22023' then null;end;
  begin perform public.studio_save_grocery_product_scale(store_id,prod,-1,2);raise 'Invalid scale accepted';exception when sqlstate '22023' then null;end;
  begin update public.studio_grocery_product_scales set scale=1.75 where product_id=prod;raise 'Direct scale bypass possible';exception when insufficient_privilege then null;end;
  flagged:=public.studio_flag_grocery_product(store_id,prod,'Dairy & Eggs','test-digest','p1','Rollback-only note.');
  second_flag:=public.studio_flag_grocery_product(store_id,prod,'Dairy & Eggs','test-digest','p1','Rollback-only note.');
  if flagged->>'id'<>second_flag->>'id' or flagged->>'status'<>'open' then raise 'Flag idempotency failed';end if;
  if public.studio_resolve_grocery_product_flag((flagged->>'id')::uuid)->>'status'<>'resolved' then raise 'Resolve failed';end if;
  if public.studio_flag_grocery_product(store_id,prod,'Dairy & Eggs','test-digest','p1','Rollback-only note.')->>'status'<>'open' then raise 'Reopen failed';end if;
  source_row:=public.studio_register_grocery_dart('GroceryAisle_qa.dart',uploaded);
  second_source:=public.studio_register_grocery_dart('renamed.dart',uploaded);
  if source_row->>'id' is null or source_row->>'id'<>second_source->>'id' or source_row?'source'
     or source_row->>'preview_status'<>'uncompiled' or source_row->>'preview_url' is not null then raise 'Upload metadata or dedup failed';end if;
  if (source_row->>'byte_size')::int<>octet_length(convert_to(uploaded,'UTF8')) or
     (select source from public.studio_grocery_dart_versions where id=(source_row->>'id')::uuid)<>uploaded then raise 'Source byte preservation failed';end if;
  begin perform public.studio_register_grocery_dart('bad.txt',uploaded);raise 'Wrong suffix allowed';exception when sqlstate '22023' then null;end;
  begin perform public.studio_register_grocery_dart('../bad.dart',uploaded);raise 'Path allowed';exception when sqlstate '22023' then null;end;
  begin update public.studio_grocery_dart_versions set preview_status='verified' where id=(source_row->>'id')::uuid;raise 'Client can attest previews';exception when insufficient_privilege then null;end;
  perform set_config('grocerytest.version',source_row->>'id',true);
  perform set_config('grocerytest.flag',flagged->>'id',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true) is not null as ordinary_user_chosen;
set local role authenticated;
do $$
declare v uuid:=current_setting('grocerytest.version')::uuid; f uuid:=current_setting('grocerytest.flag')::uuid;
begin
  if public.studio_grocery_editor_access() then raise 'Unlisted user is publisher';end if;
  if exists(select 1 from public.studio_grocery_dart_versions where id=v) or exists(select 1 from public.studio_grocery_product_flags where id=f) then raise 'Private editor data visible';end if;
  begin perform public.studio_register_grocery_dart('x.dart','class GroceryAisle {}');raise 'Unlisted user could upload';exception when insufficient_privilege then null;end;
  begin perform public.studio_save_grocery_product_scale('35ef70d0-3d20-4599-96a3-648ee3c7c340',current_setting('grocerytest.product')::uuid,2,2);raise 'Unlisted user could edit';exception when insufficient_privilege then null;end;
  begin perform public.studio_resolve_grocery_product_flag(f);raise 'Unlisted user could resolve';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$
begin
  if not exists(select 1 from public.studio_grocery_product_scales where product_id=current_setting('grocerytest.product')::uuid and scale=1.5) then raise 'Shopper could not read saved scale';end if;
  if has_table_privilege(current_user,'public.studio_grocery_dart_versions','SELECT') or has_table_privilege(current_user,'public.studio_grocery_product_flags','SELECT') then raise 'Anonymous read grant on private data';end if;
  if has_table_privilege(current_user,'public.studio_grocery_product_scales','INSERT') or has_table_privilege(current_user,'public.studio_grocery_product_scales','UPDATE') or has_function_privilege(current_user,'public.studio_save_grocery_product_scale(uuid,uuid,numeric,bigint)','EXECUTE') then raise 'Anonymous editor grant';end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from private.studio_grocery_scale_history where product_id=current_setting('grocerytest.product')::uuid and changed_by=current_setting('grocerytest.publisher')::uuid)<>2 then raise 'Revision audit failed';end if;
 if (select sha256<>encode(extensions.digest(convert_to(source,'UTF8'),'sha256'),'hex') from public.studio_grocery_dart_versions where id=current_setting('grocerytest.version')::uuid) then raise 'Upload SHA mismatch';end if;
end $$;

rollback;
