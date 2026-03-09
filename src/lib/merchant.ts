import { supabase } from "@/lib/supabase";
import type { Merchant } from "@/types/merchant";
import { DEFAULT_MERCHANT } from "@/types/merchant";

const MERCHANT_ID = "default";

const MERCHANT_COLUMNS = "id, plan, business_name, business_tagline, logo_url, colour_background, colour_waiting, colour_ready, colour_left_column, colour_right_column, colour_middle_column, message_queue, message_ready, message_thankyou, close_btn_text, close_btn_url";

export async function getMerchant(id: string = MERCHANT_ID): Promise<Merchant> {
  const { data, error } = await supabase
    .from("merchants")
    .select(MERCHANT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const msg = error.message || String(error.code ?? "unknown");
    if (msg.includes("does not exist") || error.code === "42P01") {
      console.warn("Merchants table not found. Run supabase/migrations/20250306000000_merchants.sql in Supabase SQL Editor to enable settings.");
    } else {
      console.error("Error fetching merchant:", msg);
    }
    return { ...DEFAULT_MERCHANT, id };
  }
  if (!data) return { ...DEFAULT_MERCHANT, id };
  return data as Merchant;
}

/** For dashboard (single-tenant). */
export async function getDefaultMerchant(): Promise<Merchant> {
  return getMerchant(MERCHANT_ID);
}

export async function updateMerchant(updates: Partial<Merchant>): Promise<Merchant | null> {
  const row = { id: MERCHANT_ID, plan: updates.plan ?? "free", ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("merchants")
    .upsert(row, { onConflict: "id" })
    .select(MERCHANT_COLUMNS)
    .single();
  if (error) {
    const msg = error.message || String(error.code ?? "unknown");
    if (msg.includes("does not exist") || error.code === "42P01") {
      console.warn("Merchants table not found. Run supabase/migrations/20250306000000_merchants.sql in Supabase SQL Editor to save settings.");
    } else {
      console.error("Error updating merchant:", msg);
    }
    return null;
  }
  return data as Merchant;
}

export async function upsertMerchantDefault(): Promise<void> {
  await supabase.from("merchants").upsert(
    { id: MERCHANT_ID, plan: "free", updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}
