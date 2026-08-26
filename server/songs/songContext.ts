import { db } from "@/server/db";
import { getProjectAccess, type ProjectAccess } from "@/server/projects/access";

/**
 * A song and the project that owns it.
 *
 * Lifted out of songs.routes.ts when stems.routes.ts needed the same lookup.
 * Access is never answered here -- that is server/projects/access.ts, and
 * keeping the two apart is what stops a route from checking one and forgetting
 * the other.
 */
export async function getSongContext(songId: string) {
  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.id, songId),
  });

  if (!song) return null;

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, song.project_id),
  });

  if (!project) return null;

  return { song, project };
}

type SongAccessDenied = {
  ok: false;
  status: 404 | 401;
  error: string;
};

type SongAccessGranted = {
  ok: true;
  song: NonNullable<Awaited<ReturnType<typeof getSongContext>>>["song"];
  project: NonNullable<Awaited<ReturnType<typeof getSongContext>>>["project"];
  access: ProjectAccess;
};

/**
 * "Does this song exist, and may this user work on it" in one call.
 *
 * Every song route opens with the same fifteen lines: load the song, 404,
 * resolve access, 401. Twenty-odd copies of a security check is twenty-odd
 * chances to get one of them subtly wrong, which is the same argument that
 * produced getMembership() and getProjectAccess().
 *
 * 404 before 401 deliberately: a stranger guessing song ids learns that the id
 * is wrong, not that it is right and they are shut out.
 */
export async function requireSongAccess(
  songId: string,
  userId: string,
): Promise<SongAccessGranted | SongAccessDenied> {
  const context = await getSongContext(songId);

  if (!context) {
    return { ok: false, status: 404, error: "Song not found" };
  }

  const access = await getProjectAccess(
    context.project.id,
    context.project.band_id,
    userId,
  );

  if (!access) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, song: context.song, project: context.project, access };
}
