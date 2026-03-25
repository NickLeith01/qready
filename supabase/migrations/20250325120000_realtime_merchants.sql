-- Customer pager subscribes to public.merchants for live logo / colours / banner updates.
-- supabase_realtime often starts with only public.pagers; add merchants if missing.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'merchants'
  ) then
    alter publication supabase_realtime add table public.merchants;
  end if;
end $$;
