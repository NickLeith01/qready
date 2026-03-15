"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";

const PLAN_KEY = "qready_signup_plan";

const DISCOVER_OPTIONS = [
  { id: "google", label: "Google", icon: "G" },
  { id: "youtube", label: "YouTube", icon: "▶" },
  { id: "chatgpt", label: "ChatGPT", icon: "C" },
  { id: "friend", label: "Friend / Colleague", icon: "👤" },
  { id: "other", label: "Other (please specify)", icon: null },
];

function SignUpDiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [newsletter, setNewsletter] = useState(true);

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if ((planFromUrl === "plus" || planFromUrl === "premium") && typeof window !== "undefined") {
      sessionStorage.setItem(PLAN_KEY, planFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && typeof window !== "undefined") {
        const hasUsage = sessionStorage.getItem("qready_signup_usage");
        const hasBusiness = sessionStorage.getItem("qready_signup_business");
        if (!hasUsage && !hasBusiness) router.replace("/signup");
      }
    })();
  }, [router]);

  function getRedirectAfterSignup() {
    if (typeof window === "undefined") return "/dashboard";
    const plan = sessionStorage.getItem(PLAN_KEY);
    if (plan === "plus" || plan === "premium") return `/account/upgrade?plan=${plan}`;
    return "/dashboard";
  }

  const isPaymentFlow =
    typeof window !== "undefined" && (sessionStorage.getItem(PLAN_KEY) === "plus" || sessionStorage.getItem(PLAN_KEY) === "premium");

  async function handleContinue() {
    const redirectTo = getRedirectAfterSignup();
    const value = selected === "other" ? otherText : selected;
    const discovery = value?.trim() ?? null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          discovery: discovery ?? undefined,
          newsletter: newsletter,
        },
      });
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("qready_signup_business");
      sessionStorage.removeItem("qready_signup_usage");
      sessionStorage.removeItem("qready_signup_plan");
    }
    router.push(redirectTo);
    router.refresh();
  }

  function handleSkip() {
    const redirectTo = getRedirectAfterSignup();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("qready_signup_business");
      sessionStorage.removeItem("qready_signup_usage");
      sessionStorage.removeItem("qready_signup_plan");
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <div className="flex flex-1 flex-col px-6 py-10 md:py-14">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-block">
            <img
              src="/qready-logo-colour.svg"
              alt="QReady"
              className="h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </Link>

          <h1 className="mt-8 text-2xl font-bold text-zinc-900">Sign up</h1>
          <div className="mt-1 flex w-full gap-0.5">
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-zinc-200" />
          </div>

          <h2 className="mt-8 text-xl font-bold text-zinc-900">How did you discover QReady?</h2>
          <p className="mt-1 text-sm text-zinc-600">We&apos;d love to know who we have to thank.</p>

          <div className="mt-6 space-y-3">
            {DISCOVER_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  selected === opt.id
                    ? "border-[#01a76c] bg-[#01a76c]/5"
                    : "border-zinc-300 bg-white hover:border-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="discover"
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                  className="sr-only"
                />
                {opt.icon !== null ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
                    {opt.icon}
                  </span>
                ) : (
                  <span className="h-8 w-8 shrink-0" />
                )}
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
            {selected === "other" && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Please specify"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
              />
            )}
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="rounded border-zinc-400 text-[#01a76c] focus:ring-[#01a76c]"
            />
            <span>Keep me updated with product improvements.</span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-8 w-full rounded-lg bg-[#01a76c] py-3 font-semibold text-white hover:bg-[#018a5e]"
          >
            {isPaymentFlow ? "Continue to payment →" : "Continue to Dashboard →"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="mt-3 w-full text-center text-sm text-zinc-600 underline hover:text-zinc-900"
          >
            Skip
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

export default function SignUpDiscoverPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <SignUpDiscoverContent />
    </Suspense>
  );
}
