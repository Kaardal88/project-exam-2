import { deleteObject, PUBLIC_BUCKET, PUBLIC_BASE_URL } from "@/server/r2";

/**
 * The key an object has in the public bucket, or null if this URL is not one
 * of ours.
 *
 * Profiles store a finished URL rather than a key, which is what let every
 * `<img src>` in the app stay untouched -- but it means the column also holds
 * URLs people pasted in by hand before uploads existed, pointing anywhere at
 * all. So this answers one question and refuses to guess: does this URL live
 * in our public bucket, and if so, where.
 */
export function keyFromPublicUrl(url: string | null | undefined) {
  if (!url || !PUBLIC_BASE_URL) return null;

  const prefix = `${PUBLIC_BASE_URL}/`;

  if (!url.startsWith(prefix)) return null;

  // A query string would not be there on a public URL, but strip it rather
  // than deleting a key with "?" in it if one ever is.
  const key = url.slice(prefix.length).split("?")[0];

  if (!key || key.includes("..")) return null;

  return key;
}

/**
 * Delete the object a column used to point at, once it points somewhere else.
 *
 * Called after the update has been written, and deliberately never before: a
 * failed save must not take the old picture with it.
 *
 * Every upload gets its own uuid key, so no two rows ever share an object and
 * deleting one cannot blank another. A URL that is not ours -- one pasted in
 * by hand -- is left alone, which is the whole reason keyFromPublicUrl exists.
 *
 * Failure here is logged and swallowed. An orphaned object costs a fraction of
 * a cent; a 500 on a save that already succeeded costs the person their work.
 */
export async function deleteReplacedImage(
  previous: string | null | undefined,
  next: string | null | undefined,
) {
  // undefined means the caller did not touch this column at all.
  if (next === undefined) return;

  if (!previous || previous === next) return;

  const key = keyFromPublicUrl(previous);

  if (!key) return;

  try {
    await deleteObject(key, PUBLIC_BUCKET);
  } catch (error) {
    console.error(`Could not delete replaced image "${key}":`, error);
  }
}
