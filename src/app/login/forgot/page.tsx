"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login/reset`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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

          <h1 className="mt-8 text-2xl font-bold text-zinc-900">Forgot Password</h1>
          <div className="mt-1 flex w-full">
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-zinc-200" />
          </div>

          {sent ? (
            <>
              <h2 className="mt-8 text-xl font-bold text-zinc-900">Check your email</h2>
              <p className="mt-1 text-sm text-zinc-600">
                We&apos;ve sent instructions to reset your password to {email}.
              </p>
              <p className="mt-6 text-sm text-zinc-600">
                <Link href="/login" className="font-medium text-[#01a76c] hover:underline">
                  ← Back to Login
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-8 text-xl font-bold text-zinc-900">Reset your password</h2>
              <p className="mt-1 text-sm text-zinc-600">
                We will send you instructions on how to reset your password by email.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-900">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#01a76c] py-3 font-semibold text-white hover:bg-[#018a5e] disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Reset Password"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-600">
                <Link href="/login" className="font-medium text-[#01a76c] hover:underline">
                  ← Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
