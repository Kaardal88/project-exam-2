import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { project_collaborators, projects } from "@/server/db/schema";
import { getMembership } from "@/server/bands/membership";
import { ACCEPTED } from "@/lib/inviteStatus";

/**
 * How someone got into a project.
 *
 * - "band"         they are a member of the band that owns it, so they reach
 *                  every project the band has
 * - "collaborator" they were invited to this project alone and can see nothing
 *                  else the band is doing
 */
export type ProjectAccess = {
  source: "band" | "collaborator";
  /** band_leader / member, or the collaborator role for a guest */
  role: string;
  /** true only for a band_leader, which is what every management route gates on */
  isLeader: boolean;
};

/**
 * The single place that answers "may this user work on this project, and as
 * what".
 *
 * Replaces the getMembership(project.band_id, userId) calls that projects and
 * songs used to make directly. Those asked whether the user was in the *band*,
 * which is the wrong question now that a guest can hold access to one project
 * without belonging to the band at all.
 *
 * A guest deliberately resolves to the same rights a member has: the only
 * distinction enforced today is band_leader vs everyone else, so a
 * collaborator lands in the same bucket as a member. Narrowing that later
 * means changing isLeader/role here, not revisiting every route.
 */
export async function getProjectAccess(
  projectId: string,
  bandId: string,
  userId: string,
): Promise<ProjectAccess | undefined> {
  const membership = await getMembership(bandId, userId);

  if (membership) {
    return {
      source: "band",
      role: membership.role,
      isLeader: membership.role === "band_leader",
    };
  }

  const collaboration = await db.query.project_collaborators.findFirst({
    where: and(
      eq(project_collaborators.project_id, projectId),
      eq(project_collaborators.user_id, userId),
      // a pending invitation is an offer, not access -- same rule as bands
      eq(project_collaborators.status, ACCEPTED),
    ),
  });

  if (!collaboration) return undefined;

  return {
    source: "collaborator",
    role: collaboration.role,
    // a guest is never a band leader, so every leader-gated route stays closed
    isLeader: false,
  };
}

/** Accepted collaborators on a project, for the project's people list. */
export async function getProjectCollaborators(projectId: string) {
  return db.query.project_collaborators.findMany({
    where: eq(project_collaborators.project_id, projectId),
    with: {
      user: {
        columns: { id: true, handle: true, username: true, image_url: true },
      },
    },
  });
}

/** Every project a user is a guest on, for the "Collab projects" section. */
export async function getCollabProjectsForUser(userId: string) {
  return db.query.project_collaborators.findMany({
    where: and(
      eq(project_collaborators.user_id, userId),
      eq(project_collaborators.status, ACCEPTED),
    ),
    with: {
      project: {
        with: {
          band: {
            columns: { id: true, slug: true, band_name: true, image_url: true },
          },
        },
      },
    },
  });
}

/**
 * Every collaborator across a band's projects, for the band-level overview.
 *
 * Guests are invited per project, but the band still wants one place that says
 * who is currently working with them -- otherwise a guest is invisible until
 * they happen to leave a comment.
 */
export async function getBandCollaborators(bandId: string) {
  const bandProjects = await db.query.projects.findMany({
    where: eq(projects.band_id, bandId),
    columns: { id: true },
  });

  const projectIds = bandProjects.map((project) => project.id);

  if (projectIds.length === 0) return [];

  return db.query.project_collaborators.findMany({
    where: and(
      inArray(project_collaborators.project_id, projectIds),
      eq(project_collaborators.status, ACCEPTED),
    ),
    with: {
      user: {
        columns: { id: true, handle: true, username: true, image_url: true },
      },
      project: { columns: { id: true, title: true, type: true } },
    },
  });
}
