"use client";

import { useMemo, useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { COUNTRIES } from "@/data/countries";

const DEFAULT_COUNTRY = "United Kingdom";

export type PaymentPlan = "plus" | "premium";

const PLAN_CONFIG: Record<
  PaymentPlan,
  { name: string; subtitle: string; price: number; priceLabel: string }
> = {
  plus: {
    name: "Plus",
    subtitle: "Plus subscription, billed monthly",
    price: 15,
    priceLabel: "£15",
  },
  premium: {
    name: "Premium",
    subtitle: "Premium subscription, billed monthly",
    price: 20,
    priceLabel: "£20",
  },
};

function dueOnDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

interface PaymentModalProps {
  plan: PaymentPlan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userEmail?: string | null;
  /** Supabase session access_token for /api/create-subscription */
  accessToken?: string | null;
}

const stripePromise = typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function PaymentForm({
  plan,
  onSuccess,
  onClose,
}: {
  plan: PaymentPlan;
  onSuccess?: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== "undefined" ? `${window.location.origin}/account?subscription=success` : "",
          payment_method_data: {
            billing_details: {
              address: {
                country: "GB",
              },
            },
          },
        },
      });
      if (submitError) {
        setError(submitError.message ?? "Payment failed");
        setLoading(false);
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-2 w-full rounded-lg bg-[#01a76c] py-3 text-sm font-semibold text-white hover:bg-[#018a5e] disabled:opacity-50"
      >
        {loading ? "Processing…" : "Subscribe now"}
      </button>
    </form>
  );
}

export function PaymentModal({ plan, isOpen, onClose, onSuccess, userEmail, accessToken }: PaymentModalProps) {
  const [step, setStep] = useState<"details" | "payment">("details");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const config = PLAN_CONFIG[plan];
  const subtotal = config.price;
  const dueOnLabel = useMemo(() => dueOnDate(), []);

  useEffect(() => {
    if (!isOpen) {
      setStep("details");
      setClientSecret(null);
      setFetchError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== "payment" || !accessToken || clientSecret !== null || fetchError) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setFetchError(data.error ?? "Could not start payment");
          return;
        }
        setClientSecret(data.clientSecret ?? null);
        if (!data.clientSecret) setFetchError("Invalid response");
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Network error");
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, step, plan, accessToken, clientSecret, fetchError]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl md:max-w-4xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Order summary - top on mobile, left on desktop */}
        <div className="flex min-w-0 shrink-0 flex-col border-b border-zinc-200 bg-zinc-50/80 p-4 sm:p-6 md:border-b-0 md:border-r md:flex-1">
          <h2 id="payment-modal-title" className="text-base font-semibold text-zinc-900">
            Order summary
          </h2>
          <p className="mt-3 text-xl font-bold text-zinc-900">{config.name}</p>
          <p className="mt-0.5 text-sm text-zinc-500">{config.subtitle}</p>
          <p className="mt-4 text-2xl font-bold text-[#01a76c]">{config.priceLabel}</p>
          <p className="mt-0.5 text-sm text-zinc-600">then {config.priceLabel} every month</p>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-700">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium text-zinc-900">
              <span>Due today</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>Due on {dueOnLabel}</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right panel: Your details or Payment (scrollable so Subscribe button is always reachable) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:min-w-[320px] sm:p-6">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {step === "details" ? (
            <>
              <p className="text-sm font-medium text-zinc-900">
                <span className="text-[#01a76c]">Your details</span>
                <span className="text-zinc-400"> &gt; Payment</span>
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                We collect this information to help combat fraud, and to keep your payment secure.
              </p>
              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep("payment");
                }}
              >
                <div>
                  <label htmlFor="payment-email" className="block text-sm font-medium text-zinc-700">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="payment-email"
                    type="email"
                    readOnly
                    value={userEmail ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 text-sm text-zinc-600"
                  />
                </div>
                <div>
                  <label htmlFor="payment-country" className="block text-sm font-medium text-zinc-700">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="payment-country"
                    required
                    defaultValue={DEFAULT_COUNTRY}
                    className="mt-1 w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-12 text-sm text-zinc-900 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c] bg-no-repeat bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center]"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23717171'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")" }}
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="payment-postcode" className="block text-sm font-medium text-zinc-700">
                    ZIP/Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="payment-postcode"
                    type="text"
                    required
                    placeholder=""
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#01a76c] focus:outline-none focus:ring-1 focus:ring-[#01a76c]"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-lg bg-[#01a76c] py-3 text-sm font-semibold text-white hover:bg-[#018a5e]"
                >
                  Continue
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col pb-8">
              <p className="text-sm font-medium text-zinc-900">
                <span className="text-zinc-400">Your details &gt; </span>
                <span className="text-[#01a76c]">Payment</span>
              </p>
              {!accessToken ? (
                <p className="mt-4 text-sm text-zinc-600">Please refresh the page and try again.</p>
              ) : fetchError ? (
                <p className="mt-4 text-sm text-red-600">{fetchError}</p>
              ) : clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "#01a76c" },
                    },
                  }}
                >
                  <PaymentForm plan={plan} onSuccess={onSuccess} onClose={onClose} />
                </Elements>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Loading payment form…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
