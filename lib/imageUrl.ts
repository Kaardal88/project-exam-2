/**
 * Whether a profile picture URL is one we are willing to store.
 *
 * image_url and header_image_url are written from a request body and read back
 * as <img src> for everyone who visits, so "any string" was too generous once
 * the field stopped being something only we typed into. Empty clears the
 * picture; anything else has to be http(s), which rules out data: and
 * javascript: URLs.
 *
 * Deliberately not narrowed to our own bucket. The URLs people pasted in by
 * hand before uploads existed are real data on real profiles, and a check that
 * has to keep allowing them anyway would only look like a stricter one.
 */
export function isStorableImageUrl(value: string) {
  return value === "" || /^https?:\/\//.test(value);
}

export const IMAGE_URL_MAX_LENGTH = 2048;
