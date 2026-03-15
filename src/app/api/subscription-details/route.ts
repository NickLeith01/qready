import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, planFromSubscription } from "@/lib/stripe-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * GET /api/subscription-details
 * Returns the current subscription's period end and plan for the cancel modal.
 * Header: Authorization: Bearer <Supabase access_token>
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anon.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const merchantId = user.id;
    const anonWithUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: merchantRow } = await anonWithUser
      .from("merchants")
      .select("stripe_subscription_id")
      .eq("id", merchantId)
      .maybeSingle();

    const subscriptionId = (merchantRow as { stripe_subscription_id?: string } | null)?.stripe_subscription_id ?? null;
    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json({ error: "Subscription not active" }, { status: 404 });
    }

    const plan = planFromSubscription(subscription);
    const planLabel = plan === "premium" ? "Premium" : "Plus";
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    return NextResponse.json({
      periodEnd,
      plan,
      planLabel,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    });
  } catch (err) {
    console.error("Subscription details error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load subscription" },
      { status: 500 }
    );
  }
}
