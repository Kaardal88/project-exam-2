import { Hono } from "hono";
import { and, eq, asc, ne, count, inArray } from "drizzle-orm";
import { requireAuth, optionalAuth } from "@/server/auth/auth.middleware";
import { db } from "@/server/db";
import {
  band_members,
  band_events,
  projects,
  songs,
  song_comments,
  song_tasks,
} from "@/server/db/schema";
import {
  updateBand,
  createBand,
  getBandByIdOrSlug,
  renameBandSlug,
  deleteBand,
} from "@/server/bands/bands.service";
import { isBandVisibility, bandVisibilityValues } from "@/lib/bandVisibility";
import { getMembership, getMembershipRow, isLastLeader } from "@/server/bands/membership";
import { ACCEPTED, PENDING } from "@/lib/inviteStatus";
import { getBandCollaborators } from "@/server/projects/access";
import { isBandRole, bandRoleValues } from "@/lib/bandRoles";
import { verifyPassword } from "@/server/auth/password";

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
    ? await getMembership(bandId, userId)
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
      // guests see the line-up, not who has been asked to join
      where: (band_members, { eq, and }) =>
        and(
          eq(band_members.band_id, bandId),
          eq(band_members.status, ACCEPTED),
        ),
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
          // needed so the page can canonicalise the URL when a guest arrives
          // via a retired slug or a UUID
          slug: band.slug,
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

  // Guests belong to a project, not the band, so they are not in `members`.
  // The band still needs one place that says who is working with them --
  // otherwise a collaborator is invisible until they leave a comment.
  const collaborators = await getBandCollaborators(bandId);

  return c.json(
    {
      authenticated: true,
      band,
      role: membership.role,
      members,
      collaborators,
    },
    200,
  );
});

bandsRoutes.post("/:id/members", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const membership = await getMembership(bandId, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can add members" }, 403);
  }

  const existing = await getMembershipRow(bandId, body.user_id);

  if (existing?.status === ACCEPTED) {
    return c.json({ error: "Already a member of this band" }, 409);
  }

  if (existing?.status === PENDING) {
    return c.json({ error: "Already invited, waiting for an answer" }, 409);
  }

  // A declined row is kept so the leader can see the answer, so re-inviting
  // flips it back to pending rather than inserting a second row -- which the
  // (band_id, user_id) unique constraint would reject anyway.
  if (existing) {
    const [reinvited] = await db
      .update(band_members)
      .set({ status: PENDING, invited_by: userId, invited_at: new Date() })
      .where(eq(band_members.id, existing.id))
      .returning();

    return c.json(reinvited, 200);
  }

  const [invited] = await db
    .insert(band_members)
    .values({
      band_id: bandId,
      user_id: body.user_id,
      role: "member",
      status: PENDING,
      invited_by: userId,
      invited_at: new Date(),
    })
    .returning();

  return c.json(invited, 201);
});

bandsRoutes.put("/:id/members/:userId/role", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const targetUserId = c.req.param("userId");
  const body = await c.req.json();

  const membership = await getMembership(bandId, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can change roles" }, 403);
  }

  if (!isBandRole(body.role)) {
    return c.json(
      { error: `role must be one of: ${bandRoleValues.join(", ")}` },
      400,
    );
  }

  const target = await getMembership(bandId, targetUserId);

  if (!target) {
    return c.json({ error: "Member not found" }, 404);
  }

  if (target.role === body.role) {
    return c.json(target, 200);
  }

  // Demoting the only leader would leave the band with nobody who can appoint
  // one, since every management route is gated on band_leader. Promote someone
  // else first. This applies to a leader demoting themselves too, which is the
  // likely way to hit it.
  if (
    body.role !== "band_leader" &&
    (await isLastLeader(bandId, targetUserId))
  ) {
    return c.json(
      {
        error:
          "This is the band's only leader. Promote another member before changing this role.",
      },
      409,
    );
  }

  const [updated] = await db
    .update(band_members)
    .set({ role: body.role })
    .where(
      and(
        eq(band_members.band_id, bandId),
        eq(band_members.user_id, targetUserId),
      ),
    )
    .returning();

  return c.json(updated, 200);
});

bandsRoutes.delete("/:id/members/:userId", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const memberId = c.req.param("userId");

  const membership = await getMembership(bandId, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can remove members" }, 403);
  }

  const target = await getMembership(bandId, memberId);

  if (!target) {
    return c.json({ error: "Member not found" }, 404);
  }

  // These two checks used to run *after* the delete, so the row was already
  // gone by the time the error came back -- a leader removing themselves got
  // a 400 and lost their membership anyway.
  if (memberId === userId) {
    return c.json({ error: "Band leaders cannot remove themselves" }, 400);
  }

  if (await isLastLeader(bandId, memberId)) {
    return c.json(
      {
        error:
          "This is the band's only leader. Promote another member before removing them.",
      },
      409,
    );
  }

  const [deletedMember] = await db
    .delete(band_members)
    .where(
      and(eq(band_members.band_id, bandId), eq(band_members.user_id, memberId)),
    )
    .returning();

  return c.json(deletedMember, 200);
});

