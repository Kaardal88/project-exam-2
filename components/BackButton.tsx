"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { hasSignedInHint } from "@/lib/session";

/**
 * The button's own look, so it cannot be forgotten.
 *
 * Three callers used to paste this same pill in, and the fourth passed no
 * className at all -- which rendered the word "Back" as bare text on the
 * Artists page, indistinguishable from a paragraph. Callers now pass
 * positioning, not appearance.
 */
const BASE_CLASS =
  "inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800";

export function BackButton({
  className = "",
  fallbackHref = "/user",
  children = "Back",
}: {
  /** Positioning only -- margins, alignment. The pill comes with the button. */
  className?: string;
  fallbackHref?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setIsLoggedIn(hasSignedInHint());
    }, 0);

    return () => clearTimeout(id);
  }, []);

  const content = (
    <>
      <ChevronLeft className="h-4 w-4" />
      {children}
    </>
  );

  // Logged out: there's no "previous page" worth returning to, send them
  // to the public landing page.
  if (!isLoggedIn) {
    return (
      <Link href="/" className={`${BASE_CLASS} ${className}`}>
        {content}
      </Link>
    );
  }

  // Logged in: return to wherever they came from (userProfile, bandProfile,
  // etc). Falls back when there's no in-app history (e.g. a direct link).
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={`${BASE_CLASS} ${className}`}
    >
      {content}
    </button>
  );
}
