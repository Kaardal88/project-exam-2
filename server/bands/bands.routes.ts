import { Hono } from "hono";
import { and, eq, asc } from "drizzle-orm";
import { requireAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import { bands, band_members, band_events } from "@/server/db/schema";
import { updateBand } from "@/server/bands/bands.service";

type BandsVariables = {
  userId: string;
  slug: string | null;
  bandname: string | null;
  bio: string | null;
  image_url: string | null;
};

export const bandsRoutes = new Hono<{ Variables: BandsVariables }>();

bandsRoutes.get("/public", async (c) => {
  console.log("Fetching all bands");
  const allBands = await db.query.bands.findMany({
    columns: {
      id: true,
      band_name: true,
      bio: true,
      image_url: true,
    },
  });

  return c.json(allBands, 200);
});

bandsRoutes.get("/public/:id", async (c) => {
  const bandId = c.req.param("id");

  const band = await db.query.bands.findFirst({
    columns: {
      id: true,
      band_name: true,
      bio: true,
      image_url: true,
    },
    where: (bands, { eq }) => eq(bands.id, bandId),
  });

  if (!band) {
    return c.json({ error: "Band not found" }, 404);
  }

  return c.json(band, 200);
});

bandsRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const [band] = await db
    .insert(bands)
    .values({
      band_name: body.bandname,
      slug: body.bandname.toLowerCase().replace(/\s+/g, "-"),
      created_by: userId,
      bio: body.bio,
      image_url: body.image_url,
    })
    .returning();

  await db
    .insert(band_members)
    .values({
      band_id: band.id,
      user_id: userId,
      role: "band_leader",
    })
    .returning();

  return c.json(band, 201);
});

bandsRoutes.get("/:id", requireAuth, async (c) => {
  console.log("Fetching private band");
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const band = await db.query.bands.findFirst({
    where: (bands, { eq }) => eq(bands.id, bandId),
  });

  if (!band) {
    return c.json({ error: "Band not found" }, 404);
  }

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const members = await db.query.band_members.findMany({
    where: (band_members, { eq }) => eq(band_members.band_id, bandId),
    with: {
      user: true,
    },
  });

  return c.json({ band, role: membership?.role ?? null, members }, 200);
});

bandsRoutes.post("/:id/members", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can add members" }, 403);
  }

  const [newMember] = await db
    .insert(band_members)
    .values({
      band_id: bandId,
      user_id: body.user_id,
      role: "member",
    })
    .returning();

  return c.json(newMember, 201);
});

bandsRoutes.delete("/:id/members/:userId", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const memberId = c.req.param("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can remove members" }, 403);
  }

  const [deletedMember] = await db
    .delete(band_members)
    .where(
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, memberId)),
    )
    .returning();

  if (!deletedMember) {
    return c.json({ error: "Member not found" }, 404);
  }

  if (memberId === userId) {
    return c.json({ error: "Band leaders cannot remove themselves" }, 400);
  }

  return c.json(deletedMember, 200);
});

bandsRoutes.put("/:id", requireAuth, async (c) => {
  const bandId = c.req.param("id");

  const body = await c.req.json();

  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const updatedBand = await updateBand(bandId, {
    band_name: body.band_name,
    bio: body.bio,
    image_url: body.image_url,
  });

  if (!updatedBand) {
    return c.json({ error: "Band not found" }, 404);
  }

  return c.json({ band: updatedBand }, 200);
});

bandsRoutes.get("/:id/events", requireAuth, async (c) => {
  const bandId = c.req.param("id");

  const events = await db.query.band_events.findMany({
    where: (events, { eq }) => eq(events.band_id, bandId),
    orderBy: asc(band_events.start_date),
  });
  return c.json(events);
});

bandsRoutes.post("/:id/events", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const body = await c.req.json();

  const [createdEvent] = await db
    .insert(band_events)
    .values({
      band_id: bandId,
      user_id: userId,
      created_by: userId,
      title: body.title,
      description: body.description ?? null,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date ?? body.start_date),
    })
    .returning();

  return c.json(createdEvent, 201);
});
