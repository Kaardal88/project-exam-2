import Link from "next/link";
import { appName } from "./Stemlock";

/**
 * `mt-auto` is what keeps this at the bottom, and it is why every page that
 * renders a Footer makes its <main> a `flex min-h-screen flex-col`.
 *
 * Without it the footer is simply the last thing in the flow, so a page still
 * waiting for its data drew it halfway up the screen and then shoved it down
 * when the content arrived. An auto top margin eats the leftover height
 * instead, and disappears the moment the content is taller than the viewport.
 */
export function Footer() {
  return (
    <footer className="mt-auto w-full bg-black/80 text-yellow-100">
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 py-4">
        <Link href="/info/faq" className="hover:underline">
          FAQ
        </Link>
        <Link href="/info/terms" className="hover:underline">
          Terms of Use
        </Link>
        <Link href="/info/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </div>
      <p className="text-center py-4">
        © {new Date().getFullYear()} {appName}
      </p>
    </footer>
  );
}
