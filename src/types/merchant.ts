/** Merchant/settings row. Plan 'paid' unlocks settings 2–5 and removes free-plan queue limit. */
export type MerchantPlan = "free" | "paid";

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
};
