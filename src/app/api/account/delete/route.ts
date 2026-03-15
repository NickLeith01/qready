import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * DELETE /api/account/delete
 * Deletes the authenticated user's account (auth user + merchant row).
 * Body: { accessToken: string } or Authorization: Bearer <accessToken>
 */
export async function POST(request: Request) {
  try {
    let accessToken: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.slice(7);
    }
    if (!accessToken) {
      const body = await request.json().catch(() => ({}));
      accessToken = (body as { accessToken?: string }).accessToken ?? null;
    }
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anon.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const userId = user.id;
    let admin: SupabaseClient;
    try {
      const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
      admin = createSupabaseAdmin();
    } catch {
      return NextResponse.json(
        { error: "Account deletion is not configured (missing SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 503 }
      );
    }

    const { error: merchantError } = await admin.from("merchants").delete().eq("id", userId);
    if (merchantError) {
      console.error("Error deleting merchant row:", merchantError.message);
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError.message);
      return NextResponse.json(
        { error: `Could not delete account: ${deleteError.message}. Please contact support with your email to remove your account.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Account deletion failed" },
      { status: 500 }
    );
  }
}
