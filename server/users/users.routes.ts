import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  updateUser,
  deleteUser,
  getAccountDeletionPlan,
  getUserByIdOrHandle,
} from "@/server/users/users.service";
import {
  updateUserSchema,
  deleteAccountSchema,
  changePasswordSchema,
} from "@/server/users/users.schemas";
import { getDirectory } from "@/server/users/users.directory";
import { requireAuth } from "../auth/auth.middleware";
import { ACCEPTED, PENDING, DECLINED } from "@/lib/inviteStatus";
import { userTagValues } from "@/lib/userTags";
import {
  CONNECT_PAGE_SIZE,
  DEFAULT_CONNECT_SORT,
  connectSortValues,
  isConnectRole,
  isConnectSort,
} from "@/lib/connectFilters";
import { getCollabProjectsForUser } from "@/server/projects/access";
import { verifyPassword, hashPassword } from "../auth/password";
import { createToken } from "../auth/jwt";
import { clearSessionCookies, setSessionCookies } from "../auth/session";
import { db } from "../db";
import { and, eq, inArray, asc } from "drizzle-orm";
import {
  users,
  band_members,
  band_events,
  user_events,
  project_collaborators,
} from "@/server/db/schema";

type Variables = {
  userId: string;
};

/**
 * The most rows one directory request will ever return. The grid asks for
 * twelve; this is the ceiling on anyone asking for more by hand.
 */
const MAX_DIRECTORY_LIMIT = 48;

export const usersRoutes = new Hono<{ Variables: Variables }>();

/** `?tags=drummer,singer` -- one param, several values, no repeated keys. */
function csv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * The people directory behind Connect.
 *
 * Search, filtering, sorting and paging all happen in the query (see
 * users.directory.ts). This route used to return every row in the table and
 * let the browser filter them, which is why the old band invite modal could
 * only ever be a list of everyone.
 *
 * Unknown filter values are rejected rather than ignored: a chip the reader
 * believes is narrowing the list must never quietly do nothing.
 *
 * Email is deliberately absent, as it always was here. Nothing in the UI shows
 * anyone's address but your own -- which comes from /auth/me -- and listing it
 * would make one test account enough to harvest every tester's email.
 */
usersRoutes.get("/", requireAuth, async (c) => {
  const callerId = c.get("userId");
  const query = c.req.query();

  const tags = csv(query.tags);
  const roles = csv(query.roles);

  const unknownTag = tags.find((tag) => !userTagValues.includes(tag as never));

  if (unknownTag) {
    return c.json({ error: `Unknown tag: ${unknownTag}` }, 400);
  }

  const unknownRole = roles.find((role) => !isConnectRole(role));

  if (unknownRole) {
    return c.json({ error: `Unknown role: ${unknownRole}` }, 400);
  }

  if (query.sort && !isConnectSort(query.sort)) {
    return c.json(
      { error: `sort must be one of: ${connectSortValues.join(", ")}` },
      400,
    );
  }

  // Clamped rather than trusted. The page asks for CONNECT_PAGE_SIZE or the
  // preview row; a hand-written limit=100000 would turn a paged directory back
  // into the whole-table dump this route existed to stop being.
  const requestedLimit = Number(query.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_DIRECTORY_LIMIT)
    : CONNECT_PAGE_SIZE;

  const requestedOffset = Number(query.offset);
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(Math.trunc(requestedOffset), 0)
    : 0;

  const result = await getDirectory(
    {
      q: query.q,
      tags,
      roles,
      country: query.country?.trim() || undefined,
      sort: isConnectSort(query.sort) ? query.sort : DEFAULT_CONNECT_SORT,
      limit,
      offset,
      bandId: query.band_id?.trim() || undefined,
    },
    callerId,
  );

  return c.json(result);
});

usersRoutes.get("/:id", requireAuth, async (c) => {
  // accepts a handle or a UUID, so /user/adrian and older id-based links both
  // resolve; everything below works off the resolved user.id
  const resolved = await getUserByIdOrHandle(c.req.param("id"));

  if (!resolved) {
    return c.json({ error: "User not found" }, 404);
  }

  const id = resolved.id;

  // No email here either -- a public profile page is not the place for it.
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
    columns: {
      id: true,
      handle: true,
      username: true,
      image_url: true,
      header_image_url: true,
      tags: true,
      country: true,
      created_at: true,
    },
  });
  const bandMembers = await db.query.band_members.findMany({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.user_id, id), eq(band_members.status, ACCEPTED)),
    columns: { band_id: true, role: true, joined_at: true },
    with: {
      band: {
        columns: {
          id: true,
          slug: true,
          band_name: true,
          image_url: true,
        },
      },
    },
  });
  return c.json({ user, bandMembers });
});

