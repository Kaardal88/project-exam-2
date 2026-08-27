"use client";

import { useState } from "react";
import {
  ChevronDown,
  MessageSquarePlus,
  Lock,
  LockOpen,
  RotateCcw,
  Download,
  Trash2,
  Pencil,
  MoreHorizontal,
  Check,
  Search,
} from "lucide-react";
import type { Version } from "./types";

type VersionBarProps = {
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
  /** opens a comment about this version as a whole — no timestamp */
  onComment: (version: Version) => void;
};

/** Above this many, finding one by eye stops working and a filter earns itself. */
const FILTER_THRESHOLD = 10;

function formatWhen(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Which version you are hearing, and the way to a different one.
 *
 * This was a tall panel beside the stems listing every version at once, which
 * put the history in visual competition with the thing it describes and left
 * the lanes squeezed into two thirds of the width. Most of the time the answer
 * to "which version is this" is one line long, and the full list is something
 * you want on demand.
 *
 * So it is GitHub's branch switcher: a slim bar that names where you are, and
 * a dropdown that offers everywhere else. The stems get the whole width back.
 */
export function VersionBar({
  songId,
  songTitle,
  versions,
  loading,
  selectedId,
  selectedHasMix,
  isLeader,
  onSelect,
  onChanged,
  onComment,
}: VersionBarProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<"mix" | "stems" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");

  const selected = versions.find((version) => version.id === selectedId);
  const current = versions.find((version) => version.is_current);

  const showingOld = Boolean(selected && !selected.is_current);

  const matches = filter.trim().toLowerCase();

  const listed = matches
    ? versions.filter(
        (version) =>
          version.label.toLowerCase().includes(matches) ||
          `v${version.version_number}`.includes(matches),
      )
    : versions;

  async function call(
    path: string,
    method: "PUT" | "DELETE" | "PATCH",
    failure: string,
    body?: unknown,
  ) {
    if (!selected) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/songs/${songId}/versions/${selected.id}${path}`,
        {
          method,
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? failure);
      }

      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  /**
   * Filenames come from the server inside the signed URL. Setting `download`
   * on the link does nothing here — the object is on another origin.
   */
  async function download(what: "mix" | "stems") {
    if (!selected) return;

    setDownloading(what);
    setError(null);

    try {
      const response = await fetch(
        `/api/songs/${songId}/versions/${selected.id}/download`,
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not prepare the download");
      }

      const manifest: {
        mix: { filename: string; url: string } | null;
        files: { filename: string; url: string }[];
      } = await response.json();

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

  if (loading) {
    return (
      <section className="rounded-md border border-neutral-700 bg-neutral-900/60 px-4 py-3">
        <p className="text-xs text-neutral-500">Loading history…</p>
      </section>
    );
  }

  if (versions.length === 0) {
    return (
      <section className="rounded-md border border-neutral-700 bg-neutral-900/60 px-4 py-3">
        <p className="text-xs text-neutral-500">
          No versions yet. Put a take in the song to start the log.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-md border bg-neutral-900/60 ${
        // The bar is the one place that says which version you are hearing, so
        // it carries the warning too rather than a second banner repeating it.
        showingOld ? "border-yellow-200/40" : "border-neutral-700"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        {/* --------------------------------------------- the switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setOpen((wasOpen) => !wasOpen);
              setFilter("");
            }}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-md border border-neutral-700 px-2.5 py-1.5 text-sm transition hover:cursor-pointer hover:border-yellow-200"
          >
            <span className="font-mono text-xs text-neutral-500">
              v{selected?.version_number ?? "?"}
            </span>
            <span className="max-w-[16rem] truncate font-semibold text-yellow-100">
              {selected?.label ?? "Pick a version"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
          </button>

          {open && (
            <>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />

              <div className="absolute left-0 z-40 mt-1 w-80 rounded-md border border-neutral-700 bg-neutral-900 shadow-2xl">
                <p className="border-b border-neutral-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Versions of {songTitle}
                </p>

                {versions.length > FILTER_THRESHOLD && (
                  <div className="flex items-center gap-1.5 border-b border-neutral-800 px-3 py-2">
                    <Search className="h-3 w-3 shrink-0 text-neutral-600" />
                    <input
                      autoFocus
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Find a version…"
                      className="w-full bg-transparent text-xs text-yellow-100 outline-none placeholder:text-neutral-600"
                    />
                  </div>
                )}

                <ul className="max-h-80 overflow-y-auto">
                  {listed.length === 0 && (
                    <li className="px-3 py-3 text-xs text-neutral-500">
                      Nothing matches that.
                    </li>
                  )}

                  {listed.map((version) => (
                    <li key={version.id}>
                      <button
                        onClick={() => {
                          onSelect(version);
                          setOpen(false);
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:cursor-pointer hover:bg-neutral-800/60"
                      >
                        <span className="mt-0.5 w-3 shrink-0">
                          {version.id === selectedId && (
                            <Check className="h-3 w-3 text-yellow-100" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="font-mono text-[11px] text-neutral-500">
                              v{version.version_number}
                            </span>
                            <span className="truncate text-xs font-semibold text-yellow-100">
                              {version.label}
                            </span>
                            {version.is_current && (
                              <span className="rounded-full border border-yellow-200/50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-100">
                                current
                              </span>
                            )}
                            {version.locked_at && (
                              <Lock
                                className="h-2.5 w-2.5 text-neutral-400"
                                aria-label="Locked for mix"
                              />
                            )}
                          </span>

                          <span className="block text-[10px] text-neutral-500">
                            {version.creator?.username ?? "a departed member"}
                            {version.created_at &&
                              ` · ${formatWhen(version.created_at)}`}
                            {version.stem_count != null &&
                              ` · ${version.stem_count} stem${version.stem_count === 1 ? "" : "s"}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* ------------------------------------------------ where you are */}
        {showingOld ? (
          <>
            <span className="rounded-full border border-yellow-200/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-100">
              not current
            </span>

            {current && (
              <button
                onClick={() => onSelect(current)}
                className="rounded-md border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
              >
                Back to v{current.version_number}
              </button>
            )}
          </>
        ) : (
          <span className="rounded-full border border-yellow-200/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-100">
            current
          </span>
        )}

        <span className="hidden text-[11px] text-neutral-500 sm:inline">
          {selected?.creator?.username ?? "a departed member"}
          {selected?.created_at && ` · ${formatWhen(selected.created_at)}`}
          {selected?.stem_count != null &&
            ` · ${selected.stem_count} stem${selected.stem_count === 1 ? "" : "s"}`}
        </span>

        {/* ------------------------------------------------------ actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {/*
            Out of the overflow menu and into the bar. Saying what you think of
            a mix is the most ordinary thing anyone does to a version, and it
            was behind the same click as deleting one. Not gated on leader
            either: anyone working on the project has an opinion worth hearing.
          */}
          <button
            onClick={() => selected && onComment(selected)}
            title="A comment about this version as a whole"
            className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            <MessageSquarePlus className="h-3 w-3" />
            Comment
          </button>

          {selectedHasMix && (
            <button
              onClick={() => download("mix")}
              disabled={downloading !== null}
              title="One file to play along to in your DAW"
              className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3 w-3" />
              {downloading === "mix" ? "Preparing…" : "Mix"}
            </button>
          )}

          <button
            onClick={() => download("stems")}
            disabled={downloading !== null}
            title="Every layer of this version, as separate files"
            className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3 w-3" />
            {downloading === "stems" ? "Preparing…" : "Stems"}
          </button>

          {/* Rename, lock, restore and delete are rare and destructive-ish, so
              they sit behind one more click rather than crowding the bar. */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((wasOpen) => !wasOpen)}
              aria-label="More actions for this version"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <>
                <button
                  aria-label="Close"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />

                <div className="absolute right-0 z-40 mt-1 w-52 rounded-md border border-neutral-700 bg-neutral-900 p-1 shadow-2xl">
                  {isLeader ? (
                    <>
                      <button
                        onClick={() => {
                          setDraftLabel(selected?.label ?? "");
                          setRenaming(true);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-neutral-300 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Rename
                      </button>

                      {showingOld && (
                        <button
                          onClick={() =>
                            call(
                              "/restore",
                              "PUT",
                              "Could not restore that version",
                            )
                          }
                          disabled={busy}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-neutral-300 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Make this the song again
                        </button>
                      )}

                      <button
                        onClick={() =>
                          call(
                            "/lock",
                            selected?.locked_at ? "DELETE" : "PUT",
                            "Could not change the lock",
                          )
                        }
                        disabled={busy}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-neutral-300 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
                      >
                        {selected?.locked_at ? (
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

                      {showingOld && !selected?.locked_at && (
                        <button
                          onClick={() =>
                            call("", "DELETE", "Could not remove that version")
                          }
                          disabled={busy}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-neutral-500 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove this version
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="px-2 py-1.5 text-xs text-neutral-500">
                      Only band leaders can change a version.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- note and rename */}
      {renaming && (
        <div className="border-t border-neutral-800 px-3 py-2">
          <input
            autoFocus
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={() => {
              const trimmed = draftLabel.trim();
              if (trimmed && trimmed !== selected?.label) {
                void call("", "PATCH", "Could not rename that version", {
                  label: trimmed,
                });
              }
              setRenaming(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-yellow-100 outline-none focus:border-yellow-200"
          />
        </div>
      )}

      {selected?.note && !renaming && (
        <p className="border-t border-neutral-800 px-3 py-2 text-[11px] text-neutral-400">
          {selected.note}
        </p>
      )}

      {selected?.locked_at && (
        <p className="border-t border-neutral-800 px-3 py-2 text-[10px] leading-relaxed text-neutral-400">
          Sent to mix
          {selected.locker?.username ? ` by ${selected.locker.username}` : ""}
          {` on ${formatWhen(selected.locked_at)}`}. Kept exactly as it is — it
          cannot be removed while locked. The band carries on as normal: new
          versions still stack on top, and this one stays the reference.
        </p>
      )}

      {error && <p className="form-error mx-3 mb-2">{error}</p>}
    </section>
  );
}
