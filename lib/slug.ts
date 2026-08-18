/**
 * Slug generation for URL-facing identifiers (currently band profiles).
 *
 * Kept in lib/ rather than server/ because both the API and the client need
 * to agree on the rules, following the existing lib/genres.ts and
 * lib/userTags.ts pattern.
 */

/**
 * Letters that survive Unicode NFD decomposition and therefore need an
 * explicit mapping.
 *
 * "å" and "ö" decompose into a base letter plus a combining mark, so stripping
 * combining marks below turns them into "a" and "o" on their own. "ø" and "æ"
 * are standalone letters that do not decompose at all -- without these entries
 * they would survive the pipeline and end up percent-encoded in the URL, which
 * defeats the point of a readable slug. Norwegian band names make this the
 * common case rather than an edge case.
 */
const TRANSLITERATIONS: Record<string, string> = {
  "ø": "o", // ø
  "æ": "ae", // æ
  "å": "a", // å
  "ß": "ss", // ß
  "þ": "th", // þ
  "ð": "d", // ð
  "đ": "d", // đ
  "ł": "l", // ł
};

const TRANSLITERATABLE = /[øæåßþðđł]/g;

/** Combining diacritical marks left behind by NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Slugs that would collide with a real or plausible route segment. A band that
 * generates one of these is pushed to a numeric suffix instead (see
 * ensureUniqueSlug), so /band/new can never become ambiguous.
 */
const RESERVED_SLUGS = new Set([
  "new",
  "edit",
  "delete",
  "settings",
  "api",
  "admin",
  "me",
  "login",
  "logout",
  "register",
  "public",
  "band",
  "bands",
  "user",
  "users",
  "projects",
  "songs",
]);

export const MAX_SLUG_LENGTH = 60;

/**
 * Turns arbitrary text into a URL-safe slug: lowercase, ASCII, hyphen-
 * separated. Never returns an empty string -- input with no usable characters
 * (only emoji, only punctuation) falls back to "band".
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(TRANSLITERATABLE, (character) => TRANSLITERATIONS[character])
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    // everything that is not a-z0-9 becomes a separator: this is what removes
    // the slashes in "AC/DC" that would otherwise split the URL into segments
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // slice() can leave a trailing hyphen behind when it cuts mid-separator
    .replace(/-+$/g, "");

  return base || "band";
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lets a single route parameter accept either form, so existing ?id=<uuid>
 * links keep resolving after the switch to slugs.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
