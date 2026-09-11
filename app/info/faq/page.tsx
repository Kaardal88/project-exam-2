import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { appName } from "@/components/Stemlock";
import { faq, faqIntro } from "@/lib/faq";

export const metadata: Metadata = {
  title: `FAQ — ${appName}`,
  description: faqIntro,
};

export default function FAQ() {
  return (
    <section className="rounded-lg border border-amber-200 bg-primary p-6 shadow-md sm:p-10 lg:p-14">
      <header className="lg:max-w-3xl">
        <h1 className="text-3xl font-bold">FAQ</h1>
        <p className="mt-3 text-lg leading-relaxed">{faqIntro}</p>
      </header>

      <div className="mt-10">
        <FaqList groups={faq} />
      </div>

      <p className="mt-12 border-t border-neutral-700 pt-6 text-yellow-100/70">
        The longer, more careful versions of some of these live in the{" "}
        <Link href="/info/terms" className="underline hover:text-amber-200">
          Terms of Use
        </Link>{" "}
        and the{" "}
        <Link href="/info/privacy" className="underline hover:text-amber-200">
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}
