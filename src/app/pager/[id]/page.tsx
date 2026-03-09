"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getMerchant } from "@/lib/merchant";
import type { Merchant } from "@/types/merchant";

type PagerStatus = "waiting" | "ready" | "completed";

// Layout: matched to SVG spec (viewBox 375×812) – content y 95.77→659.89, bottom bar 73.47
const MAIN_CLASS = "flex flex-1 min-h-0 flex-col overflow-hidden";
const FOOTER_SPACER_CLASS = "shrink-0 pager-footer-spacer w-full";
// From SVG: content top 95.77; LOGO_BRAND y≈217 → 121px from content top; #011 baseline 601.13, bar at 659.89
const BRAND_TOP_PX = 61;
const BRAND_LOGO_MAX_H_PX = 56;
const ORDER_NUM_BOTTOM_PX = 16;
const GAP_1_2_REDUCTION_PX = 36; // gap between 1 & 2 (higher = less negative = block lower; was 86, +50px = 36)
const MAIN_SUB_UP_PX = -122; // main copy (2) and sub-copy (3) offset down (marginTop = 122px)
// Typography (SVG: order # 46.53px, sub 13.19; we keep title 25px, order # 47px, sub 13px for closer match)
const ORDER_NUM_CLASS = "text-[47px] font-bold tabular-nums leading-none";
const TITLE_CLASS = "text-[33px] font-bold uppercase leading-tight text-center";
const SUBTEXT_CLASS = "text-[13px] text-center opacity-90";
const BTN_CLASS = "rounded-full font-semibold uppercase w-full max-w-[272px] text-[17px] h-[42px] flex items-center justify-center";

function PagerBrandBlock({
  logoUrl,
  businessName,
  tagline,
}: {
  logoUrl: string | null;
  businessName: string;
  tagline: string;
}) {
  return (
    <div className="shrink-0 w-full px-6" style={{ paddingTop: BRAND_TOP_PX }}>
      {logoUrl ? (
        <div className="flex justify-center">
          <img
            src={logoUrl}
            alt=""
            className="w-full max-w-full object-contain object-center"
            style={{ maxHeight: BRAND_LOGO_MAX_H_PX }}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <span className="text-xl font-bold uppercase tracking-wide text-inherit">{businessName}</span>
          {tagline ? <span className="mt-0.5 text-base opacity-80">{tagline}</span> : null}
        </div>
      )}
    </div>
  );
}

