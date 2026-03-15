import { supabase } from "@/lib/supabase";
import type { Merchant } from "@/types/merchant";
import { DEFAULT_MERCHANT } from "@/types/merchant";

const MERCHANT_ID = "default";

const MERCHANT_COLUMNS_BASE = "id, plan, business_name, business_tagline, logo_url, colour_background, colour_waiting, colour_ready, colour_left_column, colour_right_column, colour_middle_column, message_queue, message_ready, message_thankyou, close_btn_text, close_btn_url";
const MERCHANT_COLUMNS_WITH_BANNER = `${MERCHANT_COLUMNS_BASE}, promo_banner_url`;
const MERCHANT_COLUMNS_WITH_STRIPE = "stripe_customer_id, stripe_subscription_id";
const MERCHANT_COLUMNS_FULL = `${MERCHANT_COLUMNS_WITH_BANNER}, promo_banner_link, ${MERCHANT_COLUMNS_WITH_STRIPE}`;
const MERCHANT_COLUMNS_FULL_NO_STRIPE = `${MERCHANT_COLUMNS_WITH_BANNER}, promo_banner_link`;

function isPromoBannerColumnMissing(error: { message?: string }): boolean {
  return String(error?.message ?? "").includes("promo_banner_url") && String(error?.message ?? "").includes("does not exist");
}

function isPromoBannerLinkColumnMissing(error: { message?: string }): boolean {
  return String(error?.message ?? "").includes("promo_banner_link") && String(error?.message ?? "").includes("does not exist");
}

function isStripeColumnMissing(error: { message?: string }): boolean {
  const msg = String(error?.message ?? "");
  return (msg.includes("stripe_customer_id") || msg.includes("stripe_subscription_id")) && msg.includes("does not exist");
}

function toMerchant(data: Record<string, unknown> | null, id: string): Merchant {
  if (!data) return { ...DEFAULT_MERCHANT, id };
  return {
    ...DEFAULT_MERCHANT,
    ...data,
    promo_banner_url: (data.promo_banner_url as string | null) ?? null,
    promo_banner_link: (data.promo_banner_link as string | null) ?? null,
  } as Merchant;
}

export async function getMerchant(id: string = MERCHANT_ID): Promise<Merchant> {
  const { data, error } = await supabase
    .from("merchants")
    .select(MERCHANT_COLUMNS_FULL)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isPromoBannerColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_BASE)
        .eq("id", id)
        .maybeSingle();
      return toMerchant(fallback as Record<string, unknown> | null, id);
    }
    if (isPromoBannerLinkColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_WITH_BANNER)
        .eq("id", id)
        .maybeSingle();
      return toMerchant(fallback ? { ...fallback, promo_banner_link: null } as Record<string, unknown> : null, id);
    }
    if (isStripeColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_FULL_NO_STRIPE)
        .eq("id", id)
        .maybeSingle();
      return toMerchant(fallback as Record<string, unknown> | null, id);
    }
    const msg = error.message || String(error.code ?? "unknown");
    if (msg.includes("does not exist") || (error as { code?: string }).code === "42P01") {
      console.warn("Merchants table not found. Run supabase/migrations/20250306000000_merchants.sql in Supabase SQL Editor to enable settings.");
    } else {
      console.error("Error fetching merchant:", msg);
    }
    return { ...DEFAULT_MERCHANT, id };
  }
  return toMerchant(data as Record<string, unknown>, id);
}

/** For dashboard (single-tenant). */
export async function getDefaultMerchant(): Promise<Merchant> {
  return getMerchant(MERCHANT_ID);
}

const ANON_STORAGE_KEY = "qready_anon_merchant_id";

/** For "Try for free" without sign-in: each browser session gets its own merchant (default scheme, empty queue). */
export async function getOrCreateAnonymousMerchant(): Promise<Merchant> {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MERCHANT, id: "default" };
  }
  let id = sessionStorage.getItem(ANON_STORAGE_KEY);
  if (!id) {
    const uuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    id = "anon-" + uuid;
    sessionStorage.setItem(ANON_STORAGE_KEY, id);
  }
  await createMerchantForUser(id);
  const m = await getMerchant(id);
  return m ?? { ...DEFAULT_MERCHANT, id };
}

