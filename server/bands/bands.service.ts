import { db } from "@/server/db";
import { bands } from "@/server/db/schema";
import { eq, or, like } from "drizzle-orm";
import { slugify, isReservedSlug, isUuid } from "@/lib/slug";

export async function getBands() {
  return db.query.bands.findMany();
}

export async function getBandById(id: string) {
  return db.query.bands.findFirst({
    where: eq(bands.id, id),
  });
}

export async function getBandBySlug(slug: string) {
  return db.query.bands.findFirst({
    where: eq(bands.slug, slug),
  });
}

/**
 * Resolves the single `:id` route parameter, which accepts either form so that
 * links still work after the switch to slugs. Slugs are always stored
 * lowercase, so /band/Nordlys resolves the same as /band/nordlys.
 */
export async function getBandByIdOrSlug(idOrSlug: string) {
  return isUuid(idOrSlug)
    ? getBandById(idOrSlug)
    : getBandBySlug(idOrSlug.toLowerCase());
}

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; cause?: unknown };

  if (candidate.code === UNIQUE_VIOLATION) return true;

  // the neon-http driver wraps the driver error one level down
  const cause = candidate.cause as { code?: unknown } | undefined;
  return Boolean(cause && cause.code === UNIQUE_VIOLATION);
}

/**
 * Finds the first free slug for `name`: "nordlys", then "nordlys-2", and so
 * on. Reserved words are treated as already taken, so a band called "New"
 * becomes "new-2" rather than shadowing a route segment.
 *
 * This is a read-then-write check, so it can still lose a race against a
 * concurrent insert -- createBand() handles that case by retrying.
 */
export async function ensureUniqueSlug(name: string, excludeBandId?: string) {
  const base = slugify(name);

  const conflicting = await db.query.bands.findMany({
    columns: { id: true, slug: true },
    where: or(eq(bands.slug, base), like(bands.slug, `${base}-%`)),
  });

  const taken = new Set(
    conflicting
      .filter((band) => band.id !== excludeBandId)
      .map((band) => band.slug),
  );

  if (isReservedSlug(base)) {
    taken.add(base);
  }

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }

  return `${base}-${suffix}`;
}

type NewBand = typeof bands.$inferInsert;

/**
 * Inserts a band, deriving a unique slug from its name.
 *
 * Two people creating "Nordlys" at the same moment can both compute
 * "nordlys-2" before either commits, so the loser of that race gets a unique
 * violation from the database rather than bad data. Recomputing and retrying
 * resolves it; the retry budget only needs to cover simultaneous writers.
 */
export async function createBand(
  values: Omit<NewBand, "slug">,
  maxAttempts = 5,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const slug = await ensureUniqueSlug(values.band_name);

    try {
      const [band] = await db
        .insert(bands)
        .values({ ...values, slug })
        .returning();

      return band;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  // unreachable: the loop either returns or throws
  throw new Error("Could not generate a unique slug for the band");
}

export async function updateBand(
  id: string,
  data: {
    band_name?: string;
    bio?: string;
    image_url?: string;
    header_image_url?: string;
    slug?: string;
    country?: string;
    spotify_url?: string;
    bandcamp_url?: string;
    youtube_url?: string;
    tidal_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    tiktok_url?: string;
    website_url?: string;
  },
) {
  const [updatedBand] = await db
    .update(bands)
    .set({
      band_name: data.band_name,
      bio: data.bio,
      image_url: data.image_url,
      header_image_url: data.header_image_url,
      slug: data.slug,
      country: data.country,
      spotify_url: data.spotify_url,
      bandcamp_url: data.bandcamp_url,
      youtube_url: data.youtube_url,
      tidal_url: data.tidal_url,
      instagram_url: data.instagram_url,
      facebook_url: data.facebook_url,
      tiktok_url: data.tiktok_url,
      website_url: data.website_url,
    })
    .where(eq(bands.id, id))
    .returning();

  return updatedBand;
}

export async function deleteBand(id: string) {
  return db.delete(bands).where(eq(bands.id, id));
}
