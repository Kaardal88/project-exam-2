import { Hono } from "hono";
import { and, eq, asc } from "drizzle-orm";
import { requireAuth, optionalAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import { band_members, band_events, projects, songs } from "@/server/db/schema";
import {
  updateBand,
  createBand,
  getBandByIdOrSlug,
} from "@/server/bands/bands.service";
import { isBandVisibility, bandVisibilityValues } from "@/lib/bandVisibility";

type BandsVariables = {
  userId: string;
  slug: string | null;
  bandname: string | null;
  bio: string | null;
  image_url: string | null;
  header_image_url: string | null;
  country: string | null;
  spotify_url: string | null;
  bandcamp_url: string | null;
  youtube_url: string | null;
  tidal_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
};

export const bandsRoutes = new Hono<{ Variables: BandsVariables }>();

bandsRoutes.get("/public", async (c) => {
  const allBands = await db.query.bands.findMany({
    // unlisted and private bands are reachable by link / membership, but must
    // never appear in the public directory
    where: (bands, { eq }) => eq(bands.visibility, "public"),
    columns: {
      id: true,
      slug: true,
      band_name: true,
      bio: true,
      image_url: true,
      country: true,
      genre: true,
      spotify_url: true,
      bandcamp_url: true,
      youtube_url: true,
      tidal_url: true,
      instagram_url: true,
      facebook_url: true,
      tiktok_url: true,
      website_url: true,
    },
  });

  return c.json(allBands, 200);
});

bandsRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  if (typeof body.bandname !== "string" || body.bandname.trim() === "") {
    return c.json({ error: "bandname is required" }, 400);
  }

  const band = await createBand({
    band_name: body.bandname,
    created_by: userId,
    bio: body.bio,
    image_url: body.image_url,
    header_image_url: body.header_image_url,
    country: body.country,
    genre: body.genre,
    spotify_url: body.spotify_url,
    bandcamp_url: body.bandcamp_url,
    youtube_url: body.youtube_url,
    tidal_url: body.tidal_url,
    instagram_url: body.instagram_url,
    facebook_url: body.facebook_url,
    tiktok_url: body.tiktok_url,
    website_url: body.website_url,
  });

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

bandsRoutes.get("/:id", optionalAuth, async (c) => {
  const userId = c.get("userId") as string | undefined;

  // accepts a slug or a UUID; everything below this point works off band.id so
  // membership, events and projects are unaffected by how the band was found
  const band = await getBandByIdOrSlug(c.req.param("id"));

  if (!band) {
    return c.json({ error: "Band not found" }, 404);
  }

  const bandId = band.id;

  const membership = userId
    ? await db.query.band_members.findFirst({
        where: (band_members, { eq, and }) =>
          and(
            eq(band_members.band_id, bandId),
            eq(band_members.user_id, userId),
          ),
      })
    : null;

  // A private band must be indistinguishable from one that does not exist.
  // Returning 403 here would confirm the band is real, which is exactly the
  // fact a private band is trying to withhold -- and slugs make band URLs
  // guessable, so that confirmation is cheap to farm.
  if (!membership && band.visibility === "private") {
    return c.json({ error: "Band not found" }, 404);
  }

  // Guest, or a logged-in user who isn't a member of this specific band:
  // public-safe fields only, no error.
  if (!membership) {
    const members = await db.query.band_members.findMany({
      where: (band_members, { eq }) => eq(band_members.band_id, bandId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            image_url: true,
          },
        },
      },
    });

    return c.json(
      {
        authenticated: false,
        band: {
          id: band.id,
          band_name: band.band_name,
          bio: band.bio,
          image_url: band.image_url,
          header_image_url: band.header_image_url,
          country: band.country,
          spotify_url: band.spotify_url,
          bandcamp_url: band.bandcamp_url,
          youtube_url: band.youtube_url,
          tidal_url: band.tidal_url,
          instagram_url: band.instagram_url,
          facebook_url: band.facebook_url,
          tiktok_url: band.tiktok_url,
          website_url: band.website_url,
        },
        members,
      },
      200,
    );
  }

  const members = await db.query.band_members.findMany({
    where: (band_members, { eq }) => eq(band_members.band_id, bandId),
    with: {
      user: true,
    },
  });

  return c.json(
    { authenticated: true, band, role: membership.role, members },
    200,
  );
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

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can edit the band profile" }, 403);
  }

  if (body.visibility !== undefined && !isBandVisibility(body.visibility)) {
    return c.json(
      { error: `visibility must be one of: ${bandVisibilityValues.join(", ")}` },
      400,
    );
  }

  const updatedBand = await updateBand(bandId, {
    band_name: body.band_name,
    visibility: body.visibility,
    bio: body.bio,
    image_url: body.image_url,
    header_image_url: body.header_image_url,
    country: body.country,
    spotify_url: body.spotify_url,
    bandcamp_url: body.bandcamp_url,
    youtube_url: body.youtube_url,
    tidal_url: body.tidal_url,
    instagram_url: body.instagram_url,
    facebook_url: body.facebook_url,
    tiktok_url: body.tiktok_url,
    website_url: body.website_url,
  });

  if (!updatedBand) {
    return c.json({ error: "Band not found" }, 404);
  }

  return c.json({ band: updatedBand }, 200);
});

