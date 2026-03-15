"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";

const USAGE_OPTIONS = [
  { id: "street_food", label: "Street Food", icon: "🍔" },
  { id: "hair_beauty", label: "Hair & Beauty", icon: "✂️" },
  { id: "pharmacy_clinic", label: "Pharmacy & Clinic", icon: "💊" },
  { id: "cafe_restaurant", label: "Cafe & Restaurant", icon: "☕️" },
  { id: "retail_collection", label: "Retail & Collection", icon: "🛍️" },
  { id: "events_festivals", label: "Events & Festivals", icon: "🎪" },
];

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const plan = searchParams.get("plan");

  useEffect(() => {
    if (plan === "plus" || plan === "premium") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("qready_signup_plan", plan);
      }
    }
  }, [plan]);

  function handleContinue() {
    const value = selected === "other" ? otherText.trim() : selected;
    if (!value || !termsAccepted) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("qready_signup_usage", value);
    }
    router.push("/signup/account");
  }

  const canContinue = selected && (selected !== "other" || otherText.trim()) && termsAccepted;

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <div className="flex flex-1 flex-col px-6 py-10 md:py-14">
        <div className="mx-auto w-full max-w-lg">
          <Link href="/" className="inline-block">
            <img
              src="/qready-logo-colour.svg"
              alt="QReady"
              className="h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </Link>

          <h1 className="mt-8 border-b-2 border-[#01a76c] pb-1 text-2xl font-bold text-zinc-900">
            Sign up
          </h1>

          <h2 className="mt-8 text-xl font-bold text-zinc-900">Where&apos;s the queue?</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Help us understand how QReady is used.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {USAGE_OPTIONS.map((opt) => (
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
                  name="usage"
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                  className="sr-only"
                />
                <span className="text-xl">{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-300 px-4 py-3 hover:border-zinc-400">
              <input
                type="radio"
                name="usage"
                checked={selected === "other"}
                onChange={() => setSelected("other")}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">Other (please specify)</span>
                {selected === "other" && (
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Please specify"
                    className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
                  />
                )}
              </div>
            </label>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 rounded border-zinc-400 text-[#01a76c] focus:ring-[#01a76c]"
            />
            <span>
              * I accept the{" "}
              <Link href="/terms" className="font-medium text-[#01a76c] underline hover:text-[#018a5e]">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[#01a76c] underline hover:text-[#018a5e]">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[#01a76c] px-6 py-3.5 font-semibold text-white hover:bg-[#018a5e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue →
          </button>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link
              href={plan === "plus" || plan === "premium" ? `/login?plan=${plan}` : "/login"}
              className="font-medium text-[#01a76c] underline hover:text-[#018a5e]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
