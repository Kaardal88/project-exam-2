"use client";

import { useState } from "react";
import { Check, Play, Trash2, Upload } from "lucide-react";
import { uploadToR2 } from "@/lib/uploadToR2";
import { UploadProgress } from "./UploadProgress";

const MP3_MAX_BYTES = 25 * 1024 * 1024;

export type AudioVersion = {
  id: string;
  label: string;
  note: string | null;
  created_at: string | null;
  is_current: boolean;
  uploader: { id: string; username: string; image_url: string | null } | null;
};

type AudioVersionsProps = {
  songId: string;
  isLeader: boolean;
  currentUserId: string | null;
  /**
   * Owned by the player rather than fetched here, because the collapsed player
   * needs the current version's name too and there should be one answer to
   * "which take is this", not two that can disagree.
   */
  versions: AudioVersion[];
  loading: boolean;
  onReload: () => Promise<void>;
  /** null means "playing the current version" */
  previewVersionId: string | null;
  onPreview: (version: AudioVersion | null) => void;
  /** the song's audio pointer moved, so the page needs to reload it */
  onPromoted: () => void;
};

function formatWhen(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AudioVersions({
  songId,
  isLeader,
  currentUserId,
  versions,
  loading,
  onReload,
  previewVersionId,
  onPreview,
  onPromoted,
}: AudioVersionsProps) {
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  function openForm() {
    // A take nobody can tell apart from the last one is not much of a log
    // entry, so the field starts with something rather than empty.
    setLabel(`Version ${versions.length + 1}`);
    setNote("");
    setFile(null);
    setError(null);
    setFormOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setError("Choose an MP3 first");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".mp3") || file.type !== "audio/mpeg") {
      setError("Only .mp3 files are allowed");
      return;
    }

    if (file.size > MP3_MAX_BYTES) {
      setError("File too large. Max 25MB");
      return;
    }

    if (label.trim() === "") {
      setError("Give it a name so it can be told apart");
      return;
    }

    setSaving(true);
    setError(null);
    setProgress(0);

    try {
      // Uploaded only once the label is filled in, so abandoning the form does
      // not leave an orphaned object in the bucket with nothing pointing at it.
      const { key } = await uploadToR2({
        songId,
        target: "audio",
        file,
        onProgress: setProgress,
      });

      const response = await fetch(`/api/songs/${songId}/audio-versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2_key: key, label: label.trim(), note: note.trim() || null }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save the version");
      }

      setFormOpen(false);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function promote(version: AudioVersion) {
    const response = await fetch(
      `/api/songs/${songId}/audio-versions/${version.id}/promote`,
      { method: "PUT" },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not promote this version");
      return;
    }

    onPreview(null);
    await onReload();
    onPromoted();
  }

  async function remove(version: AudioVersion) {
    const response = await fetch(
      `/api/songs/${songId}/audio-versions/${version.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not remove this version");
      return;
    }

    if (previewVersionId === version.id) onPreview(null);
    await onReload();
  }

  return (
    <div className="mt-6 border-t border-neutral-800 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          Versions
        </h3>

        {!formOpen && (
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            <Upload className="h-3 w-3" />
            Upload a take
          </button>
        )}
      </div>

      {error && <p className="form-error mb-3">{error}</p>}

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="mb-4 space-y-3 rounded-md border border-neutral-800 bg-neutral-950/50 p-3"
        >
          <input
            type="file"
            accept="audio/mpeg,.mp3"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-neutral-400 file:mr-3 file:rounded-md file:border file:border-neutral-700 file:bg-neutral-900 file:px-3 file:py-1 file:text-xs file:text-yellow-100 hover:file:cursor-pointer"
          />

          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What is this take?"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
          />

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed, what to listen for (optional)"
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
          />

          <div className="flex items-center justify-end gap-2">
            <UploadProgress progress={progress} success={false} />

            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Uploading…" : "Add version"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No audio yet. Upload a take to start the log.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => {
            const isPreviewing = previewVersionId === version.id;
            const canRemove =
              isLeader || version.uploader?.id === currentUserId;

            return (
              <li
                key={version.id}
                className={`flex flex-wrap items-center gap-3 rounded-md border p-3 ${
                  version.is_current
                    ? "border-yellow-200/40 bg-yellow-100/5"
                    : "border-neutral-800 bg-neutral-950/40"
                }`}
              >
                <button
                  onClick={() => onPreview(isPreviewing ? null : version)}
                  title={isPreviewing ? "Back to the current version" : "Listen to this take"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:cursor-pointer ${
                    isPreviewing
                      ? "bg-yellow-100 text-black"
                      : "border border-neutral-700 text-neutral-300 hover:border-yellow-200 hover:text-yellow-100"
                  }`}
                >
                  <Play className="ml-0.5 h-3 w-3" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-yellow-100">
                      {version.label}
                    </span>

                    {version.is_current && (
                      <span className="rounded-full border border-yellow-200/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-100">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500">
                    {version.uploader?.username ?? "a departed member"}
                    {version.created_at && ` · ${formatWhen(version.created_at)}`}
                  </p>

                  {version.note && (
                    <p className="mt-1 text-xs text-neutral-400">{version.note}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isLeader && !version.is_current && (
                    <button
                      onClick={() => promote(version)}
                      title="Make this the song's audio"
                      className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                    >
                      <Check className="h-3 w-3" />
                      Make current
                    </button>
                  )}

                  {canRemove && !version.is_current && (
                    <button
                      onClick={() => remove(version)}
                      title="Remove this version"
                      aria-label={`Remove ${version.label}`}
                      className="text-neutral-500 transition hover:cursor-pointer hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
