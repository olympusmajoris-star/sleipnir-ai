-- A street may enable native ambient features. No stream, message or principal data is part of this schema.
alter function private.studio_validate_street(jsonb,uuid[]) rename to studio_validate_street_scene;
create function private.studio_validate_street(j jsonb,ids uuid[]) returns void
language plpgsql stable security invoker set search_path='' as $$
declare ambient jsonb;
begin
 if j?'ambient' then
  ambient:=j->'ambient';
  if jsonb_typeof(ambient)<>'object' or (ambient-array['streams','messages'])<>'{}'::jsonb
     or (ambient?'streams' and jsonb_typeof(ambient->'streams')<>'boolean')
     or (ambient?'messages' and jsonb_typeof(ambient->'messages')<>'boolean') then
    raise exception using errcode='22023',message='Ambient switches accept only streams and messages booleans.';
  end if;
 end if;
 perform private.studio_validate_street_scene(j-'ambient',ids);
end $$;
revoke all on function private.studio_validate_street(jsonb,uuid[]) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
