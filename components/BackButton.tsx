"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasSignedInHint } from "@/lib/session";

export function BackButton({
  className,
  fallbackHref = "/user",
  children = "Back",
}: {
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

  // Logged out: there's no "previous page" worth returning to, send them
  // to the public landing page.
  if (!isLoggedIn) {
    return (
      <Link href="/" className={className}>
        {children}
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
      className={className}
    >
      {children}
    </button>
  );
}