export async function updateMerchant(updates: Partial<Merchant>): Promise<Merchant | null> {
  const id = updates.id ?? MERCHANT_ID;
  const row: Record<string, unknown> = { id, ...updates, updated_at: new Date().toISOString() };
  if (updates.plan !== undefined) row.plan = updates.plan;
  let { data, error } = await supabase
    .from("merchants")
    .upsert(row, { onConflict: "id" })
    .select(MERCHANT_COLUMNS_FULL)
    .single();
  if (error && isPromoBannerColumnMissing(error)) {
    const { promo_banner_url: _drop, ...rest } = updates;
    const rowWithoutBanner: Record<string, unknown> = { id, ...rest, updated_at: new Date().toISOString() };
    if (updates.plan !== undefined) rowWithoutBanner.plan = updates.plan;
    const res = await supabase
      .from("merchants")
      .upsert(rowWithoutBanner, { onConflict: "id" })
      .select(MERCHANT_COLUMNS_BASE)
      .single();
    if (!res.error && res.data) {
      return toMerchant({ ...res.data, promo_banner_url: null, promo_banner_link: null } as Record<string, unknown>, id);
    }
    data = res.data;
    error = res.error;
  }
  if (error && isPromoBannerLinkColumnMissing(error)) {
    const { promo_banner_link: _dropLink, ...rest } = updates;
    const rowWithoutBannerLink: Record<string, unknown> = { id, ...rest, updated_at: new Date().toISOString() };
    if (updates.plan !== undefined) rowWithoutBannerLink.plan = updates.plan;
    const res = await supabase
      .from("merchants")
      .upsert(rowWithoutBannerLink, { onConflict: "id" })
      .select(MERCHANT_COLUMNS_WITH_BANNER)
      .single();
    if (!res.error && res.data) {
      return toMerchant({ ...res.data, promo_banner_link: null } as Record<string, unknown>, id);
    }
    data = res.data;
    error = res.error;
  }
  if (error) {
    const msg = error.message || String((error as { code?: string }).code ?? "unknown");
    if (msg.includes("does not exist") || (error as { code?: string }).code === "42P01") {
      console.warn("Merchants table not found. Run supabase/migrations/20250306000000_merchants.sql in Supabase SQL Editor to save settings.");
    } else {
      console.error("Error updating merchant:", error.message);
    }
    return null;
  }
  return toMerchant(data as Record<string, unknown>, id);
}

export async function upsertMerchantDefault(): Promise<void> {
  await supabase.from("merchants").upsert(
    { id: MERCHANT_ID, plan: "free", updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}

/** Get merchant for an auth user (id = their auth user id). Returns null if none. */
export async function getMerchantByUserId(userId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from("merchants")
    .select(MERCHANT_COLUMNS_FULL)
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (isPromoBannerColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_BASE)
        .eq("id", userId)
        .maybeSingle();
      return fallback ? toMerchant(fallback as Record<string, unknown>, userId) : null;
    }
    if (isPromoBannerLinkColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_WITH_BANNER)
        .eq("id", userId)
        .maybeSingle();
      return fallback ? toMerchant({ ...fallback, promo_banner_link: null } as Record<string, unknown>, userId) : null;
    }
    if (isStripeColumnMissing(error)) {
      const { data: fallback } = await supabase
        .from("merchants")
        .select(MERCHANT_COLUMNS_FULL_NO_STRIPE)
        .eq("id", userId)
        .maybeSingle();
      return fallback ? toMerchant(fallback as Record<string, unknown>, userId) : null;
    }
    console.error("Error fetching merchant by user:", error.message);
    return null;
  }
  if (!data) return null;
  return toMerchant(data as Record<string, unknown>, userId);
}

/** Create a new merchant row for an auth user (id = userId). Call after signup so they have their own dashboard. */
export async function createMerchantForUser(userId: string): Promise<Merchant | null> {
  const row = {
    id: userId,
    plan: "free" as const,
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await supabase
    .from("merchants")
    .upsert(row, { onConflict: "id" })
    .select(MERCHANT_COLUMNS_FULL)
    .single();
  if (error && isPromoBannerColumnMissing(error)) {
    const res = await supabase
      .from("merchants")
      .upsert(row, { onConflict: "id" })
      .select(MERCHANT_COLUMNS_BASE)
      .single();
    if (!res.error && res.data) {
      return toMerchant({ ...res.data, promo_banner_url: null, promo_banner_link: null } as Record<string, unknown>, userId);
    }
    data = res.data;
    error = res.error;
  }
  if (error && isPromoBannerLinkColumnMissing(error)) {
    const res = await supabase
      .from("merchants")
      .upsert(row, { onConflict: "id" })
      .select(MERCHANT_COLUMNS_WITH_BANNER)
      .single();
    if (!res.error && res.data) {
      return toMerchant({ ...res.data, promo_banner_link: null } as Record<string, unknown>, userId);
    }
    data = res.data;
    error = res.error;
  }
  if (error && isStripeColumnMissing(error)) {
    const res = await supabase
      .from("merchants")
      .upsert(row, { onConflict: "id" })
      .select(MERCHANT_COLUMNS_FULL_NO_STRIPE)
      .single();
    if (!res.error && res.data) {
      return toMerchant(res.data as Record<string, unknown>, userId);
    }
    data = res.data;
    error = res.error;
  }
  if (error) {
    console.error("Error creating merchant for user:", error.message);
    return null;
  }
  if (!data) return null;
  return toMerchant(data as Record<string, unknown>, userId);
}
