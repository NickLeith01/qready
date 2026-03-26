import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, getPriceId } from "@/lib/stripe-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * POST /api/create-subscription
 * Creates a Stripe subscription (first invoice incomplete) and returns the PaymentIntent client_secret for the Payment Element.
 * Body: { plan: "plus" | "premium" }
 * Header: Authorization: Bearer <Supabase access_token>
 */
export async function POST(request: Request) {
  try {
    let accessToken: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) accessToken = authHeader.slice(7);

    const body = await request.json().catch(() => ({})) as { plan?: string; accessToken?: string };
    if (!accessToken) accessToken = body.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anon.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const plan = body.plan;
    if (plan !== "plus" && plan !== "premium") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = getStripe();
    const priceId = getPriceId(plan);
    if (!stripe || !priceId) {
      return NextResponse.json(
        { error: "Payments are not configured. Please add STRIPE_SECRET_KEY and STRIPE_PRICE_ID_* in environment." },
        { status: 503 }
      );
    }

    const merchantId = user.id;
    let stripeCustomerId: string | null = null;

    const anonWithUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    let { data: merchantRow } = await anonWithUser
      .from("merchants")
      .select("stripe_customer_id")
      .eq("id", merchantId)
      .maybeSingle();

    // New users (e.g. sign up → payment without visiting dashboard) may have no merchant row yet. Create one so the webhook can update plan.
    if (!merchantRow) {
      await anonWithUser
        .from("merchants")
        .upsert({ id: merchantId, plan: "free", updated_at: new Date().toISOString() }, { onConflict: "id" });
    }

    stripeCustomerId = (merchantRow as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;

    // If we previously saved a Stripe customer id but it no longer exists in this Stripe account
    // (test/live mismatch, deleted customer, etc.), Stripe will throw "No such customer".
    // Recover by creating a fresh Stripe customer and updating `merchants`.
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("No such customer") || msg.includes("resource_missing")) {
          stripeCustomerId = null;
        } else {
          throw e;
        }
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { merchant_id: merchantId },
      });
      stripeCustomerId = customer.id;
      await anonWithUser.from("merchants").update({ stripe_customer_id: stripeCustomerId }).eq("id", merchantId);
    }

    // Cancel any existing active subscriptions so the customer only has one (prevents stacking when switching plans)
    const existing = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 100,
    });
    for (const sub of existing.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { merchant_id: merchantId, plan },
    });

    const invoice = subscription.latest_invoice as { payment_intent?: { client_secret: string } } | null;
    const clientSecret = invoice?.payment_intent?.client_secret ?? null;
    if (!clientSecret) {
      return NextResponse.json(
        { error: "Could not create payment session. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });
  } catch (err) {
    console.error("Create subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Subscription creation failed" },
      { status: 500 }
    );
  }
}
