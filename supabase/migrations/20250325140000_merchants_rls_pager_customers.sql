-- Customer handset (/pager/[id]) uses the Supabase anon key. RLS that only allows
-- SELECT merchants.id = auth.uid() hides venue rows from QR scanners.
-- Allow read when at least one pager belongs to that merchant (venue branding only).

drop policy if exists "merchants_select_anon_for_pager_display" on public.merchants;
drop policy if exists "merchants_select_authenticated_for_pager_display" on public.merchants;

create policy "merchants_select_anon_for_pager_display"
on public.merchants
for select
to anon
using (
  exists (
    select 1 from public.pagers p
    where p.merchant_id = merchants.id
  )
);

-- Logged-in user opening a QR link in the same browser (rare) uses role authenticated, not anon.
create policy "merchants_select_authenticated_for_pager_display"
on public.merchants
for select
to authenticated
using (
  exists (
    select 1 from public.pagers p
    where p.merchant_id = merchants.id
  )
);
