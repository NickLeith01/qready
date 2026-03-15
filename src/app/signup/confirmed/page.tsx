"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PLAN_KEY = "qready_signup_plan";
const EMAIL_KEY = "qready_signup_email";

function SignUpConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const planFromUrl = searchParams.get("plan");
      const planFromStorage = typeof window !== "undefined" ? sessionStorage.getItem(PLAN_KEY) : null;
      const plan = planFromUrl === "plus" || planFromUrl === "premium" ? planFromUrl : (planFromStorage === "plus" || planFromStorage === "premium" ? planFromStorage : null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem("qready_signup_usage");
        sessionStorage.removeItem("qready_signup_business");
        if (plan !== "plus" && plan !== "premium") sessionStorage.removeItem(PLAN_KEY);
      }
      if (session && (plan === "plus" || plan === "premium")) {
        if (typeof window !== "undefined") sessionStorage.setItem(PLAN_KEY, plan);
        router.replace(`/signup/discover?plan=${plan}`);
        return;
      }
      if (session) {
        router.replace("/dashboard");
        return;
      }
      router.replace("/login");
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
      <p className="text-zinc-500">Confirming your account…</p>
    </div>
  );
}

export default function SignUpConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Confirming your account…</p>
      </div>
    }>
      <SignUpConfirmedContent />
    </Suspense>
  );
}
