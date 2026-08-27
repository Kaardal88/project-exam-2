import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import {
  song_stems,
  song_stem_takes,
  song_versions,
  song_version_stems,
} from "@/server/db/schema";
import {
  getDownloadUrl,
  deleteObject,
  isKeyForSong,
  AUDIO_DOWNLOAD_TTL_SECONDS,
} from "@/server/r2";
import { requireSongAccess } from "./songContext";
import {
  commitVersion,
  getArrangement,
  playableKey,
  type StemChange,
} from "./versions.service";
import {
  isStemKind,
  isHexColor,
  MAX_STEMS_PER_VERSION,
  MIX_KIND,
} from "@/lib/stemKinds";

type Variables = { userId: string };

/**
 * Stems, takes and versions.
 *
 * Mounted at /songs alongside songsRoutes rather than inside it: that file is
 * already twelve hundred lines, and these are a coherent feature of their own.
 * The two routers must not define the same path -- Hono matches in
 * registration order, so the first one registered would silently win. The
 * older whole-song version log now lives under /audio-versions for that
 * reason, until the studio UI replaces it outright.
 */
export const stemsRoutes = new Hono<{ Variables: Variables }>();

/**
 * Filenames that sort themselves in a Downloads folder holding several songs:
 * "Kong Vidar - 01 Drums - v8.mp3".
 */
function downloadName(
  song: string,
  position: number,
  stemName: string,
  version: number,
) {
  const order = String(position + 1).padStart(2, "0");
  return `${song} - ${order} ${stemName} - v${version}.mp3`;
}

/* ------------------------------------------------------------------ slots */

/** The slot registry: what lanes this song has, and what colour each is. */
stemsRoutes.get("/:id/stems", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const stems = await db.query.song_stems.findMany({
    where: (rows, { eq }) => eq(rows.song_id, found.song.id),
    orderBy: [asc(song_stems.sort_order), asc(song_stems.created_at)],
  });

  return c.json(stems, 200);
});

/**
 * Add a slot. Open to anyone with project access, guests included -- a session
 * musician has to be able to say "I need a lane for the harmony vocal" without
 * waiting for a leader.
 */
stemsRoutes.post("/:id/stems", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const body = await c.req.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return c.json({ error: "name is required" }, 400);

  if (!isStemKind(body.kind)) {
    return c.json({ error: "kind must be one of the stem kinds" }, 400);
  }

  if (body.color != null && !isHexColor(body.color)) {
    return c.json({ error: "color must be #rrggbb" }, 400);
  }

  const existing = await db.query.song_stems.findMany({
    where: (rows, { eq }) => eq(rows.song_id, found.song.id),
    columns: { id: true, sort_order: true },
  });

  // A version can hold one take per slot, so more slots than a version can
  // hold is a lane that could never be heard. Refused here rather than
  // discovered at commit time.
  if (existing.length >= MAX_STEMS_PER_VERSION) {
    return c.json(
      {
        error: `A song can have at most ${MAX_STEMS_PER_VERSION} stems. Remove one before adding another.`,
      },
      409,
    );
  }

  const [stem] = await db
    .insert(song_stems)
    .values({
      song_id: found.song.id,
      name: name.slice(0, 80),
      kind: body.kind,
      color: body.color ?? null,
      sort_order: existing.reduce(
        (highest, row) => Math.max(highest, row.sort_order + 1),
        0,
      ),
      created_by: userId,
    })
    .returning();

  return c.json(stem, 201);
});

/**
 * Rename, recolour or reorder a slot.
 *
 * Not gated on leader. Colours are a shared visual convention the whole band
 * reads at a glance -- the drummer noticing their lane is the wrong green
 * should be able to fix it, not file a request.
 */
stemsRoutes.patch("/:id/stems/:stemId", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const stemId = c.req.param("stemId");
  const body = await c.req.json();

  const stem = await db.query.song_stems.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, stemId), eq(rows.song_id, found.song.id)),
  });

  if (!stem) return c.json({ error: "Stem not found" }, 404);

  if (body.color != null && !isHexColor(body.color)) {
    return c.json({ error: "color must be #rrggbb" }, 400);
  }

  if (body.kind != null && !isStemKind(body.kind)) {
    return c.json({ error: "kind must be one of the stem kinds" }, 400);
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;

  if (name === "") return c.json({ error: "name cannot be empty" }, 400);

  const [updated] = await db
    .update(song_stems)
    .set({
      name: name ?? stem.name,
      kind: body.kind ?? stem.kind,
      // Explicitly nullable: sending null means "go back to the kind's
      // default", which is different from not sending the field at all.
      color: body.color === undefined ? stem.color : body.color,
      sort_order:
        typeof body.sort_order === "number" ? body.sort_order : stem.sort_order,
    })
    .where(eq(song_stems.id, stemId))
    .returning();

  return c.json(updated, 200);
});

