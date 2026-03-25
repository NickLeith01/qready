"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import UserMenu from "@/components/UserMenu";
import type { Session, User } from "@supabase/supabase-js";
import { getMerchantByUserId, createMerchantForUser, getOrCreateAnonymousMerchant, updateMerchant } from "@/lib/merchant";
import { uploadLogo, uploadBanner } from "@/lib/uploadLogo";
import { DEFAULT_MERCHANT, type Merchant } from "@/types/merchant";
import { withTimeout } from "@/lib/with-timeout";

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

const DASHBOARD_LOAD_TIMEOUT_MS = 25_000;
/** Refresh must not hang forever if getSession() never resolves (storage lock, client bug). */
const GET_SESSION_TIMEOUT_MS = 12_000;

/** User id from `session.user` only — can be null when Supabase still uses a proxy after refresh. */
function userIdFromUserObject(session: { user?: User } | null | undefined): string | null {
  if (!session?.user) return null;
  try {
    const u = session.user as User & { __isUserNotAvailableProxy?: boolean };
    if (u.__isUserNotAvailableProxy) return null;
    const id = session.user.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jwtSub(accessToken: string): string | null {
  const p = decodeJwtPayload(accessToken);
  const sub = p?.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}

/**
 * One stable id for “who is logged in” on the dashboard: real `session.user.id`, else JWT `sub`.
 * Fixes refresh when the user object is missing/proxy but the access token is already in storage
 * (getUser() can also fail on some networks — JWT still carries `sub`).
 */
function authIdentityKey(session: Session | null | undefined): string {
  const fromUser = userIdFromUserObject(session);
  if (fromUser) return fromUser;
  const t = session?.access_token;
  if (!t) return "anon";
  return jwtSub(t) ?? "anon";
}

/** Merchant row id for signed-in users (= auth uid). Null → anonymous dashboard. */
function merchantOwnerId(session: Session | null | undefined): string | null {
  const k = authIdentityKey(session);
  return k === "anon" ? null : k;
}

/** Minimal `User` from access token for header/menu when `session.user` is not usable yet. */
function userFromAccessToken(accessToken: string): User | null {
  const p = decodeJwtPayload(accessToken);
  const sub = p?.sub;
  if (typeof sub !== "string" || !sub) return null;
  return {
    id: sub,
    aud: typeof p.aud === "string" ? p.aud : "authenticated",
    role: typeof p.role === "string" ? p.role : "authenticated",
    email: typeof p.email === "string" ? p.email : undefined,
    phone: "",
    app_metadata: (p.app_metadata as User["app_metadata"]) ?? {},
    user_metadata: (p.user_metadata as User["user_metadata"]) ?? {},
    created_at: typeof p.created_at === "string" ? p.created_at : "",
    updated_at: typeof p.updated_at === "string" ? p.updated_at : "",
  } as User;
}

function sessionUserForUi(session: Session | null): User | null {
  if (!session) return null;
  if (session.user) {
    try {
      const u = session.user as User & { __isUserNotAvailableProxy?: boolean };
      if (!u.__isUserNotAvailableProxy) {
        void session.user.id;
        return session.user;
      }
    } catch {
      /* use JWT */
    }
  }
  if (session.access_token) return userFromAccessToken(session.access_token);
  return null;
}

/**
 * Prefer a real user from Supabase; otherwise keep JWT-derived user so merchant id + header stay in sync.
 */
async function enrichSessionWithUser(session: Session | null): Promise<Session | null> {
  if (!session) return session;
  if (userIdFromUserObject(session)) return session;
  if (!session.access_token) return session;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
    if (user && !error) return { ...session, user };
  } catch {
    /* network / blocked */
  }
  const u = userFromAccessToken(session.access_token);
  return u ? { ...session, user: u } : session;
}

export default function DashboardPage() {
  const [pagers, setPagers] = useState<Pager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newPager, setNewPager] = useState<{ id: string; order_number: number } | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forceNextOrderOne, setForceNextOrderOne] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const [isPhone, setIsPhone] = useState(false);
  const [isPhoneLandscape, setIsPhoneLandscape] = useState(false);
  const sessionUserIdRef = useRef<string | undefined>(undefined);
  /** Ignore auth events until bootstrap has set sessionUserIdRef (prevents duplicate load + races with SIGNED_IN). */
  const authListenerReadyRef = useRef(false);

  // Load merchant (and clear user-specific state) for the current session. Each user gets their own merchant and queue.
  // When the same session refires (e.g. tab focus), don't clear merchant so we avoid a black "Loading" screen.
  const loadForSession = useCallback(async (session: Session | null) => {
    const sessionKey = authIdentityKey(session);
    const isSameSession = sessionUserIdRef.current === sessionKey;
    const ownerId = merchantOwnerId(session);

    try {
      if (isSameSession) {
        setLoading(true);
        let m: Merchant | null = null;
        if (ownerId) {
          const u = sessionUserForUi(session);
          if (u) setAuthUser(u);
          m = await getMerchantByUserId(ownerId);
          if (!m) m = await createMerchantForUser(ownerId);
          setMerchant(m ?? null);
        } else {
          setAuthUser(null);
          m = await getOrCreateAnonymousMerchant();
          setMerchant(m);
        }
        if (m?.id) {
          const { data } = await supabase
            .from("pagers")
            .select("*")
            .eq("merchant_id", m.id)
            .in("status", ["waiting", "ready"])
            .order("order_number", { ascending: true });
          setPagers(data ?? []);
        }
        return;
      }

      sessionUserIdRef.current = sessionKey;
      setLoading(true);
      setPagers([]);
      setShowNewOrder(false);
      setNewPager(null);
      setForceNextOrderOne(false);
      setMerchant(null);
      if (ownerId) {
        const u = sessionUserForUi(session);
        if (u) setAuthUser(u);
        let m = await getMerchantByUserId(ownerId);
        if (!m) {
          m = await createMerchantForUser(ownerId);
        }
        setMerchant(m ?? null);
      } else {
        setAuthUser(null);
        const m = await getOrCreateAnonymousMerchant();
        setMerchant(m);
      }
    } catch (err) {
      console.error("Dashboard loadForSession failed:", err);
      if (ownerId) {
        const u = sessionUserForUi(session);
        if (u) setAuthUser(u);
        setMerchant(null);
        setPagers([]);
      } else {
        setAuthUser(null);
        setMerchant({ ...DEFAULT_MERCHANT, id: "default" });
        setPagers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const runBootstrapRetry = useCallback(() => {
    setLoading(true);
    (async () => {
      let session: Session | null = null;
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          GET_SESSION_TIMEOUT_MS,
          "getSession"
        );
        session = data.session;
      } catch (err) {
        console.error("Dashboard retry getSession failed:", err);
      }
      try {
        session = await enrichSessionWithUser(session);
      } catch {
        /* keep */
      }
      sessionUserIdRef.current = authIdentityKey(session);
      setAuthUser(sessionUserForUi(session) ?? session?.user ?? null);
      try {
        await withTimeout(
          loadForSession(session),
          DASHBOARD_LOAD_TIMEOUT_MS,
          "Dashboard load"
        );
      } catch (err) {
        console.error("Dashboard retry load failed:", err);
      }
    })();
  }, [loadForSession]);

  // Decide whether to show top/bottom chrome based on viewport size so that phones (portrait or landscape)
  // get a full-screen queue view, while tablets/desktops keep the bars. Also track phone-landscape layout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateChromeVisibility = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const minSide = Math.min(w, h);
      // Treat devices with their smallest side under 600px as phones; hide chrome there.
      const phone = minSide < 600;
      const landscape = w > h;
      setShowChrome(!phone);
      setIsPhone(phone);
      setIsPhoneLandscape(phone && landscape);
    };
    updateChromeVisibility();
    window.addEventListener("resize", updateChromeVisibility);
    return () => window.removeEventListener("resize", updateChromeVisibility);
  }, []);

  // Auth: first load races INITIAL_SESSION vs getSession in the wild (Incognito, refresh). Use one
  // `bootstrapComplete` per effect so only the first successful path runs; macrotask getSession catches
  // missed INITIAL_SESSION. No `hydrated` gate — that left a black "Loading…" forever if auth never fired.
  useEffect(() => {
    let mounted = true;
    let bootstrapComplete = false;

    const runBootstrap = async (s: Session | null, source: string) => {
      if (!mounted || bootstrapComplete) return;
      bootstrapComplete = true;

      let session = s;
      try {
        session = await enrichSessionWithUser(s);
      } catch {
        /* keep s */
      }

      const key = authIdentityKey(session);
      sessionUserIdRef.current = key;
      setAuthUser(sessionUserForUi(session) ?? session?.user ?? null);
      authListenerReadyRef.current = true;

      if (!mounted) return;

      try {
        await withTimeout(
          loadForSession(session),
          DASHBOARD_LOAD_TIMEOUT_MS,
          "Dashboard load"
        );
      } catch (err) {
        console.error(`Dashboard load failed (${source}):`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        await runBootstrap(session, "INITIAL_SESSION");
        return;
      }

      if (!mounted) return;
      if (!authListenerReadyRef.current) return;

      const newKey = authIdentityKey(session);
      if (newKey === sessionUserIdRef.current) return;
      if (session == null) {
        try {
          const { data: { session: current } } = await withTimeout(
            supabase.auth.getSession(),
            GET_SESSION_TIMEOUT_MS,
            "getSession"
          );
          if (authIdentityKey(current) === sessionUserIdRef.current) return;
        } catch {
          return;
        }
      }
      await loadForSession(session);
    });

    // Let INITIAL_SESSION (usually a microtask) run before this macrotask so we don’t bootstrap as anon
    // while a signed-in session is still being emitted.
    const deferredId = window.setTimeout(() => {
      if (!mounted || bootstrapComplete) return;
      void (async () => {
        try {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            GET_SESSION_TIMEOUT_MS,
            "getSession"
          );
          let s = data.session;
          try {
            s = await enrichSessionWithUser(data.session);
          } catch {
            /* keep */
          }
          await runBootstrap(s, "getSession-deferred");
        } catch (err) {
          console.error("Dashboard getSession deferred failed:", err);
          await runBootstrap(null, "getSession-deferred-error");
        }
      })();
    }, 50);

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !mounted) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        const newKey = authIdentityKey(session);
        if (newKey === sessionUserIdRef.current) return;
        loadForSession(session);
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mounted = false;
      clearTimeout(deferredId);
      authListenerReadyRef.current = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      subscription.unsubscribe();
    };
  }, [loadForSession]);

  // Fetch pagers for current merchant only
  const fetchPagers = useCallback(async () => {
    if (!merchant?.id) return;
    const { data, error } = await supabase
      .from("pagers")
      .select("*")
      .eq("merchant_id", merchant.id)
      .in("status", ["waiting", "ready"])
      .order("order_number", { ascending: true });
    if (error) {
      console.error("Error fetching pagers:", error);
      return;
    }
    setPagers(data ?? []);
  }, [merchant?.id]);

  useEffect(() => {
    if (!merchant?.id) return;
    setLoading(false);
    fetchPagers();
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
  }, [merchant?.id, fetchPagers]);

  async function handleNewOrder() {
    if (!merchant?.id) return;
    let order_number: number;
    if (forceNextOrderOne) {
      order_number = 1;
      setForceNextOrderOne(false);
    } else {
      const { data: allPagers } = await supabase
        .from("pagers")
        .select("order_number")
        .eq("merchant_id", merchant.id);
      const maxOrder = allPagers?.length
        ? Math.max(...allPagers.map((p) => p.order_number))
        : 0;
      order_number = maxOrder + 1;
    }

    const { data, error } = await supabase
      .from("pagers")
      .insert({ order_number, status: "waiting", merchant_id: merchant.id })
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

  async function handleResetNumbers() {
    if (!merchant?.id) return;
    await supabase
      .from("pagers")
      .delete()
      .eq("merchant_id", merchant.id);
    setForceNextOrderOne(true);
    setPagers([]);
    setShowNewOrder(false);
    setNewPager(null);
    fetchPagers();
  }

  const waiting = pagers.filter((p) => p.status === "waiting");
  const ready = pagers.filter((p) => p.status === "ready");

  const isPaid = merchant?.plan === "plus" || merchant?.plan === "premium" || merchant?.plan === "paid";
  // Free plan only: bar 0–5, block new order and show message when at or over limit (5+)
  const slotsUsed = Math.min(waiting.length, FREE_PLAN_MAX_SLOTS);
  const cannotAddNewOrder = !isPaid && waiting.length >= FREE_PLAN_MAX_SLOTS;
  const showOverLimitPopup = !isPaid && waiting.length >= FREE_PLAN_MAX_SLOTS;

  // Base URL for QR: prefer NEXT_PUBLIC_APP_URL, fall back to current origin
  const baseUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
      : "";
  const pagerUrl =
    typeof window !== "undefined" && newPager
      ? `${baseUrl}/pager/${newPager.id}`
      : "";
  const qrSrc = pagerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pagerUrl)}`
    : "";

  const shellBg = "#171717";
  const shellKeyline = "border-[#525252]";

  // Signed in: show header + account menu immediately while merchant/pagers load (avoids black void after login).
  if (authUser && !merchant && loading) {
    return (
      <div className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
        {showChrome && (
          <div
            className={`flex h-12 sm:h-[5.25rem] shrink-0 items-center justify-between border-b ${shellKeyline} px-3 py-1.5 sm:px-6 sm:py-4 w-full`}
            style={{ backgroundColor: shellBg }}
          >
            <div className="flex w-32 shrink-0 items-center md:w-52 -mt-[14px] sm:-mt-[20px]">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white"
                aria-label="Back to home"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              <span className="text-sm text-zinc-500">QReady</span>
            </div>
            <div className="flex w-40 shrink-0 items-center justify-end md:w-52">
              <UserMenu user={authUser} hideDashboard brandBarColor={shellBg} className="-mt-[30px]" />
            </div>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-zinc-400">
          <p>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // Anonymous session: short full-screen load until anon merchant exists
  if (!authUser && !merchant && loading) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-white">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  const signedInNoMerchant = authUser && !merchant && !loading;
  const anonBootstrapFailed = !authUser && !merchant && !loading;
  if (signedInNoMerchant || anonBootstrapFailed) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-white">
        <p className="text-center text-zinc-300">
          {signedInNoMerchant
            ? "We couldn&apos;t load your dashboard."
            : "This is taking too long or the connection failed."}
        </p>
        <button
          type="button"
          onClick={runBootstrapRetry}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-white">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  // Signed-in tenant rows use auth user id as merchant id; never show that queue without a confirmed user.
  const tenantMerchantWithoutAuth =
    merchant &&
    !authUser &&
    merchant.id !== "default" &&
    !merchant.id.startsWith("anon-");
  if (tenantMerchantWithoutAuth) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-white">
        <p className="max-w-md text-center text-zinc-300">
          We couldn&apos;t confirm your sign-in. Your queue is hidden until you sign in again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={runBootstrapRetry}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Try again
          </button>
          <Link
            href="/login"
            className="rounded-full border border-zinc-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

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
  /** Green used on homepage (hero, pricing, CTA); limit popup uses this to match. */
  const HOMEPAGE_GREEN = "#01a76c";
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
  const backLinkClass = isLightBg(brandBarBg) ? "text-zinc-900 hover:text-zinc-950" : "text-zinc-400 hover:text-white";

  const middleBgHex = merchant?.colour_middle_column ?? DEFAULT_BG;
  const isMiddleLight = isLightBg(middleBgHex);
  const middleTextClass = isMiddleLight ? "text-zinc-900" : "text-white";
  const middleMutedClass = isMiddleLight ? "text-zinc-600" : "text-zinc-400";
  const middleLinkClass = isMiddleLight ? "text-zinc-900 hover:text-zinc-950" : "text-zinc-400 hover:text-white";
  const middleIconClass = isMiddleLight ? "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200" : "text-zinc-400 hover:text-white hover:bg-zinc-800";

  const leftColumnHex = merchant?.colour_left_column ?? DEFAULT_BG;
  const rightColumnHex = merchant?.colour_right_column ?? DEFAULT_BG;
  const waitingHeaderHex = merchant?.colour_waiting ?? DEFAULT_WAITING;
  const readyHeaderHex = merchant?.colour_ready ?? DEFAULT_READY;
  const isLeftLight = isLightBg(leftColumnHex);
  const isRightLight = isLightBg(rightColumnHex);
  const isWaitingHeaderLight = isLightBg(waitingHeaderHex);
  const isReadyHeaderLight = isLightBg(readyHeaderHex);
  const leftTextClass = isLeftLight ? "text-zinc-900" : "text-white";
  const leftMutedClass = isLeftLight ? "text-zinc-600" : "text-zinc-400";
  const rightTextClass = isRightLight ? "text-zinc-900" : "text-white";
  const rightMutedClass = isRightLight ? "text-zinc-600" : "text-zinc-400";
  const waitingHeaderTextClass = isWaitingHeaderLight ? "text-zinc-900" : "text-white";
  const readyHeaderTextClass = isReadyHeaderLight ? "text-zinc-900" : "text-white";

  return (
    <div className="flex h-[100svh] min-h-0 flex-col overflow-hidden text-white" style={{ backgroundColor: DEFAULT_BG }}>
      {/* Brand bar – left: back, centre: logo/name, right: user menu or Login/Sign up (padding matches homepage nav) */}
      {showChrome && (
      <div className={`flex h-12 sm:h-[5.25rem] shrink-0 items-center justify-between border-b ${keyline} px-3 py-1.5 sm:px-6 sm:py-4 w-full`} style={brandBg || { backgroundColor: DEFAULT_BG }}>
        <div className="flex w-32 shrink-0 items-center md:w-52 -mt-[14px] sm:-mt-[20px]">
          <Link
            href="/"
            className={`inline-flex items-center gap-1 text-xs sm:text-sm font-medium ${backLinkClass}`}
            aria-label="Back to home"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          {merchant?.logo_url?.trim() ? (
            <img
              src={merchant.logo_url.trim()}
              alt=""
              className="max-h-8 w-full max-w-full object-contain object-center sm:max-h-[5.25rem]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <span className={`text-base sm:text-[1.4rem] font-semibold ${brandTextClass}`}>
                {merchant?.business_name?.trim() || "YOUR BUSINESS"}
              </span>
              {merchant?.business_tagline?.trim() ? (
                <span className={`ml-2 text-xs sm:text-[1.4rem] ${brandTaglineClass}`}>
                  {merchant.business_tagline.trim()}
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className="flex w-40 shrink-0 items-center justify-end gap-4 md:w-52">
          {authUser ? (
            <UserMenu user={authUser} hideDashboard brandBarColor={brandBarBg} className="-mt-[30px]" />
          ) : (
            <div className="-mt-[7px] flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="rounded-full bg-[#01a76c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#018a5e]">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      )}
      {isPhone && !isPhoneLandscape ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6 text-center" style={{ backgroundColor: DEFAULT_BG }}>
          <svg className="h-20 w-20 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 4l2 2-2 2M6 20l-2-2 2-2M4 10a6 6 0 0112 0M4 14a6 6 0 0012 0" />
          </svg>
          <p className="text-lg font-semibold text-white">Please rotate your device</p>
          <p className="text-sm text-zinc-400">Use the dashboard in landscape mode</p>
        </div>
      ) : (
      <>
      <main className="flex min-h-0 flex-1 flex-row gap-0">
        {/* Left column – WAITING */}
        <section className={`flex min-h-0 w-1/3 flex-col border-r ${keyline}`}>
          <div className={`flex h-9 sm:h-12 shrink-0 items-center justify-center rounded-none border px-3 py-1 sm:px-4 sm:py-1.5 text-center text-xs sm:text-sm font-semibold uppercase tracking-wide ${keyline} ${waitingHeaderTextClass}`} style={waitingHeaderBg || { backgroundColor: DEFAULT_WAITING }}>
            Waiting
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto p-2 ${leftTextClass}`} style={leftColumnBg || { backgroundColor: DEFAULT_BG }}>
            {loading ? (
              <p className={`p-4 ${leftMutedClass}`}>Loading…</p>
            ) : waiting.length === 0 ? (
              <p className={`p-4 ${leftMutedClass}`}>No orders waiting</p>
            ) : (
              <ul className={isPhone ? "space-y-1" : "space-y-2"}>
                {waiting.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded border ${keyline} ${isPhone ? "px-2 py-1" : "px-3 py-2"}`}
                    style={{ backgroundColor: NUMBER_BOX_BG }}
                  >
                    <span className={`font-bold text-white ${isPhone ? "text-base" : "text-xl"}`}>#{String(p.order_number).padStart(3, "0")}</span>
                    <button
                      type="button"
                      onClick={() => markReady(p.id)}
                      className={`rounded-full border font-medium opacity-90 hover:opacity-100 ${keyline} ${waitingHeaderTextClass} ${isPhone ? "px-2 py-0.5 text-xs" : "px-4 py-1.5 text-sm"}`}
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

        {/* Middle – When free plan at limit, column fills green with white card (homepage green); otherwise normal background */}
        <section
          className={`relative flex min-h-0 w-1/3 flex-col overflow-hidden ${keyline}`}
          style={
            showOverLimitPopup
              ? { backgroundColor: HOMEPAGE_GREEN }
              : (middleColumnBg || { backgroundColor: DEFAULT_BG })
          }
        >
          {showOverLimitPopup ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 sm:p-6">
              <div
                className={`w-full max-w-sm rounded-xl bg-white text-center shadow-lg ${
                  isPhone ? "p-4" : "p-8"
                }`}
              >
                <h2 className={`font-bold text-zinc-900 ${isPhone ? "text-lg" : "text-xl"}`}>Free Plan Limit Reached</h2>
                <p className={`mt-2 font-medium text-zinc-900 ${isPhone ? "text-sm" : "text-base"}`}>5 out of 5 slots filled.</p>
                <p className={`mt-4 text-zinc-700 ${isPhone ? "text-xs" : "text-sm"}`}>
                  Move an order to &apos;Ready&apos; to free up a slot, or upgrade today to unlock:
                </p>
                <ul className={`mt-4 list-none space-y-2 text-center font-semibold text-zinc-900 ${isPhone ? "text-xs" : "text-sm"}`}>
                  <li>Unlimited Orders</li>
                  <li>Custom logo & brand colors</li>
                  <li>Clickable Wait-Screen Ads</li>
                  <li>Post-Order Redirects</li>
                </ul>
                <Link
                  href="/#pricing"
                  className={`mt-6 sm:mt-8 flex w-full justify-center rounded-lg font-semibold text-white hover:opacity-95 ${
                    isPhone ? "py-2.5 text-sm" : "py-3.5 text-base"
                  }`}
                  style={{ backgroundColor: HOMEPAGE_GREEN }}
                >
                  Go Unlimited
                </Link>
              </div>
            </div>
          ) : (
          <div className={`flex min-h-0 flex-1 flex-col p-3 sm:p-6 ${middleTextClass}`} style={middleColumnBg || { backgroundColor: DEFAULT_BG }}>
            {isPhone && (
              <div className="mb-2 flex w-full shrink-0 justify-center">
                {merchant?.logo_url?.trim() ? (
                  <img
                    src={merchant.logo_url.trim()}
                    alt=""
                    className="max-h-10 w-full max-w-[8rem] object-contain object-center"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className={`text-center text-sm font-semibold ${middleTextClass}`}>
                    {merchant?.business_name?.trim() || "YOUR BUSINESS"}
                  </span>
                )}
              </div>
            )}
            <div
              className={`flex min-h-0 flex-1 flex-col items-center ${
                isPhone ? "justify-center" : "justify-center"
              }`}
            >
          {showNewOrder && newPager ? (
            isPhone ? (
              <div className="flex w-full flex-col items-center gap-2 mt-3">
                {qrSrc && (
                  <img
                    src={qrSrc}
                    alt="QR code for pager"
                    className={
                      isPhoneLandscape
                        ? `w-[45vw] max-w-[5.6rem] max-h-[42vh] rounded-lg border bg-white p-1.5 ${keyline}`
                        : `w-[55vw] max-w-[5.75rem] max-h-[36vh] rounded-lg border bg-white p-1.5 ${keyline}`
                    }
                    style={{ aspectRatio: "1 / 1" }}
                  />
                )}
                <p className={`text-2xl font-bold ${middleTextClass}`}>
                  #{String(newPager.order_number).padStart(3, "0")}
                </p>
                <button
                  type="button"
                  onClick={handleDone}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase hover:opacity-90 ${keyline} ${waitingHeaderTextClass}`}
                  style={waitingHeaderBg || { backgroundColor: DEFAULT_WAITING }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-6">
                <p className={`text-center text-base md:text-lg ${middleMutedClass}`}>
                  Scan to avoid the queue
                  <br />
                  <span className={`font-semibold ${middleTextClass}`}>NO LOGIN REQUIRED</span>
                </p>
                {qrSrc && (
                  <img
                    src={qrSrc}
                    alt="QR code for pager"
                    className={`w-48 md:w-56 max-w-[14rem] max-h-[65vh] rounded-lg border bg-white p-3 ${keyline}`}
                    style={{ aspectRatio: "1 / 1" }}
                  />
                )}
                <p className={`text-4xl md:text-5xl font-bold ${middleTextClass}`}>
                  #{String(newPager.order_number).padStart(3, "0")}
                </p>
                <button
                  type="button"
                  onClick={handleDone}
                  className={`rounded-full border px-8 py-3.5 text-lg font-bold uppercase hover:opacity-90 ${keyline} ${waitingHeaderTextClass}`}
                  style={waitingHeaderBg || { backgroundColor: DEFAULT_WAITING }}
                >
                  Done
                </button>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={handleNewOrder}
              disabled={cannotAddNewOrder}
              className={`rounded-full border bg-rose-600 font-bold uppercase hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 ${keyline} ${isPhone ? "px-2 py-0.5 text-[0.6rem]" : "px-8 py-3.5 text-lg"}`}
            >
              New order
            </button>
            )}
            </div>
            {/* Free plan only: bar (1–5 green→red) + label; paid has no limit or bar.
                On phones we hide the bar to save space and rely on the over-limit pop-up instead. */}
            {isPhone ? (
              <div className="mt-auto w-full space-y-2 pb-safe">
                <div className="flex w-full items-center justify-between">
                  <Link
                    href="/"
                    className={`inline-flex items-center gap-1 text-xs font-medium ${middleLinkClass}`}
                    aria-label="Back to home"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${middleIconClass}`}
                      aria-label="Settings"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetNumbers}
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${forceNextOrderOne ? "text-emerald-400 hover:bg-zinc-800 hover:text-emerald-400" : middleIconClass}`}
                      aria-label="Reset numbers"
                      title={forceNextOrderOne ? "Next order will be #001" : "Reset numbers – clear queue and next order will be #001"}
                    >
                      <svg className="h-6 w-6" viewBox="0 0 20 25" fill="currentColor" aria-hidden>
                        <path d="M4.15,11.16c.08-.26.37-.41.63-.32.26.08.41.37.32.63-.42,1.3-.3,2.71.32,3.93,1.3,2.53,4.4,3.53,6.94,2.23s3.53-4.4,2.23-6.94c-1.3-2.53-4.4-3.53-6.94-2.23l-.33.17.24.47c.05.1.07.21.05.31-.05.27-.31.45-.58.41l-1.71-.28c-.16-.03-.29-.12-.37-.26-.07-.14-.07-.31,0-.45l.76-1.56c.05-.09.12-.16.21-.21.25-.13.55-.04.69.2l.24.48.33-.17h0c3.02-1.55,6.73-.36,8.28,2.67,1.55,3.02.36,6.73-2.67,8.28-1.45.75-3.14.89-4.69.38-1.56-.5-2.85-1.59-3.59-3.05-.75-1.45-.89-3.14-.38-4.69Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              !isPaid && (
                <div className={`mt-0 sm:mt-auto shrink-0 w-full space-y-0.5 sm:space-y-1 rounded border px-2 pt-0 sm:pt-3 ${keyline}`}>
                  <div className="flex w-full gap-0.5 overflow-hidden rounded items-stretch">
                    {Array.from({ length: FREE_PLAN_MAX_SLOTS }, (_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 ${i < slotsUsed ? BAR_SEGMENT_COLORS[i] : "bg-zinc-700"}`}
                      />
                    ))}
                  </div>
                  <p className={`mt-0.5 text-center text-[0.6rem] sm:text-sm ${middleMutedClass}`}>
                    Free plan: {slotsUsed} of {FREE_PLAN_MAX_SLOTS} slots used
                  </p>
                </div>
              )
            )}
          </div>
          )}
        </section>

        {/* Right column – READY */}
        <section className={`flex min-h-0 w-1/3 flex-col border-l ${keyline}`}>
          <div className={`flex h-9 sm:h-12 shrink-0 items-center justify-center rounded-none border px-3 py-1 sm:px-4 sm:py-1.5 text-center text-xs sm:text-sm font-semibold uppercase tracking-wide ${keyline} ${readyHeaderTextClass}`} style={readyHeaderBg || { backgroundColor: DEFAULT_READY }}>
            Ready
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto p-2 ${rightTextClass}`} style={rightColumnBg || { backgroundColor: DEFAULT_BG }}>
            {loading ? (
              <p className={`p-4 ${rightMutedClass}`}>Loading…</p>
            ) : ready.length === 0 ? (
              <p className={`p-4 ${rightMutedClass}`}>No orders ready</p>
            ) : (
              <ul className={isPhone ? "space-y-1" : "space-y-2"}>
                {ready.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded border ${keyline} ${isPhone ? "px-2 py-1" : "px-3 py-2"}`}
                    style={{ backgroundColor: NUMBER_BOX_BG }}
                  >
                    <span className={`font-bold text-white ${isPhone ? "text-base" : "text-xl"}`}>#{String(p.order_number).padStart(3, "0")}</span>
                    <button
                      type="button"
                      onClick={() => markCollected(p.id)}
                      className={`rounded-full border font-medium opacity-90 hover:opacity-100 ${keyline} ${readyHeaderTextClass} ${isPhone ? "px-2 py-0.5 text-xs" : "px-4 py-1.5 text-sm"}`}
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
      {showChrome && (
      <footer className={`relative flex h-9 sm:h-12 shrink-0 items-center justify-between border-t px-3 sm:px-4 ${keyline}`} style={{ backgroundColor: DEFAULT_BG }}>
        <div className="flex shrink-0 items-center gap-1">
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
          <button
            type="button"
            onClick={handleResetNumbers}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg hover:bg-zinc-800 ${forceNextOrderOne ? "text-emerald-400" : "text-zinc-400 hover:text-white"}`}
            aria-label="Reset numbers"
            title={forceNextOrderOne ? "Next order will be #001" : "Reset numbers – clear queue and next order will be #001"}
          >
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 20 25" fill="currentColor" aria-hidden>
              <path d="M4.15,11.16c.08-.26.37-.41.63-.32.26.08.41.37.32.63-.42,1.3-.3,2.71.32,3.93,1.3,2.53,4.4,3.53,6.94,2.23s3.53-4.4,2.23-6.94c-1.3-2.53-4.4-3.53-6.94-2.23l-.33.17.24.47c.05.1.07.21.05.31-.05.27-.31.45-.58.41l-1.71-.28c-.16-.03-.29-.12-.37-.26-.07-.14-.07-.31,0-.45l.76-1.56c.05-.09.12-.16.21-.21.25-.13.55-.04.69.2l.24.48.33-.17h0c3.02-1.55,6.73-.36,8.28,2.67,1.55,3.02.36,6.73-2.67,8.28-1.45.75-3.14.89-4.69.38-1.56-.5-2.85-1.59-3.59-3.05-.75-1.45-.89-3.14-.38-4.69Z" />
            </svg>
          </button>
        </div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <img src="/qready-logo.png" alt="QReady" className="h-7 w-auto max-w-[120px] object-contain object-center" referrerPolicy="no-referrer" />
        </div>
        <div className="flex shrink-0 items-center text-sm text-zinc-400">
          <span>
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
        </div>
      </footer>
      )}

      </>
      )}

      {/* Settings modal */}
      {settingsOpen && merchant && (
        <SettingsModal
          merchant={merchant}
          onClose={() => setSettingsOpen(false)}
          onPersistPatch={async (patch) => {
            const updated = await updateMerchant({ ...patch, id: merchant.id, plan: merchant.plan });
            setMerchant((prev) => (prev ? { ...prev, ...patch, ...(updated ?? {}) } : updated ?? null));
          }}
          onSave={async (updates) => {
            const updated = await updateMerchant({ ...updates, id: merchant.id, plan: merchant.plan });
            setMerchant((prev) => (prev ? { ...prev, ...updates, ...(updated ?? {}) } : updated ?? null));
            setSettingsOpen(false);
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
  onPersistPatch,
}: {
  merchant: Merchant;
  onClose: () => void;
  onSave: (updates: Partial<Merchant>) => Promise<void>;
  /** Save a partial row without closing the modal (e.g. right after storage upload). */
  onPersistPatch: (patch: Partial<Merchant>) => Promise<void>;
}) {
  const isPaid = merchant.plan === "plus" || merchant.plan === "premium" || merchant.plan === "paid";
  const isPremium = merchant.plan === "premium" || merchant.plan === "paid";
  const [businessName, setBusinessName] = useState(merchant.business_name?.trim() || "YOUR BUSINESS");
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
  const [promoBannerUrl, setPromoBannerUrl] = useState(merchant.promo_banner_url ?? "");
  const [promoBannerLink, setPromoBannerLink] = useState(merchant.promo_banner_link ?? "");
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

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
    if (isPremium) {
      updates.promo_banner_url = promoBannerUrl || null;
      const raw = (promoBannerLink || "").trim();
      if (raw && !/^https?:\/\//i.test(raw)) {
        updates.promo_banner_link = `https://${raw}`;
      } else {
        updates.promo_banner_link = raw || null;
      }
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
              placeholder="YOUR BUSINESS"
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
                      try {
                        const url = await uploadLogo(file);
                        if (url) {
                          setLogoUrl(url);
                          await onPersistPatch({ logo_url: url });
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        alert(`Logo upload failed: ${msg}`);
                      } finally {
                        setLogoUploading(false);
                        e.target.value = "";
                      }
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
            <p className="mt-0.5 text-xs text-zinc-500">1. Brand: top bar on dashboard, background on handset screens 1, 2 &amp; 4. 2. Waiting: Waiting buttons on dashboard. 3. Ready: Ready buttons on dashboard, background on handset screen 3. 4. Left column: background of left column on dashboard. 5. Right column: background of right column on dashboard. 6. Middle column: background of middle column on dashboard.</p>
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
                <span className="text-xs text-zinc-500">6. Middle column</span>
                <input type="color" value={colourMiddleColumn} onChange={(e) => setColourMiddleColumn(e.target.value)} className="mt-0.5 h-9 w-full cursor-pointer rounded border border-zinc-600 bg-transparent" />
              </div>
            </div>
          </div>

          {/* 4. Three key messages (paid) */}
          <div className={!isPaid ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              4. Key messages on phone screens
              {!isPaid && <LockIcon />}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">Press Enter for a new line on the handset (e.g. YOUR FOOD / IS SIZZLING).</p>
            <div className="mt-1 space-y-2">
              <textarea value={messageQueue} onChange={(e) => setMessageQueue(e.target.value)} placeholder="Queue message (use returns for new lines on handset)" rows={3} className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 resize-y" />
              <textarea value={messageReady} onChange={(e) => setMessageReady(e.target.value)} placeholder="Ready message (use returns for new lines)" rows={3} className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 resize-y" />
              <textarea value={messageThankyou} onChange={(e) => setMessageThankyou(e.target.value)} placeholder="Thank you message (use returns for new lines)" rows={3} className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 resize-y" />
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

          {/* 6. Advertising / promotional banner (Premium only) */}
          <div className={!isPremium ? lockClass : ""}>
            <label className="flex items-center text-sm font-medium text-zinc-300">
              6. Add advertising
              {!isPremium && <LockIcon />}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Promotional banner shown to customers on the waiting screen. Size required: 375×170px. Max file size: 2MB. File types supported: JPEG, PNG, WebP, GIF. Premium only.
            </p>
            <div className="mt-1 space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50">
                  {bannerUploading ? "Uploading…" : "Upload banner (max 2MB)"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={!isPremium || bannerUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !isPremium) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert("Banner must be 2MB or smaller.");
                        return;
                      }
                      setBannerUploading(true);
                      try {
                        const url = await uploadBanner(file);
                        if (url) {
                          setPromoBannerUrl(url);
                          await onPersistPatch({ promo_banner_url: url });
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        alert(`Banner upload failed: ${msg}`);
                      } finally {
                        setBannerUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={promoBannerUrl}
                onChange={(e) => setPromoBannerUrl(e.target.value)}
                placeholder="Or paste image URL for your ad banner"
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                disabled={!isPremium}
              />
              <div>
                <label htmlFor="promo-banner-link" className="block text-xs font-medium text-zinc-400 mt-2">Advertising link (opens in new tab when customer taps banner)</label>
                <input
                  id="promo-banner-link"
                  type="url"
                  value={promoBannerLink}
                  onChange={(e) => setPromoBannerLink(e.target.value)}
                  placeholder="https://www.yoursite.com"
                  className="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                  disabled={!isPremium}
                />
                <p className="mt-0.5 text-[11px] text-zinc-500">Include https:// at the start or the link may not work.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
        <div className="shrink-0 border-t border-zinc-700 p-4 space-y-3">
          <button type="button" onClick={handleSave} disabled={saving} className="w-full rounded-full bg-rose-600 py-3 font-semibold text-white hover:bg-rose-500 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <p className="text-center">
            <Link href="/#pricing" className="text-sm text-zinc-400 hover:text-white">
              View plans & upgrade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
