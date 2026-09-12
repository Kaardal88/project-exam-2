import { HomeLink } from "@/components/HomeLink";
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
        <HomeLink />

        <main className="mt-8 lg:mt-12">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
