"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { stemKinds, stemColor } from "@/lib/stemKinds";
import type { Stem } from "./types";

function labelFor(kind: string) {
  return stemKinds.find((option) => option.value === kind)?.label ?? "Stem";
}

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

  /**
   * The name starts filled in with the kind's label rather than empty behind a
   * placeholder, and it says "Name" rather than "optional".
   *
   * The first real song built this way came out with five lanes all called
   * "Clean guitar": the field was easy to skip, and the *take* label right
   * after it was required, so the names the band actually wanted -- "Clean
   * Rythm L", "Clean Lead R" -- all went onto the takes instead. A visible
   * value invites editing in a way a placeholder does not.
   */
  const [name, setName] = useState(labelFor(initialKind));
  const [nameTouched, setNameTouched] = useState(false);

  // Adjusting state in response to a prop change, not an effect -- the same
  // pattern the media player uses for its seek signal.
  if (initialKind !== appliedInitialKind) {
    setAppliedInitialKind(initialKind);
    setKind(initialKind);
    if (!nameTouched) setName(labelFor(initialKind));
  }

  function chooseKind(value: string) {
    setKind(value);
    // Follows the kind until the band types something of their own, then stops.
    if (!nameTouched) setName(labelFor(value));
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the stem a name — it is what the lane is called");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/songs/${songId}/stems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), kind }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add the stem");
      }

      const stem: Stem = await response.json();

      setName(labelFor(kind));
      setNameTouched(false);
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
          The name is what you will see on the lane, so call it what you call it
          in your DAW.
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
                onClick={() => chooseKind(option.value)}
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
            Name this lane
          </label>
          <input
            id="stem-name"
            value={name}
            onChange={(event) => {
              setNameTouched(true);
              setName(event.target.value);
            }}
            placeholder={labelFor(kind)}
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
