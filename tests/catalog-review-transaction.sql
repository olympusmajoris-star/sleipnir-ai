begin;
select set_config('request.jwt.claims','{"sub":"533a05da-fed8-4c92-ba94-7e4867ebce8f","role":"authenticated"}',true);
set local role authenticated;
do $$
declare s uuid; p uuid=gen_random_uuid(); request_one uuid=gen_random_uuid(); request_two uuid=gen_random_uuid(); expected jsonb; items jsonb; output jsonb;
begin
 s=public.create_studio_store('{"name":"Studio transaction test — rolled back","address":"Internal test"}');
 items=jsonb_build_array(jsonb_build_object('id',p,'expected',null,'patch',jsonb_build_object('name','Test beans','price',2.5)));
 output=public.apply_studio_catalog_review(s,request_one,items);
 if output->>'applied'<>'1' then raise exception 'Insert failed';end if;
 output=public.apply_studio_catalog_review(s,request_one,items);
 if output->>'alreadyApplied'<>'true' then raise exception 'Idempotency failed';end if;
 select jsonb_build_object('name',name,'description',description,'price',price,'image_url',image_url,'category',category,'section',section,'shelf_group',shelf_group,'full_name',full_name)
 into expected from public.products where id=p;
 items=jsonb_build_array(jsonb_build_object('id',p,'expected',expected,'patch',jsonb_build_object('name','Corrected beans')));
 perform public.apply_studio_catalog_review(s,request_two,items);
 begin
  perform public.apply_studio_catalog_review(s,gen_random_uuid(),items);
  raise exception 'BAD_TEST_stale_review_accepted';
 exception when others then if sqlerrm='BAD_TEST_stale_review_accepted' then raise;end if;end;
 perform public.restore_studio_catalog_review(request_two);
 if (select name from public.products where id=p)<>'Test beans' then raise exception 'Restore failed';end if;
 begin
  items=jsonb_build_array(jsonb_build_object('id',p,'patch',jsonb_build_object('name','No expected values')));
  perform public.apply_studio_catalog_review(s,gen_random_uuid(),items);
  raise exception 'BAD_TEST_missing_expected_accepted';
 exception when others then if sqlerrm='BAD_TEST_missing_expected_accepted' then raise;end if;end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',true);
 begin
  perform public.apply_studio_catalog_review(s,gen_random_uuid(),items);
  raise exception 'BAD_TEST_non_owner_accepted';
 exception when others then if sqlerrm='BAD_TEST_non_owner_accepted' then raise;end if;end;
end $$;
select 'Store creation, insert, edit, idempotency, restore, stale review, missing review, and unauthorized rejection passed. All writes rolled back.' as verification;
rollback;
