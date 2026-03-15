"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <nav className="flex shrink-0 items-center justify-end gap-4 border-b border-zinc-200 bg-white/95 px-6 py-4">
        <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Login
        </Link>
        <Link href="/signup" className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">
          Sign up
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex shrink-0 items-center justify-end border-b border-zinc-200 bg-white/95 px-6 py-4">
      <UserMenu user={user} />
    </nav>
  );
}
