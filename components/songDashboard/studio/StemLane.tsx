"use client";

import { useState } from "react";
import { Upload, Trash2, Check, ChevronDown, Pencil } from "lucide-react";
import { stemColor, stemKindLabel } from "@/lib/stemKinds";
import { StemWaveform } from "./StemWaveform";
import { StemColorPicker } from "./StemColorPicker";
import type { Stem, Take } from "./types";

type StemLaneProps = {
  stem: Stem;
  /** the take this version holds, or null when the slot is empty here */
  take: Take | null;
  peaks: number[] | undefined;
  progress: number;
  muted: boolean;
  soloed: boolean;
  anySoloed: boolean;
  /**
   * The song is this one file. Solo and mute do nothing on a lane with no
   * other lanes beside it, and "take" and "stem" are words the band never
   * needed, so the lane drops both.
   */
  singleFile: boolean;
  isLeader: boolean;
  currentUserId: string | null;
  /** other takes handed in for this slot, for the swap menu */
  takes: Take[];
  takesLoading: boolean;
  onOpenTakes: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSeekFraction: (fraction: number) => void;
  onColorChange: (color: string | null) => void;
  onRename: (name: string) => void;
  onUploadTake: () => void;
  onUseTake: (take: Take) => void;
  onRenameTake: (take: Take, label: string) => void;
  onRemoveTake: (take: Take) => void;
  onRemoveStem: () => void;
};

