/**
 * One line in a song's Activity feed, shared by the route that builds it and
 * the tab that draws it -- the same reason lib/bandRoles.ts exists.
 *
 * The feed is *derived*, not logged. Every line is read back out of a table
 * that already records who did what and when: a comment's author, a take's
 * uploader, a version's creator. There is no activity table, so nothing can
 * fall out of step with what actually happened -- and, equally, nothing is
 * shown that no table remembers. Deleting leaves no trace, a task has no
 * author to name, and a song's status changes are not stored anywhere.
 *
 * Adding a stem is left out on purpose. It is almost always the first half of
 * uploading a take into it, seconds later, and that card names the stem
 * already -- so it read as the same thing said twice.
 */
export type SongActivityKind =
  | "song_created"
  | "comment_posted"
  | "comment_status"
  | "comment_assigned"
  | "note_added"
  | "note_edited"
  | "file_uploaded"
  | "take_uploaded"
  | "version_created"
  | "version_locked";

export type SongActivityActor = {
  id: string;
  username: string;
  image_url: string | null;
};

export type SongActivity = {
  /** kind and row id together -- one row can appear twice, as added and as edited */
  id: string;
  kind: SongActivityKind;
  /** ISO timestamp */
  at: string;
  /** null once the account behind it is deleted */
  actor: SongActivityActor | null;
  /**
   * What the headline needs to finish its sentence: a ticket status, an
   * assignee's name, a stem's name, "v4", or whether a note is lyrics.
   */
  detail: string | null;
  /** The thing itself, quoted under the headline: a comment, a title, a label. */
  body: string | null;
  /** The row it is about, so a card can open it where it lives. */
  target_id: string;
};

/** How far back the feed reaches. A feed, not an archive. */
export const SONG_ACTIVITY_LIMIT = 50;
