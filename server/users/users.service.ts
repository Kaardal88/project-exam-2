import { db } from "@/server/db";
import { users, bands, band_members } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export async function getUsers() {
  return db.query.users.findMany();
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    image_url?: string;
    header_image_url?: string;
    tags?: string[];
  },
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      username: data.username,
      image_url: data.image_url,
      header_image_url: data.header_image_url,
      tags: data.tags,
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      image_url: users.image_url,
      header_image_url: users.header_image_url,
      tags: users.tags,
    });

  return updatedUser;
}

/**
 * What happens to each of a user's bands if they delete their account.
 *
 * - "deleted"     they are the only member, so the band goes with them
 * - "transferred" they are the only band_leader, so the longest-serving
 *                 remaining member is promoted
 * - "kept"        the band already has another leader, nothing changes
 */
export type BandDeletionOutcome = {
  band_id: string;
  band_name: string;
  outcome: "deleted" | "transferred" | "kept";
  successor: { id: string; username: string } | null;
};

export async function getAccountDeletionPlan(
  userId: string,
): Promise<BandDeletionOutcome[]> {
  const memberships = await db.query.band_members.findMany({
    where: eq(band_members.user_id, userId),
    columns: { band_id: true },
  });

  const bandIds = memberships.map((membership) => membership.band_id);

  if (bandIds.length === 0) {
    return [];
  }

  const allMembers = await db.query.band_members.findMany({
    where: inArray(band_members.band_id, bandIds),
    columns: { band_id: true, user_id: true, role: true, joined_at: true },
    with: {
      band: { columns: { band_name: true } },
      user: { columns: { id: true, username: true } },
    },
  });

  return bandIds.map((bandId) => {
    const members = allMembers.filter((member) => member.band_id === bandId);
    const others = members.filter((member) => member.user_id !== userId);
    const bandName = members[0]?.band.band_name ?? "";

    if (others.length === 0) {
      return {
        band_id: bandId,
        band_name: bandName,
        outcome: "deleted" as const,
        successor: null,
      };
    }

    const someoneElseLeads = others.some(
      (member) => member.role === "band_leader",
    );

    if (someoneElseLeads) {
      return {
        band_id: bandId,
        band_name: bandName,
        outcome: "kept" as const,
        successor: null,
      };
    }

    // Longest-serving member takes over. joined_at is nullable, so rows
    // without one sort last rather than winning by accident.
    const successor = [...others].sort((a, b) => {
      const left = a.joined_at?.getTime() ?? Infinity;
      const right = b.joined_at?.getTime() ?? Infinity;
      return left - right;
    })[0];

    return {
      band_id: bandId,
      band_name: bandName,
      outcome: "transferred" as const,
      successor: { id: successor.user.id, username: successor.user.username },
    };
  });
}

/**
 * Hard-deletes a user. Memberships and private events cascade away with them;
 * everything they authored inside a band (songs, comments, events, files) stays
 * put with its attribution set to null, so the band keeps its work.
 *
 * The plan is read before the writes, so a membership change landing in the
 * gap could make a promotion stale. Low stakes here: the loser is a band with
 * two leaders, not a locked one.
 */
export async function deleteUser(id: string) {
  const plan = await getAccountDeletionPlan(id);

  const bandsToDelete = plan
    .filter((band) => band.outcome === "deleted")
    .map((band) => band.band_id);

  const promotions = plan
    .filter((band) => band.outcome === "transferred" && band.successor)
    .map((band) =>
      db
        .update(band_members)
        .set({ role: "band_leader" })
        .where(
          and(
            eq(band_members.band_id, band.band_id),
            eq(band_members.user_id, band.successor!.id),
          ),
        ),
    );

  const statements: BatchItem<"pg">[] = [
    ...promotions,
    ...(bandsToDelete.length > 0
      ? [db.delete(bands).where(inArray(bands.id, bandsToDelete))]
      : []),
    db.delete(users).where(eq(users.id, id)),
  ];

  // neon-http has no interactive transactions; batch runs as a single one.
  // The cast only asserts the array is non-empty, which the final delete
  // guarantees but the spreads hide from the compiler.
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return plan;
}
