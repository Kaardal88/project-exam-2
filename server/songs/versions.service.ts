import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  songs,
  song_stems,
  song_stem_takes,
  song_versions,
  song_version_stems,
} from "@/server/db/schema";
import { MAX_STEMS_PER_VERSION, MIX_KIND } from "@/lib/stemKinds";

/**
 * One slot's new contents. A null take_id drops the slot out of the
 * arrangement -- which is how a layer is removed: not by deleting anything,
 * but by committing a version that leaves it out.
 */
export type StemChange = { stem_id: string; take_id: string | null };

type CommitFailure = { ok: false; status: 400 | 404 | 409; error: string };

/** "Kick", "Kick and Snare", "Kick, Snare and 2 more". */
function nameList(names: string[]) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/**
 * What a version says it did, when nobody wrote a message for it.
 *
 * A version's label is a commit message: it describes the change, not the
 * contents. The first cut of this passed the *take's* name straight through,
 * so uploading a stem called "Kick" produced a version called "Kick" -- which
 * reads as though the whole arrangement is now named after one layer of it.
 * Comparing the two arrangements says the true thing instead: "Added Kick".
 */
function describeChange(
  before: Map<string, string>,
  after: Map<string, string>,
  nameOf: (stemId: string) => string,
): string {
  const added: string[] = [];
  const replaced: string[] = [];
  const removed: string[] = [];

  for (const [stemId, takeId] of after) {
    if (!before.has(stemId)) added.push(nameOf(stemId));
    else if (before.get(stemId) !== takeId) replaced.push(nameOf(stemId));
  }

  for (const stemId of before.keys()) {
    if (!after.has(stemId)) removed.push(nameOf(stemId));
  }

  const parts: string[] = [];

  if (added.length) parts.push(`Added ${nameList(added)}`);
  if (replaced.length) {
    parts.push(
      `${parts.length ? "replaced" : "Replaced"} ${nameList(replaced)}`,
    );
  }
  if (removed.length) {
    parts.push(`${parts.length ? "removed" : "Removed"} ${nameList(removed)}`);
  }

  // Reachable only through a restore, which supplies its own label anyway.
  return parts.length ? parts.join(", ") : "Updated the arrangement";
}

type CommitSuccess = {
  ok: true;
  version: typeof song_versions.$inferSelect;
  stemCount: number;
};

/** The key that is actually played: the proxy when there is one. */
export function playableKey(take: {
  r2_key: string;
  proxy_r2_key: string | null;
}) {
  return take.proxy_r2_key ?? take.r2_key;
}

/** A version's arrangement, with the slot and the audio behind each row. */
export async function getArrangement(versionId: string) {
  return db.query.song_version_stems.findMany({
    where: (rows, { eq }) => eq(rows.song_version_id, versionId),
    with: {
      stem: true,
      take: {
        with: {
          uploader: {
            columns: { id: true, username: true, image_url: true },
          },
        },
      },
    },
  });
}

/**
 * Write a new version: a commit on main.
 *
 * The arrangement is computed here and written out in full, one row per slot.
 * The decision record sketched this as INSERT ... SELECT from the previous
 * version plus the changed rows, and that would work -- but the previous
 * version's rows have to be read anyway, to know which take lands in the mix
 * slot for songs.audio_url and to count the result against
 * MAX_STEMS_PER_VERSION. Once they are in hand, INSERT ... SELECT is a second
 * way of saying the same thing, and it carries a trap the explicit form does
 * not: the exclusion would be NOT IN, and NOT IN yields nothing at all if any
 * id in the list is null, which would silently commit an emptied arrangement
 * instead of failing.
 *
 * What matters is unchanged and is the whole point: **the copy happens on
 * write.** Every version holds its own complete set of rows, so correcting a
 * take in v1 can never change what v4 sounds like.
 *
 * Every statement goes in one db.batch(), which Neon runs as a single
 * transaction -- verified in scripts/probe-batch.ts, including that a failure
 * partway rolls the whole thing back. That is why the version id is generated
 * here rather than by the database: a batch has to know all its statements up
 * front.
 *
 * Known limitation: songs.current_version_id is read before the batch, so two
 * leaders committing the same song in the same instant would have the second
 * write win and the first one's layer stay an unadopted take. Nothing is lost
 * and it is visible in the take list. The fix, when it is worth it, is to pass
 * the expected current version from the client and make the final UPDATE
 * conditional on it.
 */