/**
 * Remove a slot entirely, along with every take in it.
 *
 * Refused as soon as any version references it: that would delete audio a
 * committed arrangement still plays. Removing a layer from the song *going
 * forward* is a different act -- commit a version that leaves the slot out,
 * and the history keeps working.
 */
stemsRoutes.delete("/:id/stems/:stemId", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can remove a stem" }, 403);
  }

  const stemId = c.req.param("stemId");

  const stem = await db.query.song_stems.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, stemId), eq(rows.song_id, found.song.id)),
  });

  if (!stem) return c.json({ error: "Stem not found" }, 404);

  // No index on stem_id here, deliberately: this is the only query that needs
  // one and deleting a stem is rare, while every take upload would pay for the
  // index on write.
  const used = await db.query.song_version_stems.findFirst({
    where: (rows, { eq }) => eq(rows.stem_id, stemId),
  });

  if (used) {
    return c.json(
      {
        error:
          "A version still uses this stem. Commit a version without it instead — that removes the layer and keeps the history playable.",
      },
      409,
    );
  }

  const takes = await db
    .select({ r2_key: song_stem_takes.r2_key })
    .from(song_stem_takes)
    .where(eq(song_stem_takes.stem_id, stemId));

  const [deleted] = await db
    .delete(song_stems)
    .where(eq(song_stems.id, stemId))
    .returning();

  // The rows are gone either way; a bucket object left behind is waste, not a
  // correctness problem, so a storage failure does not fail the request.
  for (const take of takes) {
    await deleteObject(take.r2_key).catch(() => {});
  }

  return c.json(deleted, 200);
});

/* ------------------------------------------------------------------ takes */

/** Every take handed in for one slot, newest first. */
stemsRoutes.get("/:id/stems/:stemId/takes", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const stemId = c.req.param("stemId");

  const takes = await db.query.song_stem_takes.findMany({
    where: (rows, { and, eq }) =>
      and(eq(rows.stem_id, stemId), eq(rows.song_id, found.song.id)),
    orderBy: desc(song_stem_takes.created_at),
    with: {
      uploader: { columns: { id: true, username: true, image_url: true } },
    },
  });

  return c.json(takes, 200);
});

/**
 * Register an uploaded take.
 *
 * Deliberately open to anyone with project access, guests included, and
 * deliberately **not** a commit: this adds a candidate to the slot and changes
 * nothing anybody hears. Deciding which take is the song is a band leader
 * moving main, which is POST /versions.
 */
stemsRoutes.post("/:id/stems/:stemId/takes", requireAuth, async (c) => {
  const userId = c.get("userId");
  const songId = c.req.param("id");
  const found = await requireSongAccess(songId, userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const stemId = c.req.param("stemId");
  const body = await c.req.json();

  const stem = await db.query.song_stems.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, stemId), eq(rows.song_id, songId)),
  });

  if (!stem) return c.json({ error: "Stem not found" }, 404);

  // getDownloadUrl signs whatever key it is handed, so a key from a request
  // body is checked against the prefix presign-upload issues for this song.
  if (typeof body.r2_key !== "string" || !isKeyForSong(body.r2_key, songId)) {
    return c.json(
      { error: "r2_key must be a key uploaded for this song" },
      400,
    );
  }

  const label =
    typeof body.label === "string" && body.label.trim() !== ""
      ? body.label.trim().slice(0, 255)
      : "";

  if (!label) return c.json({ error: "label is required" }, 400);

  const [take] = await db
    .insert(song_stem_takes)
    .values({
      song_id: songId,
      stem_id: stemId,
      r2_key: body.r2_key,
      label,
      note: typeof body.note === "string" ? body.note : null,
      // Only mp3 is accepted today. The column exists so wav becomes a
      // validation change rather than a schema change.
      format: "mp3",
      duration_seconds:
        typeof body.duration_seconds === "number"
          ? Math.round(body.duration_seconds)
          : null,
      sample_rate:
        typeof body.sample_rate === "number" ? body.sample_rate : null,
      byte_size: typeof body.byte_size === "number" ? body.byte_size : null,
      uploaded_by: userId,
    })
    .returning();

  return c.json(take, 201);
});

/**
 * Rename a take, or change its note.
 *
 * The label is written once at upload and was unchangeable, which turned a
 * typo into a permanent one. Open to the uploader or a leader, the same rule
 * that governs withdrawing it.
 *
 * Renaming a take deliberately does *not* touch the versions that use it. A
 * version's label is its own commit message, written when the arrangement
 * changed; relabelling the audio afterwards should not rewrite what the log
 * says happened.
 */
