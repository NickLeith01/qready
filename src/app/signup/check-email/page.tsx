"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";

const EMAIL_KEY = "qready_signup_email";

export default function SignUpCheckEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(EMAIL_KEY);
    if (!stored) {
      router.replace("/signup");
      return;
    }
    setEmail(stored);
  }, [router]);

  async function handleResend() {
    if (!email.trim()) return;
    setResendMessage(null);
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    setResendLoading(false);
    if (error) {
      setResendMessage("error");
      return;
    }
    setResendMessage("success");
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
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

          <h1 className="mt-8 text-2xl font-bold text-zinc-900">Check Your Email</h1>
          <div className="mt-1 flex w-full">
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-zinc-200" />
          </div>

          <p className="mt-8 text-sm text-zinc-600">
            To verify your identity, you&apos;ll receive an email shortly at <strong className="font-semibold text-zinc-900">{email}</strong> to activate your account.
          </p>

          <div className="mt-6">
            <label htmlFor="check-email-input" className="block text-sm font-medium text-zinc-900">
              Email
            </label>
            <input
              id="check-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
            />
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="mt-6 w-full rounded-lg bg-[#01a76c] py-3 font-semibold text-white hover:bg-[#018a5e] disabled:opacity-50"
          >
            {resendLoading ? "Sending…" : "Resend email"}
          </button>

          {resendMessage === "success" && (
            <p className="mt-3 text-sm text-[#01a76c]">Check your inbox for a new link.</p>
          )}
          {resendMessage === "error" && (
            <p className="mt-3 text-sm text-red-600">Something went wrong. Try again or contact support.</p>
          )}

          <p className="mt-6 text-sm text-zinc-600">
            Nothing in inbox? Check your spam folder or{" "}
            <Link href="/contact" className="font-medium text-[#01a76c] underline hover:text-[#018a5e]">
              contact support
            </Link>
            .
          </p>

          <p className="mt-8 text-center text-sm text-zinc-600">
            <Link href="/signup" className="text-zinc-600 underline hover:text-zinc-900">
              ← Back to sign up
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
