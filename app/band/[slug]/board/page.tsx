"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { BackButton } from "@/components/BackButton";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardCard, type BoardSong } from "@/components/board/BoardCard";
import {
  SONG_STATUSES,
  isSongStatus,
  toSongStatus,
  type SongStatus,
} from "@/lib/songStatus";

type Band = {
  id: string;
  slug: string;
  band_name: string;
};

/**
 * Where every song the band has is, in one screen.
 *
 * Its own route rather than a section of the band profile: the profile is the
 * band's shop window and its sections are collapsible cards, and four columns
 * of songs do not fit inside one. This is also the address somebody wants to
 * send to the rest of the band, which a tab held in React state cannot be.
 */
export default function BandBoardPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [band, setBand] = useState<Band | null>(null);
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
      const bandResponse = await fetch(`/api/bands/${slug}`);

      if (bandResponse.status === 401) {
        router.push("/login");
        return;
      }

      if (!bandResponse.ok) {
        setError("Failed to load band");
        setLoading(false);
        return;
      }

      const bandData = await bandResponse.json();

      // The board is the band's working state, not part of the public face.
      // Somebody who can see the profile is not thereby allowed to read what
      // the band is halfway through.
      if (!bandData.authenticated || !bandData.band?.id) {
        setError("Only members of this band can see the board");
        setLoading(false);
        return;
      }

      setBand(bandData.band);

      const songsResponse = await fetch(`/api/bands/${bandData.band.id}/songs`);

      if (!songsResponse.ok) {
        setError("Failed to load songs");
        setLoading(false);
        return;
      }

      const songsData = await songsResponse.json();

      setSongs(
        songsData.map((song: BoardSong & { status: string }) => ({
          ...song,
          status: toSongStatus(song.status),
        })),
      );
      setLoading(false);
    }

    void load();
  }, [slug, router]);

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

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  }

  if (error || !band) {
    return (
      <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
        <NavBar />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="form-error">{error ?? "Board not found"}</p>
          <Link
            href={`/band/${slug}`}
            className="mt-4 inline-block text-sm text-neutral-400 transition hover:text-yellow-100"
          >
            Back to the band
          </Link>
        </div>
      </main>
    );
  }

  const activeSong = songs.find((song) => song.id === activeSongId) ?? null;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <BackButton
        className="ml-4 mt-4 flex w-fit items-center gap-2 rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
        fallbackHref={`/band/${slug}`}
      />

      <div className="mx-auto mt-4 w-full max-w-7xl px-4 pb-24">
        <header className="mb-4 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-yellow-100">
            {band.band_name} — board
          </h1>
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

        {songs.length === 0 ? (
          <p className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 text-sm text-neutral-400">
            No songs yet. Create an album or a single on the band profile, and
            the songs in it show up here.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveSongId(null)}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
              {SONG_STATUSES.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  bandId={band.id}
                  activeSongId={activeSongId}
                  songs={visibleSongs.filter((song) => song.status === status)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeSong && (
                <BoardCard song={activeSong} bandId={band.id} overlay />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </main>
  );
}
