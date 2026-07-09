import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import { songs } from "@/server/db/schema";

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

songsRoutes.get("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");

  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.id, songId),
  });

  if (!song) {
    return c.json({ error: "Song not found" }, 404);
  }

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, song.project_id),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const membership = await getMembership(project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ ...song, project }, 200);
});

songsRoutes.put("/:id", requireAuth, async (c) => {
  const songId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.id, songId),
  });

  if (!song) {
    return c.json({ error: "Song not found" }, 404);
  }

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, song.project_id),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const membership = await getMembership(project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [updatedSong] = await db
    .update(songs)
    .set({
      title: body.title,
      status: body.status,
      track_number: body.track_number,
    })
    .where(eq(songs.id, songId))
    .returning();

  return c.json(updatedSong, 200);
});
