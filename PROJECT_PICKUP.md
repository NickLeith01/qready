## Project pickup: Digital Pager

### What we most recently changed / fixed
#### 1) Supabase Security Advisor (RLS) - fixed to avoid data exposure risk
- `public.merchants`
  - Previous policies used `using (true)` which meant anon/auth could access all merchant rows.
  - Updated the `merchants` policies so they are restricted to the signed-in user row by matching the tenant key:
    - `merchants.id` is `text`, so we must cast `auth.uid()` (uuid) to text.
  - Correct policy logic pattern:
    - SELECT: `using (id = auth.uid()::text)`
    - UPDATE: `using (id = auth.uid()::text)` AND `with check (id = auth.uid()::text)`
    - INSERT: `with check (id = auth.uid()::text)`

- `public.pagers`
  - Enabled RLS and added minimal policies to avoid breaking both:
    - the customer-facing public pager screen (`/pager/[id]`) and
    - the logged-in staff dashboard.
  - Minimal intent of policies:
    - Allow public/anon pager reads so QR/customer flow still works
    - Allow authenticated staff reads/writes only for their own rows (matching `merchant_id` to the tenant/auth user)

- Result: Dashboard and public pager screens still worked after enabling RLS (confirmed by testing in the browser).

#### 2) “Prevent use of leaked passwords” toggle
- The Supabase toggle is gated by Supabase plan tier.
- If the project is below Pro+, you may not be able to enable it; in that case the Security Advisor item may remain as advisory.

#### 3) Supabase “email rate limit exceeded” on password reset
- Supabase auth email using the built-in sender has a low, fixed rate limit.
- To raise limits you need **custom SMTP** in Supabase (e.g. Resend/SendGrid/etc.), then set higher values in:
  - Supabase: Authentication -> Rate Limits (email sent)

### Recommended verification steps before shipping again
1. In Supabase: Security Advisor -> click Refresh
2. Confirm these are resolved (or downgraded to warnings/Info where expected):
   - `RLS Disabled in Public` for `public.pagers` (should be resolved after enabling RLS + policies)
   - `RLS Policy Always True` for `public.merchants` (should be resolved after removing `using (true)`)
3. If any remaining item is specifically “Prevent use of leaked passwords” and you cannot toggle it, that likely requires upgrading Supabase plan tier.

### Repo files of interest (from our work)
- Supabase migrations:
  - `supabase/migrations/20250306000000_merchants.sql` (merchants schema + earlier permissive policies)
  - `supabase/migrations/20250309100000_storage_merchant_logos.sql` (storage policies; separate from RLS on pagers/merchants)
- App code:
  - `src/lib/merchant.ts` (tenant id assumptions + plan preservation)
  - `src/app/dashboard/page.tsx` (reads/writes pagers + merchants for the signed-in user)
  - `src/app/pager/[id]/page.tsx` (public customer pager screen; reads pager by id)

### Next thing to do (if/when you continue later)
- If you want a “proper fix” rather than a policy-only approach for pagers, the alternative is to move some pager read/write operations behind Next.js API routes using the Supabase Service Role key. However, we already confirmed the policy approach works in this iteration.

