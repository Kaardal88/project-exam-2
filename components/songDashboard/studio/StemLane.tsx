"use client";

import { useState } from "react";
import { Upload, Trash2, Check, ChevronDown } from "lucide-react";
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
  onRemoveTake,
  onRemoveStem,
}: StemLaneProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(stem.name);
  const [takesOpen, setTakesOpen] = useState(false);

  const color = stemColor(stem);

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
    <li className="flex flex-col gap-2 border-b border-neutral-800 px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      {/* The colour is an edge accent, never the text colour. */}
      <span
        aria-hidden
        className="hidden w-1 shrink-0 self-stretch rounded-full sm:block"
        style={{ backgroundColor: color, opacity: silenced ? 0.3 : 1 }}
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
            <button
              onClick={() => setRenaming(true)}
              title="Rename this stem"
              className="block max-w-full truncate text-left text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:text-yellow-200"
            >
              {stem.name}
            </button>
          )}

          <p className="truncate text-[11px] text-neutral-500">
            {take ? take.label : `${stemKindLabel(stem.kind)} — empty`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onToggleSolo}
          title={soloed ? "Unsolo" : "Solo"}
          aria-pressed={soloed}
          className={`h-6 w-6 rounded-sm border text-[10px] font-bold transition hover:cursor-pointer ${
            soloed
              ? "border-yellow-100 bg-yellow-100 text-black"
              : "border-neutral-700 text-neutral-400 hover:border-yellow-200 hover:text-yellow-100"
          }`}
        >
          S
        </button>

        <button
          onClick={onToggleMute}
          title={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className={`h-6 w-6 rounded-sm border text-[10px] font-bold transition hover:cursor-pointer ${
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
          onSeekFraction={onSeekFraction}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onUploadTake}
          title="Upload a take into this stem"
          aria-label={`Upload a take into ${stem.name}`}
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
            title="Takes handed in for this stem"
            aria-label={`Takes for ${stem.name}`}
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

              <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Takes in {stem.name}
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
                            <p className="truncate text-xs text-yellow-100">
                              {candidate.label}
                            </p>
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
                    Remove this stem entirely
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
