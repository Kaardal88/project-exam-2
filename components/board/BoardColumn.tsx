"use client";

import { useDroppable } from "@dnd-kit/core";
import { SONG_STATUS_STYLES, type SongStatus } from "@/lib/songStatus";
import { BoardCard, type BoardSong } from "@/components/board/BoardCard";

export function BoardColumn({
  status,
  songs,
  bandId,
  activeSongId,
}: {
  status: SongStatus;
  songs: BoardSong[];
  bandId: string;
  /** The song currently being dragged, so its card can step back visually. */
  activeSongId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = SONG_STATUS_STYLES[status];

  return (
    <section
      ref={setNodeRef}
      aria-label={style.label}
      className={`flex min-h-64 w-72 shrink-0 flex-col rounded-md border bg-neutral-900/80 p-3 shadow-2xl transition md:w-auto md:shrink ${
        isOver ? "border-yellow-200 bg-neutral-900" : style.column
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2 border-b border-neutral-800 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-yellow-100">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {style.label}
        </h2>

        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
          {songs.length}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        {songs.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-neutral-500">
            {isOver ? "Drop it here" : "Nothing here"}
          </p>
        ) : (
          songs.map((song) => (
            <BoardCard
              key={song.id}
              song={song}
              bandId={bandId}
              dragging={song.id === activeSongId}
            />
          ))
        )}
      </div>
    </section>
  );
}
