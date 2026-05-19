// server/auth/auth.middleware.ts
import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, secret);

    c.set("userId", payload.userId);

    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
