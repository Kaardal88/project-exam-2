import { Hono } from "hono";
import { and, eq, asc } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import { projects, songs, project_collaborators } from "@/server/db/schema";
import {
  getProjectAccess,
  getProjectCollaborators,
} from "@/server/projects/access";
import { getMembership } from "@/server/bands/membership";
import { ACCEPTED, PENDING } from "@/lib/inviteStatus";
import {
  isCollaboratorRole,
  collaboratorRoleValues,
} from "@/lib/collaboratorRoles";

type Variables = {
  userId: string;
};

export const projectsRoutes = new Hono<{ Variables: Variables }>();



projectsRoutes.get("/:id", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access) {
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
      role: access.role,
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

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!access.isLeader) {
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

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access) {
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

projectsRoutes.get("/:id/collaborators", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(await getProjectCollaborators(projectId), 200);
});

projectsRoutes.post("/:id/collaborators", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!access.isLeader) {
    return c.json({ error: "Only band leaders can invite collaborators" }, 403);
  }

  if (!isCollaboratorRole(body.role)) {
    return c.json(
      { error: `role must be one of: ${collaboratorRoleValues.join(", ")}` },
      400,
    );
  }

  // Someone already in the band reaches every project the band owns, so
  // inviting them as a guest would be a downgrade dressed as an invitation.
  const alreadyInBand = await getMembership(project.band_id, body.user_id);

  if (alreadyInBand) {
    return c.json({ error: "Already a member of this band" }, 409);
  }

  const existing = await db.query.project_collaborators.findFirst({
    where: and(
      eq(project_collaborators.project_id, projectId),
      eq(project_collaborators.user_id, body.user_id),
    ),
  });

  if (existing?.status === ACCEPTED) {
    return c.json({ error: "Already a collaborator on this project" }, 409);
  }

  if (existing?.status === PENDING) {
    return c.json({ error: "Already invited, waiting for an answer" }, 409);
  }

  // Same rule as band invitations: a declined row is kept so the leader can
  // see the answer, and re-inviting flips it back rather than inserting again.
  if (existing) {
    const [reinvited] = await db
      .update(project_collaborators)
      .set({
        role: body.role,
        status: PENDING,
        invited_by: userId,
        invited_at: new Date(),
      })
      .where(eq(project_collaborators.id, existing.id))
      .returning();

    return c.json(reinvited, 200);
  }

  const [invited] = await db
    .insert(project_collaborators)
    .values({
      project_id: projectId,
      user_id: body.user_id,
      role: body.role,
      status: PENDING,
      invited_by: userId,
      invited_at: new Date(),
    })
    .returning();

  return c.json(invited, 201);
});

projectsRoutes.delete("/:id/collaborators/:userId", requireAuth, async (c) => {
  const projectId = c.req.param("id");
  const userId = c.get("userId");
  const targetUserId = c.req.param("userId");

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const access = await getProjectAccess(project.id, project.band_id, userId);

  if (!access?.isLeader) {
    return c.json({ error: "Only band leaders can remove collaborators" }, 403);
  }

  // Revoking access does not touch what they contributed: their comments,
  // notes and files stay with the project, same as when a member deletes
  // their account.
  const [removed] = await db
    .delete(project_collaborators)
    .where(
      and(
        eq(project_collaborators.project_id, projectId),
        eq(project_collaborators.user_id, targetUserId),
      ),
    )
    .returning();

  if (!removed) {
    return c.json({ error: "Collaborator not found" }, 404);
  }

  return c.json({ success: true }, 200);
});
