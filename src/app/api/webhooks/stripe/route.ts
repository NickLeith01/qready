import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, planFromSubscription } from "@/lib/stripe-server";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) as Stripe.Event;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    const plan = planFromSubscription(subscription);
    const merchantIdFromMeta = subscription.metadata?.merchant_id as string | undefined;

    try {
      const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
      const admin = createSupabaseAdmin();
      const payload = {
        plan,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      };
      // Prefer merchant_id from subscription metadata (set when subscription is created) so we update the right row even if stripe_customer_id wasn't saved yet
      const { error } = merchantIdFromMeta
        ? await admin.from("merchants").update(payload).eq("id", merchantIdFromMeta)
        : await admin.from("merchants").update(payload).eq("stripe_customer_id", customerId);
      if (error) {
        console.error("Webhook: failed to update merchant plan:", error.message);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
      }
    } catch (err) {
      console.error("Webhook: error updating merchant:", err);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    if (!customerId) return NextResponse.json({ received: true });

    try {
      // Customer may have another active subscription (e.g. switched from Plus to Premium). Only set free if none left.
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      const another = activeSubs.data?.[0];
      const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
      const admin = createSupabaseAdmin();

      if (another) {
        const plan = planFromSubscription(another);
        const merchantIdFromMeta = another.metadata?.merchant_id as string | undefined;
        const payload = {
          plan,
          stripe_subscription_id: another.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        };
        const { error } = merchantIdFromMeta
          ? await admin.from("merchants").update(payload).eq("id", merchantIdFromMeta)
          : await admin.from("merchants").update(payload).eq("stripe_customer_id", customerId);
        if (error) console.error("Webhook: failed to update merchant after sub deleted:", error.message);
      } else {
        await admin
          .from("merchants")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
      }
    } catch (err) {
      console.error("Webhook: error downgrading merchant:", err);
    }
  }

  return NextResponse.json({ received: true });
}
