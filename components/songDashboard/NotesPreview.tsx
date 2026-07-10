import { stripHtml } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  body: string;
  kind: "note" | "lyrics";
  created_at: string | null;
  publisher: { id: string; username: string } | null;
};

type NotesPreviewProps = {
  notes: Note[];
  onViewAll: () => void;
};

export function NotesPreview({ notes, onViewAll }: NotesPreviewProps) {
  const preview = notes.filter((note) => note.kind === "note").slice(0, 2);

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-yellow-100">
        Notes
      </h3>

      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500">No notes yet</p>
      ) : (
        <ul className="space-y-3">
          {preview.map((note) => (
            <li key={note.id} className="text-sm">
              <p className="font-semibold text-yellow-100">{note.title}</p>
              <p className="mt-1 line-clamp-2 text-neutral-300">
                {stripHtml(note.body)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {note.publisher?.username ?? "Unknown"}
                {note.created_at
                  ? ` · ${new Date(note.created_at).toLocaleDateString("no-NO")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onViewAll}
        className="mt-4 text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
      >
        View all notes →
      </button>
    </section>
  );
}
