-- Add URL for the advertising banner (when customer taps the banner on the handset, open this link in a new tab).
-- Run in Supabase Dashboard → SQL Editor → New query, then Run.
alter table public.merchants add column if not exists promo_banner_link text;