export async function commitVersion({
  song,
  userId,
  label,
  note,
  changes,
  baseVersionId,
}: {
  song: typeof songs.$inferSelect;
  userId: string;
  /** The commit message. Generated from the diff when nobody wrote one. */
  label?: string;
  note: string | null;
  changes: StemChange[];
  /** What to copy from. Defaults to main; a restore passes the old version. */
  baseVersionId?: string | null;
}): Promise<CommitSuccess | CommitFailure> {
  const base =
    baseVersionId === undefined ? song.current_version_id : baseVersionId;

  if (changes.length === 0 && base === song.current_version_id) {
    return {
      ok: false,
      status: 400,
      error: "Nothing changed. A version records a change to the arrangement.",
    };
  }

  // Guarded rather than trusted: these ids reach us from a request body and
  // decide which audio a version points at.
  for (const change of changes) {
    if (typeof change?.stem_id !== "string" || change.stem_id === "") {
      return { ok: false, status: 400, error: "Each change needs a stem_id" };
    }

    if (change.take_id !== null && typeof change.take_id !== "string") {
      return {
        ok: false,
        status: 400,
        error: "take_id must be a take id, or null to drop the slot",
      };
    }
  }

  const stems = await db
    .select()
    .from(song_stems)
    .where(eq(song_stems.song_id, song.id));

  const stemById = new Map(stems.map((stem) => [stem.id, stem]));

  for (const change of changes) {
    if (!stemById.has(change.stem_id)) {
      return {
        ok: false,
        status: 404,
        error: "One of those stems does not belong to this song",
      };
    }
  }

  const previous = base ? await getArrangementRows(base) : [];

  const before = new Map(previous.map((row) => [row.stem_id, row.take_id]));

  // stem_id -> take_id. Start from what the base version held, then apply the
  // changes over the top; a null take_id removes the slot entirely.
  const arrangement = new Map<string, string>();

  for (const row of previous) arrangement.set(row.stem_id, row.take_id);

  for (const change of changes) {
    if (change.take_id === null) {
      arrangement.delete(change.stem_id);
    } else {
      arrangement.set(change.stem_id, change.take_id);
    }
  }

  if (arrangement.size === 0) {
    return {
      ok: false,
      status: 400,
      error: "A version needs at least one stem in it",
    };
  }

  if (arrangement.size > MAX_STEMS_PER_VERSION) {
    return {
      ok: false,
      status: 409,
      error: `A version can hold at most ${MAX_STEMS_PER_VERSION} stems. This one would have ${arrangement.size}.`,
    };
  }

  // Every take in the result, not only the new ones: the inherited rows are
  // what decide songs.audio_url when the mix slot was not the slot that
  // changed.
  const takeIds = [...arrangement.values()];

  const takes = await db
    .select()
    .from(song_stem_takes)
    .where(inArray(song_stem_takes.id, takeIds));

  const takeById = new Map(takes.map((take) => [take.id, take]));

  for (const [stemId, takeId] of arrangement) {
    const take = takeById.get(takeId);

    if (!take || take.song_id !== song.id) {
      return {
        ok: false,
        status: 404,
        error: "One of those takes does not belong to this song",
      };
    }

    // A take recorded for the bass slot must not be filed under vocals. The
    // UNIQUE in the database stops two takes in one slot; this stops one take
    // in the wrong slot.
    if (take.stem_id !== stemId) {
      return {
        ok: false,
        status: 400,
        error: "A take can only go in the stem it was uploaded to",
      };
    }
  }

  // The single-file mixdown, when the arrangement has a mix slot. Null
  // otherwise, and a song built from stems alone simply has no one file.
  let mixKey: string | null = null;

  for (const [stemId, takeId] of arrangement) {
    if (stemById.get(stemId)?.kind === MIX_KIND) {
      mixKey = takeById.get(takeId)?.r2_key ?? null;
      break;
    }
  }

  const finalLabel =
    label?.trim() ||
    describeChange(
      before,
      arrangement,
      (stemId) => stemById.get(stemId)?.name ?? "a stem",
    );

  const versionId = crypto.randomUUID();

  const statements = [
    db
      .insert(song_versions)
      .values({
        id: versionId,
        song_id: song.id,
        // Computed in the database so two commits cannot pick the same number
        // and lose the UNIQUE race.
        version_number: sql`(SELECT COALESCE(MAX(${song_versions.version_number}), 0) + 1 FROM ${song_versions} WHERE ${song_versions.song_id} = ${song.id})`,
        label: finalLabel.slice(0, 255),
        note,
        created_by: userId,
      })
      .returning(),

    ...[...arrangement].map(([stemId, takeId]) =>
      db.insert(song_version_stems).values({
        song_version_id: versionId,
        song_id: song.id,
        stem_id: stemId,
        take_id: takeId,
      }),
    ),

    db
      .update(songs)
      .set({
        current_version_id: versionId,
        audio_url: mixKey,
        updated_at: new Date(),
      })
      .where(eq(songs.id, song.id)),
  ];

  type Statement = (typeof statements)[number];

  const [inserted] = await db.batch(
    statements as unknown as [Statement, ...Statement[]],
  );

  return {
    ok: true,
    version: (inserted as (typeof song_versions.$inferSelect)[])[0],
    stemCount: arrangement.size,
  };
}

/** The bare rows of a version's arrangement, without the joins. */
async function getArrangementRows(versionId: string) {
  return db
    .select({
      stem_id: song_version_stems.stem_id,
      take_id: song_version_stems.take_id,
    })
    .from(song_version_stems)
    .where(eq(song_version_stems.song_version_id, versionId));
}
