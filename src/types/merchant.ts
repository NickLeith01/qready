/** Merchant/settings row. free = starter; plus = branding, no ads; premium = branding + custom ad banner. 'paid' kept for backward compat (treated as premium). */
export type MerchantPlan = "free" | "plus" | "premium" | "paid";

export type Merchant = {
  id: string;
  plan: MerchantPlan;
  business_name: string | null;
  business_tagline: string | null;
  logo_url: string | null;
  colour_background: string | null;
  colour_waiting: string | null;
  colour_ready: string | null;
  colour_left_column: string | null;
  colour_right_column: string | null;
  colour_middle_column: string | null;
  message_queue: string | null;
  message_ready: string | null;
  message_thankyou: string | null;
  close_btn_text: string | null;
  close_btn_url: string | null;
  promo_banner_url: string | null;
  /** URL opened when customer taps the ad banner on the handset (Premium). Opens in new tab. */
  promo_banner_link: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_MERCHANT: Merchant = {
  id: "default",
  plan: "free",
  business_name: null,
  business_tagline: null,
  logo_url: null,
  colour_background: null,
  colour_waiting: null,
  colour_ready: null,
  colour_left_column: null,
  colour_right_column: null,
  colour_middle_column: null,
  message_queue: null,
  message_ready: null,
  message_thankyou: null,
  close_btn_text: null,
  close_btn_url: null,
  promo_banner_url: null,
  promo_banner_link: null,
};
