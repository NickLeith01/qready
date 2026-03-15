import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import HomeCarousel from "@/components/HomeCarousel";
import DashboardPreview from "@/components/DashboardPreview";
import HomePricingSection from "@/components/HomePricingSection";
import SiteFooter from "@/components/SiteFooter";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <AuthNav />

      {/* Hero – text left, background image runs to right edge and to vertical centre */}
      <header className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12 px-6 pt-0 pb-0 md:pl-12 md:pr-0 md:min-h-[75vh]">
        <div className="flex flex-col justify-center md:max-w-xl text-center items-center py-10 md:py-16">
          <div className="mb-8">
            <img
              src="/qready-logo-colour.svg"
              alt="QReady"
              className="h-[4.375rem] w-auto max-w-[280px] object-contain md:h-[5.25rem] mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-xl md:text-2xl font-bold text-zinc-700">
            Let your customers wait anywhere
          </p>
          <p className="mt-1 text-xl md:text-2xl font-bold text-[#01a76c]">
            Upgrade your queue
          </p>
          <p className="mt-4 text-zinc-600 text-balance">
            No hardware to lose and no apps to download, just a simple, scalable solution. Streamline your orders, advertise directly to waiting customers, and keep your queue moving.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex w-fit rounded-full bg-[#01a76c] px-10 py-4 text-lg font-semibold text-white hover:bg-[#018a5e] transition-colors"
          >
            Try for free in the browser
          </Link>
          <p className="mt-3 text-sm text-zinc-500">
            No sign up or payment details required
          </p>
        </div>
        <div className="relative flex-1 min-h-[50vh] md:min-h-[75vh] md:rounded-l-xl overflow-hidden">
          <img
            src="/hero-bg.png?v=2"
            alt="Digital pager in use at a food stall"
            className="absolute inset-0 h-full w-full object-cover object-center md:object-right"
            fetchPriority="high"
          />
        </div>
      </header>

      {/* Carousel (full viewport width) */}
      <section className="bg-[var(--brand-muted)] pt-0 pb-0">
        <div className="w-screen relative left-1/2 -translate-x-1/2">
          <HomeCarousel />
        </div>
      </section>

      {/* Pricing – green block, 3 white columns; signed-in users get modal overlay on this page */}
      <HomePricingSection />

      {/* Reviews – mesh gradient, 2x2 grid same width as pricing */}
      <section className="bg-mesh-gradient px-6 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 md:gap-8">
          <article className="rounded-xl bg-white p-6 shadow-md md:p-8">
            <p className="text-amber-500 text-lg tracking-wide" aria-hidden="true">★★★★★</p>
            <h3 className="mt-2 font-bold text-zinc-900">Boosted our side-order sales!</h3>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              &ldquo;We used to spend hundreds of pounds replacing lost or broken plastic pagers every summer. QReady solved that overnight. Customers love that they don&apos;t have to download an app, and putting our own meal-deal ads on the waiting screen has actually boosted our side-order sales!&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-800">The Smokin&apos; Patty</p>
          </article>
          <article className="rounded-xl bg-white p-6 shadow-md md:p-8">
            <p className="text-amber-500 text-lg tracking-wide" aria-hidden="true">★★★★★</p>
            <h3 className="mt-2 font-bold text-zinc-900">Love the custom banner ads</h3>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              &ldquo;Our waiting area used to be packed and stressful on Saturdays. Now, guys just scan the code, grab a coffee next door, and walk back in when their phone buzzes. It has completely transformed our weekend workflow.&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-800">Sharp Cuts Barbershop</p>
          </article>
          <article className="rounded-xl bg-white p-6 shadow-md md:p-8">
            <p className="text-amber-500 text-lg tracking-wide" aria-hidden="true">★★★★★</p>
            <h3 className="mt-2 font-bold text-zinc-900">Transformed our weekend workflow</h3>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              &ldquo;Because there is no sign-up or data collected, this is perfect for our patients. We use the custom banner feature to promote our free blood pressure checks while they wait for their prescriptions. It&apos;s the easiest system we&apos;ve ever implemented.&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-800">Main Street Chemist</p>
          </article>
          <article className="rounded-xl bg-white p-6 shadow-md md:p-8">
            <p className="text-amber-500 text-lg tracking-wide" aria-hidden="true">★★★★★</p>
            <h3 className="mt-2 font-bold text-zinc-900">Best part is the end-of-order link</h3>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              &ldquo;Ditching the shouting and paper tickets was great, but the best part is the end-of-order link. Being able to automatically redirect customers to our Google Reviews page after they pick up their coffee has doubled our monthly five-star ratings.&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-800">The Daily Grind</p>
          </article>
        </div>
      </section>

      {/* FAQ – 2 columns, same width as reviews */}
      <section className="border-t border-zinc-200 bg-white px-6 py-14 md:py-20">
        <h2 className="text-center text-2xl font-bold text-zinc-900 md:text-3xl">Frequently asked questions</h2>
        <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2 md:gap-8">
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-zinc-900">Do I need to buy any special hardware?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed"><strong className="text-zinc-900">No.</strong></p>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                You can run your QReady dashboard on any device with a web browser. Most businesses just use an existing tablet, iPad, laptop, or smartphone that they already have at their counter or stall.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Can I use QReady for free?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed"><strong className="text-zinc-900">Yes.</strong></p>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                Our Starter plan is completely free and perfect for small pop-ups. It allows you to have up to 5 active waiting orders at one time. If you need to process more simultaneous orders, or if you want custom branding, you can upgrade to our <Link href="/account/upgrade?plan=plus" className="text-blue-600 underline hover:text-blue-700">Plus</Link> or <Link href="/account/upgrade?plan=premium" className="text-blue-600 underline hover:text-blue-700">Premium</Link> plans at any time.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">What happens if a customer accidentally closes the browser tab?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                If a customer minimizes their browser or locks their phone, the digital pager remains active and will still notify them once the page or phone is reopened.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">How do I cancel my subscription?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                You can cancel your monthly subscription at any time directly from your QReady dashboard. Canceling means your plan will not automatically renew. You will retain access to your paid features until the end of your current billing cycle, after which your account will simply revert to the free Starter plan.
              </p>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-zinc-900">Do customers have to give their phone number or email?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed"><strong className="text-zinc-900">No.</strong></p>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                The connection is made anonymously via the QR code. We do not collect or ask for any personal data from your customers, making it a completely frictionless and privacy-friendly experience.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">What is the difference between Plus and Premium?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                Both plans give you unlimited active orders, an order history log, and full custom branding (logos, colors, and queue messaging). However, the Plus plan displays 3rd-party ads on the customer&apos;s waiting screen. The Premium plan removes 3rd-party ads and allows you to upload your own custom promotional banners to upsell your products.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Can I direct customers to my website after they collect their order?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed"><strong className="text-zinc-900">Yes.</strong></p>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                On our <Link href="/account/upgrade?plan=plus" className="text-blue-600 underline hover:text-blue-700">Plus</Link> and <Link href="/account/upgrade?plan=premium" className="text-blue-600 underline hover:text-blue-700">Premium</Link> plans, you can set a custom redirect link. When a customer taps &ldquo;Close&rdquo; after collecting their order, they will be sent directly to a destination of your choice—such as your Google Reviews page, Instagram profile, or online menu.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">How do I contact support?</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                You can reach out to us anytime at <a href="mailto:contact@qready.io" className="text-blue-600 underline hover:text-blue-700">contact@qready.io</a> for technical questions, onboarding help, or feedback. Premium users also receive priority email support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simplify your queue – green CTA box, same width as 2-column sections */}
      <section className="border-t border-zinc-200 bg-zinc-100 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#01a76c] p-8 shadow-lg md:p-12 md:flex md:items-center md:gap-12">
          <div className="md:max-w-md">
            <h2 className="text-2xl font-bold text-white md:text-3xl">Simplify your queue today!</h2>
            <ul className="mt-6 space-y-3 text-black">
              <li className="flex items-center gap-2">
                <span className="text-black">✓</span>
                Add your business name
              </li>
              <li className="flex items-center gap-2">
                <span className="text-black">✓</span>
                Add customers to the queue
              </li>
              <li className="flex items-center gap-2">
                <span className="text-black">✓</span>
                Notify them when ready
              </li>
            </ul>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex w-full justify-center rounded-full bg-black px-8 py-4 font-semibold text-white shadow-md hover:bg-zinc-800 sm:w-auto"
            >
              Try for free in the browser
            </Link>
            <p className="mt-4 text-sm text-black">No credit card or sign-up required</p>
          </div>
          <div className="mt-8 flex justify-center md:mt-0 md:flex-1 md:justify-end">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