bandsRoutes.get("/:id/events", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const events = await db.query.band_events.findMany({
    where: (events, { eq }) => eq(events.band_id, bandId),
    orderBy: asc(band_events.start_date),
  });
  return c.json(events);
});

bandsRoutes.post("/:id/events", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can create events" }, 403);
  }

  const body = await c.req.json();

  if (!body.title || !body.start_date) {
    return c.json({ error: "title and start_date are required" }, 400);
  }

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

bandsRoutes.put("/:id/events/:eventId", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const eventId = c.req.param("eventId");
  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can edit events" }, 403);
  }

  const body = await c.req.json();

  if (!body.title || !body.start_date) {
    return c.json({ error: "title and start_date are required" }, 400);
  }

  const [updatedEvent] = await db
    .update(band_events)
    .set({
      title: body.title,
      description: body.description ?? null,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date ?? body.start_date),
    })
    .where(and(eq(band_events.id, eventId), eq(band_events.band_id, bandId)))
    .returning();

  if (!updatedEvent) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json(updatedEvent, 200);
});

bandsRoutes.delete("/:id/events/:eventId", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const eventId = c.req.param("eventId");
  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can delete events" }, 403);
  }

  const [deletedEvent] = await db
    .delete(band_events)
    .where(and(eq(band_events.id, eventId), eq(band_events.band_id, bandId)))
    .returning();

  if (!deletedEvent) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json({ success: true }, 200);
});

bandsRoutes.get("/:id/projects", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const membership = await db.query.band_members.findFirst({
    where: (band_members, { eq, and }) =>
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, userId)),
  });

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const bandProjects = await db.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.band_id, bandId),
    orderBy: asc(projects.created_at),
  });

  return c.json(bandProjects, 200);
});

bandsRoutes.post("/:id/projects", requireAuth, async (c) => {
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
    return c.json({ error: "Only band leaders can create projects" }, 403);
  }

  if (body.type !== "album" && body.type !== "single") {
    return c.json({ error: "type must be 'album' or 'single'" }, 400);
  }

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  const [project] = await db
    .insert(projects)
    .values({
      band_id: bandId,
      type: body.type,
      title: body.title,
      description: body.description ?? null,
      cover_image_url: body.cover_image_url ?? null,
      created_by: userId,
    })
    .returning();

  if (body.type === "single") {
    await db.insert(songs).values({
      project_id: project.id,
      title: body.title,
      status: "wip",
      created_by: userId,
    });
  }

  return c.json(project, 201);
});
