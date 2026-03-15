"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      setHasSession(!!session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-zinc-900">
        <p className="text-sm text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-zinc-900">
        <div className="flex flex-1 flex-col px-6 py-10 md:py-14">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="inline-block">
              <img src="/qready-logo-colour.svg" alt="QReady" className="h-9 w-auto object-contain" referrerPolicy="no-referrer" />
            </Link>
            <h1 className="mt-8 text-2xl font-bold text-zinc-900">Invalid or expired link</h1>
            <p className="mt-2 text-sm text-zinc-600">This password reset link is invalid or has expired. Request a new one.</p>
            <p className="mt-6">
              <Link href="/login/forgot" className="font-medium text-[#01a76c] hover:underline">← Request new reset link</Link>
            </p>
            <p className="mt-2">
              <Link href="/login" className="font-medium text-[#01a76c] hover:underline">Back to Login</Link>
            </p>
          </div>
        </div>
        <SiteFooter />
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

          <h1 className="mt-8 text-2xl font-bold text-zinc-900">Set new password</h1>
          <div className="mt-1 flex w-full">
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-zinc-200" />
          </div>

          <h2 className="mt-8 text-xl font-bold text-zinc-900">Choose a new password</h2>
          <p className="mt-1 text-sm text-zinc-600">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900">
                New password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-10 text-zinc-900 placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#01a76c] py-3 font-semibold text-white hover:bg-[#018a5e] disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            <Link href="/login" className="font-medium text-[#01a76c] hover:underline">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
