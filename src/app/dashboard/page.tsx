"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDefaultMerchant, updateMerchant } from "@/lib/merchant";
import { uploadLogo } from "@/lib/uploadLogo";
import type { Merchant } from "@/types/merchant";

type Pager = {
  id: string;
  order_number: number;
  status: "waiting" | "ready" | "completed";
  created_at: string;
  merchant_id: string | null;
};

const BASE_URL_KEY = "digital-pager-base-url";

/** Free plan: max 5 in waiting. Bar shows 1–5 (green→red). At 5 can't add; at 6+ show over-limit pop-up. */
const FREE_PLAN_MAX_SLOTS = 5;
const BAR_SEGMENT_COLORS = [
  "bg-emerald-500",   // 1 – green
  "bg-yellow-400",    // 2 – yellow
  "bg-orange-400",    // 3 – orange
  "bg-orange-500",    // 4 – more orange
  "bg-rose-500",      // 5 – red
] as const;

export default function DashboardPage() {
  const [pagers, setPagers] = useState<Pager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newPager, setNewPager] = useState<{ id: string; order_number: number } | null>(null);
  // Manual base URL for QR (so customer phone can reach the app). Persisted in localStorage.
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setBaseUrlOverride(localStorage.getItem(BASE_URL_KEY) || "");
  }, []);
  useEffect(() => {
    getDefaultMerchant().then(setMerchant);
  }, []);

  // Fetch pagers (waiting + ready only)
  async function fetchPagers() {
    const { data, error } = await supabase
      .from("pagers")
      .select("*")
      .in("status", ["waiting", "ready"])
      .order("order_number", { ascending: true });
    if (error) {
      console.error("Error fetching pagers:", error);
      return;
    }
    setPagers(data ?? []);
  }

  useEffect(() => {
    fetchPagers();
    setLoading(false);

    // Realtime: when a row changes, refetch
    const channel = supabase
      .channel("pagers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagers" },
        () => fetchPagers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleNewOrder() {
    // Get next order number
    const maxOrder = pagers.length
      ? Math.max(...pagers.map((p) => p.order_number))
      : 0;
    const order_number = maxOrder + 1;

    const { data, error } = await supabase
      .from("pagers")
      .insert({ order_number, status: "waiting", merchant_id: "default" })
      .select("id, order_number")
      .single();

    if (error) {
      console.error("Error creating pager:", error);
      return;
    }
    setNewPager({ id: data.id, order_number: data.order_number });
    setShowNewOrder(true);
  }

  async function handleDone() {
    setShowNewOrder(false);
    setNewPager(null);
    fetchPagers();
  }

  async function markReady(id: string) {
    await supabase.from("pagers").update({ status: "ready" }).eq("id", id);
    fetchPagers();
  }

  async function markCollected(id: string) {
    await supabase.from("pagers").update({ status: "completed" }).eq("id", id);
    fetchPagers();
  }

  const waiting = pagers.filter((p) => p.status === "waiting");
  const ready = pagers.filter((p) => p.status === "ready");

  const isPaid = merchant?.plan === "paid";
  // Free plan only: bar 0–5, block new order and show message when at or over limit (5+)
  const slotsUsed = Math.min(waiting.length, FREE_PLAN_MAX_SLOTS);
  const cannotAddNewOrder = !isPaid && waiting.length >= FREE_PLAN_MAX_SLOTS;
  const showOverLimitPopup = !isPaid && waiting.length >= FREE_PLAN_MAX_SLOTS;

  // Base URL for QR: manual override (saved in localStorage) > env var > current origin
  // If user enters only http://192.168.1.28 (no port) for local IP, add :3000 so dev server is reachable
  const rawBase =
    typeof window !== "undefined"
      ? (baseUrlOverride.trim() || process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
      : "";
  const hasPort = rawBase && /^https?:\/\/[^/]+:\d+(\/|$)/.test(rawBase.replace(/\?.*$/, ""));
  const isLocalHost =
    rawBase && (rawBase.includes("localhost") || /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(rawBase));
  const baseUrl =
    rawBase && !hasPort && isLocalHost
      ? `${rawBase.replace(/\/$/, "")}:3000`
      : rawBase;
  // Only show Base URL / port hints when on localhost or private IP (dev); hide when published
  const isDevOrLocal =
    typeof window !== "undefined" &&
    (window.location.origin.includes("localhost") ||
      /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.origin));
  const pagerUrl =
    typeof window !== "undefined" && newPager
      ? `${baseUrl}/pager/${newPager.id}`
      : "";
  const qrSrc = pagerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pagerUrl)}`
    : "";

  const brandBg = merchant?.colour_background ? { backgroundColor: merchant.colour_background } : undefined;
  const waitingHeaderBg = merchant?.colour_waiting ? { backgroundColor: merchant.colour_waiting } : undefined;
  const readyHeaderBg = merchant?.colour_ready ? { backgroundColor: merchant.colour_ready } : undefined;
  const leftColumnBg = merchant?.colour_left_column ? { backgroundColor: merchant.colour_left_column } : undefined;
  const rightColumnBg = merchant?.colour_right_column ? { backgroundColor: merchant.colour_right_column } : undefined;
  const middleColumnBg = merchant?.colour_middle_column ? { backgroundColor: merchant.colour_middle_column } : undefined;

  const DEFAULT_BG = "#171717";
  const NUMBER_BOX_BG = "#262626";
  const DEFAULT_WAITING = "#1e4ed8";
  const DEFAULT_READY = "#5ec26a";
  const keyline = "border-[#525252]";

  // For light backgrounds (e.g. white), use dark text so branding stays visible
  const brandBarBg = brandBg?.backgroundColor ?? DEFAULT_BG;
  const isLightBg = (hex: string) => {
    const h = hex.replace(/^#/, "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 0.5;
  };
  const brandTextClass = isLightBg(brandBarBg) ? "text-zinc-900" : "text-white";
  const brandTaglineClass = isLightBg(brandBarBg) ? "text-zinc-600" : "text-zinc-400";

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden text-white" style={{ backgroundColor: DEFAULT_BG }}>
      {/* Full-width brand bar – Brand colour */}
      <div className={`flex min-h-[5.25rem] shrink-0 items-center justify-center border-b ${keyline} px-4 py-2 w-full`} style={brandBg || { backgroundColor: DEFAULT_BG }}>
        {merchant?.logo_url?.trim() ? (
          <img src={merchant.logo_url.trim()} alt="" className="max-h-[5.25rem] w-full max-w-full object-contain object-center" referrerPolicy="no-referrer" />
        ) : (
          <>
            <span className={`text-[1.4rem] font-semibold ${brandTextClass}`}>{merchant?.business_name?.trim() || "BURGER Shack"}</span>
            {merchant?.business_tagline?.trim() ? (
              <span className={`ml-2 text-[1.4rem] ${brandTaglineClass}`}>{merchant.business_tagline.trim()}</span>
            ) : null}
          </>
        )}
      </div>
      <main className="flex min-h-0 flex-1 flex-row gap-0">
        {/* Left column – WAITING */}
        <section className={`flex min-h-0 w-1/3 flex-col border-r ${keyline}`}>
          <div className={`flex h-12 shrink-0 items-center justify-center rounded-none border px-4 py-1.5 text-center text-sm font-semibold uppercase tracking-wide ${keyline}`} style={waitingHeaderBg || { backgroundColor: DEFAULT_WAITING }}>
            Waiting
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2" style={leftColumnBg || { backgroundColor: DEFAULT_BG }}>
            {loading ? (
              <p className="p-4 text-zinc-400">Loading…</p>
            ) : waiting.length === 0 ? (
              <p className="p-4 text-zinc-500">No orders waiting</p>
            ) : (
              <ul className="space-y-2">
                {waiting.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded border px-3 py-2 ${keyline}`}
                    style={{ backgroundColor: NUMBER_BOX_BG }}
                  >
                    <span className="text-xl font-bold">#{String(p.order_number).padStart(3, "0")}</span>
                    <button
                      type="button"
                      onClick={() => markReady(p.id)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium opacity-90 hover:opacity-100 ${keyline}`}
                      style={{ backgroundColor: merchant?.colour_waiting || DEFAULT_WAITING }}
                    >
                      Ready?
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Middle – Background colour (dashboard only); no side borders so keylines match (left/right columns draw the dividers) */}
        <section className={`relative flex min-h-0 w-1/3 flex-col ${keyline}`} style={middleColumnBg || { backgroundColor: DEFAULT_BG }}>
          <div className="flex min-h-0 flex-1 flex-col p-6" style={middleColumnBg || { backgroundColor: DEFAULT_BG }}>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          {showNewOrder && newPager ? (
            <div className="flex w-full flex-col items-center gap-4">
              <p className="text-center text-sm text-zinc-300">
                Scan to avoid the queue
                <br />
                <span className="font-medium text-white">NO LOGIN REQUIRED</span>
              </p>
              {isDevOrLocal && (
                <div className="w-full max-w-xs">
                  <label className="mb-1 block text-left text-xs text-zinc-400">
                    Base URL for customer link (use your Mac’s IP so phone can open it)
                  </label>
                  <p className="mb-1 text-left text-xs text-zinc-500">
                    Include the port, e.g. <code className="rounded bg-zinc-800 px-1">:3000</code> — otherwise the link won’t work.
                  </p>
                  <input
                    type="url"
                    value={baseUrlOverride}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBaseUrlOverride(v);
                      if (typeof window !== "undefined") localStorage.setItem(BASE_URL_KEY, v);
                    }}
                    placeholder="e.g. http://192.168.1.28:3000"
                    className={`w-full rounded border bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 ${keyline}`}
                  />
                </div>
              )}
              {qrSrc && (
                <img src={qrSrc} alt="QR code for pager" className={`rounded-lg border bg-white p-2 ${keyline}`} />
              )}
              {pagerUrl && (
                <>
                  <p className="max-w-full break-all text-center text-xs text-zinc-400">
                    {pagerUrl}
                  </p>
                  {isDevOrLocal && pagerUrl.startsWith("http://localhost") && (
                    <p className="max-w-sm text-center text-xs text-amber-400">
                      QR points to localhost — customer’s phone won’t open it. Enter your Mac’s URL above (e.g. http://192.168.1.28:3000).
                    </p>
                  )}
                </>
              )}
              <p className="text-2xl font-bold">#{String(newPager.order_number).padStart(3, "0")}</p>
              <button
                type="button"
                onClick={handleDone}
                className={`rounded-full border bg-rose-600 px-12 py-4 text-lg font-bold uppercase hover:bg-rose-500 ${keyline}`}
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNewOrder}
              disabled={cannotAddNewOrder}
              className={`rounded-full border bg-rose-600 px-12 py-4 text-lg font-bold uppercase hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 ${keyline}`}
            >
              New order
            </button>
          )}
            </div>
            {/* Free plan only: bar (1–5 green→red) + label; paid has no limit or bar */}
            {!isPaid && (
              <div className={`mt-auto shrink-0 w-full space-y-1 rounded border px-2 pt-4 ${keyline}`}>
                <div className="flex w-full gap-0.5 overflow-hidden rounded">
                  {Array.from({ length: FREE_PLAN_MAX_SLOTS }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 ${i < slotsUsed ? BAR_SEGMENT_COLORS[i] : "bg-zinc-700"}`}
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-zinc-400">
                  Free plan: {slotsUsed} of {FREE_PLAN_MAX_SLOTS} slots used
                </p>
              </div>
            )}
          </div>
          {/* Over-limit pop-up: 6+ in waiting – fills middle column */}
          {showOverLimitPopup && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-6">
              <div className={`w-full max-w-sm rounded-lg border bg-zinc-900 p-6 text-center shadow-xl ${keyline}`}>
                <h2 className="text-lg font-semibold text-white">Free plan limit reached</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  You have {waiting.length} orders in the waiting queue. The free plan allows a maximum of {FREE_PLAN_MAX_SLOTS} at a time.
                </p>
                <p className="mt-3 text-sm text-zinc-400">
                  Move orders to Ready to free slots, or upgrade to the paid plan for more capacity.
                </p>
                <p className="mt-4 text-xs text-zinc-500">Plan details TBC</p>
              </div>
            </div>
          )}
        </section>

        {/* Right column – READY */}
        <section className={`flex min-h-0 w-1/3 flex-col border-l ${keyline}`}>
          <div className={`flex h-12 shrink-0 items-center justify-center rounded-none border px-4 py-1.5 text-center text-sm font-semibold uppercase tracking-wide ${keyline}`} style={readyHeaderBg || { backgroundColor: DEFAULT_READY }}>
            Ready
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2" style={rightColumnBg || { backgroundColor: DEFAULT_BG }}>
            {loading ? (
              <p className="p-4 text-zinc-400">Loading…</p>
            ) : ready.length === 0 ? (
              <p className="p-4 text-zinc-500">No orders ready</p>
            ) : (
              <ul className="space-y-2">
                {ready.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded border px-3 py-2 ${keyline}`}
                    style={{ backgroundColor: NUMBER_BOX_BG }}
                  >
                    <span className="text-xl font-bold">#{String(p.order_number).padStart(3, "0")}</span>
                    <button
                      type="button"
                      onClick={() => markCollected(p.id)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium opacity-90 hover:opacity-100 ${keyline}`}
                      style={{ backgroundColor: merchant?.colour_ready || DEFAULT_READY }}
                    >
                      Collected
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {/* Bottom bar – same colour as page background */}
      <footer className={`relative flex h-12 shrink-0 items-center justify-between border-t px-4 ${keyline}`} style={{ backgroundColor: DEFAULT_BG }}>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Settings"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <img src="/qready-logo.png" alt="Qready" className="h-7 w-auto max-w-[120px] object-contain object-center" referrerPolicy="no-referrer" />
        </div>
        <span className="shrink-0 text-right text-sm text-zinc-400">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          {new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </footer>

      {/* Settings modal */}
      {settingsOpen && merchant && (
        <SettingsModal
          merchant={merchant}
          onClose={() => setSettingsOpen(false)}
          onSave={async (updates) => {
            const updated = await updateMerchant(updates);
            setMerchant((prev) => (prev ? { ...prev, ...updates, ...(updated ?? {}) } : updated ?? null));
            setSettingsOpen(false);
          }}
          onPlanChange={async (plan) => {
            setMerchant((m) => (m ? { ...m, plan } : null));
            const updated = await updateMerchant({ plan });
            if (updated) {
              setMerchant(updated);
            }
            // If update failed (e.g. DB missing columns), keep optimistic "paid" so you can still test colours
          }}
        />
      )}
    </div>
  );
}

function SettingsModal({
  merchant,
  onClose,
  onSave,
  onPlanChange,
}: {
  merchant: Merchant;
  onClose: () => void;
  onSave: (updates: Partial<Merchant>) => Promise<void>;
  onPlanChange?: (plan: "free" | "paid") => Promise<void>;
}) {
  const isPaid = merchant.plan === "paid";
  const [businessName, setBusinessName] = useState(merchant.business_name ?? "");
  const [businessTagline, setBusinessTagline] = useState(merchant.business_tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(merchant.logo_url ?? "");
  const [colourBackground, setColourBackground] = useState(merchant.colour_background ?? "#171717");
  const [colourWaiting, setColourWaiting] = useState(merchant.colour_waiting ?? "#1e4ed8");
  const [colourReady, setColourReady] = useState(merchant.colour_ready ?? "#5ec26a");
  const [colourLeftColumn, setColourLeftColumn] = useState(merchant.colour_left_column ?? "#171717");
  const [colourRightColumn, setColourRightColumn] = useState(merchant.colour_right_column ?? "#171717");
  const [colourMiddleColumn, setColourMiddleColumn] = useState(merchant.colour_middle_column ?? "#171717");
  const [messageQueue, setMessageQueue] = useState(merchant.message_queue ?? "You are in the queue!");
  const [messageReady, setMessageReady] = useState(merchant.message_ready ?? "Your order is ready for collection!");
  const [messageThankyou, setMessageThankyou] = useState(merchant.message_thankyou ?? "Thank you for your order");
  const [closeBtnText, setCloseBtnText] = useState(merchant.close_btn_text ?? "Close");
  const [closeBtnUrl, setCloseBtnUrl] = useState(merchant.close_btn_url ?? "");
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates: Partial<Merchant> = { business_name: businessName || null, business_tagline: businessTagline || null };
    if (isPaid) {
      updates.logo_url = logoUrl || null;
      updates.colour_background = colourBackground || null;
      updates.colour_waiting = colourWaiting || null;
      updates.colour_ready = colourReady || null;
      updates.colour_left_column = colourLeftColumn || null;
      updates.colour_right_column = colourRightColumn || null;
      updates.colour_middle_column = colourMiddleColumn || null;
      updates.message_queue = messageQueue || null;
      updates.message_ready = messageReady || null;
      updates.message_thankyou = messageThankyou || null;
      updates.close_btn_text = closeBtnText || null;
      updates.close_btn_url = closeBtnUrl || null;
    }
    await onSave(updates);
    setSaving(false);
  }

  const lockClass = "pointer-events-none opacity-50";
  const LockIcon = () => (
    <span className="ml-1.5 text-zinc-500" title="Paid plan feature">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    </span>
  );

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">✕</button>
        </div>
        <div className="min-h-0 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* 1. Business name + tagline (free) */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-zinc-300">
              1. Business name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. BURGER Shack"
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500"
            />
            <input
              type="text"
              value={businessTagline}
              onChange={(e) => setBusinessTagline(e.target.value)}
              placeholder="Tag line"
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* 2. Custom logo (paid) – upload (max 2MB) or URL. Replaces business name in header. */}
          <div className={!isPaid ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              2. Custom logo
              {!isPaid && <LockIcon />}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">Replaces business name in the header. Max recommended size: 400×120px.</p>
            <div className="mt-1 space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
                  {logoUploading ? "Uploading…" : "Upload logo (max 2MB)"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={!isPaid || logoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !isPaid) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert("Logo must be 2MB or smaller.");
                        return;
                      }
                      setLogoUploading(true);
                      const url = await uploadLogo(file);
                      if (url) setLogoUrl(url);
                      setLogoUploading(false);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Or paste logo image URL"
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* 3. Colours (paid) – Brand, Waiting, Ready, Left column, Right column */}
          <div className={!isPaid ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              3. Colours
              {!isPaid && <LockIcon />}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">1. Brand: top bar, phone 1 &amp; 4. 2. Waiting: left header + boxes, phone 2. 3. Ready: right header + boxes, phone 3. 4–6: left / right / middle column (dashboard).</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-zinc-500">1. Brand</span>
                <input type="color" value={colourBackground} onChange={(e) => setColourBackground(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
              <div>
                <span className="text-xs text-zinc-500">2. Waiting</span>
                <input type="color" value={colourWaiting} onChange={(e) => setColourWaiting(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
              <div>
                <span className="text-xs text-zinc-500">3. Ready</span>
                <input type="color" value={colourReady} onChange={(e) => setColourReady(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
              <div>
                <span className="text-xs text-zinc-500">4. Left column</span>
                <input type="color" value={colourLeftColumn} onChange={(e) => setColourLeftColumn(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
              <div>
                <span className="text-xs text-zinc-500">5. Right column</span>
                <input type="color" value={colourRightColumn} onChange={(e) => setColourRightColumn(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
              <div>
                <span className="text-xs text-zinc-500">6. Background (middle column)</span>
                <input type="color" value={colourMiddleColumn} onChange={(e) => setColourMiddleColumn(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
            </div>
          </div>

          {/* 4. Three key messages (paid) */}
          <div className={!isPaid ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              4. Key messages on pager screens
              {!isPaid && <LockIcon />}
            </label>
            <div className="mt-1 space-y-2">
              <input type="text" value={messageQueue} onChange={(e) => setMessageQueue(e.target.value)} placeholder="Queue message" className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
              <input type="text" value={messageReady} onChange={(e) => setMessageReady(e.target.value)} placeholder="Ready message" className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
              <input type="text" value={messageThankyou} onChange={(e) => setMessageThankyou(e.target.value)} placeholder="Thank you message" className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
            </div>
          </div>

          {/* 5. Close button redirect (paid) */}
          <div className={!isPaid ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              5. Close button → custom text & URL
              {!isPaid && <LockIcon />}
            </label>
            <div className="mt-1 space-y-2">
              <input type="text" value={closeBtnText} onChange={(e) => setCloseBtnText(e.target.value)} placeholder="e.g. Leave a review" className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
              <input type="url" value={closeBtnUrl} onChange={(e) => setCloseBtnUrl(e.target.value)} placeholder="e.g. https://trustpilot.com/..." className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500" />
            </div>
          </div>
        </div>
        </div>
        <div className="shrink-0 border-t border-zinc-700 p-4 space-y-3">
          <button type="button" onClick={handleSave} disabled={saving} className="w-full rounded-full bg-rose-600 py-3 font-semibold text-white hover:bg-rose-500 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {onPlanChange && (
            <div className="rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2">
              <p className="text-xs text-zinc-500 mb-1.5">Testing: switch plan</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => onPlanChange("free")} className="flex-1 rounded bg-zinc-700 py-1.5 text-xs text-white hover:bg-zinc-600">
                  Free
                </button>
                <button type="button" onClick={() => onPlanChange("paid")} className="flex-1 rounded bg-emerald-700 py-1.5 text-xs text-white hover:bg-emerald-600">
                  Paid
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
