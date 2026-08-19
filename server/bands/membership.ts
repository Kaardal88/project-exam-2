import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { band_members } from "@/server/db/schema";

/**
 * The single place that answers "does this user have access to this band, and
 * as what".
 *
 * This query used to be written out inline in ten places in bands.routes.ts
 * plus a local copy in projects.routes.ts and songs.routes.ts. Consolidating
 * it is not tidying: an invitation needs an accepted/pending distinction, and
 * with twelve copies of the query, missing one would hand a pending invitee
 * full access before they ever accepted. There is now one line to change.
 *
 * Returns undefined when the user has no membership at all, which callers
 * treat as unauthorised.
 */
export async function getMembership(bandId: string, userId: string) {
  return db.query.band_members.findFirst({
    where: and(
      eq(band_members.band_id, bandId),
      eq(band_members.user_id, userId),
    ),
  });
}

/** Convenience for the many routes gated on band_leader. */
export async function isBandLeader(bandId: string, userId: string) {
  const membership = await getMembership(bandId, userId);
  return membership?.role === "band_leader";
}
