"use client";

import { useState } from "react";
import {
  Lock,
  LockOpen,
  RotateCcw,
  Download,
  Trash2,
  Pencil,
} from "lucide-react";
import type { Version } from "./types";

type VersionHistoryProps = {
  songId: string;
  songTitle: string;
  versions: Version[];
  loading: boolean;
  selectedId: string | null;
  /** whether the selected version has a "Full mix" slot to download */
  selectedHasMix: boolean;
  isLeader: boolean;
  onSelect: (version: Version) => void;
  onChanged: () => Promise<void> | void;
};

function formatWhen(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VersionHistory({
  songId,
  songTitle,
  versions,
  loading,
  selectedId,
  selectedHasMix,
  isLeader,
  onSelect,
  onChanged,
}: VersionHistoryProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"mix" | "stems" | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  /**
   * Rewrite a version's message. Commit messages get better in hindsight, and
   * the generated ones do not always land.
   */
  async function rename(version: Version, label: string) {
    setError(null);

    const response = await fetch(
      `/api/songs/${songId}/versions/${version.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not rename that version");
      return;
    }

    await onChanged();
  }

  async function call(
    versionId: string,
    path: string,
    method: "PUT" | "DELETE",
    failure: string,
  ) {
    setBusy(versionId);
    setError(null);

    try {
      const response = await fetch(
        `/api/songs/${songId}/versions/${versionId}${path}`,
        { method },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? failure);
      }

      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setBusy(null);
    }
  }

  type Manifest = {
    mix: { filename: string; url: string } | null;
    files: { filename: string; url: string }[];
  };

  /**
   * Takes a version away to work on.
   *
   * "mix" is the guide track a band member drops into a DAW to overdub
   * against; "stems" is every layer separately. The filenames come from the
   * server inside the signed URL itself -- setting `download` on the link does
   * nothing here, because the object lives on another origin and the attribute
   * is ignored cross-origin. That is why these used to arrive named after
   * their uuid.
   */
  async function download(version: Version, what: "mix" | "stems") {
    setDownloading(what);
    setError(null);

    try {
      const response = await fetch(
        `/api/songs/${songId}/versions/${version.id}/download`,
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not prepare the download");
      }

      const manifest: Manifest = await response.json();

      const wanted =
        what === "mix" ? (manifest.mix ? [manifest.mix] : []) : manifest.files;

      if (wanted.length === 0) {
        throw new Error("There is no single mixdown in this version.");
      }

      for (const file of wanted) {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Browsers throttle or drop a burst of downloads fired in one tick.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/60">
      <header className="border-b border-neutral-800 px-4 py-3">
        {/* The song is named once here rather than on every row -- the panel
            already sits inside that song's dashboard. */}
        <h2 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          History · <span className="normal-case">{songTitle}</span>
        </h2>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Every version is the whole arrangement at one moment. Newest on top.
        </p>
      </header>

      {error && <p className="form-error mx-4 mt-3">{error}</p>}

      {loading ? (
        <p className="px-4 py-4 text-sm text-neutral-500">Loading history…</p>
      ) : versions.length === 0 ? (
        <p className="px-4 py-4 text-sm text-neutral-500">
          No versions yet. Put a take in the song to start the log.
        </p>
      ) : (
        <ul className="max-h-[26rem] overflow-y-auto">
          {versions.map((version) => {
            const selected = version.id === selectedId;

            return (
              <li
                key={version.id}
                className={`border-b border-neutral-800 last:border-b-0 ${
                  selected ? "bg-yellow-100/5" : ""
                }`}
              >
                <button
                  onClick={() => onSelect(version)}
                  className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:cursor-pointer hover:bg-neutral-800/40"
                >
                  {/* The commit dot: filled on main, hollow behind it. */}
                  <span
                    aria-hidden
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full border ${
                      version.is_current
                        ? "border-yellow-100 bg-yellow-100"
                        : "border-neutral-600"
                    }`}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      {/* The version's identity leads; the message describes
                          what it did. Before this the message was the take's
                          own name, so a version read as though the whole
                          arrangement had been renamed after one layer. */}
                      <span className="font-mono text-xs text-neutral-500">
                        v{version.version_number}
                      </span>

                      <span className="truncate text-sm font-semibold text-yellow-100">
                        {version.label}
                      </span>

                      {version.is_current && (
                        <span className="rounded-full border border-yellow-200/50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-100">
                          current
                        </span>
                      )}

                      {version.locked_at && (
                        <Lock
                          className="h-3 w-3 text-neutral-400"
                          aria-label="Locked for mix"
                        />
                      )}
                    </span>

                    <span className="block text-[11px] text-neutral-500">
                      {version.creator?.username ?? "a departed member"}
                      {version.created_at && ` · ${formatWhen(version.created_at)}`}
                      {version.stem_count != null &&
                        ` · ${version.stem_count} stem${version.stem_count === 1 ? "" : "s"}`}
                    </span>

                    {version.note && (
                      <span className="mt-0.5 block text-[11px] text-neutral-400">
                        {version.note}
                      </span>
                    )}

                    {/* A padlock on its own said nothing about what it did.
                        Locking freezes one version as the reference that went
                        to mix -- it deliberately does not stop the band
                        working, which is the part that needed saying. */}
                    {version.locked_at && (
                      <span className="mt-1 block rounded-sm border border-neutral-700 bg-neutral-950/60 px-1.5 py-1 text-[10px] leading-relaxed text-neutral-400">
                        Sent to mix
                        {version.locker?.username
                          ? ` by ${version.locker.username}`
                          : ""}
                        {version.locked_at
                          ? ` on ${formatWhen(version.locked_at)}`
                          : ""}
                        . Kept exactly as it is — it cannot be removed while
                        locked. The band carries on as normal: new versions
                        still stack on top, and this one stays the reference.
                      </span>
                    )}
                  </span>
                </button>

                {selected && renamingId === version.id && (
                  <div className="px-4 pb-2">
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                      onBlur={() => {
                        const trimmed = draftLabel.trim();
                        if (trimmed && trimmed !== version.label) {
                          void rename(version, trimmed);
                        }
                        setRenamingId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-yellow-100 outline-none focus:border-yellow-200"
                    />
                  </div>
                )}

                {selected && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {isLeader && renamingId !== version.id && (
                      <button
                        onClick={() => {
                          setRenamingId(version.id);
                          setDraftLabel(version.label);
                        }}
                        title="Rewrite this version's message"
                        className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Rename
                      </button>
                    )}

                    {selectedHasMix && (
                      <button
                        onClick={() => download(version, "mix")}
                        disabled={downloading !== null}
                        title="One file to play along to in your DAW"
                        className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download className="h-3 w-3" />
                        {downloading === "mix" ? "Preparing…" : "Download mix"}
                      </button>
                    )}

                    <button
                      onClick={() => download(version, "stems")}
                      disabled={downloading !== null}
                      title="Every layer of this version, as separate files"
                      className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3 w-3" />
                      {downloading === "stems" ? "Preparing…" : "Download stems"}
                    </button>

                    {isLeader && !version.is_current && (
                      <button
                        onClick={() =>
                          call(
                            version.id,
                            "/restore",
                            "PUT",
                            "Could not restore that version",
                          )
                        }
                        disabled={busy === version.id}
                        title="Bring this arrangement back as a new version"
                        className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    )}

                    {isLeader && (
                      <button
                        onClick={() =>
                          call(
                            version.id,
                            "/lock",
                            version.locked_at ? "DELETE" : "PUT",
                            "Could not change the lock",
                          )
                        }
                        disabled={busy === version.id}
                        title={
                          version.locked_at
                            ? "Unlock so it can be removed again"
                            : "Freeze this version as the one sent to mix. Does not stop new versions."
                        }
                        className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                      >
                        {version.locked_at ? (
                          <>
                            <LockOpen className="h-3 w-3" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Lock for mix
                          </>
                        )}
                      </button>
                    )}

                    {isLeader && !version.is_current && !version.locked_at && (
                      <button
                        onClick={() =>
                          call(
                            version.id,
                            "",
                            "DELETE",
                            "Could not remove that version",
                          )
                        }
                        disabled={busy === version.id}
                        title="Remove this version from the log"
                        aria-label={`Remove ${version.label}`}
                        className="flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-500 transition hover:cursor-pointer hover:border-red-400/40 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
