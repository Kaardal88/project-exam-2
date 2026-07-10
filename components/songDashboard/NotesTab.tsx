"use client";

import { useState } from "react";
import { NoteEditorModal } from "./NoteEditorModal";
import { stripHtml } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  body: string;
  kind: "note" | "lyrics";
  created_at: string | null;
  updated_at: string | null;
  published_by: string | null;
  updated_by: string | null;
  publisher: { id: string; username: string } | null;
  editor: { id: string; username: string } | null;
};

type NotesTabProps = {
  songId: string;
  kind: "note" | "lyrics";
  label: string;
  notes: Note[];
  onNotesChanged: () => void;
};

export function NotesTab({ songId, kind, label, notes, onNotesChanged }: NotesTabProps) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = notes.filter((note) => note.kind === kind);
  const singular = kind === "lyrics" ? "lyrics" : "note";

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-100">{label}</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black!"
        >
          New {singular}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">No {label.toLowerCase()} yet</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => setEditingNote(note)}
              className="rounded-md border border-neutral-800 bg-neutral-950/40 p-4 text-left transition hover:cursor-pointer hover:border-yellow-200"
            >
              <p className="font-semibold text-yellow-100">{note.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-neutral-300">
                {stripHtml(note.body)}
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Published by {note.publisher?.username ?? "Unknown"}
                {note.updated_by &&
                  note.updated_by !== note.published_by &&
                  ` · last edited by ${note.editor?.username ?? "Unknown"}`}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {note.updated_at
                  ? new Date(note.updated_at).toLocaleDateString("no-NO")
                  : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <NoteEditorModal
          isOpen
          onClose={() => setCreating(false)}
          songId={songId}
          kind={kind}
          existingNote={null}
          onSaved={() => {
            setCreating(false);
            onNotesChanged();
          }}
        />
      )}

      {editingNote && (
        <NoteEditorModal
          isOpen
          onClose={() => setEditingNote(null)}
          songId={songId}
          kind={kind}
          existingNote={editingNote}
          onSaved={() => {
            setEditingNote(null);
            onNotesChanged();
          }}
        />
      )}
    </section>
  );
}
