import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/server/db";
import {
  users,
  band_members,
  project_collaborators,
  projects,
} from "@/server/db/schema";
import { ACCEPTED, type InviteStatus } from "@/lib/inviteStatus";
import { BAND_LEADER } from "@/lib/bandRoles";
import { connectRoles, type ConnectSort } from "@/lib/connectFilters";

/**
 * The Connect directory: search, filter, sort and page over people.
 *
 * This replaced `GET /users` handing the whole table to the browser, which the
 * page then filtered in JavaScript. That worked while the app had a screenful
 * of testers and stops working the moment it does not -- and it also meant
 * every filter the Connect plan asked for would have been a filter over an
 * ever-growing payload rather than a query. All of it happens here now, and the
 * page asks for twelve rows at a time.
 *
 * See docs/decisions/connect-directory.md for why tags stayed an array on the
 * user rather than becoming a join table.
 */

export type DirectoryFilters = {
  q?: string;
  tags?: string[];
  roles?: string[];
  country?: string;
  sort?: ConnectSort;
  limit?: number;
  offset?: number;
  /** Band the caller is inviting on behalf of -- see loadInviteContext(). */
  bandId?: string;
};

export type DirectoryUser = {
  id: string;
  handle: string | null;
  username: string;
  image_url: string | null;
  header_image_url: string | null;
  tags: string[] | null;
  country: string | null;
  created_at: Date | null;
  /** Roles held in some band, accepted only -- drives the badges and the filter. */
  band_roles: string[];
  /** Roles held as a project guest, accepted only. */
  guest_roles: string[];
  /**
   * Only present when the request named a band the caller actually leads.
   * `band` is this person's standing with that band; `projects` maps project id
   * to their standing on it, so the invite step can grey out a project they are
   * already on rather than finding out from a 409.
   */
  invite?: {
    band: InviteStatus | null;
    projects: Record<string, InviteStatus>;
  };
};

/**
 * `ARRAY['a','b']::text[]` with every element a bound parameter.
 *
 * Written out rather than leaning on the driver to serialise a JS array,
 * because these arrays end up inside a raw `unnest(...)` for the relevance
 * sort, where there is no column type for drizzle to infer a mapping from.
 */
function textArray(values: string[]): SQL {
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
}

/** Role values are unique across the two tables, so the value says where to look. */
function splitRolesBySource(roles: string[]) {
  const known = roles
    .map((role) => connectRoles.find((option) => option.value === role))
    .filter(
      (option): option is (typeof connectRoles)[number] => option !== undefined,
    );

  return {
    band: known
      .filter((role) => role.source === "band")
      .map((role) => role.value),
    project: known
      .filter((role) => role.source === "project")
      .map((role) => role.value),
  };
}

function buildWhere(filters: DirectoryFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  const q = filters.q?.trim();

  if (q) {
    // Handle as well as username: someone who was given an address should be
    // able to paste it in and find the person behind it.
    conditions.push(
      or(ilike(users.username, `%${q}%`), ilike(users.handle, `%${q}%`)),
    );
  }

  if (filters.tags?.length) {
    // Overlap, not containment: picking Drummer and Singer means "either",
    // which is how a row of chips reads.
    conditions.push(sql`${users.tags} && ${textArray(filters.tags)}`);
  }

  if (filters.country) {
    conditions.push(eq(users.country, filters.country));
  }

  if (filters.roles?.length) {
    const { band, project } = splitRolesBySource(filters.roles);

    // A subquery per table rather than a join, so someone holding the same
    // role in three bands is still one row in the result.
    const roleConditions: SQL[] = [];

    if (band.length) {
      roleConditions.push(
        inArray(
          users.id,
          db
            .select({ id: band_members.user_id })
            .from(band_members)
            .where(
              and(
                eq(band_members.status, ACCEPTED),
                inArray(band_members.role, band),
              ),
            ),
        ),
      );
    }

    if (project.length) {
      roleConditions.push(
        inArray(
          users.id,
          db
            .select({ id: project_collaborators.user_id })
            .from(project_collaborators)
            .where(
              and(
                eq(project_collaborators.status, ACCEPTED),
                inArray(project_collaborators.role, project),
              ),
            ),
        ),
      );
    }

    // An unrecognised role value leaves roleConditions empty, and matching
    // nothing is the honest answer: silently dropping the filter would show a
    // full directory under a chip the reader believes is narrowing it.
    conditions.push(roleConditions.length ? or(...roleConditions) : sql`false`);
  }

  const present = conditions.filter(
    (condition): condition is SQL => condition !== undefined,
  );

  return present.length ? and(...present) : undefined;
}

function buildOrderBy(filters: DirectoryFilters) {
  if (filters.sort === "alphabetical") {
    return [asc(users.username)];
  }

  if (filters.sort === "relevant" && filters.tags?.length) {
    // How many of the chosen tags this person actually claims. Counted in SQL
    // so it can order rows the page has not fetched -- ranking in JavaScript
    // would only reorder the twelve already on screen, which is not a sort.
    const matches = sql`(
      SELECT count(*) FROM unnest(${users.tags}) AS tag
       WHERE tag = ANY(${textArray(filters.tags)})
    )`;

    return [desc(matches), asc(users.username)];
  }

  // Newest, and the default. Every account older than
  // scripts/add-user-connect-fields.ts shares one created_at, so without the
  // username tiebreaker those rows would come back in a different order for
  // each page of the same result set and the grid would repeat people.
  return [desc(users.created_at), asc(users.username)];
}

