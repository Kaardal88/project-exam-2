import Link from "next/link";
import { appName } from "@/components/Stemlock";
import { Footer } from "@/components/Footer";

/**
 * The shell around FAQ, Terms and Privacy.
 *
 * Wider than a reading column on purpose: from lg up the documents inside lay
 * themselves out in two columns, which is the difference between one long
 * scroll and a page you can take in. Below lg they are a single column and
 * this max-width never comes into play.
 */
export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:max-w-6xl lg:py-12">
        <div className="flex w-max justify-center bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
          <Link href="/">
            <span className="text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              {appName}
            </span>
          </Link>
        </div>

        <main className="mt-8 lg:mt-12">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
