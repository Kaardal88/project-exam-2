import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import { projects, songs } from "@/server/db/schema";

type Variables = {
  userId: string;
};

export const projectsRoutes = new Hono<{ Variables: Variables }>();

async function getMembership(bandId: string, userId: string) {
  return db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });
}

projectsRoutes.get("/:id", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const membership = await getMembership(project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const projectSongs = await db.query.songs.findMany({
    where: (songs, { eq }) => eq(songs.project_id, projectId),
    orderBy: asc(songs.track_number),
  });

  // the page links back to the band profile, which is addressed by slug
  const band = await db.query.bands.findFirst({
    where: (bands, { eq }) => eq(bands.id, project.band_id),
    columns: { slug: true },
  });

  return c.json(
    {
      ...project,
      band_slug: band?.slug ?? null,
      songs: projectSongs,
      role: membership.role,
    },
    200,
  );
});

projectsRoutes.put("/:id", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const membership = await getMembership(project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can edit projects" }, 403);
  }

  const [updatedProject] = await db
    .update(projects)
    .set({
      title: body.title,
      description: body.description,
      cover_image_url: body.cover_image_url,
    })
    .where(eq(projects.id, projectId))
    .returning();

  return c.json(updatedProject, 200);
});

projectsRoutes.post("/:id/songs", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const membership = await getMembership(project.band_id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  const [song] = await db
    .insert(songs)
    .values({
      project_id: projectId,
      title: body.title,
      status: "wip",
      created_by: userId,
    })
    .returning();

  return c.json(song, 201);
});
