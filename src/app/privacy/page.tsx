import type { Metadata } from "next";
import BackButton from "@/components/BackButton";
import PrivacyAccordion from "@/components/PrivacyAccordion";

export const metadata: Metadata = {
  title: "Privacy Policy | QReady",
  description: "Privacy Notice for QReady – how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 text-zinc-900">
      <BackButton />
      <div className="mx-auto max-w-2xl pt-8">
        <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">PRIVACY NOTICE</h1>

        <p className="mt-2 text-sm text-zinc-600">Last updated March 11, 2026</p>

        <div className="mt-6 space-y-4 text-zinc-800 leading-relaxed">
          <p>
            This Privacy Notice for QReady (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), describes how and why we might access, collect, store, use, and/or share (&quot;process&quot;) your personal information when you use our services (&quot;Services&quot;), including when you:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>[Use of Services as described in the notice]</li>
          </ul>
          <p>
            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services.
          </p>
        </div>

        <h2 className="mt-10 font-bold text-zinc-900">SUMMARY OF KEY POINTS</h2>
        <p className="mt-2 text-zinc-800 leading-relaxed">
          This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-zinc-800 leading-relaxed">
          <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.</li>
          <li><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered &quot;special&quot; or &quot;sensitive&quot; in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.</li>
          <li><strong>Do we collect any information from third parties?</strong> We may collect information from public databases, marketing partners, social media platforms, and other outside sources. Learn more about information collected from other sources.</li>
          <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.</li>
          <li><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.</li>
          <li><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.</li>
          <li><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</li>
        </ol>
        <p className="mt-4 text-zinc-800 leading-relaxed">
          <strong>Want to learn more about what we do with any information we collect?</strong> Review the Privacy Notice in full.
        </p>

        <h2 className="mt-10 font-bold text-zinc-900">TABLE OF CONTENTS</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-800 leading-relaxed">
          <li>What information do we collect?</li>
          <li>How do we process your information?</li>
          <li>When and with whom do we share your personal information?</li>
          <li>Do we use cookies and other tracking technologies?</li>
          <li>How do we handle your social logins?</li>
          <li>Is your information transferred internationally?</li>
          <li>How long do we keep your information?</li>
          <li>Do we collect information from minors?</li>
          <li>What are your privacy rights?</li>
          <li>Controls for do-not-track features</li>
          <li>Do we make updates to this notice?</li>
          <li>How can you contact us about this notice?</li>
          <li>How can you review, update, or delete the data we collect from you?</li>
        </ol>

        <div className="mt-10">
          <PrivacyAccordion />
        </div>
      </div>
    </div>
  );
}
