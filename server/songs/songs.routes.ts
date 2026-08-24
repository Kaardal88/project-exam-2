import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import {
  songs,
  song_comments,
  song_tasks,
  song_notes,
  song_comment_events,
  song_files,
  song_audio_versions,
} from "@/server/db/schema";
import {
  getUploadUrl,
  getDownloadUrl,
  deleteObject,
  isLegacyPastedUrl,
  isKeyForSong,
  MP3_MAX_BYTES,
  IMAGE_MAX_BYTES,
  FILE_MAX_BYTES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  AUDIO_DOWNLOAD_TTL_SECONDS,
  ARTWORK_DOWNLOAD_TTL_SECONDS,
  FILE_DOWNLOAD_TTL_SECONDS,
} from "@/server/r2";
import { getProjectAccess } from "@/server/projects/access";
import { getSongContext } from "./songContext";

const TICKET_STATUSES = ["open", "wip", "done"] as const;
const NOTE_KINDS = ["note", "lyrics"] as const;
const FILE_CATEGORIES = [
  "project_file",
  "artwork",
  "press_photo",
  "contract",
] as const;
// "stem" is one layer of a song; "audio" is the whole-song take the version
// log has always used. Both are mp3 and validated identically -- they differ
// only in which key prefix they land under, and therefore which feature reads
// them back.
const UPLOAD_TARGETS = ["audio", "stem", "artwork", "file"] as const;
const IMAGE_FILE_CATEGORIES = ["artwork", "press_photo"];

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 100);
}

type Variables = {
  userId: string;
};

export const songsRoutes = new Hono<{ Variables: Variables }>();



// Moved to ./songContext.ts when stems.routes.ts needed the same lookup.

songsRoutes.get("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ ...context.song, project: context.project }, 200);
});

songsRoutes.put("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Audio is no longer settable here. It is the current version's key, and the
  // only way to change which version is current is to promote one, which is a
  // band leader's decision. Rejecting loudly rather than ignoring quietly, so
  // a caller still sending it finds out.
  if ("audio_url" in body) {
    return c.json(
      {
        error:
          "Audio is set by promoting a version. POST /songs/:id/versions to upload one.",
      },
      400,
    );
  }

  // Artwork still ends up in getDownloadUrl and, on replace, deleteObject.
  // Access to *this* song is not access to an arbitrary key in the bucket.
  if (body.artwork_url != null && !isKeyForSong(body.artwork_url, songId)) {
    return c.json(
      { error: "artwork_url must be a key uploaded for this song" },
      400,
    );
  }

  const [updatedSong] = await db
    .update(songs)
    .set({
      title: body.title,
      status: body.status,
      track_number: body.track_number,
      artwork_url: body.artwork_url,
      updated_at: new Date(),
    })
    .where(eq(songs.id, songId))
    .returning();

  // Artwork still replaces in place. Audio does not: the old take stays in the
  // version log, which is the whole point of keeping one.
  if (
    body.artwork_url &&
    context.song.artwork_url &&
    context.song.artwork_url !== body.artwork_url
  ) {
    await deleteObject(context.song.artwork_url).catch(() => {});
  }

  return c.json(updatedSong, 200);
});

songsRoutes.delete("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!access.isLeader) {
    return c.json({ error: "Only band leaders can delete songs" }, 403);
  }

  const [deletedSong] = await db
    .delete(songs)
    .where(eq(songs.id, songId))
    .returning();

  return c.json(deletedSong, 200);
});

