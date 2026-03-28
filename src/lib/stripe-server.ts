import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY ?? "";

export function getStripe(): Stripe | null {
  if (!secretKey || !secretKey.startsWith("sk_")) return null;
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

export function getPriceId(plan: "plus" | "premium"): string | null {
  if (plan === "plus") return process.env.STRIPE_PRICE_ID_PLUS ?? null;
  if (plan === "premium") return process.env.STRIPE_PRICE_ID_PREMIUM ?? null;
  return null;
}

/** Paid features only after the first invoice succeeds (or trial). Incomplete checkout must not unlock the plan. */
export function subscriptionGrantsPaidPlan(subscription: Stripe.Subscription): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
}

/** Derive plan from a Stripe subscription (metadata or price ID). When listing, price can be an id string. */
export function planFromSubscription(subscription: Stripe.Subscription): "plus" | "premium" {
  const planFromMeta = subscription.metadata?.plan as string | undefined;
  if (planFromMeta === "plus" || planFromMeta === "premium") return planFromMeta;
  const priceOrId = subscription.items?.data?.[0]?.price;
  const priceId = typeof priceOrId === "string" ? priceOrId : (priceOrId as { id?: string } | undefined)?.id;
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_ID_PLUS) return "plus";
  return "plus";
}
