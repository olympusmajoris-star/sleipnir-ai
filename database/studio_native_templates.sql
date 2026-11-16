-- Private original widget sources. Public studio visitors cannot read templates.
create table public.studio_native_templates (
  id text not null,
  version text not null,
  widget_name text not null,
  source text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key (id, version)
);
alter table public.studio_native_templates enable row level security;
revoke all on public.studio_native_templates from public, anon, authenticated;
grant select on public.studio_native_templates to authenticated;
create policy "Publishers read original widget templates"
  on public.studio_native_templates for select to authenticated
  using ((select private.studio_is_publisher()));
comment on table public.studio_native_templates is
  'Owner-only original Dart templates for studio export. No client writes.';
