# Logo upload (Supabase Storage)

For **Upload logo (max 2MB)** in Settings (Plus/Premium) to work:

1. **Create the bucket** (if it doesn't exist): Supabase Dashboard → **Storage** → **New bucket** → name: `merchant-logos` → **Public** on → Create.

2. **Add storage policies** (each user uploads to their own folder `{user_id}/logo.{ext}`):
   - Go to **SQL Editor** → **New query**.
   - Paste the contents of **`supabase/migrations/20250309100000_storage_merchant_logos.sql`**.
   - Click **Run** (if you already had older policies, this replaces them).

After that, logo upload from the dashboard should work. If it still fails, check the browser alert for the exact error message. You must be signed in.
