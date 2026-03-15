"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PaymentModal, type PaymentPlan } from "@/components/PaymentModal";

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan = planParam === "plus" || planParam === "premium" ? planParam : null;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!plan) {
        router.replace(s ? "/account" : "/");
        return;
      }
      if (!s) {
        router.replace(`/signup?plan=${plan}`);
        return;
      }
      setUserEmail(s.user?.email ?? null);
      setAccessToken(s.access_token ?? null);
      setLoading(false);
    })();
  }, [router, plan]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  // Signed in + plan in URL: show payment modal over faded background
  if (userEmail !== null && plan) {
    return (
      <div className="min-h-screen bg-white">
        <PaymentModal
          plan={plan as PaymentPlan}
          isOpen={true}
          onClose={() => router.push("/account")}
          onSuccess={() => router.push("/account")}
          userEmail={userEmail}
          accessToken={accessToken}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <Link href="/account" className="text-sm text-zinc-400 hover:text-white">← Account</Link>
      <div className="mx-auto max-w-md pt-8 text-center">
        <h1 className="text-2xl font-bold">Upgrade to Pro</h1>
        <p className="mt-2 text-zinc-400">Unlimited waiting queue, custom branding, and more.</p>
        <p className="mt-6 rounded-lg bg-zinc-800/80 p-4 text-sm text-zinc-500">
          Choose a plan above to subscribe. You can test the Pro experience anytime via Dashboard → Settings → Testing: switch plan.
        </p>
        <Link href="/account" className="mt-6 inline-block rounded-full bg-rose-600 px-6 py-2.5 font-semibold hover:bg-rose-500">
          Back to Account
        </Link>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