songsRoutes.get("/:id/comments", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const comments = await db.query.song_comments.findMany({
    where: (song_comments, { eq }) => eq(song_comments.song_id, songId),
    orderBy: desc(song_comments.created_at),
    with: {
      author: {
        columns: { id: true, username: true, image_url: true },
      },
      assignee: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(comments, 200);
});

songsRoutes.post("/:id/comments", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (typeof body.timestamp_seconds !== "number") {
    return c.json({ error: "timestamp_seconds is required" }, 400);
  }

  if (!body.body) {
    return c.json({ error: "body is required" }, 400);
  }

  const [comment] = await db
    .insert(song_comments)
    .values({
      song_id: songId,
      author_id: userId,
      timestamp_seconds: body.timestamp_seconds,
      body: body.body,
      assignee_id: body.assignee_id ?? null,
      status: "open",
    })
    .returning();

  return c.json(comment, 201);
});

songsRoutes.put("/:id/comments/:commentId", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const commentId = c.req.param("commentId");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const comment = await db.query.song_comments.findFirst({
    where: (song_comments, { eq, and }) =>
      and(eq(song_comments.id, commentId), eq(song_comments.song_id, songId)),
  });

  if (!comment) {
    return c.json({ error: "Comment not found" }, 404);
  }

  const isLeader = access.isLeader;
  const isAssignee = comment.assignee_id === userId;

  const wantsStatusChange =
    typeof body.status === "string" && body.status !== comment.status;
  const wantsReassign =
    "assignee_id" in body && body.assignee_id !== comment.assignee_id;

  if (!wantsStatusChange && !wantsReassign) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  if (wantsStatusChange) {
    if (!isAssignee && !isLeader) {
      return c.json(
        { error: "Only the assignee or band leader can change ticket status" },
        403,
      );
    }

    if (!TICKET_STATUSES.includes(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
  }

  if (wantsReassign && !isAssignee && !isLeader) {
    return c.json(
      { error: "Only the current assignee or band leader can reassign a ticket" },
      403,
    );
  }

  const updates: Partial<typeof song_comments.$inferInsert> = {};

  if (wantsStatusChange) {
    updates.status = body.status;
    updates.resolved_at = body.status === "done" ? new Date() : null;
  }

  if (wantsReassign) {
    updates.assignee_id = body.assignee_id ?? null;
  }

  const [updatedComment] = await db
    .update(song_comments)
    .set(updates)
    .where(eq(song_comments.id, commentId))
    .returning();

  const events: (typeof song_comment_events.$inferInsert)[] = [];

  if (wantsStatusChange) {
    events.push({
      comment_id: commentId,
      actor_id: userId,
      event_type: "status_change",
      from_value: comment.status,
      to_value: body.status,
    });
  }

  if (wantsReassign) {
    events.push({
      comment_id: commentId,
      actor_id: userId,
      event_type: "reassigned",
      from_value: comment.assignee_id ?? "unassigned",
      to_value: body.assignee_id ?? "unassigned",
    });
  }

  if (events.length > 0) {
    await db.insert(song_comment_events).values(events);
  }

  return c.json(updatedComment, 200);
});

songsRoutes.get("/:id/comments/:commentId/history", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const commentId = c.req.param("commentId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const comment = await db.query.song_comments.findFirst({
    where: (song_comments, { eq, and }) =>
      and(eq(song_comments.id, commentId), eq(song_comments.song_id, songId)),
  });

  if (!comment) {
    return c.json({ error: "Comment not found" }, 404);
  }

  const history = await db.query.song_comment_events.findMany({
    where: (song_comment_events, { eq }) =>
      eq(song_comment_events.comment_id, commentId),
    orderBy: (song_comment_events, { asc }) => asc(song_comment_events.created_at),
    with: {
      actor: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(history, 200);
});

songsRoutes.get("/:id/tasks", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tasks = await db.query.song_tasks.findMany({
    where: (song_tasks, { eq }) => eq(song_tasks.song_id, songId),
    orderBy: desc(song_tasks.created_at),
    with: {
      assignee: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(tasks, 200);
});

// Phase 2: POST /:id/tasks to create tasks; PUT /:id/tasks/:taskId to toggle is_done.

songsRoutes.get("/:id/notes", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const notes = await db.query.song_notes.findMany({
    where: (song_notes, { eq }) => eq(song_notes.song_id, songId),
    orderBy: desc(song_notes.created_at),
    with: {
      publisher: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(notes, 200);
});

songsRoutes.post("/:id/notes", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  if (!body.body) {
    return c.json({ error: "body is required" }, 400);
  }

  if (!NOTE_KINDS.includes(body.kind)) {
    return c.json({ error: "kind must be 'note' or 'lyrics'" }, 400);
  }

  const [note] = await db
    .insert(song_notes)
    .values({
      song_id: songId,
      title: body.title,
      body: body.body,
      kind: body.kind,
      published_by: userId,
      updated_by: userId,
    })
    .returning();

  return c.json(note, 201);
});

songsRoutes.put("/:id/notes/:noteId", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const noteId = c.req.param("noteId");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const note = await db.query.song_notes.findFirst({
    where: (song_notes, { eq, and }) =>
      and(eq(song_notes.id, noteId), eq(song_notes.song_id, songId)),
  });

  if (!note) {
    return c.json({ error: "Note not found" }, 404);
  }

  const [updatedNote] = await db
    .update(song_notes)
    .set({
      title: body.title ?? note.title,
      body: body.body ?? note.body,
      updated_by: userId,
      updated_at: new Date(),
    })
    .where(eq(song_notes.id, noteId))
    .returning();

  return c.json(updatedNote, 200);
});

songsRoutes.get("/:id/files", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const files = await db.query.song_files.findMany({
    where: (song_files, { eq }) => eq(song_files.song_id, songId),
    orderBy: desc(song_files.created_at),
    with: {
      uploader: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(files, 200);
});

songsRoutes.post("/:id/files", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!body.filename) {
    return c.json({ error: "filename is required" }, 400);
  }

  if (!FILE_CATEGORIES.includes(body.category)) {
    return c.json(
      { error: "category must be one of: " + FILE_CATEGORIES.join(", ") },
      400,
    );
  }

  // Same rule as audio and artwork: the download route signs this key, so it
  // has to be one this song's presign route issued. Legacy pasted URLs are
  // still read back on existing rows, but no new one may be created.
  if (body.file_url != null && !isKeyForSong(body.file_url, songId)) {
    return c.json({ error: "file_url must be a key uploaded for this song" }, 400);
  }

  const [file] = await db
    .insert(song_files)
    .values({
      song_id: songId,
      filename: body.filename,
      category: body.category,
      file_url: body.file_url || null,
      uploaded_by: userId,
    })
    .returning();

  return c.json(file, 201);
});

songsRoutes.delete("/:id/files/:fileId", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const fileId = c.req.param("fileId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const file = await db.query.song_files.findFirst({
    where: (song_files, { eq, and }) =>
      and(eq(song_files.id, fileId), eq(song_files.song_id, songId)),
  });

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  const isUploader = file.uploaded_by === userId;
  const isLeader = access.isLeader;

  if (!isUploader && !isLeader) {
    return c.json(
      { error: "Only the uploader or band leader can delete this file" },
      403,
    );
  }

  if (file.file_url && !isLegacyPastedUrl(file.file_url)) {
    try {
      await deleteObject(file.file_url);
    } catch {
      return c.json(
        { error: "Failed to delete the file from storage. Please try again." },
        502,
      );
    }
  }

  const [deletedFile] = await db
    .delete(song_files)
    .where(eq(song_files.id, fileId))
    .returning();

  return c.json(deletedFile, 200);
});

songsRoutes.post("/:id/presign-upload", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { target, filename, contentType, size, category } = body;

  if (!UPLOAD_TARGETS.includes(target)) {
    return c.json(
      { error: "target must be 'audio', 'stem', 'artwork', or 'file'" },
      400,
    );
  }

  if (typeof filename !== "string" || !filename) {
    return c.json({ error: "filename is required" }, 400);
  }

  if (typeof contentType !== "string" || !contentType) {
    return c.json({ error: "contentType is required" }, 400);
  }

  if (typeof size !== "number" || size <= 0) {
    return c.json({ error: "size is required" }, 400);
  }

  const isImageUpload =
    target === "artwork" ||
    (target === "file" && IMAGE_FILE_CATEGORIES.includes(category));

  let maxBytes: number;
  let extension: string;

  if (target === "audio" || target === "stem") {
    if (!ALLOWED_AUDIO_TYPES[contentType]) {
      return c.json({ error: "Only MP3 audio files are allowed" }, 400);
    }

    if (!filename.toLowerCase().endsWith(".mp3")) {
      return c.json({ error: "Only .mp3 files are allowed" }, 400);
    }

    maxBytes = MP3_MAX_BYTES;
    extension = ALLOWED_AUDIO_TYPES[contentType];
  } else if (isImageUpload) {
    if (!ALLOWED_IMAGE_TYPES[contentType]) {
      return c.json({ error: "Only JPG or PNG images are allowed" }, 400);
    }

    const lower = filename.toLowerCase();

    if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".png")) {
      return c.json(
        { error: "Only .jpg, .jpeg, or .png files are allowed" },
        400,
      );
    }

    maxBytes = IMAGE_MAX_BYTES;
    extension = ALLOWED_IMAGE_TYPES[contentType];
  } else {
    maxBytes = FILE_MAX_BYTES;
    extension = filename.includes(".") ? filename.split(".").pop()! : "bin";
  }

  if (size > maxBytes) {
    return c.json(
      { error: `File too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB` },
      400,
    );
  }

  const uuid = crypto.randomUUID();
  let key: string;

  if (target === "audio") {
    key = `songs/${songId}/audio/${uuid}.${extension}`;
  } else if (target === "stem") {
    // Same songs/<songId>/ prefix every other upload uses, so isKeyForSong()
    // covers stems without a line of new validation. Any future key path must
    // go through that check rather than alongside it.
    key = `songs/${songId}/stems/${uuid}.${extension}`;
  } else if (target === "artwork") {
    key = `songs/${songId}/artwork/${uuid}.${extension}`;
  } else {
    key = `songs/${songId}/files/${uuid}-${sanitizeFilename(filename)}`;
  }

  const uploadUrl = await getUploadUrl(key, contentType);

  return c.json({ uploadUrl, key }, 200);
});

