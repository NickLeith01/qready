import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Hero */}
      <header className="flex flex-col items-center px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
        <div className="mb-8 flex justify-center">
          <img
            src="/qready-logo.png"
            alt="Qready"
            className="h-12 w-auto max-w-[200px] object-contain object-center md:h-14"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-lg font-medium text-zinc-400 md:text-xl">
          The hardware-free digital pager
        </p>
        <p className="mt-4 max-w-xl text-balance text-zinc-300 md:text-lg">
          Your customers scan a QR code. Their phone becomes the pager. When their order is ready, you tap one button — they get buzzed. No plastic buzzers, no app download, no phone numbers.
        </p>
        <Link
          href="/dashboard"
          className="mt-10 inline-flex rounded-full bg-rose-600 px-10 py-4 text-lg font-semibold uppercase tracking-wide hover:bg-rose-500"
        >
          Get started
        </Link>
      </header>

      {/* How it works */}
      <section className="border-t border-zinc-800 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
          <ul className="mt-10 space-y-8 md:mt-14 md:grid md:grid-cols-3 md:gap-8 md:space-y-0">
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/20 text-lg font-bold text-rose-400">1</span>
              <h3 className="mt-4 font-semibold">Staff: New order</h3>
              <p className="mt-2 text-sm text-zinc-400">Tap New order on the dashboard. A QR code and order number appear.</p>
            </li>
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/20 text-lg font-bold text-rose-400">2</span>
              <h3 className="mt-4 font-semibold">Customer: Scan</h3>
              <p className="mt-2 text-sm text-zinc-400">They scan the QR. No app, no sign-up. One tap to start the pager.</p>
            </li>
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/20 text-lg font-bold text-rose-400">3</span>
              <h3 className="mt-4 font-semibold">You: Ready</h3>
              <p className="mt-2 text-sm text-zinc-400">Tap Ready when their order is up. Their phone buzzes, flashes, and pings.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-zinc-800 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Why Qready</h2>
          <ul className="mt-8 space-y-4 text-left text-zinc-300 md:mt-10">
            <li className="flex items-start gap-3">
              <span className="text-rose-400">✓</span>
              <span><strong className="text-white">No hardware</strong> — No plastic buzzers to buy, lose, or replace.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-400">✓</span>
              <span><strong className="text-white">No app download</strong> — Customers scan and go. Works in the browser.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-400">✓</span>
              <span><strong className="text-white">No phone numbers</strong> — No SMS cost, no privacy worries.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-400">✓</span>
              <span><strong className="text-white">Works for everyone</strong> — Tourists, locals, any phone with a browser.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <footer className="border-t border-zinc-800 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-lg text-zinc-300">Ready to go hardware-free?</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-rose-600 px-10 py-4 font-semibold uppercase tracking-wide hover:bg-rose-500"
          >
            Open dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
