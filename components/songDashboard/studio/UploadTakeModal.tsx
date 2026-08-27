"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { formatSongTime } from "@/lib/utils";
import { uploadToR2 } from "@/lib/uploadToR2";
import { UploadProgress } from "../UploadProgress";
import type { Stem } from "./types";

const MP3_MAX_BYTES = 25 * 1024 * 1024;

type UploadTakeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  stem: Stem | null;
  isLeader: boolean;
  /** Length of the version currently loaded, for the comparison below. 0 when nothing is. */
  songDuration: number;
  /** committed: whether the take was put straight into a new version */
  onUploaded: (committed: boolean) => Promise<void> | void;
};

/** Duration straight off the file, so the lane can show a length before decoding. */
async function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export function UploadTakeModal({
  isOpen,
  onClose,
  songId,
  stem,
  isLeader,
  songDuration,
  onUploaded,
}: UploadTakeModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  /**
   * The one click that keeps the simple case simple. A leader uploading a
   * finished mix means "this is the song now" almost every time, so it is
   * checked by default -- and it is absent for a guest, whose take is a
   * contribution, not a decision.
   */
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setFileDuration(null);
    setLabel("");
    setNote("");
    setMakeCurrent(true);
    setError(null);
    setProgress(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!stem) return;

    if (!file) return setError("Choose an MP3 first");

    if (!file.name.toLowerCase().endsWith(".mp3") || file.type !== "audio/mpeg") {
      return setError("Only .mp3 files are allowed");
    }

    if (file.size > MP3_MAX_BYTES) {
      return setError("File too large. Max 25MB");
    }

    if (!label.trim()) {
      return setError("Give the take a name so it can be told apart");
    }

    setSaving(true);
    setError(null);
    setProgress(0);

    try {
      const duration = fileDuration ?? (await readDuration(file));

      // Uploaded only once the form is valid, so abandoning it never leaves an
      // orphaned object in the bucket with nothing pointing at it.
      const { key } = await uploadToR2({
        songId,
        target: "stem",
        file,
        onProgress: setProgress,
      });

      const takeResponse = await fetch(
        `/api/songs/${songId}/stems/${stem.id}/takes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            r2_key: key,
            label: label.trim(),
            note: note.trim() || null,
            duration_seconds: duration,
            byte_size: file.size,
          }),
        },
      );

      if (!takeResponse.ok) {
        const body = await takeResponse.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save the take");
      }

      const take = await takeResponse.json();
      let committed = false;

      if (isLeader && makeCurrent) {
        const commitResponse = await fetch(`/api/songs/${songId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // No label: the server writes one from what actually changed, so
          // uploading a stem called "Kick" produces "Added Kick" rather than a
          // version named after one of its layers.
          body: JSON.stringify({
            note: note.trim() || null,
            stems: [{ stem_id: stem.id, take_id: take.id }],
          }),
        });

        if (!commitResponse.ok) {
          const body = await commitResponse.json().catch(() => ({}));
          // The take is safely in either way, so this is a partial success
          // rather than a failure — say so instead of implying it was lost.
          throw new Error(
            `The take was saved, but it is not in the song yet: ${
              body.error ?? "the version could not be written"
            }`,
          );
        }

        committed = true;
      }

      reset();
      await onUploaded(committed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-yellow-100">
          Upload a take{stem ? ` — ${stem.name}` : ""}
        </h2>

        {error && <p className="form-error">{error}</p>}

        <input
          type="file"
          accept="audio/mpeg,.mp3"
          onChange={async (event) => {
            const picked = event.target.files?.[0] ?? null;
            setFile(picked);
            setFileDuration(picked ? await readDuration(picked) : null);
          }}
          className="block w-full text-xs text-neutral-400 file:mr-3 file:rounded-md file:border file:border-neutral-700 file:bg-neutral-900 file:px-3 file:py-1 file:text-xs file:text-yellow-100 hover:file:cursor-pointer"
        />

        {/*
          A fact, not a warning. A stem rendered out of a DAW is full project
          length and silent until the part comes in, which is the whole point
          of rendering one -- so telling people to "export from the start" is
          explaining their own job back to them. What is worth showing is the
          one number that catches a genuinely truncated file: how long this is
          against how long the song is. Different is not wrong -- some DAWs
          trim trailing silence -- so it says what it sees and leaves the call
          to the person who made the file.
        */}
        {fileDuration !== null && (
          <p className="rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-400">
            This take is {formatSongTime(fileDuration)}
            {songDuration > 0 && (
              <>
                {" · the song is "}
                {formatSongTime(songDuration)}
                {Math.abs(fileDuration - songDuration) > 1.5 && (
                  <span className="mt-1 block text-neutral-500">
                    Stems play together from 0:00, so a different length usually
                    means a trimmed render rather than a shorter part.
                  </span>
                )}
              </>
            )}
          </p>
        )}

        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="What is this take?"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
        />

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What changed, what to listen for (optional)"
          rows={2}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
        />

        {isLeader ? (
          <label className="flex items-start gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={makeCurrent}
              onChange={(event) => setMakeCurrent(event.target.checked)}
              className="mt-0.5 accent-yellow-100"
            />
            <span>
              Put it in the song now
              <span className="block text-neutral-500">
                Writes a new version. Leave it off to keep the take on the shelf.
              </span>
            </span>
          </label>
        ) : (
          <p className="rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-400">
            Your take goes into this stem for the band to hear. A band leader
            decides when it becomes part of the song.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <UploadProgress progress={progress} success={false} />

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Uploading…" : "Upload take"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
