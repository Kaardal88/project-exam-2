"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

/**
 * One of the chips under a song's title -- BPM, key -- that turns into an input
 * when clicked.
 *
 * Deliberately a bare text field for now: the band types what they would say
 * out loud ("F#m", "A minor"), and nothing is picked from a list. A key picker
 * or a tap-tempo button can replace the input later without the page around it
 * changing.
 *
 * Enter and clicking away both save, Escape abandons. A failed save leaves the
 * field open with what was typed, rather than snapping back and losing it.
 */
export function SongMetaChip({
  label,
  value,
  display,
  placeholder,
  maxLength,
  inputMode = "text",
  onSave,
}: {
  /** "BPM", "Key" -- shown in the chip while it is being edited. */
  label: string;
  /** The stored value as text, "" when there is none. */
  value: string;
  /** What the chip reads when it is not being edited, or null when unset. */
  display: string | null;
  placeholder: string;
  maxLength: number;
  inputMode?: "text" | "numeric";
  /** Resolves to an error message, or to null once the value is saved. */
  onSave: (draft: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Escape closes the field, and a browser may blur a focused input as it is
   * removed -- which would save the very draft being abandoned.
   */
  const abandoning = useRef(false);

  function startEditing() {
    abandoning.current = false;
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  async function commit() {
    if (abandoning.current || saving) return;

    if (draft.trim() === value) {
      setEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    const message = await onSave(draft);
    setSaving(false);

    if (message) {
      setError(message);
      return;
    }

    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        title={`Edit ${label.toLowerCase()}`}
        className="group flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
      >
        {display ?? `${label} —`}
        <Pencil className="h-2.5 w-2.5 shrink-0 text-neutral-600 group-hover:text-yellow-200" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <label
        className={`flex items-center gap-1.5 rounded-full border bg-neutral-950 px-3 py-1 text-xs transition focus-within:border-yellow-200 ${
          error ? "border-red-800" : "border-neutral-700"
        }`}
      >
        <span className="text-neutral-500">{label}</span>
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              abandoning.current = true;
              setEditing(false);
              setError(null);
            }
          }}
          disabled={saving}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          // Sized in characters, so the chip grows with what is typed instead
          // of reserving room for the longest key there is.
          size={Math.max(draft.length, placeholder.length, 2)}
          className="bg-transparent text-yellow-100 outline-none placeholder:text-neutral-600 disabled:opacity-50"
        />
      </label>

      {error && <span className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
