"use client";

import { useRef } from "react";

/**
 * A file input that speaks English.
 *
 * The browser's own `<input type="file">` draws its button and its "no file
 * chosen" in the operating system's language, and no attribute or CSS changes
 * that -- so on a Norwegian machine an English app said "Velg fil". The real
 * input is still here, hidden, doing the picking; only the part people see is
 * ours.
 */
export function FilePicker({
  file,
  onChange,
  accept,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="shrink-0 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {file ? "Choose another" : "Choose file"}
      </button>

      <span
        className={`min-w-0 truncate text-xs ${
          file ? "text-neutral-300" : "text-neutral-500"
        }`}
      >
        {file ? file.name : "No file chosen"}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => {
          // Cancelling the dialog keeps what was already chosen.
          const picked = event.target.files?.[0];
          if (picked) onChange(picked);
          // Cleared so picking the same file again after a failed upload
          // still fires a change.
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
