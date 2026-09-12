"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSignedInHint } from "@/lib/session";

/**
 * hasSignedInHint(), as state a component can render from.
 *
 * Read after mount only -- the hint is a cookie, and the server has no idea
 * what it says while rendering, so deciding on the first paint would hydrate
 * one shape and then swap it. Deferred through a timeout, which is the shape
 * the compiler lint accepts for reading a cookie into state.
 *
 * What it decides is what gets drawn: where a link points, which button is
 * shown. Never whether anything is fetched or withheld.
 */
export function useSignedInHint() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setSignedIn(hasSignedInHint());
    }, 0);

    return () => clearTimeout(id);
  }, []);

  return signedIn;
}

/**
 * Sends a signed-in visitor away from the pages only a signed-out one needs:
 * login and register. Without it, someone already in could open the sign-up
 * form from the landing page and make a second account on top of the first.
 *
 * Asks the API rather than trusting the hint. A stale hint would send someone
 * whose session has expired to /user, which answers 401 by pushing to /login,
 * which would push straight back -- a loop. The hint only decides whether the
 * question is worth a request, so a signed-out visitor costs nothing.
 */
export function useRedirectIfSignedIn(destination = "/user") {
  const router = useRouter();

  useEffect(() => {
    if (!hasSignedInHint()) return;

    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => {
        if (response.ok && !cancelled) router.replace(destination);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [router, destination]);
}
