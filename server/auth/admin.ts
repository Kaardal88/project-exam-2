import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

/**
 * Gates the feedback inbox on the single platform admin.
 *
 * Runs after requireAuth, and re-reads is_admin from the database on every
 * request rather than trusting anything carried in the token. A JWT here lasts
 * seven days, so a flag baked into one would outlive its own revocation --
 * revoking admin has to take effect on the next request, not next week.
 *
 * The cost is one indexed primary-key lookup, paid only on the handful of
 * routes that read feedback, never on the app's ordinary traffic.
 *
 * Admin means reading the feedback inbox and answering it. It is not a
 * superuser: it grants nothing over anyone's bands, projects or files. Testers
 * agreed to send feedback, not to be overseen.
 */
export const requireAdmin = createMiddleware(async (c, next) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { is_admin: true },
  });

  // 404, not 403. A signed-in tester poking at /api/feedback should find
  // nothing there, rather than confirmation that an inbox exists and they are
  // not welcome in it.
  if (!user?.is_admin) {
    return c.json({ error: "Not found" }, 404);
  }

  await next();
});
