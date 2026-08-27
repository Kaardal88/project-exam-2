"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Volume2,
  VolumeX,
  Music,
  Download,
} from "lucide-react";
import { formatSongTime } from "@/lib/utils";
import { bounceToMp3, saveBlob } from "@/lib/bounce";
import { MAX_STEMS_PER_VERSION, MIX_KIND } from "@/lib/stemKinds";
import { useStemPlayer, type PlayerLane } from "./useStemPlayer";
import { StemLane } from "./StemLane";
import { VersionHistory } from "./VersionHistory";
import { AddStemModal } from "./AddStemModal";
import { UploadTakeModal } from "./UploadTakeModal";
import type { Stem, Take, Version, VersionDetail } from "./types";

type StudioTabProps = {
  songId: string;
  songTitle: string;
  isLeader: boolean;
  currentUserId: string | null;
  /** the song's audio pointer may have moved, so the page reloads the song */
  onSongChanged: () => void;
};

export function StudioTab({
  songId,
  songTitle,
  isLeader,
  currentUserId,
  onSongChanged,
}: StudioTabProps) {
  const [stems, setStems] = useState<Stem[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addStemOpen, setAddStemOpen] = useState(false);
  const [addStemKind, setAddStemKind] = useState("vocals");
  const [uploadInto, setUploadInto] = useState<Stem | null>(null);

  const [takesByStem, setTakesByStem] = useState<Record<string, Take[]>>({});
  const [takesLoading, setTakesLoading] = useState<string | null>(null);

  const [bouncing, setBouncing] = useState<number | null>(null);

  const loadStems = useCallback(async () => {
    const response = await fetch(`/api/songs/${songId}/stems`);
    if (response.ok) setStems(await response.json());
  }, [songId]);

  const loadVersions = useCallback(async () => {
    const response = await fetch(`/api/songs/${songId}/versions`);
    if (!response.ok) return [] as Version[];

    const list: Version[] = await response.json();
    setVersions(list);
    return list;
  }, [songId]);

  const loadDetail = useCallback(
    async (versionId: string) => {
      const response = await fetch(
        `/api/songs/${songId}/versions/${versionId}`,
      );

      if (!response.ok) {
        setError("Couldn't load that version.");
        return;
      }

      setDetail(await response.json());
      setSelectedId(versionId);
    },
    [songId],
  );

  /** Everything the studio shows, in the fewest requests that will do. */
  const reload = useCallback(
    async (keepSelection = false) => {
      // Yields first so that calling this straight from an effect does not set
      // state synchronously during the effect and cascade a second render.
      await Promise.resolve();

      setError(null);

      const [, list] = await Promise.all([loadStems(), loadVersions()]);

      const wanted =
        (keepSelection && selectedId) ||
        list.find((version) => version.is_current)?.id ||
        list[0]?.id;

      if (wanted) await loadDetail(wanted);
      else setDetail(null);

      setLoading(false);
    },
    [loadStems, loadVersions, loadDetail, selectedId],
  );

  useEffect(() => {
    // The studio's first fetch. reload() only touches state after awaiting, so
    // this is not the cascading render the rule guards against -- but the rule
    // follows the call rather than the timing and cannot tell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // Runs for the song, not for every change to reload's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  async function loadTakes(stemId: string) {
    setTakesLoading(stemId);

    const response = await fetch(`/api/songs/${songId}/stems/${stemId}/takes`);

    if (response.ok) {
      const takes: Take[] = await response.json();
      setTakesByStem((current) => ({ ...current, [stemId]: takes }));
    }

    setTakesLoading(null);
  }

  // Lanes come from the selected version, so previewing an older one plays
  // that arrangement rather than the current song.
  const lanes: PlayerLane[] = useMemo(
    () =>
      (detail?.stems ?? []).map((row) => ({
        id: row.stem.id,
        takeId: row.take.id,
        url: row.url,
      })),
    [detail],
  );

  const player = useStemPlayer(lanes);

  const progress = player.duration > 0 ? player.position / player.duration : 0;

  const takeByStemId = new Map(
    (detail?.stems ?? []).map((row) => [row.stem.id, row.take]),
  );

  async function patchStem(stem: Stem, body: Record<string, unknown>) {
    const response = await fetch(`/api/songs/${songId}/stems/${stem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not update the stem");
      return;
    }

    await loadStems();
    // The lane's colour and name live on the version detail too.
    if (selectedId) await loadDetail(selectedId);
  }

  /**
   * Put a take that is already uploaded into the song, as a new version.
   *
   * Not named useTake: React treats a use* function as a hook and refuses to
   * let it be called from a callback.
   */
  async function adoptTake(stem: Stem, take: Take) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: null,
        stems: [{ stem_id: stem.id, take_id: take.id }],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not put that take in the song");
      return;
    }

    setSelectedId(null);
    await reload();
    onSongChanged();
  }

  /** Drop a slot out of the arrangement, which is a commit, not a delete. */
  async function dropStem(stem: Stem) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: null,
        stems: [{ stem_id: stem.id, take_id: null }],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not remove that layer");
      return;
    }

    setSelectedId(null);
    await reload();
    onSongChanged();
  }

  async function removeStem(stem: Stem) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/stems/${stem.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not remove the stem");
      return;
    }

    await reload(true);
  }

  async function renameTake(take: Take, label: string) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/takes/${take.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not rename that take");
      return;
    }

    await loadTakes(take.stem_id);
    // The lane names the take it is playing, so the detail has to follow.
    if (selectedId) await loadDetail(selectedId);
  }

  async function removeTake(take: Take) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/takes/${take.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not withdraw that take");
      return;
    }

    await loadTakes(take.stem_id);
  }

  /**
   * Render what is playing down to one MP3, in the browser.
   *
   * A song built only from stems has no single file anywhere, so there is
   * nothing to drop into a DAW and play along to. This makes one, honours mute
   * and solo — mute your own part and you get a backing track to record it
   * against — and never touches the server.
   */
  async function bounce() {
    if (player.state !== "ready" || !detail) return;

    setBouncing(0);
    setError(null);

    try {
      const sources = player.bounceSources();

      if (sources.length === 0) {
        throw new Error("Nothing is audible — unmute a lane first.");
      }

      const blob = await bounceToMp3(sources, player.duration, (fraction) =>
        setBouncing(Math.round(fraction * 100)),
      );

      saveBlob(blob, `${songTitle} - v${detail.version_number} (bounce).mp3`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not bounce");
    } finally {
      setBouncing(null);
    }
  }

  const showingOldVersion = Boolean(detail && !detail.is_current);

  /* ------------------------------------------------------------ empty */

  if (!loading && stems.length === 0) {
    return (
      <>
        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-8 text-center shadow-2xl">
          <Music className="mx-auto mb-3 h-8 w-8 text-neutral-600" />

          <h2 className="text-lg font-bold text-yellow-100">
            No audio here yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
            A song is built from stems — separate files for the drums, the
            guitar, the vocal — played together. If you only have one finished
            file, that works too: it is a song with one stem.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => {
                setAddStemKind(MIX_KIND);
                setAddStemOpen(true);
              }}
              className="rounded-md border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black!"
            >
              Upload the song
            </button>

            <span className="text-xs text-neutral-600">or</span>

            <button
              onClick={() => {
                setAddStemKind("drums");
                setAddStemOpen(true);
              }}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
            >
              Upload stems
            </button>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Both are the same thing underneath — one finished file is a song
            with one stem, so nothing is closed off either way.
          </p>
        </section>

        <AddStemModal
          isOpen={addStemOpen}
          onClose={() => setAddStemOpen(false)}
          songId={songId}
          initialKind={addStemKind}
          onAdded={async (stem) => {
            await reload();
            // An empty lane is not what anyone came for. Naming the stem and
            // giving it audio is one intention, so it is one flow.
            setUploadInto(stem);
          }}
        />
      </>
    );
  }

  /* ------------------------------------------------------------ studio */

  return (
    <div className="space-y-4">
      {error && <p className="form-error">{error}</p>}

      {showingOldVersion && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-yellow-200/30 bg-yellow-100/5 px-3 py-2">
          <span className="text-xs text-neutral-300">
            Listening to{" "}
            <span className="font-semibold text-yellow-100">
              {detail?.label}
            </span>
            {" — not the song as it stands."}
          </span>

          <button
            onClick={() => {
              const current = versions.find((version) => version.is_current);
              if (current) void loadDetail(current.id);
            }}
            className="rounded-md border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            Back to current
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0 rounded-md border border-neutral-700 bg-neutral-900/60">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
                Stems
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {stems.length} of {MAX_STEMS_PER_VERSION} · played together
              </p>
            </div>

            <button
              onClick={() => {
                setAddStemKind("drums");
                setAddStemOpen(true);
              }}
              disabled={stems.length >= MAX_STEMS_PER_VERSION}
              className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Add stem
            </button>
          </header>

          {player.state === "loading" && (
            <p className="px-4 py-2 text-[11px] text-neutral-500">
              Decoding {player.loadedCount} of {player.laneCount} stems…
            </p>
          )}

          {player.error && <p className="form-error mx-4 my-2">{player.error}</p>}

          <ul>
            {stems.map((stem) => (
              <StemLane
                key={stem.id}
                stem={stem}
                take={takeByStemId.get(stem.id) ?? null}
                peaks={player.peaks[stem.id]}
                progress={progress}
                muted={player.muted.has(stem.id)}
                soloed={player.soloed.has(stem.id)}
                anySoloed={player.soloed.size > 0}
                isLeader={isLeader}
                currentUserId={currentUserId}
                takes={takesByStem[stem.id] ?? []}
                takesLoading={takesLoading === stem.id}
                onOpenTakes={() => loadTakes(stem.id)}
                onToggleMute={() => player.toggleMute(stem.id)}
                onToggleSolo={() => player.toggleSolo(stem.id)}
                onSeekFraction={(fraction) =>
                  player.seek(fraction * player.duration)
                }
                onColorChange={(color) => patchStem(stem, { color })}
                onRename={(name) => patchStem(stem, { name })}
                onUploadTake={() => setUploadInto(stem)}
                onUseTake={(take) => adoptTake(stem, take)}
                onRenameTake={renameTake}
                onRemoveTake={removeTake}
                onRemoveStem={() =>
                  takeByStemId.has(stem.id) ? dropStem(stem) : removeStem(stem)
                }
              />
            ))}
          </ul>

          {/* The transport, under the lanes the way a DAW puts it. */}
          <footer className="flex flex-wrap items-center gap-3 border-t border-neutral-800 px-4 py-3">
            <button
              onClick={player.toggle}
              disabled={player.state !== "ready"}
              aria-label={player.isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-black transition hover:cursor-pointer hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {player.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>

            <span className="font-mono text-xs text-neutral-400">
              {formatSongTime(player.position)} /{" "}
              {formatSongTime(player.duration)}
            </span>

            <button
              onClick={bounce}
              disabled={player.state !== "ready" || bouncing !== null}
              title="Render what you are hearing to a single MP3, to play along to in a DAW"
              className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3 w-3" />
              {bouncing !== null ? `Bouncing ${bouncing}%` : "Bounce to MP3"}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() =>
                  player.setMasterVolume(player.masterVolume > 0 ? 0 : 1)
                }
                aria-label={player.masterVolume > 0 ? "Mute all" : "Unmute all"}
                className="text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
              >
                {player.masterVolume > 0 ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={player.masterVolume}
                onChange={(event) =>
                  player.setMasterVolume(Number(event.target.value))
                }
                aria-label="Master volume"
                className="h-1 w-24 cursor-pointer accent-yellow-100"
              />
            </div>
          </footer>
        </section>

        <VersionHistory
          songId={songId}
          songTitle={songTitle}
          versions={versions}
          loading={loading}
          selectedId={selectedId}
          selectedHasMix={
            detail?.stems.some((row) => row.stem.kind === MIX_KIND) ?? false
          }
          isLeader={isLeader}
          onSelect={(version) => loadDetail(version.id)}
          onChanged={async () => {
            setSelectedId(null);
            await reload();
            onSongChanged();
          }}
        />
      </div>

      <AddStemModal
        isOpen={addStemOpen}
        onClose={() => setAddStemOpen(false)}
        songId={songId}
        initialKind={addStemKind}
        onAdded={async (stem) => {
          await reload(true);
          setUploadInto(stem);
        }}
      />

      <UploadTakeModal
        isOpen={uploadInto !== null}
        onClose={() => setUploadInto(null)}
        songId={songId}
        stem={uploadInto}
        isLeader={isLeader}
        songDuration={player.duration}
        onUploaded={async (committed) => {
          if (uploadInto) await loadTakes(uploadInto.id);
          if (committed) {
            setSelectedId(null);
            await reload();
            onSongChanged();
          }
        }}
      />
    </div>
  );
}
