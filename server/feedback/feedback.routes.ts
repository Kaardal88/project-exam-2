import { Hono } from "hono";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { requireAdmin } from "@/server/auth/admin";
import { db } from "@/server/db";
import { feedback, users } from "@/server/db/schema";
import {
  isFeedbackCategory,
  isFeedbackStatus,
  feedbackCategoryValues,
  feedbackStatuses,
} from "@/lib/feedbackCategories";

const BODY_MAX_LENGTH = 4000;
const REPLY_MAX_LENGTH = 4000;

type Variables = {
  userId: string;
};

export const feedbackRoutes = new Hono<{ Variables: Variables }>();

/**
 * Send feedback. Open to any signed-in account, which during the test round
 * means the five testers and nobody else, since registration is how you get in
 * at all.
 */
feedbackRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  if (!isFeedbackCategory(body.category)) {
    return c.json(
      { error: `category must be one of: ${feedbackCategoryValues.join(", ")}` },
      400,
    );
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (text === "") {
    return c.json({ error: "Tell me what happened" }, 400);
  }

  if (text.length > BODY_MAX_LENGTH) {
    return c.json(
      { error: `Keep it under ${BODY_MAX_LENGTH} characters` },
      400,
    );
  }

  const [created] = await db
    .insert(feedback)
    .values({
      author_id: userId,
      category: body.category,
      body: text,
      // Captured by the form rather than typed. "It crashed" and "it crashed
      // on /songs?songId=..." are different reports, and nobody remembers to
      // include the second one.
      page: typeof body.page === "string" ? body.page.slice(0, 255) : null,
    })
    .returning();

  return c.json(created, 201);
});

/**
 * Your own submissions, and the developer's answers to them.
 *
 * Scoped to author_id on the server. This is the whole reason a tester can be
 * given a receipt without being given the inbox -- filtering in the client
 * would mean shipping everyone's feedback to everyone's browser and hoping.
 */
feedbackRoutes.get("/mine", requireAuth, async (c) => {
  const userId = c.get("userId");

  const mine = await db.query.feedback.findMany({
    where: eq(feedback.author_id, userId),
    orderBy: desc(feedback.created_at),
  });

  return c.json(mine, 200);
});

/**
 * What is waiting for you, for the badges in the account menu.
 *
 * Returns both numbers from one request so the nav does not need to know
 * whether it is talking to an admin. A tester always gets inbox: 0 -- the
 * count is computed only when the flag is set, so the number never exists to
 * be leaked.
 */
feedbackRoutes.get("/unread", requireAuth, async (c) => {
  const userId = c.get("userId");

  const mine = await db.query.feedback.findMany({
    where: and(
      eq(feedback.author_id, userId),
      isNotNull(feedback.reply),
      isNull(feedback.reply_seen_at),
    ),
    columns: { id: true },
  });

  const viewer = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { is_admin: true },
  });

  const inbox = viewer?.is_admin
    ? await db.query.feedback.findMany({
        where: eq(feedback.status, "new"),
        columns: { id: true },
      })
    : [];

  return c.json({ replies: mine.length, inbox: inbox.length }, 200);
});

/**
 * Mark every answer you have been given as seen.
 *
 * A separate call rather than a side effect of reading /mine: a GET that
 * quietly changes state is the kind of thing a prefetch or a double render
 * fires by accident, and the badge would clear without anyone having looked.
 */
feedbackRoutes.put("/mine/seen", requireAuth, async (c) => {
  const userId = c.get("userId");

  await db
    .update(feedback)
    .set({ reply_seen_at: new Date() })
    .where(
      and(
        eq(feedback.author_id, userId),
        isNotNull(feedback.reply),
        isNull(feedback.reply_seen_at),
      ),
    );

  return c.json({ success: true }, 200);
});

/** The inbox. Admin only, and there is only ever one admin. */
feedbackRoutes.get("/", requireAuth, requireAdmin, async (c) => {
  const all = await db.query.feedback.findMany({
    orderBy: desc(feedback.created_at),
    with: {
      author: {
        columns: { id: true, handle: true, username: true, image_url: true },
      },
    },
  });

  return c.json(all, 200);
});

/** Triage and answer. Admin only. */
feedbackRoutes.put("/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.id, id),
  });

  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const wantsStatus = "status" in body;
  const wantsReply = "reply" in body;

  if (!wantsStatus && !wantsReply) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  if (wantsStatus && !isFeedbackStatus(body.status)) {
    return c.json(
      { error: `status must be one of: ${feedbackStatuses.join(", ")}` },
      400,
    );
  }

  const reply =
    typeof body.reply === "string" && body.reply.trim() !== ""
      ? body.reply.trim().slice(0, REPLY_MAX_LENGTH)
      : null;

  const updates: Partial<typeof feedback.$inferInsert> = {};

  if (wantsStatus) updates.status = body.status;

  if (wantsReply) {
    updates.reply = reply;
    // Cleared along with the reply, so a withdrawn answer does not leave a
    // timestamp claiming one was given.
    updates.replied_at = reply ? new Date() : null;
    // An edited answer is unread again. Otherwise a correction sent after the
    // tester had already looked would arrive with no indication at all.
    updates.reply_seen_at = null;
  }

  const [updated] = await db
    .update(feedback)
    .set(updates)
    .where(eq(feedback.id, id))
    .returning();

  return c.json(updated, 200);
});
