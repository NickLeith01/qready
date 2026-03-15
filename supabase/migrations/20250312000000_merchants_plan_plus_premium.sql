-- Allow plan values 'plus' and 'premium' for testing and future billing. Existing 'paid' remains valid (treated as premium in app).
-- Drop any existing check constraint on plan (name may vary by Postgres version).
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.merchants'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%plan%'
  loop
    execute format('alter table public.merchants drop constraint %I', cname);
  end loop;
end $$;
alter table public.merchants add constraint merchants_plan_check check (plan in ('free', 'paid', 'plus', 'premium'));
