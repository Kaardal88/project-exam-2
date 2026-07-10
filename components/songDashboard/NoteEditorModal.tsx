"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RichTextEditor } from "./RichTextEditor";

type Note = {
  id: string;
  title: string;
  body: string;
};

type NoteEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  kind: "note" | "lyrics";
  existingNote: Note | null;
  onSaved: () => void;
};

export function NoteEditorModal({
  isOpen,
  onClose,
  songId,
  kind,
  existingNote,
  onSaved,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState(existingNote?.title ?? "");
  const [body, setBody] = useState(existingNote?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = existingNote !== null;
  const label = kind === "lyrics" ? "lyrics" : "note";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title can't be empty");
      return;
    }

    setSubmitting(true);
    setError(null);

    const token = localStorage.getItem("token");

    const url = isEditing
      ? `/api/songs/${songId}/notes/${existingNote.id}`
      : `/api/songs/${songId}/notes`;

    const response = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        isEditing ? { title, body } : { title, body, kind },
      ),
    });

    if (!response.ok) {
      setError(`Failed to save ${label}`);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">
          {isEditing ? `Edit ${label}` : `New ${label}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="form-error">{error}</p>}

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              {kind === "lyrics" ? "Lyrics" : "Note"}
            </label>
            <RichTextEditor initialValue={body} onChange={setBody} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:cursor-pointer hover:bg-yellow-200 disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEditing ? "Save changes" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
