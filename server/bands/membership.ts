import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { band_members } from "@/server/db/schema";
import { BAND_LEADER } from "@/lib/bandRoles";
import { ACCEPTED } from "@/lib/inviteStatus";

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
      // A pending invitation is an offer, not access. This is the line the
      // consolidation above existed to make possible.
      eq(band_members.status, ACCEPTED),
    ),
  });
}

/** The membership row regardless of status, for invite handling itself. */
export async function getMembershipRow(bandId: string, userId: string) {
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

/** Everyone holding band_leader in a band. */
export async function getLeaders(bandId: string) {
  return db.query.band_members.findMany({
    where: and(
      eq(band_members.band_id, bandId),
      eq(band_members.role, BAND_LEADER),
      eq(band_members.status, ACCEPTED),
    ),
    columns: { user_id: true },
  });
}

/**
 * True when removing or demoting this member would leave the band with no
 * leader at all.
 *
 * A leaderless band is unrecoverable through the UI: only a band_leader can
 * edit the profile, manage members or change roles, so there would be nobody
 * left who could appoint one. Account deletion already avoids this by
 * auto-promoting the longest-serving member; this is the same guard for the
 * paths where a human is making the choice.
 */
export async function isLastLeader(bandId: string, userId: string) {
  const leaders = await getLeaders(bandId);

  return (
    leaders.length === 1 && leaders[0].user_id === userId
  );
}
