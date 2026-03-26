-- Dashboard "reset board" deletes all pager rows for the venue. Without DELETE policies, Postgres
-- rejects the delete (RLS), the UI briefly clears then refetch restores the old numbers.

drop policy if exists "pagers_delete_authenticated_own" on public.pagers;
drop policy if exists "pagers_delete_anon_anon_merchant" on public.pagers;

-- Signed-in staff: merchant.id = auth.users.id
create policy "pagers_delete_authenticated_own"
on public.pagers
for delete
to authenticated
using (merchant_id = auth.uid()::text);

-- Try-for-free (no login): merchant rows use id like anon-<uuid>. Anon key has no auth.uid().
-- Matches typical permissive try-for-free setup; tighten if you require stricter isolation.
create policy "pagers_delete_anon_anon_merchant"
on public.pagers
for delete
to anon
using (merchant_id like 'anon-%');
