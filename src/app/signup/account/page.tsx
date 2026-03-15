"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteFooter from "@/components/SiteFooter";

export default function SignUpAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasUsage = sessionStorage.getItem("qready_signup_usage");
    const hasBusiness = sessionStorage.getItem("qready_signup_business");
    if (!hasUsage && !hasBusiness) {
      router.replace("/signup");
    }
  }, [router]);

  function getSignupContext() {
    if (typeof window === "undefined") return { business_type: undefined };
    const usage = sessionStorage.getItem("qready_signup_usage");
    const business = sessionStorage.getItem("qready_signup_business");
    return { business_type: usage ?? business ?? undefined };
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { business_type } = getSignupContext();
    const plan = typeof window !== "undefined" ? sessionStorage.getItem("qready_signup_plan") : null;
    const planParam = plan === "plus" || plan === "premium" ? `?plan=${plan}` : "";
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_type },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/signup/confirmed${planParam}` : undefined,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("qready_signup_email", email);
    }
    router.push("/signup/check-email");
    router.refresh();
  }

  async function handleGoogleSignUp() {
    setError(null);
    const { business_type } = getSignupContext();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/signup/discover`,
        ...(business_type ? { queryParams: { business_type: String(business_type) } } : {}),
      },
    });
    if (err) setError(err.message);
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
          <div className="mt-1 flex w-full">
            <span className="block h-0.5 flex-1 bg-[#01a76c]" />
            <span className="block h-0.5 flex-1 bg-zinc-200" />
          </div>

          <h2 className="mt-8 text-xl font-bold text-zinc-900">Create an account</h2>
          <p className="mt-1 text-sm text-zinc-600">Get ready to upgrade your queue!</p>

          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  minLength={6}
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
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <span className="flex-1 border-t border-zinc-300" />
            <span className="text-xs text-zinc-500">or</span>
            <span className="flex-1 border-t border-zinc-300" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-3 font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </button>

          <p className="mt-6 text-center text-sm text-zinc-600">
            <Link href="/signup" className="text-zinc-600 underline hover:text-zinc-900">
              ← Back
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
