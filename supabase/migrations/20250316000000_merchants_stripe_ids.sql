-- Store Stripe customer and subscription IDs so we can reuse the customer and update plan from webhooks.
alter table public.merchants add column if not exists stripe_customer_id text;
alter table public.merchants add column if not exists stripe_subscription_id text;