/**
 * The version log. Everyone with access to the project sees the whole history,
 * including guests -- knowing what came before is most of what makes a take
 * worth recording.
 *
 * `is_current` is derived from the song's own pointer rather than stored, so
 * there is no second place that could disagree about which take is the song.
 */
songsRoutes.get("/:id/audio-versions", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const versions = await db.query.song_audio_versions.findMany({
    where: (versions, { eq }) => eq(versions.song_id, songId),
    orderBy: desc(song_audio_versions.created_at),
    with: {
      uploader: {
        columns: { id: true, username: true, image_url: true },
      },
    },
  });

  return c.json(
    versions.map((version) => ({
      ...version,
      is_current: version.r2_key === context.song.audio_url,
    })),
    200,
  );
});

/**
 * Upload a take. Deliberately open to anyone with project access, guests
 * included: a session musician who cannot hand in what they played is no use
 * to anybody. Adding a version never changes what the song currently plays.
 */
songsRoutes.post("/:id/audio-versions", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (typeof body.r2_key !== "string" || !isKeyForSong(body.r2_key, songId)) {
    return c.json({ error: "r2_key must be a key uploaded for this song" }, 400);
  }

  const label =
    typeof body.label === "string" && body.label.trim() !== ""
      ? body.label.trim().slice(0, 255)
      : null;

  if (!label) {
    return c.json({ error: "label is required" }, 400);
  }

  const [version] = await db
    .insert(song_audio_versions)
    .values({
      song_id: songId,
      r2_key: body.r2_key,
      label,
      note: typeof body.note === "string" ? body.note : null,
      uploaded_by: userId,
    })
    .returning();

  return c.json({ ...version, is_current: false }, 201);
});

