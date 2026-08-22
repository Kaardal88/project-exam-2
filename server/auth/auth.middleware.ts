// server/auth/auth.middleware.ts
import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import { readSessionToken } from "./session";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export const requireAuth = createMiddleware(async (c, next) => {
  const token = readSessionToken(c);

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    c.set("userId", payload.userId);

    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Like requireAuth, but a missing or invalid token is not an error — it just
// leaves userId unset. For routes that serve both guests and members with
// different payloads (e.g. a band profile that's public unless you're a
// member).
export const optionalAuth = createMiddleware(async (c, next) => {
  const token = readSessionToken(c);

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      c.set("userId", payload.userId);
    } catch {
      // Invalid/expired token: treat as a guest rather than failing the request.
    }
  }

  await next();
});
