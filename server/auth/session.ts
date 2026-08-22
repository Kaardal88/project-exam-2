import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

/**
 * The session lives in an httpOnly cookie, not localStorage.
 *
 * localStorage is readable by any script on the page, so a single injected
 * script -- a compromised dependency, a bad ad, one XSS -- could read the JWT
 * and replay it from anywhere until it expired. An httpOnly cookie is not
 * reachable from JavaScript at all: the browser attaches it to same-origin
 * requests and nothing on the page can read its value.
 */
export const SESSION_COOKIE = "bs_session";

/**
 * A second, deliberately readable cookie carrying no secret and no authority.
 *
 * Once the real token is httpOnly, the client can no longer answer "am I
 * signed in?" without asking the server, which the nav bar and the back button
 * need to know before they render. This cookie is that answer and nothing
 * more: forging it gets you a different-looking back link and no access, since
 * every API route reads SESSION_COOKIE instead. It is written and cleared in
 * lockstep with the real one so the two cannot drift apart.
 */
export const SIGNED_IN_COOKIE = "bs_signed_in";

/** Matches the "7d" expiry createToken() signs into the JWT itself. */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Secure is off in development because localhost is served over http and a
 * Secure cookie would simply not be stored, which looks exactly like a broken
 * login.
 */
const isProduction = process.env.NODE_ENV === "production";

/**
 * SameSite=Lax is the CSRF defence: the browser withholds the cookie from
 * cross-site POST/PUT/DELETE requests, which is every route that changes
 * anything. It still sends it on top-level GET navigations, which is why
 * logging out is a POST rather than a link.
 */
const shared = {
  path: "/",
  sameSite: "Lax",
  secure: isProduction,
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export function setSessionCookies(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, { ...shared, httpOnly: true });
  setCookie(c, SIGNED_IN_COOKIE, "1", { ...shared, httpOnly: false });
}

export function clearSessionCookies(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, SIGNED_IN_COOKIE, { path: "/" });
}

export function readSessionToken(c: Context) {
  return getCookie(c, SESSION_COOKIE);
}
