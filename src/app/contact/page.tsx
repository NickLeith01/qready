import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";
import AuthNav from "@/components/AuthNav";
import DashboardPreview from "@/components/DashboardPreview";

export const metadata: Metadata = {
  title: "Contact us | QReady",
  description: "Get in touch with QReady. We usually answer within 1–2 business days.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <AuthNav />

      {/* Page title */}
      <section className="px-6 pt-10 pb-4 md:pt-14 md:pb-6">
        <h1 className="text-center text-3xl font-bold text-zinc-900 md:text-4xl">
          Contact us
        </h1>
      </section>

      {/* Contact – green block, image + text, same width/gap as homepage columns */}
      <section className="px-6 pb-14 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 rounded-2xl bg-[#01a76c] md:grid-cols-2 md:gap-8 md:p-0">
          <div className="flex items-center justify-center rounded-t-2xl bg-[#01a76c] px-6 py-8 md:rounded-l-2xl md:rounded-tr-none md:py-12">
            <img
              src="/contact-image.png"
              alt="QReady support – we're here to help"
              className="h-auto w-full max-w-md object-contain"
            />
          </div>
          <div className="flex flex-col justify-center px-6 pb-10 text-center md:py-12 md:pr-12 md:pl-8 md:text-left">
            <p className="text-lg text-white md:text-xl">
              Ask us anything, or share your feedback.
            </p>
            <p className="mt-3 text-white/95">
              We usually answer within 1–2 business days.
            </p>
            <a
              href="mailto:contact@qready.io"
              className="mt-6 inline-flex font-semibold text-white underline decoration-white/80 underline-offset-2 hover:decoration-white"
            >
              contact@qready.io
            </a>
          </div>
        </div>
      </section>

      {/* Simplify your queue – same as homepage */}
      <section className="border-t border-zinc-200 bg-zinc-100 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#01a76c] p-8 shadow-lg md:p-12 md:flex md:items-center md:gap-12">
          <div className="md:max-w-md">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Simplify your queue today!
            </h2>
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
            <p className="mt-4 text-sm text-black">
              No credit card or sign-up required
            </p>
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
