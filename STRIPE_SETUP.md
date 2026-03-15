# Stripe Payment Element setup

This app uses Stripe’s **Payment Element** for Plus/Premium subscriptions. To go live:

## 1. Environment variables

Add to `.env.local` (and your production env):

```bash
# Stripe (get these from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs from Stripe Dashboard → Products (create Plus and Premium, then copy each price ID)
STRIPE_PRICE_ID_PLUS=price_...
STRIPE_PRICE_ID_PREMIUM=price_...

# Webhook signing secret (after adding the webhook endpoint in Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...
```

For local testing use `sk_test_...` and `pk_test_...`, and create test Products/Prices.

## 2. Stripe Dashboard

1. **Products & Prices**  
   Create two products (e.g. “Plus” and “Premium”) with recurring monthly prices (£15 and £20 or your amounts). Copy each **Price ID** (`price_...`) into `STRIPE_PRICE_ID_PLUS` and `STRIPE_PRICE_ID_PREMIUM`.

2. **Webhook**  
   - Developers → Webhooks → Add endpoint  
   - URL: `https://your-domain.com/api/webhooks/stripe` (for local dev use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)  
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`  
   - Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

3. **Bank account**  
   Settings → Business settings → Payouts: add your bank account so Stripe can send you payouts.

## 3. Database migration

Run the migration that adds Stripe columns to `merchants`:

```bash
supabase db push
# or run supabase/migrations/20250316000000_merchants_stripe_ids.sql in the SQL Editor
```

## 4. One subscription per customer

Each customer should have **only one active subscription** (Plus or Premium). The API enforces this: when a user starts a new subscription (e.g. switches from Plus to Premium), the app **cancels any existing active subscriptions** for that customer before creating the new one. If you see multiple active subscriptions for the same customer in the Stripe Dashboard (e.g. from earlier tests), cancel the extras so only the intended plan remains; otherwise Stripe will bill for each active subscription.

## 5. Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use the printed webhook secret in `.env.local` as `STRIPE_WEBHOOK_SECRET` while testing.

## 6. Why your balance is less than the payment amount

Stripe deducts **processing fees** (e.g. ~1.5% + 20p per card charge in the UK). So a £15 payment may show as ~£14.31 in your balance; the difference is Stripe’s fee. This is normal. See [Stripe pricing](https://stripe.com/gb/pricing) for details.

## 7. Account page still shows “Free” after paying

- Ensure **stripe listen** was running in a second terminal when you completed the test payment (so the webhook was forwarded).
- Ensure the **database migration** (step 3) has been run so `merchants` has `stripe_customer_id` and `stripe_subscription_id`.
- The webhook uses **Supabase service role** to update `merchants`; set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (from Supabase Dashboard → Settings → API) so the webhook can write to the database.
