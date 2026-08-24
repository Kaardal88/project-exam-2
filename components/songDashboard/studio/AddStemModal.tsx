"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { stemKinds, stemColor } from "@/lib/stemKinds";
import type { Stem } from "./types";

type AddStemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  /** What the picker starts on — "mix" when the band said "just the song". */
  initialKind?: string;
  /** Handed the stem it created, so the caller can go straight to the audio. */
  onAdded: (stem: Stem) => Promise<void> | void;
};

export function AddStemModal({
  isOpen,
  onClose,
  songId,
  initialKind = "vocals",
  onAdded,
}: AddStemModalProps) {
  const [kind, setKind] = useState<string>(initialKind);
  const [appliedInitialKind, setAppliedInitialKind] = useState(initialKind);

  // Adjusting state in response to a prop change, not an effect -- the same
  // pattern the media player uses for its seek signal.
  if (initialKind !== appliedInitialKind) {
    setAppliedInitialKind(initialKind);
    setKind(initialKind);
  }

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/songs/${songId}/stems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The kind's label is a sensible name, so the field is optional --
        // "Vocals" is a perfectly good name for the vocals.
        body: JSON.stringify({
          name:
            name.trim() ||
            stemKinds.find((option) => option.value === kind)?.label ||
            "Stem",
          kind,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add the stem");
      }

      const stem: Stem = await response.json();

      setName("");
      await onAdded(stem);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the stem");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-yellow-100">Add a stem</h2>

        <p className="text-xs text-neutral-400">
          A stem is one layer of the song — the drums, one guitar, a vocal.
          Adding it makes the lane; the audio comes next.
        </p>

        {error && <p className="form-error">{error}</p>}

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500">
            What is it
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            {stemKinds.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] transition hover:cursor-pointer ${
                  kind === option.value
                    ? "border-yellow-100 text-yellow-100"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: stemColor({
                      kind: option.value,
                      color: null,
                    }),
                  }}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="stem-name"
            className="mb-1.5 block text-xs uppercase tracking-wide text-neutral-500"
          >
            Call it something (optional)
          </label>
          <input
            id="stem-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              stemKinds.find((option) => option.value === kind)?.label ?? ""
            }
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
          />
        </div>

        <div className="flex justify-end gap-2">
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
            {saving ? "Adding…" : "Add stem"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
