"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, MessageSquare, ListChecks } from "lucide-react";
import { SONG_STATUS_STYLES, type SongStatus } from "@/lib/songStatus";

export type BoardSong = {
  id: string;
  title: string;
  status: SongStatus;
  updated_at: string | null;
  open_comments: number;
  tasks: { total: number; done: number };
  project: { id: string; title: string; type: "album" | "single" } | null;
};

/**
 * Dragging is on a handle rather than the whole card, and that is a decision
 * rather than a detail.
 *
 * The card's job is to be opened -- the title is a real link to the song. A
 * card that is both a link and a drag surface has to guess which one a press
 * meant, and gets it wrong often enough to be annoying on a trackpad and
 * unusable on a phone. A handle also gives the keyboard sensor something to
 * focus: tab to it, space to pick up, arrows to move, space to drop.
 */
export function BoardCard({
  song,
  bandId,
  dragging = false,
  overlay = false,
}: {
  song: BoardSong;
  bandId: string;
  /** This card is the one being dragged; the overlay copy is what follows the cursor. */
  dragging?: boolean;
  /** Rendered inside DragOverlay, so it must not register a second draggable. */
  overlay?: boolean;
}) {
  const style = SONG_STATUS_STYLES[song.status];

  return (
    <article
      className={`rounded-md border border-neutral-700 bg-neutral-950/60 p-3 transition ${
        overlay
          ? "cursor-grabbing border-yellow-200 shadow-2xl"
          : "hover:border-yellow-200"
      } ${dragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-start gap-2">
        {/* The overlay copy shows the handle without registering a second
            draggable for the same song -- drawn rather than omitted, so the
            card that follows the cursor is the same width as the one it left. */}
        {overlay ? (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-yellow-100" />
        ) : (
          <DragHandle songId={song.id} songTitle={song.title} />
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/songs?songId=${song.id}&bandId=${bandId}`}
            draggable={false}
            className="block truncate text-sm font-semibold text-yellow-100 transition hover:text-yellow-200"
          >
            {song.title}
          </Link>

          {song.project && (
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {song.project.type === "album" ? "Album" : "Single"}:{" "}
              {song.project.title}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${style.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>

            {/* Only when there is something waiting. A "0 open" badge on every
                card is noise on the one screen meant to be read at a glance. */}
            {/* The reason WIP can be one broad column: the card says how far
                into it the song is, so a stage that covers writing through
                tracking still carries a number. */}
            {song.tasks.total > 0 && (
              <span
                title={`${song.tasks.done} of ${song.tasks.total} tasks done`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  song.tasks.done === song.tasks.total
                    ? "border-green-400 text-green-300"
                    : "border-neutral-600 text-neutral-300"
                }`}
              >
                <ListChecks className="h-3 w-3" />
                {song.tasks.done}/{song.tasks.total}
              </span>
            )}

            {song.open_comments > 0 && (
              <span
                title={`${song.open_comments} unresolved comment${
                  song.open_comments === 1 ? "" : "s"
                }`}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-600 px-2 py-0.5 text-[11px] text-neutral-300"
              >
                <MessageSquare className="h-3 w-3" />
                {song.open_comments}
              </span>
            )}

            {song.updated_at && (
              <span className="text-[11px] text-neutral-500">
                {new Date(song.updated_at).toLocaleDateString("no-NO")}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DragHandle({
  songId,
  songTitle,
}: {
  songId: string;
  songTitle: string;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: songId });

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Move ${songTitle} to another stage`}
      className="mt-0.5 shrink-0 rounded text-neutral-500 transition hover:text-yellow-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-200 cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
