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
} from "@/server/db/schema";

const TICKET_STATUSES = ["open", "wip", "done"] as const;

type Variables = {
  userId: string;
};

export const songsRoutes = new Hono<{ Variables: Variables }>();

async function getMembership(bandId: string, userId: string) {
  return db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });
}

async function getSongContext(songId: string) {
  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.id, songId),
  });

  if (!song) return null;

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, song.project_id),
  });

  if (!project) return null;

  return { song, project };
}

songsRoutes.get("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [updatedSong] = await db
    .update(songs)
    .set({
      title: body.title,
      status: body.status,
      track_number: body.track_number,
      updated_at: new Date(),
    })
    .where(eq(songs.id, songId))
    .returning();

  return c.json(updatedSong, 200);
});

songsRoutes.delete("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const context = await getSongContext(songId);

  if (!context) {
    return c.json({ error: "Song not found" }, 404);
  }

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const comment = await db.query.song_comments.findFirst({
    where: (song_comments, { eq, and }) =>
      and(eq(song_comments.id, commentId), eq(song_comments.song_id, songId)),
  });

  if (!comment) {
    return c.json({ error: "Comment not found" }, 404);
  }

  const isLeader = membership.role === "band_leader";
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

  const membership = await getMembership(context.project.band_id, userId);

  if (!membership) {
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

// Phase 3: POST /:id/notes / PUT /:id/notes/:noteId for the rich-text editor.
