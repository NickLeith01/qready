"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/with-timeout";
import { getMerchantByUserId, createMerchantForUser } from "@/lib/merchant";
import type { Merchant } from "@/types/merchant";
import type { User } from "@supabase/supabase-js";
import { PaymentModal, type PaymentPlan } from "@/components/PaymentModal";
import SiteFooter from "@/components/SiteFooter";

function loginProviderLabel(provider: string | undefined): string {
  if (!provider) return "Email";
  if (provider === "google") return "Google";
  return provider;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentModalPlan, setPaymentModalPlan] = useState<PaymentPlan | null>(null);
  const [syncingPlan, setSyncingPlan] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelModalLoading, setCancelModalLoading] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null);
  const [subscriptionPlanLabel, setSubscriptionPlanLabel] = useState<"Plus" | "Premium" | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null>(null);
  const [loadingSubscriptionDetails, setLoadingSubscriptionDetails] = useState(false);
  const [resumingSubscription, setResumingSubscription] = useState(false);

  async function refreshMerchant() {
    if (!user?.id) return;
    const m = await getMerchantByUserId(user.id);
    setMerchant(m ?? null);
  }

  async function syncPlanFromStripe() {
    if (!session?.access_token || !user?.id) return;
    setSyncingPlan(true);
    try {
      const res = await fetch("/api/sync-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const data = (await res.json().catch(() => ({}))) as { synced?: boolean; plan?: string };
      if (res.ok && (data.synced || data.plan)) await refreshMerchant();
    } finally {
      setSyncingPlan(false);
    }
  }

  async function fetchSubscriptionDetails() {
    if (!session?.access_token) return;
    setLoadingSubscriptionDetails(true);
    try {
      const res = await fetch("/api/subscription-details", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        periodEnd?: string;
        cancelAtPeriodEnd?: boolean;
      };
      if (res.ok && data.periodEnd != null) {
        setSubscriptionDetails({
          periodEnd: data.periodEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        });
      } else {
        setSubscriptionDetails(null);
      }
    } finally {
      setLoadingSubscriptionDetails(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const GET_SESSION_MS = 12_000;

    (async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          GET_SESSION_MS,
          "getSession"
        );
        if (cancelled) return;
        const s = data.session;
        if (!s?.user) {
          router.replace("/login");
          return;
        }
        setUser(s.user);
        setSession(s);
        let m = await getMerchantByUserId(s.user.id);
        if (cancelled) return;
        if (!m && s.user.id) {
          await createMerchantForUser(s.user.id);
          if (cancelled) return;
          m = await getMerchantByUserId(s.user.id);
        }
        if (cancelled) return;
        setMerchant(m ?? null);
        try {
          const res = await fetch("/api/sync-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
            body: JSON.stringify({ accessToken: s.access_token }),
          });
          const syncJson = (await res.json().catch(() => ({}))) as { synced?: boolean; plan?: string };
          if (syncJson.synced && res.ok && !cancelled) {
            m = await getMerchantByUserId(s.user.id);
            setMerchant(m ?? null);
          }
        } catch {
          // Non-blocking
        }
      } catch (e) {
        console.error("Account page bootstrap failed:", e);
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Refetch merchant and subscription details when user returns to this tab
  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => {
      getMerchantByUserId(user.id).then((m) => {
        setMerchant(m ?? null);
        const paid = m?.plan === "plus" || m?.plan === "premium" || m?.plan === "paid";
        if (paid && session?.access_token) fetchSubscriptionDetails();
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id, session?.access_token]);

  // For paid users, load subscription details (period end, cancel_at_period_end) so we can show (Cancelling) and Resume
  useEffect(() => {
    const paid = merchant?.plan === "plus" || merchant?.plan === "premium" || merchant?.plan === "paid";
    if (paid && session?.access_token) fetchSubscriptionDetails();
    else setSubscriptionDetails(null);
  }, [merchant?.plan, session?.access_token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-zinc-900">
        <p className="text-center text-zinc-600">We couldn&apos;t load your account. Check your connection and try again.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="rounded-full bg-[#01a76c] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#018a5e]"
          >
            Reload page
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const planLabel =
    merchant.plan === "paid" || merchant.plan === "premium" ? "Premium" : merchant.plan === "plus" ? "Plus" : "Free";
  const isPaid = merchant.plan === "plus" || merchant.plan === "premium" || merchant.plan === "paid";
  const cancelAtPeriodEnd = subscriptionDetails?.cancelAtPeriodEnd ?? false;
  const periodEndFormatted =
    subscriptionDetails?.periodEnd
      ? new Date(subscriptionDetails.periodEnd).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
  const billingLabel = isPaid
    ? (merchant.plan === "plus" ? "£15/pm" : "£20/pm")
    : "–";
  const provider = (user.app_metadata?.provider as string) || "email";
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "—";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <div className="flex flex-1 flex-col px-6 py-10 md:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col items-center">
            <Link href="/" className="inline-block">
              <img
                src="/qready-logo-colour.svg"
                alt="QReady"
                className="h-9 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </Link>
            <Link href="/dashboard" className="mt-4 text-sm font-medium text-zinc-500 hover:text-zinc-900">
              ← Dashboard
            </Link>
          </div>

          {/* Account */}
          <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Account</h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-500">
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
                <div className="text-sm text-zinc-600">
                  <p><span className="font-medium text-zinc-900">Name:</span> {displayName}</p>
                  <p className="mt-0.5"><span className="font-medium text-zinc-900">Email:</span> {user.email ?? "—"}</p>
                  <p className="mt-0.5"><span className="font-medium text-zinc-900">Login with:</span> {loginProviderLabel(provider)}</p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-[#01a76c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#018a5e]"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete account
              </button>
            </div>
          </section>

          {/* Delete account confirmation modal */}
          {deleteModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => !deleting && setDeleteModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div
                className="relative w-full max-w-lg rounded-xl bg-white p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute right-4 top-4 rounded-lg border border-sky-400 bg-white p-1.5 text-zinc-900 hover:bg-zinc-50"
                  onClick={() => !deleting && setDeleteModalOpen(false)}
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 id="delete-modal-title" className="mt-2 text-center text-lg font-bold text-zinc-900">
                  Delete account?
                </h2>
                <p className="mt-4 text-center text-sm text-zinc-700">
                  Warning: This action cannot be undone. Deleting your account will immediately and permanently erase your:
                </p>
                <div className="mt-4 space-y-2 text-center text-sm text-zinc-700">
                  <p>Active and past orders</p>
                  <p>Custom branding and settings</p>
                  <p>QReady account login</p>
                </div>
                <div className="mt-8 flex justify-center gap-3">
                  <button
                    type="button"
                    className="rounded-lg bg-[#01a76c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#018a5e]"
                    onClick={() => !deleting && setDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        if (token) {
                          const res = await fetch("/api/account/delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ accessToken: token }),
                          });
                          if (!res.ok) {
                            const json = await res.json().catch(() => ({}));
                            if (typeof window !== "undefined") {
                              window.alert(json?.error ?? "Account deletion failed. Please contact contact@qready.io.");
                            }
                            return;
                          }
                        }
                        setDeleteModalOpen(false);
                        await supabase.auth.signOut();
                        router.push("/");
                        if (typeof window !== "undefined") window.location.href = "/";
                      } catch (e) {
                        if (typeof window !== "undefined") {
                          window.alert("Something went wrong. Please contact contact@qready.io to delete your account.");
                        }
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel subscription confirmation modal */}
          {cancelModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => !cancellingSubscription && setCancelModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-subscription-modal-title"
            >
              <div
                className="relative w-full max-w-lg rounded-xl bg-white p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute right-4 top-4 rounded-full border border-sky-400 bg-white p-1.5 text-zinc-900 hover:bg-zinc-50"
                  onClick={() => !cancellingSubscription && setCancelModalOpen(false)}
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 id="cancel-subscription-modal-title" className="text-center text-lg font-bold text-zinc-900">
                  Cancellation Subscription?
                </h2>
                {cancelModalLoading ? (
                  <p className="mt-4 text-center text-sm text-zinc-500">Loading…</p>
                ) : subscriptionPeriodEnd && subscriptionPlanLabel ? (
                  <>
                    <p className="mt-4 text-center text-sm text-zinc-700">
                      Your {subscriptionPlanLabel} plan will be cancelled and auto-renew turned off.
                    </p>
                    <p className="mt-2 text-center text-sm text-zinc-700">
                      You can continue using your {subscriptionPlanLabel} features until your prepaid month ends on{" "}
                      {new Date(subscriptionPeriodEnd).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      .
                    </p>
                    <p className="mt-2 text-center text-sm text-zinc-700">
                      Once the cycle ends, your account will revert to the Free plan with a 5-order limit.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-center text-sm text-zinc-500">Unable to load subscription details.</p>
                )}
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    className="rounded-lg bg-[#01a76c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#018a5e] disabled:opacity-50"
                    onClick={() => setCancelModalOpen(false)}
                    disabled={cancellingSubscription}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={cancelModalLoading || cancellingSubscription}
                    onClick={async () => {
                      if (!session?.access_token) return;
                      setCancellingSubscription(true);
                      try {
                        const res = await fetch("/api/cancel-subscription", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ accessToken: session.access_token }),
                        });
                        const data = (await res.json().catch(() => ({}))) as { error?: string };
                        if (!res.ok) {
                          if (typeof window !== "undefined")
                            window.alert(data.error ?? "Failed to cancel subscription. Please try again.");
                          return;
                        }
                        setCancelModalOpen(false);
                        await refreshMerchant();
                        await fetchSubscriptionDetails();
                      } finally {
                        setCancellingSubscription(false);
                      }
                    }}
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentModalPlan && (
            <PaymentModal
              plan={paymentModalPlan}
              isOpen={!!paymentModalPlan}
              onClose={() => setPaymentModalPlan(null)}
              onSuccess={refreshMerchant}
              userEmail={user.email}
              accessToken={session?.access_token}
            />
          )}

          {/* Your plan + Billing (same width as 3 columns below) */}
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Your plan</h2>
            {/* Grid: 3 equal columns so Billing/Amount centred, Plan column aligns with middle of Premium card below */}
            <div className="mt-4 grid grid-cols-3 items-start gap-x-6">
              <div>
                <p className="text-sm font-medium text-zinc-900">Current plan</p>
                <p className="mt-0.5 text-sm text-zinc-700">
                  {planLabel}
                  {cancelAtPeriodEnd ? " (Cancelling)" : ""}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-900">Billing</p>
                <p className="mt-0.5 text-sm text-zinc-700">
                  {cancelAtPeriodEnd && periodEndFormatted ? (
                    <>
                      Cancelled. Access ends on {periodEndFormatted}.
                      <br />
                      (No further charges will be made)
                    </>
                  ) : (
                    billingLabel
                  )}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                {isPaid && cancelAtPeriodEnd && (
                  <button
                    type="button"
                    className="rounded-lg bg-[#01a76c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#018a5e] disabled:opacity-50"
                    onClick={async () => {
                      if (!session?.access_token) return;
                      setResumingSubscription(true);
                      try {
                        const res = await fetch("/api/resume-subscription", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ accessToken: session.access_token }),
                        });
                        const data = (await res.json().catch(() => ({}))) as { error?: string };
                        if (!res.ok) {
                          if (typeof window !== "undefined")
                            window.alert(data.error ?? "Failed to resume subscription. Please try again.");
                          return;
                        }
                        await fetchSubscriptionDetails();
                      } finally {
                        setResumingSubscription(false);
                      }
                    }}
                    disabled={resumingSubscription}
                  >
                    {resumingSubscription ? "Resuming…" : "Resume"}
                  </button>
                )}
                {isPaid && !cancelAtPeriodEnd && (
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    onClick={async () => {
                      setCancelModalOpen(true);
                      setCancelModalLoading(true);
                      setSubscriptionPeriodEnd(null);
                      setSubscriptionPlanLabel(null);
                      try {
                        const res = await fetch("/api/subscription-details", {
                          headers: { Authorization: `Bearer ${session?.access_token}` },
                        });
                        const data = (await res.json().catch(() => ({}))) as {
                          periodEnd?: string;
                          planLabel?: "Plus" | "Premium";
                          error?: string;
                        };
                        if (res.ok && data.periodEnd != null && data.planLabel) {
                          setSubscriptionPeriodEnd(data.periodEnd);
                          setSubscriptionPlanLabel(data.planLabel);
                        } else {
                          setCancelModalOpen(false);
                          if (typeof window !== "undefined")
                            window.alert(data.error ?? "Could not load subscription details.");
                        }
                      } finally {
                        setCancelModalLoading(false);
                      }
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <h3 className="col-span-3 mt-8 text-base font-semibold text-zinc-900">Billing information</h3>
              {!isPaid ? (
                <p className="col-span-3 mt-2 text-sm text-zinc-500">–</p>
              ) : (
                <>
                  <div className="border-b border-zinc-200 py-2 text-sm font-medium text-zinc-900">Date</div>
                  <div className="border-b border-zinc-200 py-2 text-center text-sm font-medium text-zinc-900">Amount</div>
                  <div className="border-b border-zinc-200 py-2 text-center text-sm font-medium text-zinc-900">Plan</div>
                  <div className="border-b border-zinc-100 py-2 text-sm text-zinc-500">–</div>
                  <div className="border-b border-zinc-100 py-2 text-center text-sm text-zinc-500">–</div>
                  <div className="border-b border-zinc-100 py-2 text-center text-sm text-zinc-500">–</div>
                  <p className="col-span-3 mt-2 text-xs text-zinc-500">Payment history will appear here once billing is connected.</p>
                </>
              )}
            </div>
          </section>

          {/* Three plans (same as pricing page) */}
          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
            {/* Starter */}
            <div className="relative">
              {planLabel === "Free" && (
                <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#01a76c] px-3 py-1 text-xs font-semibold text-white">
                  Current plan
                </span>
              )}
              <div
                className={`flex flex-col rounded-xl bg-white p-6 md:p-8 md:pb-12 ${
                  planLabel === "Free"
                    ? "border-2 border-[#01a76c] pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    : "border border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
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
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Unlimited</span></li>
                  </ul>
                </div>
                <div className="border-t border-zinc-200 pt-6 mt-6">
                  <p className="text-sm font-semibold text-zinc-800">Branding & Interface</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                    <li className="flex items-center gap-2"><span className="text-[#01a76c]">✓</span> Text based brand name</li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Logo</span></li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Brand Colors</span></li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Queue Messaging</span></li>
                  </ul>
                </div>
                <div className="border-t border-zinc-200 pt-6 mt-6">
                  <p className="text-sm font-semibold text-zinc-800">Customer Journey</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Click-Through End Link</span></li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">No 3rd Party Ads</span></li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Promotions and Ads</span></li>
                  </ul>
                </div>
              </div>
              </div>
            </div>

            {/* Plus */}
            <div className="relative">
              {planLabel === "Plus" && (
                <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#01a76c] px-3 py-1 text-xs font-semibold text-white">
                  Current plan
                </span>
              )}
              <div
                className={`flex flex-col rounded-xl bg-white p-6 md:p-8 md:pb-12 ${
                  planLabel === "Plus"
                    ? "border-2 border-[#01a76c] pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    : "border border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                }`}
              >
              <h3 className="text-center text-xl font-bold text-zinc-900">Plus</h3>
              <p className="mt-2 text-center text-sm text-zinc-500">Full brand control for<br />growing businesses</p>
              <p className="mt-6 text-center text-2xl font-bold text-zinc-900 md:text-3xl">
                £15
                <span className="text-base font-normal md:text-lg"> /month</span>
              </p>
              <p className="mt-1 text-center text-sm font-semibold text-zinc-900">Unlimited active orders</p>
              {planLabel === "Plus" ? (
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-6 py-3.5 text-center font-semibold text-zinc-500 cursor-not-allowed"
                >
                  Current plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaymentModalPlan("plus")}
                  className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
                >
                  Get Plus
                </button>
              )}
              <p className="mt-3 text-center text-xs text-zinc-400">Cancel anytime</p>
              <div className="mt-8 flex-1 space-y-0 border-t border-zinc-200 pt-6 pb-10">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Queue Management</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Up to 5 at one time</span></li>
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
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">No 3rd Party Ads</span></li>
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Custom Promotions and Ads</span></li>
                  </ul>
                </div>
              </div>
              </div>
            </div>

            {/* Premium */}
            <div className="relative">
              {planLabel === "Premium" && (
                <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#01a76c] px-3 py-1 text-xs font-semibold text-white">
                  Current plan
                </span>
              )}
              <div
                className={`flex flex-col rounded-xl bg-white p-6 md:p-8 md:pb-12 ${
                  planLabel === "Premium"
                    ? "border-2 border-[#01a76c] pt-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    : "border border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                }`}
              >
              <h3 className="text-center text-xl font-bold text-zinc-900">Premium</h3>
              <p className="mt-2 text-center text-sm text-zinc-500">Maximize revenue with<br />customer engagement</p>
              <p className="mt-6 text-center text-2xl font-bold text-zinc-900 md:text-3xl">
                £20
                <span className="text-base font-normal md:text-lg"> /month</span>
              </p>
              <p className="mt-1 text-center text-sm font-semibold text-zinc-900">Unlimited active orders</p>
              {planLabel === "Premium" ? (
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-6 py-3.5 text-center font-semibold text-zinc-500 cursor-not-allowed"
                >
                  Current plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaymentModalPlan("premium")}
                  className="mt-4 inline-flex w-full justify-center rounded-lg border border-black bg-[#01a76c] px-6 py-3.5 text-center font-semibold text-white hover:bg-[#018a5e]"
                >
                  Get Premium
                </button>
              )}
              <p className="mt-3 text-center text-xs text-zinc-400">Cancel anytime</p>
              <div className="mt-8 flex-1 space-y-0 border-t border-zinc-200 pt-6 pb-10">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Queue Management</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                    <li className="flex items-center gap-2"><span className="text-zinc-300">✕</span><span className="text-zinc-400 line-through">Up to 5 at one time</span></li>
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
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
