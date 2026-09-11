"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardCard, type BoardSong } from "@/components/board/BoardCard";
import {
  SONG_STATUSES,
  isSongStatus,
  toSongStatus,
  type SongStatus,
} from "@/lib/songStatus";

/**
 * Where every song the band has is, in one screen.
 *
 * This used to be a route of its own, reached from the profile's menu by a
 * link that sat among buttons. It looked like the rest of the list and behaved
 * like none of it: every other entry swapped the panel beside the menu, and
 * this one left the page. Enough people asked why that it is a section now,
 * shown in the same place as the others, and the reasons it was a page have
 * both been answered another way -- the section is in the URL (`?tab=Board`),
 * so it can still be sent to the rest of the band, and the menu collapses to
 * icons, which gives four columns the width they need.
 *
 * It fetches its own songs rather than taking them from the profile. Nothing
 * else on the profile needs them, and a board is read for its current state:
 * opening the tab is when that should be asked for.
 */
export function Board({ bandId }: { bandId: string }) {
  const [songs, setSongs] = useState<BoardSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [activeSongId, setActiveSongId] = useState<string | null>(null);

  const sensors = useSensors(
    // A card carries a link and a handle, so a press that never travels is a
    // click, not a drag. Without the threshold every attempt to focus the
    // handle starts dragging.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/bands/${bandId}/songs`);

        if (!response.ok) {
          setError("Failed to load songs");
          return;
        }

        const data = await response.json();

        setSongs(
          data.map((song: BoardSong & { status: string }) => ({
            ...song,
            status: toSongStatus(song.status),
          })),
        );
      } catch (error) {
        console.error("Failed to load songs:", error);
        setError("Failed to load songs");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [bandId]);

  const projects = useMemo(() => {
    const seen = new Map<string, { id: string; title: string }>();

    songs.forEach((song) => {
      if (song.project) seen.set(song.project.id, song.project);
    });

    return [...seen.values()];
  }, [songs]);

  const visibleSongs = useMemo(
    () =>
      projectFilter === "all"
        ? songs
        : songs.filter((song) => song.project?.id === projectFilter),
    [songs, projectFilter],
  );

  const moveSong = useCallback(
    async (songId: string, status: SongStatus) => {
      const song = songs.find((entry) => entry.id === songId);
      if (!song || song.status === status) return;

      const previous = song.status;

      // Moved on screen first: a card that hangs where it was dropped until a
      // round trip finishes reads as a board that did not accept the drop.
      setSongs((current) =>
        current.map((entry) =>
          entry.id === songId ? { ...entry, status } : entry,
        ),
      );
      setMoveError(null);

      try {
        const response = await fetch(`/api/songs/${songId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) throw new Error("Failed to move song");
      } catch {
        // Put it back where it was. Leaving it in the new column would show
        // the band a stage the database does not agree with, and they would
        // only find out on the next reload.
        setSongs((current) =>
          current.map((entry) =>
            entry.id === songId ? { ...entry, status: previous } : entry,
          ),
        );
        setMoveError(`Couldn't move "${song.title}". It stayed where it was.`);
      }
    },
    [songs],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveSongId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSongId(null);

    const status = event.over?.id;

    // Dropped outside every column, which is a cancelled drag rather than a
    // move to nowhere.
    if (!isSongStatus(status)) return;

    void moveSong(String(event.active.id), status);
  }

  const activeSong = songs.find((song) => song.id === activeSongId) ?? null;

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
      {/* The same heading every other section opens with, so arriving here
          reads as another tab rather than somewhere else. */}
      <header className="mb-4 flex flex-col items-center gap-1 text-center">
        <h2 className="text-yellow-100">Board</h2>
        <p className="text-sm text-neutral-400">
          Every song the band has, across albums and singles. Drag a card by
          its handle to move it, or focus the handle and use space and the
          arrow keys.
        </p>
      </header>

      {/* A dropdown rather than a row of buttons: album titles are as long as
          the band wants them to be, and a handful laid side by side pushes
          the board itself down the page before it has been read. */}
      {projects.length > 1 && (
        <label className="mb-4 flex w-fit items-center gap-2 text-xs text-neutral-400">
          Project
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="max-w-64 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-yellow-100 outline-none transition hover:border-neutral-600 focus:border-yellow-200"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {moveError && <p className="form-error mb-4">{moveError}</p>}

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-400">
          Loading songs…
        </p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No songs yet. Create an album or a single from Home, and the songs in
          it show up here.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveSongId(null)}
        >
          {/* Four columns side by side from lg, not md. The board shares the
              row with the menu now, and at md that leaves each column a
              little over a hundred pixels -- narrower than a song title. Below
              lg the columns keep their width and the row scrolls instead. */}
          <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {SONG_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                bandId={bandId}
                activeSongId={activeSongId}
                songs={visibleSongs.filter((song) => song.status === status)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeSong && (
              <BoardCard song={activeSong} bandId={bandId} overlay />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
