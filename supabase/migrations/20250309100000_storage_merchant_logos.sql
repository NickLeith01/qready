-- Storage policies for merchant logo uploads (dashboard) and public read (pager).
-- Each user uploads to their own folder: {auth.uid()}/logo.{ext}. Run in Supabase Dashboard → SQL Editor.

drop policy if exists "Allow authenticated upload merchant-logos" on storage.objects;
drop policy if exists "Allow authenticated update merchant-logos" on storage.objects;
drop policy if exists "Allow anon upload merchant-logos" on storage.objects;
drop policy if exists "Allow anon update merchant-logos" on storage.objects;
drop policy if exists "Allow public read merchant-logos" on storage.objects;

-- Authenticated: insert/update only in folder named with own user id
create policy "Allow authenticated upload merchant-logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'merchant-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow authenticated update merchant-logos"
on storage.objects for update to authenticated
using (
  bucket_id = 'merchant-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Anon (e.g. anonymous sign-in): same, folder = auth.uid()
create policy "Allow anon upload merchant-logos"
on storage.objects for insert to anon
with check (
  bucket_id = 'merchant-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Allow anon update merchant-logos"
on storage.objects for update to anon
using (
  bucket_id = 'merchant-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read (pager and dashboard can show logo URL)
create policy "Allow public read merchant-logos"
on storage.objects for select to public
using (bucket_id = 'merchant-logos');
