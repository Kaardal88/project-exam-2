/**
 * Where a song sits in the band's process.
 *
 * `songs.status` is a plain varchar with no enum and no check constraint, so
 * this file -- not the database -- is what the four stages actually are. Two
 * of them are older than the board: `wip` is the column default every existing
 * song was written with, and `finished` is what the project page and the song
 * header have always shown. Keeping both meant the board could be added
 * without touching a single row.
 *
 * Value and label are separate on purpose, the same split
 * `components/songDashboard/ticketStatus.ts` makes. The label is what the band
 * reads and is free to change; the value is stored on every song and is not.
 * Rename a column heading here whenever the word stops fitting -- but adding
 * or removing a *value* means deciding what happens to the songs already
 * carrying it.
 */
export const SONG_STATUSES = ["backlog", "wip", "mixing", "finished"] as const;

export type SongStatus = (typeof SONG_STATUSES)[number];

/** Songs written before the board existed, and the column a new song opens in. */
export const DEFAULT_SONG_STATUS: SongStatus = "wip";

export const SONG_STATUS_STYLES: Record<
  SongStatus,
  { label: string; dot: string; badge: string; column: string }
> = {
  backlog: {
    label: "Backlog",
    dot: "bg-neutral-400",
    badge: "border-neutral-400 text-neutral-300",
    column: "border-neutral-700",
  },
  wip: {
    label: "WIP",
    dot: "bg-yellow-100",
    badge: "border-yellow-100 text-yellow-100",
    column: "border-yellow-100/40",
  },
  mixing: {
    label: "Mixing",
    dot: "bg-blue-400",
    badge: "border-blue-400 text-blue-400",
    column: "border-blue-400/40",
  },
  finished: {
    label: "Finished",
    dot: "bg-green-400",
    badge: "border-green-400 text-green-300",
    column: "border-green-400/40",
  },
};

/**
 * Status arrives from a request body and from rows written before these four
 * stages existed, so nothing may assume it is one of them.
 */
export function isSongStatus(value: unknown): value is SongStatus {
  return (
    typeof value === "string" && (SONG_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * The stage to *show* a song at. An unrecognised value in the database is not
 * an error to surface to a band -- it is a song that has to appear in some
 * column, and the one it was created in is the honest answer.
 */
export function toSongStatus(value: unknown): SongStatus {
  return isSongStatus(value) ? value : DEFAULT_SONG_STATUS;
}
