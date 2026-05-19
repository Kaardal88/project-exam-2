import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createToken } from "./jwt";
import { verifyPassword } from "./password";
import { loginSchema, registerSchema } from "./auth.schemas";
import { hashPassword } from "./password";
import { requireAuth } from "./auth.middleware";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const authRoutes = new Hono();

authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const data = c.req.valid("json");

  const password_hash = await hashPassword(data.password);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existingUser) {
    return c.json({ error: "Email is already in use" }, 409);
  }

  const [newUser] = await db
    .insert(users)
    .values({
      username: data.username,
      email: data.email,
      password_hash,
    })
    .returning();

  return c.json({
    message: "User registered",
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    },
  });
});

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json");

  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const isPasswordValid = await verifyPassword(
    data.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    return c.json({ error: "Invalid password" }, 401);
  }

  const token = await createToken(user.id);

  if (!token) {
    return c.json({ error: "Failed to create token" }, 500);
  }

  return c.json({ token });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
    columns: { id: true, username: true, email: true },
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});
