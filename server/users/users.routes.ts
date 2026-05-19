import { Hono } from "hono";

import {
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
} from "@/server/users/users.service";
import { requireAuth } from "../auth/auth.middleware";

type Variables = {
  userId: number;
};

export const usersRoutes = new Hono<{ Variables: Variables }>();

usersRoutes.get("/", async (c) => {
  const users = await getUsers();
  return c.json(users);
});

usersRoutes.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = await getUserById(id);
  return c.json(user);
});

usersRoutes.put("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const { username, email, passwordHash } = await c.req.json();
  if (Number(c.get("userId")) !== Number(id)) {
    return c.json({ error: "Users can only update their own account" }, 403);
  }
  const updatedUser = await updateUser(id, username, email, passwordHash);
  return c.json(updatedUser);
});

usersRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = Number(c.req.param("id"));
  const loggedInUserId = Number(c.get("userId"));

  if (loggedInUserId !== userId) {
    return c.json({ error: "Users can only delete their own account" }, 403);
  }

  const deletedUser = await deleteUser(userId);

  return c.json(deletedUser);
});

export default usersRoutes;
