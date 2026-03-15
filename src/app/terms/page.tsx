import type { Metadata } from "next";
import BackButton from "@/components/BackButton";
import TermsAccordion from "@/components/TermsAccordion";

export const metadata: Metadata = {
  title: "Terms of Service | QReady",
  description: "Terms of Service for QReady Digital Pager services.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 text-zinc-900">
      <BackButton />
      <div className="mx-auto max-w-2xl pt-8">
        <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">TERMS OF SERVICE</h1>

        <p className="mt-2 text-sm text-zinc-600">Last updated March 11, 2026</p>

        <h2 className="mt-8 font-bold text-zinc-900">AGREEMENT TO OUR LEGAL TERMS</h2>

        <div className="mt-4 space-y-4 text-zinc-800 leading-relaxed">
          <p>
            We are QReady (&apos;Company&apos;, &apos;we&apos;, &apos;us&apos;, or &apos;our&apos;), a company registered in the United Kingdom.
          </p>
          <p>
            We operate the website http://www.qready.io (the &apos;Site&apos;), as well as any other related products and services that refer or link to these legal terms (the &apos;Legal Terms&apos;) (collectively, the &apos;Services&apos;).
          </p>
          <p>
            These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity (&apos;you&apos;), and QReady, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
          </p>
          <p>
            Supplemental terms and conditions or documents that may be posted on the Services from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Legal Terms from time to time. We will alert you about any changes by updating the &apos;Last updated&apos; date of these Legal Terms, and you waive any right to receive specific notice of each such change. It is your responsibility to periodically review these Legal Terms to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and to have accepted, the changes in any revised Legal Terms by your continued use of the Services after the date such revised Legal Terms are posted.
          </p>
          <p>
            The Services are intended for users who are at least 18 years old. Persons under the age of 18 are not permitted to use or register for the Services.
          </p>
          <p>
            We recommend that you print a copy of these Legal Terms for your records.
          </p>
        </div>

        <div className="mt-10">
          <TermsAccordion />
        </div>
      </div>
    </div>
  );
}