stemsRoutes.patch("/:id/takes/:takeId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const takeId = c.req.param("takeId");
  const body = await c.req.json();

  const take = await db.query.song_stem_takes.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, takeId), eq(rows.song_id, found.song.id)),
  });

  if (!take) return c.json({ error: "Take not found" }, 404);

  if (take.uploaded_by !== userId && !found.access.isLeader) {
    return c.json(
      { error: "Only the uploader or a band leader can rename this take" },
      403,
    );
  }

  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 255) : undefined;

  if (label === "") return c.json({ error: "label cannot be empty" }, 400);

  const [updated] = await db
    .update(song_stem_takes)
    .set({
      label: label ?? take.label,
      note: body.note === undefined ? take.note : body.note,
    })
    .where(eq(song_stem_takes.id, takeId))
    .returning();

  return c.json(updated, 200);
});

/** A playable URL for one take, so candidates can be compared before a commit. */
stemsRoutes.get("/:id/takes/:takeId/url", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const take = await db.query.song_stem_takes.findFirst({
    where: (rows, { and, eq }) =>
      and(
        eq(rows.id, c.req.param("takeId")),
        eq(rows.song_id, found.song.id),
      ),
  });

  if (!take) return c.json({ error: "Take not found" }, 404);

  const url = await getDownloadUrl(
    playableKey(take),
    AUDIO_DOWNLOAD_TTL_SECONDS,
  );

  return c.json({ url }, 200);
});

/**
 * Withdraw a take. The uploader can remove their own; a leader can remove any
 * -- the same rule song_files and the old version log already use.
 *
 * Refused if a version points at it. The database would refuse anyway, since
 * song_version_stems.take_id is ON DELETE RESTRICT, but a 409 naming the
 * versions is a better answer than a foreign key error.
 */
stemsRoutes.delete("/:id/takes/:takeId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const takeId = c.req.param("takeId");

  const take = await db.query.song_stem_takes.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, takeId), eq(rows.song_id, found.song.id)),
  });

  if (!take) return c.json({ error: "Take not found" }, 404);

  if (take.uploaded_by !== userId && !found.access.isLeader) {
    return c.json(
      { error: "Only the uploader or a band leader can remove this take" },
      403,
    );
  }

  const usedBy = await db
    .select({ version_number: song_versions.version_number })
    .from(song_version_stems)
    .innerJoin(
      song_versions,
      eq(song_version_stems.song_version_id, song_versions.id),
    )
    .where(eq(song_version_stems.take_id, takeId));

  if (usedBy.length > 0) {
    const names = usedBy.map((row) => `v${row.version_number}`).join(", ");

    return c.json(
      {
        error: `This take is part of ${names}. Removing it would change what those versions sound like.`,
      },
      409,
    );
  }

  try {
    await deleteObject(take.r2_key);
    if (take.proxy_r2_key) await deleteObject(take.proxy_r2_key);
  } catch {
    return c.json(
      { error: "Failed to delete the file from storage. Please try again." },
      502,
    );
  }

  const [deleted] = await db
    .delete(song_stem_takes)
    .where(eq(song_stem_takes.id, takeId))
    .returning();

  return c.json(deleted, 200);
});

/* --------------------------------------------------------------- versions */

/**
 * The commit log. Everyone with project access sees all of it, guests
 * included -- knowing what came before is most of what makes a take worth
 * recording.
 */
stemsRoutes.get("/:id/versions", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const versions = await db.query.song_versions.findMany({
    where: (rows, { eq }) => eq(rows.song_id, found.song.id),
    orderBy: desc(song_versions.version_number),
    with: {
      creator: { columns: { id: true, username: true, image_url: true } },
      locker: { columns: { id: true, username: true, image_url: true } },
      stems: { columns: { id: true } },
    },
  });

  return c.json(
    versions.map(({ stems, ...version }) => ({
      ...version,
      stem_count: stems.length,
      // Derived from the song's own pointer rather than stored, so there is no
      // second place that could disagree about which version is main.
      is_current: version.id === found.song.current_version_id,
    })),
    200,
  );
});

/**
 * One version, with every stem and a signed URL for each.
 *
 * One request on purpose. The player has to start every source against the
 * same clock, so fetching a URL per stem would be ten round trips before a
 * single note plays.
 */
