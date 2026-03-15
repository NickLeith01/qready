"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMerchantByUserId } from "@/lib/merchant";
import type { Session, User } from "@supabase/supabase-js";
import { PaymentModal, type PaymentPlan } from "@/components/PaymentModal";

export default function HomePricingSection() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [paymentModalPlan, setPaymentModalPlan] = useState<PaymentPlan | null>(null);
  const [planLabel, setPlanLabel] = useState<"Free" | "Plus" | "Premium">("Free");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      setUser(s?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      setUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setPlanLabel("Free");
      return;
    }
    getMerchantByUserId(user.id).then((m) => {
      if (!m) {
        setPlanLabel("Free");
        return;
      }
      if (m.plan === "plus") setPlanLabel("Plus");
      else if (m.plan === "premium" || m.plan === "paid") setPlanLabel("Premium");
      else setPlanLabel("Free");
    });
  }, [user?.id]);

  const signedIn = !!user;
  const isStarter = planLabel === "Free";
  const isPlus = planLabel === "Plus";
  const isPremium = planLabel === "Premium";

  return (
    <>
      <section id="pricing" className="w-full bg-[#01a76c] px-6 py-14 md:py-20">
        <h2 className="text-center text-3xl font-bold text-white md:text-4xl">Pricing</h2>
        <div className="mx-auto mt-16 grid w-full min-w-0 max-w-[min(72rem,100%)] gap-6 md:grid-cols-3 md:gap-8">
          {/* Starter */}
          <div className="relative min-w-0">
            {isStarter && (
              <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold text-[#01a76c]">
                Current plan
              </span>
            )}
            <div
              className={`flex flex-col rounded-xl bg-white p-6 shadow-lg md:p-8 md:pb-12 ${
                isStarter ? "border-2 border-black pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]" : "border border-zinc-200"
              }`}
            >
            <h3 className="text-center text-xl font-bold text-zinc-900">Starter</h3>
            <p className="mt-2 text-center text-sm text-zinc-500">Perfect for food trucks<br />& small pop-ups</p>
            <p className="mt-6 text-center text-2xl font-bold text-zinc-900 md:text-3xl">Free</p>
            <p className="mt-1 text-center text-sm font-semibold text-zinc-900">
              Maximum of 5 active orders
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
            >
              Try for free
            </Link>
            <p className="mt-3 text-center text-xs text-zinc-400">No payment details required</p>
            <div className="mt-8 flex-1 space-y-0 border-t border-zinc-200 pt-6 pb-10">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Queue Management</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> <strong>Up to 5 at one time</strong></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Unlimited</span></li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Branding & Interface</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Text based brand name</li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Logo</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Brand Colors</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Queue Messaging</span></li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Customer Journey</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Click-Through End Link</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">No 3rd Party Ads</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Promotions and Ads</span></li>
                </ul>
              </div>
            </div>
            </div>
          </div>

          {/* Plus */}
          <div className="relative min-w-0">
            {isPlus && (
              <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold text-[#01a76c]">
                Current plan
              </span>
            )}
            <div
              className={`flex flex-col rounded-xl bg-white p-6 shadow-lg md:p-8 md:pb-12 ${
                isPlus ? "border-2 border-black pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]" : "border border-zinc-200"
              }`}
            >
            <h3 className="text-center text-xl font-bold text-zinc-900">Plus</h3>
            <p className="mt-2 text-center text-sm text-zinc-500">Full brand control for<br />growing businesses.</p>
            <p className="mt-6 text-center text-2xl font-bold text-zinc-900 md:text-3xl">
              £15
              <span className="text-base font-normal md:text-lg"> /month</span>
            </p>
            <p className="mt-1 text-center text-sm font-semibold text-zinc-900">Unlimited active orders</p>
            {isPlus ? (
              <button
                type="button"
                disabled
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-6 py-3.5 text-center font-semibold text-zinc-500 cursor-not-allowed"
              >
                Current plan
              </button>
            ) : signedIn ? (
              <button
                type="button"
                onClick={() => setPaymentModalPlan("plus")}
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
              >
                Get Plus
              </button>
            ) : (
              <Link
                href="/account/upgrade?plan=plus"
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
              >
                Get Plus
              </Link>
            )}
            <p className="mt-3 text-center text-xs text-zinc-400">Cancel anytime</p>
            <div className="mt-8 flex-1 space-y-0 border-t border-zinc-200 pt-6 pb-10">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Queue Management</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Up to 5 at one time</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> <strong>Unlimited</strong></li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Branding & Interface</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Text based brand name</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Logo</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Brand Colors</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Queue Messaging</li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Customer Journey</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Click-Through End Link</li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">No 3rd Party Ads</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Custom Promotions and Ads</span></li>
                </ul>
              </div>
            </div>
            </div>
          </div>

          {/* Premium */}
          <div className="relative min-w-0">
            {isPremium && (
              <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold text-[#01a76c]">
                Current plan
              </span>
            )}
            <div
              className={`flex flex-col rounded-xl bg-white p-6 shadow-lg md:p-8 md:pb-12 ${
                isPremium ? "border-2 border-black pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]" : "border border-zinc-200"
              }`}
            >
            <h3 className="text-center text-xl font-bold text-zinc-900">Premium</h3>
            <p className="mt-2 text-center text-sm text-zinc-500">Maximize revenue with<br />customer engagement</p>
            <p className="mt-6 text-center text-2xl font-bold text-zinc-900 md:text-3xl">
              £20
              <span className="text-base font-normal md:text-lg"> /month</span>
            </p>
            <p className="mt-1 text-center text-sm font-semibold text-zinc-900">Unlimited active orders</p>
            {isPremium ? (
              <button
                type="button"
                disabled
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-6 py-3.5 text-center font-semibold text-zinc-500 cursor-not-allowed"
              >
                Current plan
              </button>
            ) : signedIn ? (
              <button
                type="button"
                onClick={() => setPaymentModalPlan("premium")}
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
              >
                Get Premium
              </button>
            ) : (
              <Link
                href="/account/upgrade?plan=premium"
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
              >
                Get Premium
              </Link>
            )}
            <p className="mt-3 text-center text-xs text-zinc-400">Cancel anytime</p>
            <div className="mt-8 flex-1 space-y-0 border-t border-zinc-200 pt-6 pb-10">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Queue Management</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#cbccce]">✕</span><span className="text-[#cbccce] line-through">Up to 5 at one time</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> <strong>Unlimited</strong></li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Branding & Interface</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Text based brand name</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Logo</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Brand Colors</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Queue Messaging</li>
                </ul>
              </div>
              <div className="border-t border-zinc-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-zinc-800">Customer Journey</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Click-Through End Link</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> No 3rd Party Ads</li>
                  <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Custom Promotions and Ads</li>
                </ul>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {paymentModalPlan && (
        <PaymentModal
          plan={paymentModalPlan}
          isOpen={!!paymentModalPlan}
          onClose={() => setPaymentModalPlan(null)}
          userEmail={user?.email ?? null}
          accessToken={session?.access_token}
        />
      )}
    </>
  );
}
