import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe, planFromSubscription } from "@/lib/stripe-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * POST /api/sync-plan
 * Syncs the merchant's plan from Stripe (source of truth) into the database.
 * Call this when the Account page loads so the UI matches Stripe even if webhooks were missed.
 * Body or Header: Bearer <Supabase access_token>
 */
export async function POST(request: Request) {
  try {
    let accessToken: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) accessToken = authHeader.slice(7);
    const body = await request.json().catch(() => ({})) as { accessToken?: string };
    if (!accessToken) accessToken = body.accessToken ?? null;
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
      .select("stripe_customer_id, plan")
      .eq("id", merchantId)
      .maybeSingle();

    let stripeCustomerId = (merchantRow as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
    const currentPlan = (merchantRow as { plan?: string } | null)?.plan ?? "free";

    // Recover if we stored a Stripe customer id that does not exist in the current Stripe account
    // (test/live mismatch, deleted customer, etc.).
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

    // If merchant has no stripe_customer_id (e.g. new user paid before merchant row existed), try to find Stripe customer by email and link + sync
    let subscription: Stripe.Subscription | null = null;
    if (!stripeCustomerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 5 });
      for (const customer of customers.data ?? []) {
        const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
        const sub = subs.data?.[0] ?? null;
        if (sub) {
          stripeCustomerId = customer.id;
          subscription = sub;
          break;
        }
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ plan: currentPlan, synced: false });
    }

    if (!subscription) {
      const activeSubs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });
      subscription = activeSubs.data?.[0] ?? null;
    }

    const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
    const admin = createSupabaseAdmin();

    if (subscription) {
      const plan = planFromSubscription(subscription);
      const { error } = await admin
        .from("merchants")
        .update({
          plan,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);
      if (error) {
        console.error("Sync plan: failed to update merchant:", error.message);
        return NextResponse.json({ plan: currentPlan, synced: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ plan, synced: true });
    }

    const { error } = await admin
      .from("merchants")
      .update({
        plan: "free",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId);
    if (error) {
      console.error("Sync plan: failed to set free:", error.message);
      return NextResponse.json({ plan: currentPlan, synced: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ plan: "free", synced: true });
  } catch (err) {
    console.error("Sync plan error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
