import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createToken } from "./jwt";
import { verifyPassword } from "./password";
import { loginSchema, registerSchema } from "./auth.schemas";
import { hashPassword } from "./password";
import { requireAuth } from "./auth.middleware";

import { db } from "@/server/db";
import { users, band_members } from "@/server/db/schema";
import { eq } from "drizzle-orm";

type AuthVariables = {
  userId: string;
};

// Precomputed bcrypt hash with no matching password. Used to keep the
// login timing the same whether or not the email exists, so response
// time can't be used to enumerate registered accounts.
const DUMMY_PASSWORD_HASH =
  "$2b$10$okj.e30iXuFPR6dmrySaOu.6DGDWHWMI3qKoL6/lE1/lcWyoC7j0q";

export const authRoutes = new Hono<{
  Variables: AuthVariables;
}>();

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
      tags: data.tags ?? [],
    })
    .returning();

  return c.json({
    message: "User registered",
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      tags: newUser.tags,
    },
  });
});

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json");

  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  const isPasswordValid = await verifyPassword(
    data.password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !isPasswordValid) {
    return c.json({ error: "Invalid email or password" }, 401);
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
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
      tags: true,
    },
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const bandMembers = await db.query.band_members.findMany({
    where: eq(band_members.user_id, userId),
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

  return c.json({ user, bandMembers }, 200);
});

authRoutes.get("/users/:userId", async (c) => {
  const { userId } = c.req.param();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
      tags: true,
    },
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const bandMembers = await db.query.band_members.findMany({
    where: eq(band_members.user_id, userId),
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

  return c.json({ user, bandMembers }, 200);
});

authRoutes.get("/logout", requireAuth, async (c) => {
  return c.json({ message: "Logout successful" });
});
