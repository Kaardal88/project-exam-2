import { db } from "@/server/db";
import { users, bands, band_members } from "@/server/db/schema";
import { and, eq, inArray, or, like } from "drizzle-orm";
import { slugify, isReservedSlug, isUuid } from "@/lib/slug";
import { ACCEPTED } from "@/lib/inviteStatus";
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
    // a pending invitation is not a membership, so it must not make the user
    // look like a band's only member and get that band deleted with them
    where: and(
      eq(band_members.user_id, userId),
      eq(band_members.status, ACCEPTED),
    ),
    columns: { band_id: true },
  });

  const bandIds = memberships.map((membership) => membership.band_id);

  if (bandIds.length === 0) {
    return [];
  }

  const allMembers = await db.query.band_members.findMany({
    where: and(
      inArray(band_members.band_id, bandIds),
      eq(band_members.status, ACCEPTED),
    ),
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

/**
 * Finds the first free handle for a display name: "adrian", then "adrian-2".
 *
 * Same shape as ensureUniqueSlug() for bands, and for the same reason -- two
 * users may legitimately share a display name, so the collision is expected
 * rather than an error to reject.
 */
export async function ensureUniqueHandle(username: string, excludeUserId?: string) {
  const base = slugify(username);

  const conflicting = await db.query.users.findMany({
    columns: { id: true, handle: true },
    where: or(eq(users.handle, base), like(users.handle, `${base}-%`)),
  });

  const taken = new Set(
    conflicting
      .filter((user) => user.id !== excludeUserId)
      .map((user) => user.handle)
      .filter((handle): handle is string => Boolean(handle)),
  );

  if (isReservedSlug(base)) taken.add(base);

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;

  return `${base}-${suffix}`;
}

/** Resolves the profile route parameter, which accepts a handle or a UUID. */
export async function getUserByIdOrHandle(idOrHandle: string) {
  if (isUuid(idOrHandle)) {
    return db.query.users.findFirst({ where: eq(users.id, idOrHandle) });
  }

  return db.query.users.findFirst({
    where: eq(users.handle, idOrHandle.toLowerCase()),
  });
}

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; cause?: unknown };

  if (candidate.code === UNIQUE_VIOLATION) return true;

  const cause = candidate.cause as { code?: unknown } | undefined;
  return Boolean(cause && cause.code === UNIQUE_VIOLATION);
}

type NewUser = typeof users.$inferInsert;

/**
 * Registers a user, deriving a unique handle from the display name.
 *
 * Mirrors createBand(): ensureUniqueHandle() is a read-then-write check, so
 * two people registering the same display name at once can both compute
 * "adrian-2". The loser gets a unique violation and recomputes.
 */
export async function createUser(
  values: Omit<NewUser, "handle">,
  maxAttempts = 5,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const handle = await ensureUniqueHandle(values.username);

    try {
      const [user] = await db
        .insert(users)
        .values({ ...values, handle })
        .returning();

      return user;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === maxAttempts) throw error;
    }
  }

  throw new Error("Could not generate a unique handle for the user");
}
