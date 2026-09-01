import { Hono } from "hono";
import { requireAuth } from "../auth/auth.middleware";
import { isBandLeader } from "@/server/bands/membership";
import {
  getUploadUrl,
  publicUrlFor,
  PUBLIC_BUCKET,
  PUBLIC_BASE_URL,
  IMAGE_MAX_BYTES,
} from "@/server/r2";

type Variables = {
  userId: string;
};

export const uploadsRoutes = new Hono<{ Variables: Variables }>();

/**
 * What the browser is allowed to PUT into the public bucket.
 *
 * Wider than ALLOWED_IMAGE_TYPES because the client re-encodes before
 * uploading and webp is what it produces: it keeps transparency, which jpeg
 * would flatten to black on an avatar cut out of a PNG.
 */
const ALLOWED_PROFILE_IMAGE_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const OWNERS = ["user", "band"] as const;
const TARGETS = ["avatar", "header"] as const;

type Owner = (typeof OWNERS)[number];
type Target = (typeof TARGETS)[number];

/** The one place the key layout is written down. Read back by isProfileImageUrl. */
function keyPrefix(owner: Owner, ownerId: string, target: Target) {
  return owner === "user"
    ? `users/${ownerId}/${target}/`
    : `bands/${ownerId}/${target}/`;
}

/**
 * Hand the browser a short-lived URL to PUT one profile image to.
 *
 * Separate from the song presign route rather than a sixth target on it: that
 * one authorises against a song's project, and an avatar has no song. The
 * shapes rhyme deliberately -- same validation order, same key-prefix rule --
 * so the two read as one pattern.
 */
uploadsRoutes.post("/presign-image", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const { owner, ownerId, target, filename, contentType, size } = body;

  if (!OWNERS.includes(owner)) {
    return c.json({ error: "owner must be 'user' or 'band'" }, 400);
  }

  if (!TARGETS.includes(target)) {
    return c.json({ error: "target must be 'avatar' or 'header'" }, 400);
  }

  if (typeof ownerId !== "string" || !ownerId) {
    return c.json({ error: "ownerId is required" }, 400);
  }

  // Authorisation, and the only part of this route that differs by owner.
  if (owner === "user") {
    if (ownerId !== userId) {
      return c.json({ error: "You can only change your own picture" }, 403);
    }
  } else if (!(await isBandLeader(ownerId, userId))) {
    return c.json({ error: "Only a band leader can change this" }, 403);
  }

  if (typeof filename !== "string" || !filename) {
    return c.json({ error: "filename is required" }, 400);
  }

  if (typeof contentType !== "string" || !ALLOWED_PROFILE_IMAGE_TYPES[contentType]) {
    return c.json({ error: "Only WebP, JPG or PNG images are allowed" }, 400);
  }

  if (typeof size !== "number" || size <= 0) {
    return c.json({ error: "size is required" }, 400);
  }

  if (size > IMAGE_MAX_BYTES) {
    return c.json(
      {
        error: `Image too large. Max ${Math.round(IMAGE_MAX_BYTES / (1024 * 1024))}MB`,
      },
      400,
    );
  }

  // Said plainly, because the failure is otherwise a presigned URL against an
  // undefined bucket and a CORS error in the browser with no cause attached.
  if (!PUBLIC_BUCKET || !PUBLIC_BASE_URL) {
    console.error(
      "Image uploads are not configured: set R2_STEMLOCK_PUBLIC_NAME and R2_STEMLOCK_PUBLIC_URL",
    );

    return c.json({ error: "Image uploads are not configured" }, 500);
  }

  const extension = ALLOWED_PROFILE_IMAGE_TYPES[contentType];
  const key = `${keyPrefix(owner, ownerId, target)}${crypto.randomUUID()}.${extension}`;

  const uploadUrl = await getUploadUrl(key, contentType, PUBLIC_BUCKET);

  // The public URL goes back with the upload URL so the client never has to
  // build it, and so the base address lives in one place on the server.
  return c.json({ uploadUrl, key, publicUrl: publicUrlFor(key) }, 200);
});
