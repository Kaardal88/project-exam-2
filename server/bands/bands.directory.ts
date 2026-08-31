import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { bands } from "@/server/db/schema";
import { PUBLIC_VISIBILITY } from "@/lib/bandVisibility";
import type { BandSort } from "@/lib/bandFilters";

/**
 * The public band directory: search, filter, sort and page over bands.
 *
 * The sibling of server/users/users.directory.ts, and built the same way for
 * the same reason — /bands/public used to return every public band and let the
 * page do the rest, which meant "filter by genre" would have been a filter over
 * a payload rather than a query.
 *
 * One difference that matters: **this is unauthenticated.** A signed-out
 * visitor browses the same directory a member does, so nothing here may return
 * a column that is not already public, and the visibility filter is not
 * optional. Unlisted and private bands are reachable by link or membership and
 * must never appear in a listing.
 */

export type BandDirectoryFilters = {
  /** Band name only, deliberately -- see buildWhere(). */
  q?: string;
  genres?: string[];
  country?: string;
  sort?: BandSort;
  limit?: number;
  offset?: number;
};

function buildWhere(filters: BandDirectoryFilters): SQL | undefined {
  const conditions: SQL[] = [
    // Not a filter the caller can turn off. Every other condition narrows a
    // public list; this one is what makes it public.
    eq(bands.visibility, PUBLIC_VISIBILITY),
  ];

  const q = filters.q?.trim();

  if (q) {
    // Name only. Bios are long and full of incidental words, so searching them
    // makes "folk" match a band that once wrote "for the folk at the back" --
    // a search that returns more than it should is harder to trust than one
    // that returns less.
    conditions.push(ilike(bands.band_name, `%${q}%`));
  }

  if (filters.genres?.length) {
    // bands.genre holds one value, so several chips mean "any of these".
    conditions.push(inArray(bands.genre, filters.genres));
  }

  if (filters.country) {
    conditions.push(eq(bands.country, filters.country));
  }

  return and(...conditions);
}

function buildOrderBy(sort: BandSort | undefined) {
  if (sort === "alphabetical") {
    return [asc(bands.band_name)];
  }

  if (sort === "random") {
    // Only ever used with a small limit and never with an offset -- see the
    // note in lib/bandFilters.ts about why this cannot be a grid sort.
    return [sql`random()`];
  }

  // Newest, and the default. band_name breaks ties so an offset-paged result
  // stays stable between pages; bands.created_at has always existed, so unlike
  // users these are genuinely different timestamps and the tiebreaker rarely
  // does any work.
  return [desc(bands.created_at), asc(bands.band_name)];
}

export async function getPublicBands(filters: BandDirectoryFilters) {
  const where = buildWhere(filters);
  const limit = filters.limit ?? 12;
  const offset = filters.offset ?? 0;

  const rows = await db
    .select({
      id: bands.id,
      slug: bands.slug,
      band_name: bands.band_name,
      bio: bands.bio,
      image_url: bands.image_url,
      country: bands.country,
      genre: bands.genre,
      created_at: bands.created_at,
      spotify_url: bands.spotify_url,
      bandcamp_url: bands.bandcamp_url,
      youtube_url: bands.youtube_url,
      tidal_url: bands.tidal_url,
      instagram_url: bands.instagram_url,
      facebook_url: bands.facebook_url,
      tiktok_url: bands.tiktok_url,
      website_url: bands.website_url,
    })
    .from(bands)
    .where(where)
    .orderBy(...buildOrderBy(filters.sort))
    .limit(limit)
    .offset(offset);

  // The count is what the empty state quotes, what "Load more" hides itself
  // on, and what the landing page counts bands with.
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(bands)
    .where(where);

  const total = counted?.total ?? 0;

  return {
    bands: rows,
    total,
    // A random draw is a sample, not a page, so there is never any more of it.
    hasMore: filters.sort === "random" ? false : offset + rows.length < total,
  };
}
