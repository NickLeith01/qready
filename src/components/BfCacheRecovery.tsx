"use client";

import { useEffect } from "react";

/**
 * When the user goes Back/Forward, Chrome may restore the page from bfcache with frozen JS:
 * in-flight auth/data promises never finish → endless "Loading…". A real reload restores a clean run.
 */
export default function BfCacheRecovery() {
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