export function StemLane({
  stem,
  take,
  peaks,
  progress,
  muted,
  soloed,
  anySoloed,
  singleFile,
  isLeader,
  currentUserId,
  takes,
  takesLoading,
  onOpenTakes,
  onToggleMute,
  onToggleSolo,
  onSeekFraction,
  onColorChange,
  onRename,
  onUploadTake,
  onUseTake,
  onRenameTake,
  onRemoveTake,
  onRemoveStem,
}: StemLaneProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(stem.name);
  const [takesOpen, setTakesOpen] = useState(false);
  const [renamingTakeId, setRenamingTakeId] = useState<string | null>(null);
  const [draftTakeLabel, setDraftTakeLabel] = useState("");

  const color = stemColor(stem);

  /**
   * The slot exists on the song but holds nothing in the version being shown.
   *
   * Kept on screen rather than hidden: the lane is where you upload into it and
   * where you put it back, and a registry that disappears when you look at an
   * older version is harder to work with than a dimmed row. It just has to say
   * what it is.
   */
  const absent = take === null;

  // What you would actually hear right now. Solo anywhere on the song silences
  // every lane that is not soloed, which is what makes solo useful.
  const silenced = anySoloed ? !soloed : muted;

  function commitRename() {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== stem.name) onRename(trimmed);
    else setDraftName(stem.name);
  }

  return (
    <li
      className={`flex flex-col gap-2 border-b border-neutral-800 px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3 ${
        absent ? "opacity-45" : ""
      }`}
    >
      {/* The colour is an edge accent, never the text colour. */}
      <span
        aria-hidden
        className="hidden w-1 shrink-0 self-stretch rounded-full sm:block"
        style={{
          backgroundColor: color,
          opacity: absent || silenced ? 0.3 : 1,
        }}
      />

      <div className="flex w-full items-center gap-2 sm:w-44 sm:shrink-0">
        <StemColorPicker
          color={color}
          chosen={stem.color}
          onChange={onColorChange}
          label={stem.name}
        />

        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") {
                  setDraftName(stem.name);
                  setRenaming(false);
                }
              }}
              className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-sm text-yellow-100 outline-none focus:border-yellow-200"
            />
          ) : (
            /* The name used to be a button that looked exactly like text, so
               nobody found it. A pencil is the whole difference between a
               feature that exists and one that is used. */
            <button
              onClick={() => setRenaming(true)}
              title="Rename this stem"
              className="group flex max-w-full items-center gap-1 text-left transition hover:cursor-pointer"
            >
              <span className="truncate text-sm font-semibold text-yellow-100 group-hover:text-yellow-200">
                {stem.name}
              </span>
              <Pencil className="h-2.5 w-2.5 shrink-0 text-neutral-600 group-hover:text-yellow-200" />
            </button>
          )}

          <p className="truncate text-[11px] text-neutral-500">
            {take ? take.label : `${stemKindLabel(stem.kind)} — not in this version`}
          </p>
        </div>
      </div>

      <div className={singleFile ? "hidden" : "flex shrink-0 items-center gap-1"}>
        <button
          onClick={onToggleSolo}
          disabled={absent}
          title={absent ? "Nothing to solo in this version" : soloed ? "Unsolo" : "Solo"}
          aria-pressed={soloed}
          className={`h-6 w-6 rounded-sm border text-[10px] font-bold transition hover:cursor-pointer disabled:cursor-not-allowed ${
            soloed
              ? "border-yellow-100 bg-yellow-100 text-black"
              : "border-neutral-700 text-neutral-400 hover:border-yellow-200 hover:text-yellow-100"
          }`}
        >
          S
        </button>

        <button
          onClick={onToggleMute}
          disabled={absent}
          title={absent ? "Nothing to mute in this version" : muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className={`h-6 w-6 rounded-sm border text-[10px] font-bold transition hover:cursor-pointer disabled:cursor-not-allowed ${
            muted
              ? "border-red-400 bg-red-400/20 text-red-300"
              : "border-neutral-700 text-neutral-400 hover:border-yellow-200 hover:text-yellow-100"
          }`}
        >
          M
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <StemWaveform
          peaks={peaks}
          progress={progress}
          color={color}
          dimmed={silenced}
          absent={absent}
          onSeekFraction={absent ? undefined : onSeekFraction}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onUploadTake}
          title={singleFile ? "Upload a new mix" : "Upload a take into this stem"}
          aria-label={
            singleFile ? "Upload a new mix" : `Upload a take into ${stem.name}`
          }
          className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
        >
          <Upload className="h-3.5 w-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              const next = !takesOpen;
              setTakesOpen(next);
              if (next) onOpenTakes();
            }}
            title={
              singleFile
                ? "Every mix uploaded for this song"
                : "Takes handed in for this stem"
            }
            aria-label={singleFile ? "Uploaded mixes" : `Takes for ${stem.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {takesOpen && (
            <>
              <button
                aria-label="Close"
                onClick={() => setTakesOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />

              {/* On mobile the lane stacks, so this button sits at the left
                  edge and a right-anchored menu hangs 256px off the screen.
                  Anchor left below sm, right from sm up where the button group
                  really is on the right. The cap keeps it inside a narrow
                  phone either way. */}
              <div className="absolute left-0 z-20 mt-1 w-64 max-w-[calc(100vw-4rem)] rounded-md border border-neutral-700 bg-neutral-900 p-2 shadow-2xl sm:left-auto sm:right-0">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {singleFile ? "Uploaded mixes" : `Takes in ${stem.name}`}
                </p>

                {takesLoading ? (
                  <p className="px-1 py-2 text-xs text-neutral-500">Loading…</p>
                ) : takes.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-neutral-500">
                    Nothing handed in yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {takes.map((candidate) => {
                      const inUse = candidate.id === take?.id;
                      const canRemove =
                        isLeader || candidate.uploader?.id === currentUserId;

                      return (
                        <li
                          key={candidate.id}
                          className="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-neutral-800"
                        >
                          <div className="min-w-0 flex-1">
                            {renamingTakeId === candidate.id ? (
                              <input
                                autoFocus
                                value={draftTakeLabel}
                                onChange={(event) =>
                                  setDraftTakeLabel(event.target.value)
                                }
                                onBlur={() => {
                                  const trimmed = draftTakeLabel.trim();
                                  if (trimmed && trimmed !== candidate.label) {
                                    onRenameTake(candidate, trimmed);
                                  }
                                  setRenamingTakeId(null);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter")
                                    event.currentTarget.blur();
                                  if (event.key === "Escape")
                                    setRenamingTakeId(null);
                                }}
                                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-1 py-0.5 text-xs text-yellow-100 outline-none focus:border-yellow-200"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setRenamingTakeId(candidate.id);
                                  setDraftTakeLabel(candidate.label);
                                }}
                                title="Rename this take"
                                className="group flex w-full items-center gap-1 text-left hover:cursor-pointer"
                              >
                                <span className="truncate text-xs text-yellow-100">
                                  {candidate.label}
                                </span>
                                <Pencil className="h-2.5 w-2.5 shrink-0 text-neutral-600 group-hover:text-yellow-200" />
                              </button>
                            )}
                            <p className="truncate text-[10px] text-neutral-500">
                              {candidate.uploader?.username ?? "a departed member"}
                            </p>
                          </div>

                          {inUse ? (
                            <span
                              title="In the current version"
                              className="text-[10px] font-semibold uppercase text-yellow-100"
                            >
                              in use
                            </span>
                          ) : (
                            isLeader && (
                              <button
                                onClick={() => {
                                  onUseTake(candidate);
                                  setTakesOpen(false);
                                }}
                                title="Put this take in the next version"
                                className="text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}

                          {canRemove && !inUse && (
                            <button
                              onClick={() => onRemoveTake(candidate)}
                              title="Withdraw this take"
                              aria-label={`Withdraw ${candidate.label}`}
                              className="text-neutral-500 transition hover:cursor-pointer hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {isLeader && (
                  <button
                    onClick={() => {
                      setTakesOpen(false);
                      onRemoveStem();
                    }}
                    className="mt-2 w-full rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-500 transition hover:cursor-pointer hover:border-red-400/40 hover:text-red-300"
                  >
                    {singleFile
                      ? "Take the audio out of the song"
                      : "Remove this stem entirely"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