usersRoutes.put(
  "/:id",
  requireAuth,
  zValidator("json", updateUserSchema),
  async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");

    const { username, image_url, header_image_url, tags, country } =
      c.req.valid("json");

    if (userId !== id) {
      return c.json({ error: "Users can only update their own account" }, 403);
    }

    const updatedUser = await updateUser(id, {
      username,
      image_url,
      header_image_url,
      tags,
      country,
    });

    return c.json({ user: updatedUser });
  },
);

/**
 * Change your own password.
 *
 * Scoped to /me rather than /:id: there is no case for one account setting
 * another's password, so the route does not offer the shape.
 *
 * Known limitation, stated here rather than discovered later: this does not
 * end sessions on other devices. The JWT is stateless, so the only ways to
 * invalidate an issued one are to keep a token version in the database and
 * read it on every authenticated request, or to shorten the expiry. The first
 * costs a round trip per request on a serverless database, which is real
 * latency on a page that already makes six parallel calls. So a changed
 * password stops future logins with the old one, and any session already open
 * elsewhere lasts until it expires. Worth revisiting if this ever holds
 * anything worth stealing.
 */
usersRoutes.put(
  "/me/password",
  requireAuth,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const userId = c.get("userId");
    const { currentPassword, newPassword } = c.req.valid("json");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, password_hash: true },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }

    if (currentPassword === newPassword) {
      return c.json({ error: "That is already your password" }, 400);
    }

    await db
      .update(users)
      .set({ password_hash: await hashPassword(newPassword) })
      .where(eq(users.id, userId));

    // A fresh cookie so the browser doing the changing stays signed in on a
    // token minted after the change, rather than carrying on with the one it
    // had before.
    const token = await createToken(userId);

    if (token) setSessionCookies(c, token);

    return c.json({ success: true });
  },
);

usersRoutes.get("/me/deletion-preview", requireAuth, async (c) => {
  const userId = c.get("userId");

  return c.json({ bands: await getAccountDeletionPlan(userId) });
});

usersRoutes.delete(
  "/:id",
  requireAuth,
  zValidator("json", deleteAccountSchema),
  async (c) => {
    const userId = c.req.param("id");
    const loggedInUserId = c.get("userId");
    const { username, password } = c.req.valid("json");

    if (loggedInUserId !== userId) {
      return c.json({ error: "Users can only delete their own account" }, 403);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Typing the username is UI friction; the password is the actual check.
    if (username !== user.username) {
      return c.json({ error: "Username does not match" }, 400);
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      return c.json({ error: "Incorrect password" }, 401);
    }

    const bands = await deleteUser(userId);

    // The account this session pointed at no longer exists, so the cookie must
    // go with it -- the client cannot clear an httpOnly cookie itself.
    clearSessionCookies(c);

    return c.json({ success: true, bands });
  },
);

usersRoutes.get("/me/events", requireAuth, async (c) => {
  const userId = c.get("userId");

  const memberships = await db.query.band_members.findMany({
    where: and(eq(band_members.user_id, userId), eq(band_members.status, ACCEPTED)),
  });

  const bandIds = memberships.map((member) => member.band_id);

  if (bandIds.length === 0) {
    return c.json([], 200);
  }

  const events = await db.query.band_events.findMany({
    where: inArray(band_events.band_id, bandIds),
    orderBy: asc(band_events.start_date),
  });

  return c.json(events, 200);
});

usersRoutes.get("/me/private-events", requireAuth, async (c) => {
  const userId = c.get("userId");

  const events = await db.query.user_events.findMany({
    where: eq(user_events.user_id, userId),
    orderBy: asc(user_events.start_date),
  });

  return c.json(events, 200);
});

usersRoutes.post("/me/private-events", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  if (!body.title || !body.start_date) {
    return c.json({ error: "title and start_date are required" }, 400);
  }

  const [createdEvent] = await db
    .insert(user_events)
    .values({
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date ?? body.start_date),
    })
    .returning();

  return c.json(createdEvent, 201);
});

usersRoutes.put("/me/private-events/:eventId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const eventId = c.req.param("eventId");
  const body = await c.req.json();

  if (!body.title || !body.start_date) {
    return c.json({ error: "title and start_date are required" }, 400);
  }

  const [updatedEvent] = await db
    .update(user_events)
    .set({
      title: body.title,
      description: body.description ?? null,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date ?? body.start_date),
    })
    .where(and(eq(user_events.id, eventId), eq(user_events.user_id, userId)))
    .returning();

  if (!updatedEvent) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json(updatedEvent, 200);
});

