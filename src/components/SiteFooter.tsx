import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-[#1c1c1c] px-6 py-6 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
        <p className="order-2 text-sm text-[#cbccce] sm:order-1 sm:flex-1">
          © {new Date().getFullYear()} QReady. All rights reserved.
        </p>
        <Link
          href="/"
          className="order-1 text-base font-semibold text-[#cbccce] hover:text-white sm:order-2 sm:flex-none"
          aria-label="QReady home"
        >
          QReady.io
        </Link>
        <nav className="order-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm sm:flex-1 sm:justify-end">
          <Link href="/getting-started" className="text-[#cbccce] hover:text-white">
            Getting started
          </Link>
          <Link href="/contact" className="text-[#cbccce] hover:text-white">
            Contact
          </Link>
          <Link href="/terms" className="text-[#cbccce] hover:text-white">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-[#cbccce] hover:text-white">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