stemsRoutes.get("/:id/versions/:versionId", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const versionId = c.req.param("versionId");

  const version = await db.query.song_versions.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, versionId), eq(rows.song_id, found.song.id)),
    with: {
      creator: { columns: { id: true, username: true, image_url: true } },
    },
  });

  if (!version) return c.json({ error: "Version not found" }, 404);

  const arrangement = await getArrangement(versionId);

  const lanes = await Promise.all(
    arrangement.map(async (row) => ({
      stem: row.stem,
      take: row.take,
      url: await getDownloadUrl(
        playableKey(row.take),
        AUDIO_DOWNLOAD_TTL_SECONDS,
      ),
    })),
  );

  lanes.sort((a, b) => a.stem.sort_order - b.stem.sort_order);

  return c.json(
    {
      ...version,
      is_current: version.id === found.song.current_version_id,
      stems: lanes,
    },
    200,
  );
});

/**
 * Commit: make this set of takes the song.
 *
 * Band leaders only. This is the decision the take/version split exists to
 * separate from the act of contributing.
 *
 * The body carries only what changed -- `stems: [{ stem_id, take_id }]`, with
 * a null take_id dropping a slot. Everything else is copied from the current
 * version at write time, so this version's rows are complete on their own.
 */
stemsRoutes.post("/:id/versions", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json(
      { error: "Only band leaders can decide what the song is" },
      403,
    );
  }

  const body = await c.req.json();

  // Optional. Left out, the service writes one from the difference between
  // this arrangement and the last -- "Added Kick" rather than "Kick".
  const label =
    typeof body.label === "string" && body.label.trim() !== ""
      ? body.label.trim().slice(0, 255)
      : undefined;

  if (!Array.isArray(body.stems)) {
    return c.json({ error: "stems must be an array of changes" }, 400);
  }

  const result = await commitVersion({
    song: found.song,
    userId,
    label,
    note: typeof body.note === "string" ? body.note : null,
    changes: body.stems as StemChange[],
  });

  if (!result.ok) return c.json({ error: result.error }, result.status);

  return c.json(
    { ...result.version, stem_count: result.stemCount, is_current: true },
    201,
  );
});

/**
 * Rewrite a version's message.
 *
 * Commit messages get better in hindsight, and the generated ones do not always
 * land. Band leaders only, the same as writing the version in the first place.
 * Renaming does not touch the arrangement -- only what the log says about it.
 */
stemsRoutes.patch("/:id/versions/:versionId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can rename a version" }, 403);
  }

  const versionId = c.req.param("versionId");
  const body = await c.req.json();

  const version = await db.query.song_versions.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, versionId), eq(rows.song_id, found.song.id)),
  });

  if (!version) return c.json({ error: "Version not found" }, 404);

  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 255) : undefined;

  if (label === "") return c.json({ error: "label cannot be empty" }, 400);

  const [updated] = await db
    .update(song_versions)
    .set({
      label: label ?? version.label,
      note: body.note === undefined ? version.note : body.note,
    })
    .where(eq(song_versions.id, versionId))
    .returning();

  return c.json(updated, 200);
});

/**
 * Go back to an older version.
 *
 * Writes a **new** version holding that one's arrangement rather than moving
 * main backwards. Same shape as git revert, and it is what keeps the history a
 * straight line: every version in the log was main at the moment it was made,
 * and the next commit always descends from the newest.
 */
stemsRoutes.put("/:id/versions/:versionId/restore", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can restore a version" }, 403);
  }

  const versionId = c.req.param("versionId");

  const version = await db.query.song_versions.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, versionId), eq(rows.song_id, found.song.id)),
  });

  if (!version) return c.json({ error: "Version not found" }, 404);

  if (version.id === found.song.current_version_id) {
    return c.json({ error: "That version is already the song" }, 409);
  }

  const result = await commitVersion({
    song: found.song,
    userId,
    label: `Back to "${version.label}"`,
    note: `Restored the arrangement from v${version.version_number}.`,
    changes: [],
    baseVersionId: version.id,
  });

  if (!result.ok) return c.json({ error: result.error }, result.status);

  return c.json(
    { ...result.version, stem_count: result.stemCount, is_current: true },
    201,
  );
});

/** Mark a version as sent to mix, so it stops being a moving target. */
stemsRoutes.put("/:id/versions/:versionId/lock", requireAuth, async (c) => {
  const userId = c.get("userId");
  const found = await requireSongAccess(c.req.param("id"), userId);
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can lock a version" }, 403);
  }

  const [locked] = await db
    .update(song_versions)
    .set({ locked_at: new Date(), locked_by: userId })
    .where(
      and(
        eq(song_versions.id, c.req.param("versionId")),
        eq(song_versions.song_id, found.song.id),
      ),
    )
    .returning();

  if (!locked) return c.json({ error: "Version not found" }, 404);

  return c.json(locked, 200);
});

