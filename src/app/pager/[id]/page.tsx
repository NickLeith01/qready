"use client";

import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getMerchant } from "@/lib/merchant";
import type { Merchant } from "@/types/merchant";

type PagerStatus = "waiting" | "ready" | "completed";

// Layout: main section fills space above fixed-height footer; no scroll (100dvh locked).
const MAIN_CLASS = "flex flex-1 min-h-0 flex-col overflow-hidden";
// Footer: ad 170px + gap 8px + powered-by 40px + vertical padding 16px = 234px (+ safe area in CSS)
const FOOTER_HEIGHT_PX = 234;
// From SVG: content top 95.77; LOGO_BRAND y≈217 → 121px from content top; #011 baseline 601.13, bar at 659.89. Reduced 40px so 1–4 sit higher.
const BRAND_TOP_PX = 21;
const BRAND_LOGO_MAX_H_PX = 56;
const ORDER_NUM_BOTTOM_PX = 16;
const GAP_1_2_REDUCTION_PX = 76; // gap between 1 & 2 (higher = more negative = items 2–4 move up; was 36, +40px)
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

function PagerFooter({
  borderClass = "border-transparent",
  promoBannerUrl,
  bannerLink,
}: {
  borderClass?: string;
  promoBannerUrl?: string | null;
  bannerLink?: string | null;
}) {
  const bannerImgUrl = promoBannerUrl?.trim() || null;
  const linkUrl = bannerLink?.trim() || null;
  const adContent = bannerImgUrl ? (
    linkUrl ? (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-[170px] w-full overflow-hidden bg-zinc-900"
      >
        <img
          src={bannerImgUrl}
          alt=""
          className="h-full w-full object-contain object-center"
          referrerPolicy="no-referrer"
        />
      </a>
    ) : (
      <div className="relative block h-[170px] w-full overflow-hidden bg-zinc-900">
        <img
          src={bannerImgUrl}
          alt=""
          className="h-full w-full object-contain object-center"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  ) : (
    <a
      href="https://www.qready.io"
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-[170px] w-full overflow-hidden"
    >
      <img
        src="/signedout-ad.gif"
        alt=""
        className="h-full w-full object-contain object-center"
        referrerPolicy="no-referrer"
      />
    </a>
  );

  return (
    <footer
      className={`shrink-0 border-t ${borderClass} bg-black pb-safe`}
      style={{ height: `calc(${FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }}
    >
      <div className="mx-auto flex w-full max-w-[375px] flex-col px-0 pt-0 pb-2">
        {/* Ad area – custom banner or placeholder; ~375×170px */}
        {adContent}

        {/* Powered by bar – ~375×40px */}
        <div className="flex h-10 w-full items-center justify-between rounded-md bg-zinc-950 px-3 text-[11px] text-black">
          <span className="uppercase tracking-wide">Ad</span>
          <div className="flex items-center gap-1.5">
            <span className="uppercase tracking-wide text-[10px]">Powered by</span>
            <img
              src="/qready-logo.png"
              alt="QReady"
              className="h-4 w-auto max-w-[80px] object-contain object-center"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  /** Once customer has seen "Your order is ready", don't show "You are in the queue" again when staff clicks Collected. */
  const hasBeenReadyRef = useRef(false);
  const [hasSeenReady, setHasSeenReady] = useState(() =>
    typeof window !== "undefined" && id ? sessionStorage.getItem(`pager-seen-ready-${id}`) === "1" : false
  );
  const [thankYouCloseUrl, setThankYouCloseUrl] = useState<string | null>(null);

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
    setFetchError(null);
    const { data, error } = await supabase
      .from("pagers")
      .select("order_number, status, merchant_id")
      .eq("id", id)
      .single();
    if (error) {
      const msg = (error as { message?: string }).message ?? String(error);
      const code = (error as { code?: string }).code;
      console.error("Error fetching pager:", msg, code ? `(${code})` : "", error);
      setFetchError(msg || "Could not load your order");
      return;
    }
    setOrderNumber(data.order_number);
    // When staff already clicked Collected: do NOT set status to "completed" — only set Thank You so we never show queue.
    if (data.status === "completed" && hasBeenReadyRef.current) {
      setThankYou(true);
      // leave status as-is (keep "ready") so UI keeps showing thank you
    } else {
      setStatus(data.status as PagerStatus);
    }
    const mid = data.merchant_id ?? "default";
    getMerchant(mid).then(setMerchant);
    // If we just discovered we're ready (e.g. after waking phone), play sound after short delay so browser allows it
    if (data.status === "ready" && started && !hasPlayedRef.current && typeof document !== "undefined" && document.visibilityState === "visible") {
      setTimeout(() => {
        if (hasPlayedRef.current) return;
        hasPlayedRef.current = true;
        document.title = "QReady";
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
          const newStatus = payload?.new?.status as PagerStatus | undefined;
          if (newStatus !== "waiting" && newStatus !== "ready" && newStatus !== "completed") return;
          // When staff click Collected: do NOT set status to "completed" — only set Thank You so we stay on thank-you screen (avoids any race with ref/state).
          if (newStatus === "completed" && hasBeenReadyRef.current) {
            setThankYou(true);
            return;
          }
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

  // Keep ref in sync for realtime/refetch callbacks (they read the ref in closures).
  hasBeenReadyRef.current = hasBeenReadyRef.current || hasSeenReady;

  // Mark that we've seen ready as soon as we show the ready screen (runs before paint). Persist so remounts (e.g. tab switch) don't forget.
  useLayoutEffect(() => {
    if (status === "ready" && started && id) {
      hasBeenReadyRef.current = true;
      setHasSeenReady(true);
      try {
        sessionStorage.setItem(`pager-seen-ready-${id}`, "1");
      } catch {
        // ignore
      }
    }
  }, [status, started, id]);

  // When showing thank you and merchant has no close_btn_url, try fetching it once (avoids overwriting merchant)
  useEffect(() => {
    const showingThankYou = thankYou || (status === "completed" && (hasSeenReady || hasBeenReadyRef.current));
    if (!showingThankYou || !merchant?.id) return;
    if (merchant.close_btn_url?.trim()) return;
    getMerchant(merchant.id).then((m) => {
      const url = m.close_btn_url?.trim() || null;
      if (url) setThankYouCloseUrl(url);
    });
  }, [thankYou, status, hasSeenReady, merchant?.id, merchant?.close_btn_url]);

  // When status becomes "ready": play alert
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
    if (fetchError) {
      return (
        <div className="flex h-[100dvh] min-h-0 flex-col items-center justify-center overflow-hidden bg-zinc-900 px-6 text-white">
          <p className="text-center text-zinc-300">{fetchError}</p>
          <button
            type="button"
            onClick={() => refetchPager()}
            className="mt-6 rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="flex h-[100dvh] min-h-0 flex-col items-center justify-center overflow-hidden bg-zinc-900 text-white">
        <p>Loading…</p>
      </div>
    );
  }

  // When staff click Collected (status === "completed") and customer had seen "Your order is ready", show Thank You — never show queue again. Use ref so we don't rely on effect timing.
  const hadSeenReady = hasSeenReady || hasBeenReadyRef.current || (status === "ready" && started);
  if (status === "ready" && started) hasBeenReadyRef.current = true;
  const showThankYou = thankYou || (status === "completed" && hadSeenReady);
  const displayStatus: PagerStatus = status === "completed" && hadSeenReady ? "ready" : status;

  const businessName = merchant.business_name?.trim() || "YOUR BUSINESS";
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
  const promoBannerUrl = merchant.promo_banner_url?.trim() || null;
  const promoBannerLink = merchant.promo_banner_link?.trim() || null;
  const bannerLink = promoBannerLink || closeUrl;

  const isLightBg = (hex: string) => {
    const h = hex.replace(/^#/, "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 0.5;
  };
  const onMyWayBgHex = waitingColour || "#1e4ed8";
  const onMyWayTextClass = isLightBg(onMyWayBgHex) ? "text-zinc-900" : "text-white";
  const closeBtnTextColor = waitingColour
    ? (isLightBg(waitingColour) ? "#171717" : waitingColour)
    : "#171717";

  const effectiveCloseUrl = closeUrl || thankYouCloseUrl;
  function handleThankYouButton() {
    if (effectiveCloseUrl) {
      window.open(effectiveCloseUrl, "_blank", "noopener,noreferrer");
    }
    window.close();
  }

  // UI_04: Thank you + CLOSE (background colour; brand on bg; consistent layout). Also when staff clicked Collected and customer had seen ready.
  if (showThankYou) {
    const thankYouBg = bgColour ? { backgroundColor: bgColour } : undefined;
    return (
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white" style={thankYouBg || { backgroundColor: "#171717" }}>
        <main className={MAIN_CLASS} style={thankYouBg}>
          <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
          <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
<div className="flex shrink-0 flex-col items-center justify-start px-6">
            <div className="flex flex-col items-center w-full" style={{ marginTop: -MAIN_SUB_UP_PX }}>
                <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                  {msgThankyou}
                </h1>
                <button
                  type="button"
                  onClick={handleThankYouButton}
                  className={`${BTN_CLASS} mt-5 bg-white`}
                  style={{ color: closeBtnTextColor }}
                >
                  {closeText.toUpperCase()}
                </button>
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 38 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        </main>
        <PagerFooter promoBannerUrl={promoBannerUrl} bannerLink={bannerLink} />
      </div>
    );
  }

  // UI_03: Order ready – green, ON MY WAY (brand on bg; same layout)
  if (displayStatus === "ready" && started) {
    const readyBg = readyColour ? { backgroundColor: readyColour } : undefined;
    return (
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white" style={readyBg || { backgroundColor: "#5ec26a" }}>
        <main className={MAIN_CLASS} style={readyBg}>
          <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
          <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
<div className="flex shrink-0 flex-col items-center justify-start px-6">
            <div className="flex flex-col items-center w-full" style={{ marginTop: -MAIN_SUB_UP_PX }}>
                <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                  {msgReady}
                </h1>
                <button
                  type="button"
                  onClick={handleOnMyWay}
                  className={`${BTN_CLASS} mt-5 ${onMyWayTextClass}`}
                  style={waitingColour ? { backgroundColor: waitingColour } : { backgroundColor: "#1e4ed8" }}
                >
                  ON MY WAY
                </button>
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 38 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        </main>
        <PagerFooter promoBannerUrl={promoBannerUrl} bannerLink={bannerLink} />
      </div>
    );
  }

  // UI_01: Tap to start pager (enable sound) – brand on bg; same layout
  if (!started) {
    const startBg = bgColour ? { backgroundColor: bgColour } : undefined;
    return (
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white" style={startBg || { backgroundColor: "#171717" }}>
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
                  TAP HERE
                  {"\n"}
                  TO SEE IF YOUR
                  {"\n"}
                  ORDER IS READY...
                </h1>
                <p className={`${SUBTEXT_CLASS} mt-5`}>
                  ...and we will <strong>BUZZ</strong> you when it is!
                </p>
              </div>
            </div>
            <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 60 }}>
              <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        </main>
        <PagerFooter promoBannerUrl={promoBannerUrl} bannerLink={bannerLink} />
      </div>
    );
  }

  // UI_02: In the queue – background = brand (screens 1, 2, 4). Never show this if we've already shown ready (displayStatus stays "ready" after Collected).
  const queueBg = bgColour ? { backgroundColor: bgColour } : undefined;
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white" style={queueBg || { backgroundColor: "#171717" }}>
      <main className={MAIN_CLASS} style={queueBg}>
        <PagerBrandBlock logoUrl={logoUrl} businessName={businessName} tagline={tagline} />
        <div className="flex min-h-0 flex-1 flex-col" style={{ marginTop: -GAP_1_2_REDUCTION_PX }}>
          <div className="flex shrink-0 flex-col items-center justify-start px-6">
            <div style={{ marginTop: -MAIN_SUB_UP_PX }}>
              <h1 className={TITLE_CLASS} style={{ whiteSpace: "pre-line" }}>
                {msgQueue}
              </h1>
              <p className={`${SUBTEXT_CLASS} mt-6 leading-tight`}>Keep this tab open. We will buzz you!</p>
            </div>
          </div>
          <div className="shrink-0 px-6 text-center" style={{ paddingBottom: ORDER_NUM_BOTTOM_PX, marginTop: 60 }}>
            <p className={ORDER_NUM_CLASS}>#{String(orderNumber).padStart(3, "0")}</p>
          </div>
          <div className="min-h-0 flex-1" aria-hidden />
        </div>
      </main>
      <PagerFooter promoBannerUrl={promoBannerUrl} bannerLink={bannerLink} />
    </div>
  );
}
