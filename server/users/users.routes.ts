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
} from "@/server/users/users.schemas";
import { requireAuth } from "../auth/auth.middleware";
import { verifyPassword } from "../auth/password";
import { db } from "../db";
import { and, eq, inArray, asc } from "drizzle-orm";
import {
  users,
  band_members,
  band_events,
  user_events,
} from "@/server/db/schema";

type Variables = {
  userId: string;
};

export const usersRoutes = new Hono<{ Variables: Variables }>();

usersRoutes.get("/", requireAuth, async (c) => {
  const users = await db.query.users.findMany({
    columns: {
      id: true,
      handle: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
      tags: true,
    },
  });
  return c.json(users);
});

usersRoutes.get("/:id", requireAuth, async (c) => {
  // accepts a handle or a UUID, so /user/adrian and older id-based links both
  // resolve; everything below works off the resolved user.id
  const resolved = await getUserByIdOrHandle(c.req.param("id"));

  if (!resolved) {
    return c.json({ error: "User not found" }, 404);
  }

  const id = resolved.id;

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
    columns: {
      id: true,
      handle: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
      tags: true,
    },
  });
  const bandMembers = await db.query.band_members.findMany({
    where: (band_members, { eq }) => eq(band_members.user_id, id),
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

    const { username, image_url, header_image_url, tags } = c.req.valid("json");

    if (userId !== id) {
      return c.json({ error: "Users can only update their own account" }, 403);
    }

    const updatedUser = await updateUser(id, {
      username,
      image_url,
      header_image_url,
      tags,
    });

    return c.json({ user: updatedUser });
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

    return c.json({ success: true, bands });
  },
);

usersRoutes.get("/me/events", requireAuth, async (c) => {
  const userId = c.get("userId");

  const memberships = await db.query.band_members.findMany({
    where: eq(band_members.user_id, userId),
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
