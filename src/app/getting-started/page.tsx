import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Getting Started | QReady",
  description: "How to manage your QReady queue and customise your dashboard and customer phone screens.",
};

const SECTION_TITLE_CLASS = "border-b-2 border-[#01a76c] pb-1 text-xl font-bold text-zinc-900 md:text-2xl";
const BODY_CLASS = "mt-2 text-zinc-700 leading-relaxed";
const LIST_ITEM_CLASS = "mt-4";
const LIST_NUM_CLASS = "font-semibold text-[#01a76c]";

function Tip({ children }: { children: React.ReactNode }) {
  return <p className={`mt-2 text-sm text-zinc-600 italic ${BODY_CLASS}`}>Tip: {children}</p>;
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-900">
      <div className="flex-1 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm font-medium text-[#01a76c] hover:underline">
            ← Back to home
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-zinc-900 md:text-4xl">Getting Started</h1>

          {/* The dashboard */}
          <section className="mt-10">
            <h2 className={SECTION_TITLE_CLASS}>The dashboard</h2>
            <p className={`mt-3 ${BODY_CLASS}`}>
              How to manage your QReady queue in seconds.
            </p>

            <img
              src="/getting-started/dashboard-steps.png"
              alt="Dashboard with steps 1–6: QR code, Done, Ready?, Collected, settings gear, reset"
              className="mt-6 w-full rounded-lg border border-zinc-200 shadow-sm"
            />

            <ol className="mt-6 list-none space-y-0 pl-0">
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>1. Join the queue</span>
                <p className={BODY_CLASS}>
                  Customers simply scan the unique QR code to join the digital waitlist on their smartphone. There are no apps to download or logins required.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>2. Process the next order</span>
                <p className={BODY_CLASS}>
                  Tap the &apos;Done&apos; button to log the current order and instantly generate a fresh QR code for the next customer in line.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>3. Notify the customer</span>
                <p className={BODY_CLASS}>
                  When an order or service is complete, tap &apos;Ready?&apos;. This instantly pings the customer&apos;s phone, letting them know it&apos;s time to collect.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>4. Clear completed orders</span>
                <p className={BODY_CLASS}>
                  Once the customer picks up their item, tap &apos;Collected&apos; to remove it from your active screen and keep your dashboard tidy.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>5. Custom settings</span>
                <p className={BODY_CLASS}>
                  Click the gear icon to access your dashboard settings. (Note: Customizing your brand colors and customer screens is available on paid plans).
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>6. Reset the board</span>
                <p className={BODY_CLASS}>
                  Tap the refresh icon to instantly clear the queue and reset your order numbers.
                </p>
              </li>
            </ol>
          </section>

          {/* Custom settings - The dashboard */}
          <section className="mt-14">
            <h2 className={SECTION_TITLE_CLASS}>Custom settings - The dashboard</h2>
            <p className={`mt-3 ${BODY_CLASS}`}>
              Personalise your dashboard and the customer&apos;s mobile view by clicking the settings gear icon on your main dashboard.
            </p>

            <img
              src="/getting-started/dashboard-custom.png"
              alt="Dashboard with custom brand colours and logo"
              className="mt-6 w-full rounded-lg border border-zinc-200 shadow-sm"
            />

            <ol className="mt-6 list-none space-y-0 pl-0">
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>1. Business name (Free plan)</span>
                <p className={BODY_CLASS}>
                  Enter your business name and tagline to display at the top of your screen.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>2. Custom logo (plus and Premium only.)</span>
                <p className={BODY_CLASS}>
                  Upload a logo to replace the text-based business name in the header.
                </p>
                <p className={BODY_CLASS}>
                  Recommended size: 400x120px (max 2mb).
                </p>
                <Tip>We recommend using a PNG file with a transparent background so it sits perfectly on top of any brand colour you choose.</Tip>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>3. Interface colours (plus and Premium only.)</span>
                <p className={BODY_CLASS}>
                  Tailor the look of your dashboard using the colour pickers:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
                  <li>3.1. Brand colour</li>
                  <li>3.2. Waiting colour</li>
                  <li>3.3. Ready colour</li>
                  <li>3.4. Left column colour</li>
                  <li>3.5. Right column colour</li>
                  <li>3.6. Middle column colour</li>
                </ul>
              </li>
            </ol>
          </section>

          {/* Custom settings - Handset */}
          <section className="mt-14">
            <h2 className={SECTION_TITLE_CLASS}>Custom settings - Handset</h2>
            <p className={`mt-3 ${BODY_CLASS}`}>
              Personalise the customer&apos;s mobile view by clicking the settings gear icon on your main dashboard.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <figure>
                <img
                  src="/getting-started/phone-activation.gif"
                  alt="Phone screen: activation message (Tap to secure your spot)"
                  className="w-full rounded-lg border border-zinc-200 shadow-sm"
                />
                <figcaption className="mt-1 text-center text-sm text-zinc-600">4.0 Activation</figcaption>
              </figure>
              <figure>
                <img
                  src="/getting-started/phone-queue.gif"
                  alt="Phone screen: queue message (e.g. Your food is sizzling)"
                  className="w-full rounded-lg border border-zinc-200 shadow-sm"
                />
                <figcaption className="mt-1 text-center text-sm text-zinc-600">4.1 Queue</figcaption>
              </figure>
              <figure>
                <img
                  src="/getting-started/phone-ready.gif"
                  alt="Phone screen: ready message and ON MY WAY button"
                  className="w-full rounded-lg border border-zinc-200 shadow-sm"
                />
                <figcaption className="mt-1 text-center text-sm text-zinc-600">4.2 Ready</figcaption>
              </figure>
              <figure>
                <img
                  src="/getting-started/phone-thankyou.gif"
                  alt="Phone screen: thank you message and CLOSE button"
                  className="w-full rounded-lg border border-zinc-200 shadow-sm"
                />
                <figcaption className="mt-1 text-center text-sm text-zinc-600">4.3 Thank you</figcaption>
              </figure>
            </div>

            <ol className="mt-8 list-none space-y-0 pl-0">
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>1. Business name (Free plan)</span>
                <p className={BODY_CLASS}>
                  Enter your business name and tagline to display at the top of the mobile screen.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>2. Custom logo (Plus & Premium only)</span>
                <p className={BODY_CLASS}>
                  Upload a logo to replace the text-based business name in the header.
                </p>
                <p className={BODY_CLASS}>
                  Recommended size: 400x120px.
                </p>
                <Tip>We recommend using a PNG file with a transparent background so it sits seamlessly on top of your chosen brand colour.</Tip>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>3. Interface colours (Plus & Premium only)</span>
                <p className={BODY_CLASS}>
                  Tailor the look of the customer&apos;s mobile view using the colour pickers:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
                  <li>3.1. Brand colour</li>
                  <li>3.3. Ready colour</li>
                </ul>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>4. Key messages on phone screens (Plus & Premium only)</span>
                <p className={BODY_CLASS}>
                  Customize the text your customers see at every stage of their wait:
                </p>
                <ul className="mt-3 space-y-3 list-none pl-0 text-zinc-700">
                  <li>
                    <span className="font-medium text-zinc-900">4.0. Activation Message:</span> This initial message (e.g., &quot;Tap to secure your spot&quot;) is not editable. It contains critical instructions necessary to prompt the customer to interact with their screen so the phone can receive the final alert.
                  </li>
                  <li>
                    <span className="font-medium text-zinc-900">4.1. Queue Message:</span> Customize the text they stare at while waiting (e.g., &quot;Your food is sizzling!&quot;).
                  </li>
                  <li>
                    <span className="font-medium text-zinc-900">4.2. Ready Message:</span> Customize the text that tells them to collect their order (e.g., &quot;It&apos;s burger time, come get it!&quot;).
                  </li>
                  <li>
                    <span className="font-medium text-zinc-900">4.3. Thank You Message:</span> Customize the final sign-off text they see after collection.
                  </li>
                </ul>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>5. Custom close button (Plus & Premium only)</span>
                <p className={BODY_CLASS}>
                  Change the button text and add a custom URL to redirect the customer to your Google reviews, social media, or website after they collect their order.
                </p>
              </li>
              <li className={LIST_ITEM_CLASS}>
                <span className={LIST_NUM_CLASS}>6. Add advertising banner (Premium only)</span>
                <p className={BODY_CLASS}>
                  Display a custom promotional banner to customers on their waiting screen.
                </p>
                <p className={BODY_CLASS}>
                  Dimensions required: 375x170px.
                </p>
                <p className={BODY_CLASS}>
                  Max file size: 2MB.
                </p>
                <p className={BODY_CLASS}>
                  Supported formats: JPEG, PNG, WebP, GIF.
                </p>
                <Tip>We highly recommend using an animated GIF to really grab attention and upsell your products!</Tip>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
