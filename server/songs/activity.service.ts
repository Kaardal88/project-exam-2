import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  songs,
  song_comments,
  song_comment_events,
  song_notes,
  song_files,
  song_stem_takes,
  song_versions,
} from "@/server/db/schema";
import {
  SONG_ACTIVITY_LIMIT,
  type SongActivity,
  type SongActivityActor,
} from "@/lib/songActivity";

const ACTOR = { columns: { id: true, username: true, image_url: true } } as const;

/**
 * An edit inside this window of a note being written is the same act as
 * writing it. A note typed, saved and fixed for a typo thirty seconds later is
 * one thing somebody did, not two cards.
 */
const EDIT_GRACE = sql`interval '1 minute'`;

type Song = typeof songs.$inferSelect;

/**
 * The song's recent history, newest first, read back out of the tables that
 * already record it.
 *
 * Each source is asked for its own newest SONG_ACTIVITY_LIMIT rows, and the
 * merge keeps the newest SONG_ACTIVITY_LIMIT of those. That is exact rather
 * than approximate: whatever makes the overall top fifty is necessarily in the
 * top fifty of the table it came from.
 *
 * One db.batch, so eight reads cost one round trip to Neon rather than eight --
 * and, being one transaction, they all see the same moment.
 */
export async function getSongActivity(song: Song): Promise<SongActivity[]> {
  const songId = song.id;
  const limit = SONG_ACTIVITY_LIMIT;

  const [
    comments,
    commentEvents,
    notesAdded,
    notesEdited,
    files,
    takes,
    versions,
    locks,
  ] = await db.batch([
    db.query.song_comments.findMany({
      where: eq(song_comments.song_id, songId),
      orderBy: desc(song_comments.created_at),
      limit,
      columns: { id: true, body: true, created_at: true },
      with: { author: ACTOR },
    }),
    // Events carry no song_id of their own; they belong to a song through
    // their comment.
    db.query.song_comment_events.findMany({
      where: inArray(
        song_comment_events.comment_id,
        db
          .select({ id: song_comments.id })
          .from(song_comments)
          .where(eq(song_comments.song_id, songId)),
      ),
      orderBy: desc(song_comment_events.created_at),
      limit,
      with: {
        actor: ACTOR,
        comment: { columns: { id: true, body: true } },
      },
    }),
    db.query.song_notes.findMany({
      where: eq(song_notes.song_id, songId),
      orderBy: desc(song_notes.created_at),
      limit,
      columns: { id: true, title: true, kind: true, created_at: true },
      with: { publisher: ACTOR },
    }),
    // Only the latest edit of each note is remembered -- updated_at and
    // updated_by are overwritten -- so a note edited five times is one card.
    db.query.song_notes.findMany({
      where: and(
        eq(song_notes.song_id, songId),
        sql`${song_notes.updated_at} > ${song_notes.created_at} + ${EDIT_GRACE}`,
      ),
      orderBy: desc(song_notes.updated_at),
      limit,
      columns: { id: true, title: true, kind: true, updated_at: true },
      with: { editor: ACTOR },
    }),
    db.query.song_files.findMany({
      where: eq(song_files.song_id, songId),
      orderBy: desc(song_files.created_at),
      limit,
      columns: { id: true, filename: true, created_at: true },
      with: { uploader: ACTOR },
    }),
    db.query.song_stem_takes.findMany({
      where: eq(song_stem_takes.song_id, songId),
      orderBy: desc(song_stem_takes.created_at),
      limit,
      columns: { id: true, label: true, created_at: true },
      with: { uploader: ACTOR, stem: { columns: { name: true } } },
    }),
    db.query.song_versions.findMany({
      where: eq(song_versions.song_id, songId),
      orderBy: desc(song_versions.created_at),
      limit,
      columns: { id: true, version_number: true, label: true, created_at: true },
      with: { creator: ACTOR },
    }),
    db.query.song_versions.findMany({
      where: and(
        eq(song_versions.song_id, songId),
        isNotNull(song_versions.locked_at),
      ),
      orderBy: desc(song_versions.locked_at),
      limit,
      columns: { id: true, version_number: true, label: true, locked_at: true },
      with: { locker: ACTOR },
    }),
  ]);

  /*
   * Two lines name a person by id rather than through a relation: the song's
   * creator, and whoever a comment was reassigned to (song_comment_events
   * keeps the id as a plain string, with "unassigned" for nobody). One lookup
   * for all of them, and only when there is anybody to look up.
   */
  const assignedIds = commentEvents
    .filter((event) => event.event_type === "reassigned")
    .map((event) => event.to_value)
    .filter((id): id is string => !!id && id !== "unassigned");

  const lookupIds = [
    ...new Set([...assignedIds, ...(song.created_by ? [song.created_by] : [])]),
  ];

  const people = lookupIds.length
    ? await db.query.users.findMany({
        where: (users, { inArray }) => inArray(users.id, lookupIds),
        columns: { id: true, username: true, image_url: true },
      })
    : [];

  const personById = new Map<string, SongActivityActor>(
    people.map((person) => [person.id, person]),
  );

  const items: SongActivity[] = [];

  function push(at: Date | null, item: Omit<SongActivity, "at">) {
    // Every one of these columns defaults to now(), so a null is a row from
    // before the column existed. Undatable, so it has no place in a timeline.
    if (at) items.push({ ...item, at: at.toISOString() });
  }

  push(song.created_at, {
    id: `song_created:${song.id}`,
    kind: "song_created",
    actor: song.created_by ? (personById.get(song.created_by) ?? null) : null,
    detail: null,
    body: null,
    target_id: song.id,
  });

  for (const comment of comments) {
    push(comment.created_at, {
      id: `comment_posted:${comment.id}`,
      kind: "comment_posted",
      actor: comment.author,
      detail: null,
      body: comment.body,
      target_id: comment.id,
    });
  }

  for (const event of commentEvents) {
    const isStatus = event.event_type === "status_change";

    push(event.created_at, {
      id: `comment_event:${event.id}`,
      kind: isStatus ? "comment_status" : "comment_assigned",
      actor: event.actor,
      // A status is passed through as its value and labelled by the client,
      // which already owns TICKET_STATUS_STYLES. An assignee is resolved here,
      // because a guest may be the one assigned and the client only knows the
      // band's members.
      detail: isStatus
        ? event.to_value
        : event.to_value && event.to_value !== "unassigned"
          ? (personById.get(event.to_value)?.username ?? "someone")
          : null,
      body: event.comment.body,
      target_id: event.comment.id,
    });
  }

  for (const note of notesAdded) {
    push(note.created_at, {
      id: `note_added:${note.id}`,
      kind: "note_added",
      actor: note.publisher,
      detail: note.kind,
      body: note.title,
      target_id: note.id,
    });
  }

  for (const note of notesEdited) {
    push(note.updated_at, {
      id: `note_edited:${note.id}`,
      kind: "note_edited",
      actor: note.editor,
      detail: note.kind,
      body: note.title,
      target_id: note.id,
    });
  }

  for (const file of files) {
    push(file.created_at, {
      id: `file_uploaded:${file.id}`,
      kind: "file_uploaded",
      actor: file.uploader,
      detail: null,
      body: file.filename,
      target_id: file.id,
    });
  }

  for (const take of takes) {
    push(take.created_at, {
      id: `take_uploaded:${take.id}`,
      kind: "take_uploaded",
      actor: take.uploader,
      detail: take.stem.name,
      body: take.label,
      target_id: take.id,
    });
  }

  for (const version of versions) {
    push(version.created_at, {
      id: `version_created:${version.id}`,
      kind: "version_created",
      actor: version.creator,
      detail: `v${version.version_number}`,
      body: version.label,
      target_id: version.id,
    });
  }

  for (const version of locks) {
    push(version.locked_at, {
      id: `version_locked:${version.id}`,
      kind: "version_locked",
      actor: version.locker,
      detail: `v${version.version_number}`,
      body: version.label,
      target_id: version.id,
    });
  }

  // ISO strings in one timezone sort correctly as strings.
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return items.slice(0, limit);
}