/**
 * What the caller may do about each person, given the band they say they are
 * inviting for.
 *
 * Returns null unless they actually lead that band. This is display only --
 * POST /bands/:id/members and POST /projects/:id/collaborators each check for
 * themselves, and that is where the rule is enforced -- but a page that offers
 * a button it already knows will 403 is a page lying to its reader.
 */
async function loadInviteContext(
  bandId: string,
  callerId: string,
  userIds: string[],
) {
  const leadership = await db.query.band_members.findFirst({
    where: and(
      eq(band_members.band_id, bandId),
      eq(band_members.user_id, callerId),
      eq(band_members.status, ACCEPTED),
    ),
    columns: { role: true },
  });

  if (leadership?.role !== BAND_LEADER) return null;

  const empty = {
    band: new Map<string, InviteStatus>(),
    projects: new Map<string, Record<string, InviteStatus>>(),
  };

  if (userIds.length === 0) return empty;

  const bandProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.band_id, bandId));

  const projectIds = bandProjects.map((project) => project.id);

  const [memberships, collaborations] = await Promise.all([
    db
      .select({ user_id: band_members.user_id, status: band_members.status })
      .from(band_members)
      .where(
        and(
          eq(band_members.band_id, bandId),
          inArray(band_members.user_id, userIds),
        ),
      ),
    projectIds.length
      ? db
          .select({
            user_id: project_collaborators.user_id,
            project_id: project_collaborators.project_id,
            status: project_collaborators.status,
          })
          .from(project_collaborators)
          .where(
            and(
              inArray(project_collaborators.project_id, projectIds),
              inArray(project_collaborators.user_id, userIds),
            ),
          )
      : Promise.resolve(
          [] as { user_id: string; project_id: string; status: string }[],
        ),
  ]);

  for (const membership of memberships) {
    empty.band.set(membership.user_id, membership.status as InviteStatus);
  }

  for (const collaboration of collaborations) {
    const existing = empty.projects.get(collaboration.user_id) ?? {};
    existing[collaboration.project_id] = collaboration.status as InviteStatus;
    empty.projects.set(collaboration.user_id, existing);
  }

  return empty;
}

/** Distinct accepted roles per user, for the badges on each card. */
async function loadRoles(userIds: string[]) {
  const grouped = {
    band: new Map<string, string[]>(),
    guest: new Map<string, string[]>(),
  };

  if (userIds.length === 0) return grouped;

  const [bandRows, guestRows] = await Promise.all([
    db
      .selectDistinct({
        user_id: band_members.user_id,
        role: band_members.role,
      })
      .from(band_members)
      .where(
        and(
          eq(band_members.status, ACCEPTED),
          inArray(band_members.user_id, userIds),
        ),
      ),
    db
      .selectDistinct({
        user_id: project_collaborators.user_id,
        role: project_collaborators.role,
      })
      .from(project_collaborators)
      .where(
        and(
          eq(project_collaborators.status, ACCEPTED),
          inArray(project_collaborators.user_id, userIds),
        ),
      ),
  ]);

  function collect(
    target: Map<string, string[]>,
    rows: { user_id: string; role: string }[],
  ) {
    for (const row of rows) {
      target.set(row.user_id, [...(target.get(row.user_id) ?? []), row.role]);
    }
  }

  collect(grouped.band, bandRows);
  collect(grouped.guest, guestRows);

  return grouped;
}

export async function getDirectory(
  filters: DirectoryFilters,
  callerId: string,
): Promise<{ users: DirectoryUser[]; total: number; hasMore: boolean }> {
  const where = buildWhere(filters);
  const limit = filters.limit ?? 12;
  const offset = filters.offset ?? 0;

  // Email is deliberately absent, as it was on the route this replaced: the
  // directory hands every signed-in user the table a page at a time, and
  // nothing in the UI shows anyone's address but your own.
  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      username: users.username,
      image_url: users.image_url,
      header_image_url: users.header_image_url,
      tags: users.tags,
      country: users.country,
      created_at: users.created_at,
    })
    .from(users)
    .where(where)
    .orderBy(...buildOrderBy(filters))
    .limit(limit)
    .offset(offset);

  // The count is what lets the empty state name how many people the filters
  // excluded, and what "Load more" hides itself on.
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);

  const total = counted?.total ?? 0;

  const userIds = rows.map((row) => row.id);

  const [roles, invites] = await Promise.all([
    loadRoles(userIds),
    filters.bandId
      ? loadInviteContext(filters.bandId, callerId, userIds)
      : Promise.resolve(null),
  ]);

  return {
    users: rows.map((row) => ({
      ...row,
      band_roles: roles.band.get(row.id) ?? [],
      guest_roles: roles.guest.get(row.id) ?? [],
      ...(invites
        ? {
            invite: {
              band: invites.band.get(row.id) ?? null,
              projects: invites.projects.get(row.id) ?? {},
            },
          }
        : {}),
    })),
    total,
    hasMore: offset + rows.length < total,
  };
}
