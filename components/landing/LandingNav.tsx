"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useSignedInHint } from "@/components/useSignedInHint";

const sections = [
  { id: "home", label: "Home" },
  { id: "preview", label: "Preview" },
  { id: "features", label: "Features" },
  { id: "bands", label: "Bands" },
];

// Simple in-page section nav for the landing page. Plain hash anchors +
// the global `scroll-smooth` on <html> (see app/layout.tsx) handle the
// smooth scrolling — no JS scroll handler or extra dependency needed.
//
// The account controls live here rather than in the hero: "Sign up" is the
// one action the page is asking for, so it stays a labelled button, while
// logging in is for people who already know the app and gets the quieter
// person icon at the far right.
//
// Signed in, both give way to one labelled way back into the app. Offering
// "Sign up" to someone already in made the page look logged out, and let a
// tester start a second account on top of the first.
export function LandingNav() {
  // May be stale, and that is fine: /user is behind the real session either
  // way, and /register sends a signed-in visitor on to it.
  const isSignedIn = useSignedInHint();

  return (
    <nav
      aria-label="Section navigation"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-2 px-3 py-3 sm:px-4 md:px-6"
    >
      <div className="flex items-center gap-0.5 rounded-full border border-neutral-800 bg-neutral-950/70 px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:gap-2 sm:px-2 sm:py-1.5">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full px-2 py-1.5 text-[11px] font-semibold text-yellow-100/80 transition hover:bg-neutral-800 hover:text-yellow-100 sm:px-3 sm:text-sm"
          >
            {section.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950/70 px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:gap-2 sm:px-2 sm:py-1.5">
        {isSignedIn ? (
          <Link
            href="/user"
            className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1.5 text-[11px] font-bold !text-black transition hover:bg-yellow-200 sm:px-4 sm:text-sm"
          >
            <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Your profile
          </Link>
        ) : (
          <>
            <Link
              href="/register"
              className="rounded-full bg-yellow-100 px-2.5 py-1.5 text-[11px] font-bold !text-black transition hover:bg-yellow-200 sm:px-4 sm:text-sm"
            >
              Sign up
            </Link>

            <Link
              href="/login"
              aria-label="Log in"
              title="Log in"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#4b432d] text-yellow-100/80 transition hover:bg-neutral-800 hover:text-yellow-100 sm:h-9 sm:w-9"
            >
              <UserRound className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
