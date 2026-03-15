"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/** Darken a hex colour by a factor (0–1). */
function darkenHex(hex: string, factor = 0.7): string {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6 && h.length !== 3) return hex;
  const parse = (s: string) => parseInt(s, 16);
  const r = h.length === 6 ? parse(h.slice(0, 2)) : parse(h[0] + h[0]);
  const g = h.length === 6 ? parse(h.slice(2, 4)) : parse(h[1] + h[1]);
  const b = h.length === 6 ? parse(h.slice(4, 6)) : parse(h[2] + h[2]);
  const clamp = (n: number) => Math.round(Math.max(0, Math.min(255, n * factor)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function isLightHex(hex: string): boolean {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.5;
}

type UserMenuProps = {
  user: User;
  className?: string;
  /** If true, hide "Dashboard" in the list (we're already there). */
  hideDashboard?: boolean;
  /** When set (e.g. on dashboard), button uses a darker shade of this bar colour instead of green. */
  brandBarColor?: string;
};

export default function UserMenu({ user, className = "", hideDashboard, brandBarColor }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDashboardStyle = !!brandBarColor;
  const darkerBg = isDashboardStyle && brandBarColor ? darkenHex(brandBarColor) : undefined;
  const darkerHover = isDashboardStyle && brandBarColor ? darkenHex(brandBarColor, 0.55) : undefined;
  const dashboardTextLight = darkerBg ? !isLightHex(darkerBg) : false;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  function handleLogout() {
    setOpen(false);
    // Navigate away first so the dashboard unmounts and stops touching auth storage.
    // Then sign out in the background to avoid "Lock broken by another request" (storage contention).
    router.push("/");
    router.refresh();
    supabase.auth.signOut().catch(() => {
      // If signOut throws (e.g. lock error), force full navigation to clear state.
      if (typeof window !== "undefined") window.location.href = "/";
    });
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "Account";

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent md:px-3 md:py-2 ${isDashboardStyle && darkerBg ? "hover:opacity-90" : "border-[#018a5e] bg-[#01a76c] text-white hover:bg-[#018a5e] focus:ring-[#01a76c]"}`}
        style={isDashboardStyle && darkerBg ? { backgroundColor: darkerBg, borderColor: darkerBg } : undefined}
        onMouseEnter={(e) => {
          if (isDashboardStyle && darkerHover) {
            e.currentTarget.style.backgroundColor = darkerHover;
            e.currentTarget.style.borderColor = darkerHover;
          }
        }}
        onMouseLeave={(e) => {
          if (isDashboardStyle && darkerBg) {
            e.currentTarget.style.backgroundColor = darkerBg;
            e.currentTarget.style.borderColor = darkerBg;
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover md:h-8 md:w-8" referrerPolicy="no-referrer" />
        ) : (
          <span className={`flex h-7 w-7 items-center justify-center rounded-full md:h-8 md:w-8 ${dashboardTextLight ? "bg-white/20 text-white" : "bg-black/15 text-zinc-900"}`}>
            <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
        )}
        <span className={`max-w-[120px] truncate md:max-w-[180px] ${isDashboardStyle && darkerBg ? (dashboardTextLight ? "text-white" : "text-zinc-900") : ""}`}>{displayName}</span>
        <svg className={`h-4 w-4 shrink-0 ${isDashboardStyle && darkerBg ? (dashboardTextLight ? "text-white/90" : "text-zinc-700") : "text-white/90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {!hideDashboard && (
            <Link
              href="/dashboard"
              className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/account"
            className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <div className="my-1 border-t border-zinc-700" />
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