/**
 * Make a version the song. Band leaders only -- this is the decision the
 * version log exists to separate from the act of contributing.
 *
 * Nothing is deleted: the take being replaced stays in the log, and promoting
 * it back is the same one-line move in the other direction.
 */
songsRoutes.put("/:id/audio-versions/:versionId/promote", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const versionId = c.req.param("versionId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!access.isLeader) {
    return c.json(
      { error: "Only band leaders can choose which version is the song" },
      403,
    );
  }

  const version = await db.query.song_audio_versions.findFirst({
    where: (versions, { eq, and }) =>
      and(eq(versions.id, versionId), eq(versions.song_id, songId)),
  });

  if (!version) {
    return c.json({ error: "Version not found" }, 404);
  }

  const [updatedSong] = await db
    .update(songs)
    .set({ audio_url: version.r2_key, updated_at: new Date() })
    .where(eq(songs.id, songId))
    .returning();

  return c.json({ song: updatedSong, promoted: version.id }, 200);
});

/**
 * Remove a take. The uploader can withdraw their own; a band leader can remove
 * any -- the same rule song_files already uses.
 *
 * The current version is refused outright. Deleting it would leave the song
 * pointing at an object that no longer exists, which plays as a broken player
 * with no explanation. Promote another version first; that is the same shape
 * as the guard stopping a band from losing its last leader.
 */
