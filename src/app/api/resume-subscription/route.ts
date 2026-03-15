import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * POST /api/resume-subscription
 * Resumes a subscription that was set to cancel at period end (turns off cancel_at_period_end).
 * Header: Authorization: Bearer <Supabase access_token>
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await request.json().catch(() => ({})) as { accessToken?: string };
    const token = accessToken ?? body.accessToken ?? null;
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anon.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const merchantId = user.id;
    const anonWithUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: merchantRow } = await anonWithUser
      .from("merchants")
      .select("stripe_subscription_id")
      .eq("id", merchantId)
      .maybeSingle();

    const subscriptionId = (merchantRow as { stripe_subscription_id?: string } | null)?.stripe_subscription_id ?? null;
    if (!subscriptionId) {
      return NextResponse.json({ error: "No subscription to resume" }, { status: 404 });
    }

    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resume subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resume subscription" },
      { status: 500 }
    );
  }
}
