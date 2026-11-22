create function private.studio_menu_one_owned(sid uuid,kind text,key text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.studio_is_publisher() then raise exception using errcode='42501',message='Publisher access required.';end if;
 return (select private.studio_menu_state(sid,kind,key) from private.studio_menu_design_heads h
   where (h.store_id,h.target_kind,h.target_key)=(sid,kind,key) and h.owner_id=auth.uid() and private.studio_menu_design_store(sid));
end $$;
create function public.studio_menu_design_draft(p_store_id uuid,p_target_kind text,p_target_key text) returns jsonb
language sql stable security invoker set search_path='' begin atomic select private.studio_menu_one_owned(p_store_id,p_target_kind,p_target_key);end;
revoke all on function private.studio_menu_one_owned(uuid,text,text),public.studio_menu_design_draft(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.studio_menu_one_owned(uuid,text,text),public.studio_menu_design_draft(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