function PagerFooter({ borderClass = "border-zinc-700" }: { borderClass?: string }) {
  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-10 flex h-14 items-center justify-center border-t ${borderClass} bg-black pt-2 pager-footer-fixed`}
    >
      <img
        src="/qready-logo.png"
        alt="Qready"
        className="h-7 w-auto max-w-[120px] object-contain object-center"
        referrerPolicy="no-referrer"
      />
    </footer>
  );
}

export default function PagerPage() {
  const params = useParams();
  const id = params.id as string;
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [status, setStatus] = useState<PagerStatus | null>(null);
  const [started, setStarted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const hasPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Lock viewport: no page scroll so footer logo is always visible
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Play "ready" sound and vibrate. Call only from a user gesture (e.g. tap on green screen).
  // Create a fresh AudioContext here if needed — after lock/tab switch the old one is often suspended and won't play.
  function playReadyAlert() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }
    if (typeof window === "undefined") return;
    try {
      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new Ctx();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gain.gain.value = 0.3;
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 880;
      o2.type = "sine";
      g2.gain.value = 0.3;
      o2.start(ctx.currentTime + 0.4);
      o2.stop(ctx.currentTime + 0.65);
    } catch {
      // ignore
    }
  }

  // Fetch latest pager from server (used on load and when page becomes visible again after lock/tab switch)
  async function refetchPager() {
    if (!id) return;
    const { data, error } = await supabase
      .from("pagers")
      .select("order_number, status, merchant_id")
      .eq("id", id)
      .single();
    if (error) {
      console.error("Error fetching pager:", error);
      return;
    }
    setOrderNumber(data.order_number);
    setStatus(data.status as PagerStatus);
    const mid = data.merchant_id ?? "default";
    getMerchant(mid).then(setMerchant);
    // If we just discovered we're ready (e.g. after waking phone), play sound after short delay so browser allows it
    if (data.status === "ready" && started && !hasPlayedRef.current && typeof document !== "undefined" && document.visibilityState === "visible") {
      setTimeout(() => {
        if (hasPlayedRef.current) return;
        hasPlayedRef.current = true;
        document.title = "Qready";
        playReadyAlert();
      }, 250);
    }
  }

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!id) return;
    refetchPager();

    const channel = supabase
      .channel(`pager-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pagers", filter: `id=eq.${id}` },
        (payload) => {
          const newStatus = payload.new?.status as PagerStatus;
          setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // When page becomes visible again (wake phone, switch back to tab), refetch so screen updates to green if staff clicked Ready while phone was locked
  useEffect(() => {
    if (typeof document === "undefined" || !id) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchPager();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [id]);

  // When status becomes "ready": if tab is visible, play now; else update title so they see it when they switch back
  useEffect(() => {
    if (status !== "ready" || !started || hasPlayedRef.current) return;

    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      hasPlayedRef.current = true;
      playReadyAlert();
    } else {
      if (typeof document !== "undefined") {
        document.title = "🔔 Your order is ready!";
      }
    }
  }, [status, started]);

  function handleStart() {
    // Create and unlock AudioContext on user gesture (required for iOS to allow sound later)
    if (typeof window !== "undefined" && !audioContextRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
    }
    setStarted(true);
  }

  function handleOnMyWay() {
    setAcknowledged(true);
    setThankYou(true);
  }

  if (orderNumber === null || status === null || merchant === null) {
    return (
      <div className="flex h-screen min-h-0 flex-col items-center justify-center overflow-hidden bg-zinc-900 text-white">
        <p>Loading…</p>
      </div>
    );
  }

  const businessName = merchant.business_name?.trim() || "BURGER Shack";
  const tagline = merchant.business_tagline?.trim() || "";
  const logoUrl = merchant.logo_url?.trim() || null;
  const bgColour = merchant.colour_background?.trim() || undefined;
  const waitingColour = merchant.colour_waiting?.trim() || undefined;
  const readyColour = merchant.colour_ready?.trim() || undefined;
  const msgQueue = merchant.message_queue?.trim() || "You are in the queue!";
  const msgReady = merchant.message_ready?.trim() || "Your order is ready for collection!";
  const msgThankyou = merchant.message_thankyou?.trim() || "Thank you for your order";
  const closeText = merchant.close_btn_text?.trim() || "Close";
  const closeUrl = merchant.close_btn_url?.trim() || null;

  // UI_04: Thank you + CLOSE (background colour; brand on bg; consistent layout)
  if (thankYou) {
    const thankYouBg = bgColour ? { backgroundColor: bgColour } : undefined;
    return (
      <div className="flex h-screen min-h-0 flex-col overflow-hidden text-white" style={thankYouBg || { backgroundColor: "#171717" }}>
        <main className={MAIN_CLASS} style={thankYouBg}>
          <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
          <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
            <div className="flex shrink-0 flex-col items-center justify-start px-6">
              <div style={{ marginTop: -MAIN_SUB_UP_PX }}>
                <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                  THANK YOU
                  {"\n"}
                  FOR
                  {"\n"}
                  YOUR ORDER
                </h1>
                {closeUrl ? (
                <a
                  href={closeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BTN_CLASS} mt-5 bg-white text-emerald-600 no-underline`}
                >
                  {closeText.toUpperCase()}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => window.close()}
                  className={`${BTN_CLASS} mt-5 bg-white text-emerald-600`}
              >
                {closeText.toUpperCase()}
              </button>
            )}
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 100 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
            <div className={FOOTER_SPACER_CLASS} aria-hidden />
          </div>
        </main>
        <PagerFooter />
      </div>
    );
  }

  // UI_03: Order ready – green, ON MY WAY (brand on bg; same layout)
  if (status === "ready" && started) {
    const readyBg = readyColour ? { backgroundColor: readyColour } : undefined;
    return (
      <div className="flex h-screen min-h-0 flex-col overflow-hidden text-white" style={readyBg || { backgroundColor: "#5ec26a" }}>
        <main className={MAIN_CLASS} style={readyBg}>
          <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
          <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
            <div className="flex shrink-0 flex-col items-center justify-start px-6">
              <div style={{ marginTop: -MAIN_SUB_UP_PX }}>
                <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                  YOUR ORDER
                  {"\n"}
                  IS READY FOR
                  {"\n"}
                  COLLECTION
                </h1>
                <button
                  type="button"
                  onClick={handleOnMyWay}
                  className={`${BTN_CLASS} mt-5 bg-white text-emerald-600`}
                >
                  ON MY WAY
                </button>
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 100 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
            <div className={FOOTER_SPACER_CLASS} aria-hidden />
          </div>
        </main>
        <PagerFooter borderClass="border-emerald-700" />
      </div>
    );
  }

  // UI_01: Tap to start pager (enable sound) – brand on bg; same layout
  if (!started) {
    const startBg = bgColour ? { backgroundColor: bgColour } : undefined;
    return (
      <div className="flex h-screen min-h-0 flex-col overflow-hidden text-white" style={startBg || { backgroundColor: "#171717" }}>
        <main
          className={MAIN_CLASS}
          style={startBg || { backgroundColor: "#171717" }}
          role="button"
          tabIndex={0}
          onClick={handleStart}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
        >
          <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
          <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
            <div className="flex shrink-0 flex-col items-center justify-start px-6">
              <div style={{ marginTop: -MAIN_SUB_UP_PX }}>
                <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                  TAP
                  {"\n"}
                  TO START
                  {"\n"}
                  PAGER
                </h1>
                <p className={`${SUBTEXT_CLASS} mt-5`}>We will buzz you when it&apos;s ready.</p>
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 100 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
            <div className={FOOTER_SPACER_CLASS} aria-hidden />
          </div>
        </main>
        <PagerFooter />
      </div>
    );
  }

  // UI_02: In the queue – keep tab open (brand on bg; same layout)
  const waitingBg = waitingColour ? { backgroundColor: waitingColour } : undefined;
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden text-white" style={waitingBg || { backgroundColor: "#1e4ed8" }}>
      <main className={MAIN_CLASS} style={waitingBg}>
        <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
        <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
          <div className="flex shrink-0 flex-col items-center justify-start px-6">
            <div style={{ marginTop: -MAIN_SUB_UP_PX }}>
              <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                YOU ARE
                {"\n"}
                IN THE
                {"\n"}
                QUEUE
              </h1>
              <p className={`${SUBTEXT_CLASS} mt-6 leading-tight`}>Keep this tab open. We will buzz you!</p>
            </div>
          </div>
          <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 100 }}>
            <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
          </div>
          <div className="min-h-0 flex-1" aria-hidden />
        <div className={FOOTER_SPACER_CLASS} aria-hidden />
        </div>
      </main>
      <PagerFooter borderClass="border-rose-700" />
    </div>
  );
}
