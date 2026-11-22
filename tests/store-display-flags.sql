begin;
do $$declare publisher_id uuid;
begin
  select user_id into strict publisher_id from private.studio_publishers limit 1;
  perform set_config('request.jwt.claim.sub',publisher_id::text,true);
end $$;
set local role authenticated;
do $$declare store constant uuid:='35ef70d0-3d20-4599-96a3-648ee3c7c340'; a jsonb; b jsonb;
begin
  a:=public.studio_flag_store_display(store,'Entrance','Test only; rolled back.');
  b:=public.studio_flag_store_display(store,'Entrance','Test only; rolled back.');
  if a->>'id' <> b->>'id' or a->>'status'<>'open' then raise 'duplicate'; end if;
  if public.studio_resolve_store_display_flag((a->>'id')::uuid)->>'status'<>'resolved' then raise 'resolve'; end if;
  if public.studio_flag_store_display(store,'Entrance','Test only; rolled back.')->>'status'<>'open' then raise 'reopen'; end if;
  begin perform public.studio_flag_store_display(gen_random_uuid(),'Entrance','Test'); raise 'wrong store'; exception when sqlstate 'PT404' then null; end;
  begin perform public.studio_flag_store_display(store,'','Test'); raise 'blank surface'; exception when sqlstate '22023' then null; end;
end $$;
set local role anon;
do $$begin
  begin perform 1 from public.studio_store_display_flags;raise 'anonymous read';exception when insufficient_privilege then null;end;
  begin perform public.studio_flag_store_display(gen_random_uuid(),'Entrance','anon');raise 'anonymous write';exception when insufficient_privilege then null;end;
end $$;
rollback;
