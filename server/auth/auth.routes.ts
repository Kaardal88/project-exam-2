import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createToken } from "./jwt";
import { verifyPassword } from "./password";
import { loginSchema, registerSchema } from "./auth.schemas";
import { hashPassword } from "./password";
import { requireAuth } from "./auth.middleware";
import { setSessionCookies, clearSessionCookies } from "./session";
import { createUser } from "@/server/users/users.service";
import { ACCEPTED } from "@/lib/inviteStatus";

import { db } from "@/server/db";
import { users, band_members } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

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

  const newUser = await createUser({
    username: data.username,
    email: data.email,
    password_hash,
    tags: data.tags ?? [],
  });

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

  // The token goes into an httpOnly cookie and is never handed to the client.
  // The response body says only that it worked.
  setSessionCookies(c, token);

  return c.json({ success: true });
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
      handle: true,
      username: true,
      email: true,
      image_url: true,
      header_image_url: true,
      tags: true,
      country: true,
      // Your own flag, on your own record, so the nav knows whether to draw
      // the inbox link. A rendering hint only -- every feedback route checks
      // the database itself, so editing this in devtools reveals nothing.
      is_admin: true,
    },
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const bandMembers = await db.query.band_members.findMany({
    where: and(eq(band_members.user_id, userId), eq(band_members.status, ACCEPTED)),
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

  return c.json({ user, bandMembers }, 200);
});

// GET /auth/users/:userId used to live here: an unauthenticated copy of
// /users/:id that served any user's email to anyone who asked. Nothing in the
// app called it -- /users/:id, which requires auth, is what the profile page
// uses -- so it was reach for strangers and nothing else.

/**
 * POST, not GET, and not gated on requireAuth.
 *
 * A GET logout is something a prefetch, a link or an <img> on another site can
 * trigger, and SameSite=Lax deliberately still sends the cookie on top-level
 * GET navigations. Requiring auth would also mean an expired session could not
 * clear its own leftover cookies -- logging out has to work even when the
 * thing being logged out of is already gone.
 */
authRoutes.post("/logout", async (c) => {
  clearSessionCookies(c);

  return c.json({ message: "Logout successful" });
});
