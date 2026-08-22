/**
 * "Does this browser think it is signed in?" — for rendering, never for access.
 *
 * The real session is an httpOnly cookie the page cannot read, which is the
 * point of it. But some UI has to decide what to draw before any request comes
 * back: the back button picks a destination, and showing a signed-out nav to a
 * signed-in user for a moment looks broken.
 *
 * So the server writes a second cookie next to the real one, carrying "1" and
 * no secret. Editing it in devtools changes what this function returns and
 * nothing else — every API route reads the httpOnly cookie, so a forged hint
 * buys a different-looking back link and no data. Treat the answer as a hint
 * that may be stale, and let the API be the authority.
 */
const SIGNED_IN_COOKIE = "bs_signed_in";

export function hasSignedInHint() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${SIGNED_IN_COOKIE}=`));
}

/**
 * Ends the session: the server clears both cookies, since an httpOnly one
 * cannot be cleared from here.
 */
export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
