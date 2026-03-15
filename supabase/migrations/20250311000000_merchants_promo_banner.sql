-- Add promotional banner / advertising image URL for Premium (custom ads on pager).
-- Run this in Supabase Dashboard → SQL Editor → New query, then Run.
-- After it succeeds, in src/lib/merchant.ts: (1) add ", promo_banner_url" to MERCHANT_COLUMNS; (2) in updateMerchant use ...updates in the row and remove the promo_banner_url destructuring so the banner is saved.
alter table public.merchants add column if not exists promo_banner_url text;