songsRoutes.delete("/:id/audio-versions/:versionId", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const versionId = c.req.param("versionId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const version = await db.query.song_audio_versions.findFirst({
    where: (versions, { eq, and }) =>
      and(eq(versions.id, versionId), eq(versions.song_id, songId)),
  });

  if (!version) {
    return c.json({ error: "Version not found" }, 404);
  }

  if (version.uploaded_by !== userId && !access.isLeader) {
    return c.json(
      { error: "Only the uploader or a band leader can remove this version" },
      403,
    );
  }

  if (version.r2_key === context.song.audio_url) {
    return c.json(
      {
        error:
          "This is the song's current audio. Promote another version before removing it.",
      },
      409,
    );
  }

  try {
    await deleteObject(version.r2_key);
  } catch {
    return c.json(
      { error: "Failed to delete the file from storage. Please try again." },
      502,
    );
  }

  const [deleted] = await db
    .delete(song_audio_versions)
    .where(eq(song_audio_versions.id, versionId))
    .returning();

  return c.json(deleted, 200);
});

/** A playable URL for one version, so takes can be compared against each other. */
songsRoutes.get("/:id/audio-versions/:versionId/url", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const versionId = c.req.param("versionId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const version = await db.query.song_audio_versions.findFirst({
    where: (versions, { eq, and }) =>
      and(eq(versions.id, versionId), eq(versions.song_id, songId)),
  });

  if (!version) {
    return c.json({ error: "Version not found" }, 404);
  }

  const url = await getDownloadUrl(version.r2_key, AUDIO_DOWNLOAD_TTL_SECONDS);

  return c.json({ url }, 200);
});

songsRoutes.get("/:id/audio-url", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!context.song.audio_url) {
    return c.json({ error: "No audio uploaded" }, 404);
  }

  const url = await getDownloadUrl(context.song.audio_url, AUDIO_DOWNLOAD_TTL_SECONDS);

  return c.json({ url }, 200);
});

songsRoutes.get("/:id/artwork-url", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!context.song.artwork_url) {
    return c.json({ error: "No artwork uploaded" }, 404);
  }

  const url = await getDownloadUrl(
    context.song.artwork_url,
    ARTWORK_DOWNLOAD_TTL_SECONDS,
  );

  return c.json({ url }, 200);
});

songsRoutes.get("/:id/files/:fileId/download-url", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const fileId = c.req.param("fileId");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const file = await db.query.song_files.findFirst({
    where: (song_files, { eq, and }) =>
      and(eq(song_files.id, fileId), eq(song_files.song_id, songId)),
  });

  if (!file || !file.file_url) {
    return c.json({ error: "File not found" }, 404);
  }

  if (isLegacyPastedUrl(file.file_url)) {
    return c.json({ url: file.file_url }, 200);
  }

  const url = await getDownloadUrl(file.file_url, FILE_DOWNLOAD_TTL_SECONDS);

  return c.json({ url }, 200);
});
