import { Hono } from "hono";
import { updateUser, deleteUser } from "@/server/users/users.service";
import { requireAuth } from "../auth/auth.middleware";
import { db } from "../db";
import { eq, inArray, asc } from "drizzle-orm";
import { band_members, band_events } from "@/server/db/schema";

type Variables = {
  userId: string;
};

export const usersRoutes = new Hono<{ Variables: Variables }>();

usersRoutes.get("/", requireAuth, async (c) => {
  const users = await db.query.users.findMany({
    columns: {
      id: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
    },
  });
  return c.json(users);
});

usersRoutes.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
    columns: {
      id: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
    },
  });
  const bandMembers = await db.query.band_members.findMany({
    where: (band_members, { eq }) => eq(band_members.user_id, id),
    columns: { band_id: true, role: true, joined_at: true },
    with: {
      band: {
        columns: {
          id: true,
          band_name: true,
          image_url: true,
        },
      },
    },
  });
  return c.json({ user, bandMembers });
});

usersRoutes.put("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");

  const { username, image_url, header_image_url } = await c.req.json();

  if (userId !== id) {
    return c.json({ error: "Users can only update their own account" }, 403);
  }

  const updatedUser = await updateUser(id, {
    username,
    image_url,
    header_image_url,
  });

  return c.json({ user: updatedUser });
});

usersRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.req.param("id");
  const loggedInUserId = c.get("userId");

  if (loggedInUserId !== userId) {
    return c.json({ error: "Users can only delete their own account" }, 403);
  }

  const deletedUser = await deleteUser(userId);

  return c.json(deletedUser);
});

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

export default usersRoutes;
