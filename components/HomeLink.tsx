"use client";

import Link from "next/link";
import { StemLockLogo } from "./StemLockLogo";
import { useSignedInHint } from "./useSignedInHint";

/**
 * The wordmark as a way home, for the pages that stand outside the navbar:
 * FAQ, Terms, Privacy, login, register and New band.
 *
 * Home depends on who is asking. Signed in, it is your profile -- the same
 * place the navbar's logo goes. Signed out, it is the landing page. These
 * pages used to point at "/" unconditionally, which dropped a signed-in
 * tester onto a page offering them "Sign up".
 */
export function HomeLink({ className = "" }: { className?: string }) {
  const signedIn = useSignedInHint();

  return (
    <Link
      href={signedIn ? "/user" : "/"}
      title={signedIn ? "Your profile" : "Home"}
      className={`block w-max ${className}`}
    >
      <StemLockLogo />
    </Link>
  );
}