stemsRoutes.delete("/:id/versions/:versionId/lock", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can unlock a version" }, 403);
  }

  const [unlocked] = await db
    .update(song_versions)
    .set({ locked_at: null, locked_by: null })
    .where(
      and(
        eq(song_versions.id, c.req.param("versionId")),
        eq(song_versions.song_id, found.song.id),
      ),
    )
    .returning();

  if (!unlocked) return c.json({ error: "Version not found" }, 404);

  return c.json(unlocked, 200);
});

/**
 * Remove a version from the log.
 *
 * The current one is refused -- the song would be left pointing at nothing.
 * A locked one is refused too: somebody is mixing against it, and the point of
 * locking is that it stays where it was. The takes survive either way; only
 * the snapshot rows go.
 */
stemsRoutes.delete("/:id/versions/:versionId", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  if (!found.access.isLeader) {
    return c.json({ error: "Only band leaders can remove a version" }, 403);
  }

  const versionId = c.req.param("versionId");

  const version = await db.query.song_versions.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, versionId), eq(rows.song_id, found.song.id)),
  });

  if (!version) return c.json({ error: "Version not found" }, 404);

  if (version.id === found.song.current_version_id) {
    return c.json(
      {
        error:
          "This is the song as it stands. Commit or restore another version before removing it.",
      },
      409,
    );
  }

  if (version.locked_at) {
    return c.json(
      { error: "This version is locked for mix. Unlock it first." },
      409,
    );
  }

  const [deleted] = await db
    .delete(song_versions)
    .where(eq(song_versions.id, versionId))
    .returning();

  return c.json(deleted, 200);
});

/**
 * Everything needed to take one version away and work on it.
 *
 * Written first with a mix engineer in mind, but the real user turned out to
 * be a band member overdubbing at home: download the latest version, open it
 * in a DAW, play a solo over it, render that track on its own and upload it
 * back as the next version. That is the loop this whole feature exists to
 * close, and it needs two different things --
 *
 * - `mix`, a single file to drop in as a guide track. Null when the song has
 *   no "Full mix" slot, because then no such file exists.
 * - `files`, every stem separately, for anyone who wants the parts.
 *
 * A manifest of signed URLs rather than a zip. A real archive wants a queue, a
 * worker and somewhere to park the result, and this stack has none of the
 * three -- so the endpoint is shaped so a zip can replace the body later
 * without the client or the model changing.
 *
 * Open to anyone with project access, which is how a guest invited to the
 * project already reaches it. No new access model.
 */
stemsRoutes.get("/:id/versions/:versionId/download", requireAuth, async (c) => {
  const found = await requireSongAccess(c.req.param("id"), c.get("userId"));
  if (!found.ok) return c.json({ error: found.error }, found.status);

  const versionId = c.req.param("versionId");

  const version = await db.query.song_versions.findFirst({
    where: (rows, { and, eq }) =>
      and(eq(rows.id, versionId), eq(rows.song_id, found.song.id)),
  });

  if (!version) return c.json({ error: "Version not found" }, 404);

  const arrangement = await getArrangement(versionId);

  arrangement.sort((a, b) => a.stem.sort_order - b.stem.sort_order);

  const files = await Promise.all(
    arrangement.map(async (row, position) => {
      const filename = downloadName(
        found.song.title,
        position,
        row.stem.name,
        version.version_number,
      );

      return {
        filename,
        stem: row.stem.name,
        kind: row.stem.kind,
        // The master, never the proxy: the proxy exists so the app can play
        // cheaply, and someone recording against this wants what was actually
        // recorded.
        url: await getDownloadUrl(
          row.take.r2_key,
          AUDIO_DOWNLOAD_TTL_SECONDS,
          filename,
        ),
      };
    }),
  );

  // The guide track, when the arrangement has one. Named after the song rather
  // than the slot, because this is the file somebody drops into a DAW and it
  // should say which song it is.
  const mixRow = arrangement.find((row) => row.stem.kind === MIX_KIND);

  const mix = mixRow
    ? await (async () => {
        const filename = `${found.song.title} - v${version.version_number}.mp3`;

        return {
          filename,
          url: await getDownloadUrl(
            mixRow.take.r2_key,
            AUDIO_DOWNLOAD_TTL_SECONDS,
            filename,
          ),
        };
      })()
    : null;

  return c.json(
    {
      song: found.song.title,
      version: version.version_number,
      label: version.label,
      expires_in_seconds: AUDIO_DOWNLOAD_TTL_SECONDS,
      mix,
      files,
    },
    200,
  );
});