usersRoutes.delete("/me/private-events/:eventId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const eventId = c.req.param("eventId");

  const [deletedEvent] = await db
    .delete(user_events)
    .where(and(eq(user_events.id, eventId), eq(user_events.user_id, userId)))
    .returning();

  if (!deletedEvent) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json({ success: true }, 200);
});

export default usersRoutes;

/**
 * Invitations waiting for an answer.
 *
 * Kept on the user rather than the band: this is the reader's inbox, and it
 * spans every band that has asked for them.
 */
usersRoutes.get("/me/invitations", requireAuth, async (c) => {
  const userId = c.get("userId");

  const [bandInvites, projectInvites] = await Promise.all([
    db.query.band_members.findMany({
      where: and(
        eq(band_members.user_id, userId),
        eq(band_members.status, PENDING),
      ),
      columns: { id: true, band_id: true, role: true, invited_at: true },
      with: {
        band: {
          // visibility so the page knows whether previewing the band before
          // accepting will actually work: a private band 404s to a non-member
          columns: {
            id: true,
            slug: true,
            band_name: true,
            image_url: true,
            visibility: true,
          },
        },
      },
    }),
    db.query.project_collaborators.findMany({
      where: and(
        eq(project_collaborators.user_id, userId),
        eq(project_collaborators.status, PENDING),
      ),
      columns: { id: true, project_id: true, role: true, invited_at: true },
      with: {
        project: {
          columns: { id: true, title: true, type: true, cover_image_url: true },
          with: {
            band: {
              columns: {
                id: true,
                slug: true,
                band_name: true,
                image_url: true,
                visibility: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // One inbox for both. A reader does not care which table an invitation came
  // out of, so the kind is a field rather than a second list.
  const invitations = [
    ...bandInvites.map((invite) => ({ kind: "band" as const, ...invite })),
    ...projectInvites.map((invite) => ({
      kind: "project" as const,
      ...invite,
    })),
  ].sort((a, b) => {
    const left = a.invited_at ? new Date(a.invited_at).getTime() : 0;
    const right = b.invited_at ? new Date(b.invited_at).getTime() : 0;
    return right - left;
  });

  return c.json({ invitations }, 200);
});

usersRoutes.post("/me/invitations/:id/respond", requireAuth, async (c) => {
  const userId = c.get("userId");
  const inviteId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  if (body.answer !== "accept" && body.answer !== "decline") {
    return c.json({ error: "answer must be 'accept' or 'decline'" }, 400);
  }

  if (body.kind !== "band" && body.kind !== "project") {
    return c.json({ error: "kind must be 'band' or 'project'" }, 400);
  }

  const accepted = body.answer === "accept";

  // joined_at is what "longest-serving member" sorts on when leadership is
  // handed over, so it has to mean the moment they actually joined, not the
  // moment they were asked.
  const answer = {
    status: accepted ? ACCEPTED : DECLINED,
    ...(accepted ? { joined_at: new Date() } : {}),
  };

  // Both lookups are scoped to the signed-in user, so nobody can answer
  // someone else's invitation by guessing its id.
  if (body.kind === "band") {
    const invitation = await db.query.band_members.findFirst({
      where: and(
        eq(band_members.id, inviteId),
        eq(band_members.user_id, userId),
        eq(band_members.status, PENDING),
      ),
    });

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    const [updated] = await db
      .update(band_members)
      .set(answer)
      .where(eq(band_members.id, inviteId))
      .returning();

    return c.json(updated, 200);
  }

  const invitation = await db.query.project_collaborators.findFirst({
    where: and(
      eq(project_collaborators.id, inviteId),
      eq(project_collaborators.user_id, userId),
      eq(project_collaborators.status, PENDING),
    ),
  });

  if (!invitation) {
    return c.json({ error: "Invitation not found" }, 404);
  }

  const [updated] = await db
    .update(project_collaborators)
    .set(answer)
    .where(eq(project_collaborators.id, inviteId))
    .returning();

  return c.json(updated, 200);
});

/** Projects this user is a guest on, for the "Collab projects" section. */
usersRoutes.get("/me/collab-projects", requireAuth, async (c) => {
  const userId = c.get("userId");

  return c.json({ projects: await getCollabProjectsForUser(userId) }, 200);
});