bandsRoutes.put("/:id", requireAuth, async (c) => {
  const bandId = c.req.param("id");

  const body = await c.req.json();

  const userId = c.get("userId");

  const membership = await getMembership(bandId, userId);

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

  // Slug is edited on its own, never derived from the band name on rename: a
  // typo fix in the name should not silently retire a shared URL.
  if (typeof body.slug === "string" && body.slug.trim() !== "") {
    const renamed = await renameBandSlug(bandId, body.slug);

    if (!renamed) {
      return c.json({ error: "Band not found" }, 404);
    }
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

bandsRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId");

  const band = await getBandByIdOrSlug(c.req.param("id"));

  if (!band) {
    return c.json({ error: "Band not found" }, 404);
  }

  const membership = await getMembership(band.id, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (membership.role !== "band_leader") {
    return c.json({ error: "Only band leaders can delete a band" }, 403);
  }

  const body = await c.req.json().catch(() => ({}));

  // Same confirmation strength as account deletion: typing the name proves
  // intent, but the password is the real check, because a session cookie rides
  // along with every request from that browser and UI friction alone protects
  // nothing on an unlocked laptop.
  if (body.band_name !== band.band_name) {
    return c.json({ error: "Band name does not match" }, 400);
  }

  if (typeof body.password !== "string" || body.password === "") {
    return c.json({ error: "Password is required" }, 400);
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
    columns: { password_hash: true },
  });

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Incorrect password" }, 401);
  }

  // Everything below the band cascades: band_members, band_events, projects and
  // band_slug_history go with it, projects take their songs, and songs already
  // took their comments, tasks, notes and files. One delete tears down the tree.
  await deleteBand(band.id);

  return c.json({ success: true, band_name: band.band_name }, 200);
});

bandsRoutes.get("/:id/events", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const membership = await getMembership(bandId, userId);

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

  const membership = await getMembership(bandId, userId);

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

  const membership = await getMembership(bandId, userId);

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

  const membership = await getMembership(bandId, userId);

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

  const membership = await getMembership(bandId, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const bandProjects = await db.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.band_id, bandId),
    orderBy: asc(projects.created_at),
  });

  return c.json(bandProjects, 200);
});

/**
 * Every song the band has, across every album and single, for the board.
 *
 * A band works on an album and two singles at the same time, and "what are we
 * working on" is one question -- so this crosses projects rather than making
 * the reader open three boards and hold the answer in their head.
 *
 * Band members only, the same rule as /:id/projects. A project collaborator is
 * a guest on one project and has no business reading the band's whole slate.
 */
bandsRoutes.get("/:id/songs", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");

  const membership = await getMembership(bandId, userId);

  if (!membership) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const bandProjects = await db.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.band_id, bandId),
    columns: { id: true, title: true, type: true },
  });

  if (bandProjects.length === 0) return c.json([], 200);

  const projectIds = bandProjects.map((project) => project.id);

  const bandSongs = await db.query.songs.findMany({
    where: (songs, { inArray }) => inArray(songs.project_id, projectIds),
    columns: {
      id: true,
      title: true,
      status: true,
      project_id: true,
      track_number: true,
      updated_at: true,
    },
    orderBy: asc(songs.created_at),
  });

  if (bandSongs.length === 0) return c.json([], 200);

  // What is still waiting on somebody. Counted here rather than on the client
  // because the board would otherwise fetch comments per song, and a band with
  // an album's worth of songs would open it with a dozen requests in flight.
  const openCounts = await db
    .select({
      song_id: song_comments.song_id,
      open: count(),
    })
    .from(song_comments)
    .where(
      and(
        inArray(
          song_comments.song_id,
          bandSongs.map((song) => song.id),
        ),
        ne(song_comments.status, "done"),
      ),
    )
    .groupBy(song_comments.song_id);

  // Ticked-off subtasks, counted the same way and for the same reason. Two
  // numbers rather than a ratio, because "0/6" and "0 %" read very differently
  // on a card: the first says six things are waiting, the second says nothing.
  const taskRows = await db
    .select({
      song_id: song_tasks.song_id,
      is_done: song_tasks.is_done,
    })
    .from(song_tasks)
    .where(
      inArray(
        song_tasks.song_id,
        bandSongs.map((song) => song.id),
      ),
    );

  const tasksBySong = new Map<string, { total: number; done: number }>();

  taskRows.forEach((row) => {
    const tally = tasksBySong.get(row.song_id) ?? { total: 0, done: 0 };

    tally.total++;
    if (row.is_done) tally.done++;

    tasksBySong.set(row.song_id, tally);
  });

  const openBySong = new Map(openCounts.map((row) => [row.song_id, row.open]));
  const projectsById = new Map(
    bandProjects.map((project) => [project.id, project]),
  );

  return c.json(
    bandSongs.map((song) => ({
      ...song,
      open_comments: openBySong.get(song.id) ?? 0,
      tasks: tasksBySong.get(song.id) ?? { total: 0, done: 0 },
      project: projectsById.get(song.project_id) ?? null,
    })),
    200,
  );
});

bandsRoutes.post("/:id/projects", requireAuth, async (c) => {
  const bandId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const membership = await getMembership(bandId, userId);

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
