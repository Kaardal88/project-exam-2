import { mockSong, mockTasks, mockNotes } from "./data/mockData";

// Compact stand-in for the song dashboard — "the heart of the app".
// Mirrors app/songs/page.tsx's title/status/chip header
// plus condensed Tasks/Notes preview cards, with fake data.
export function SongDashboardMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-neutral-900 p-4 md:p-6">
      <h1 className="text-lg font-bold text-yellow-100 md:text-2xl">
        {mockSong.title}
      </h1>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400 md:text-sm">
        {mockSong.status === "finished" ? "Finished" : "Work in progress"}
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            mockSong.status === "finished" ? "bg-green-400" : "bg-yellow-100"
          }`}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
          {mockSong.bpm} bpm
        </span>
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
          {mockSong.key}
        </span>
      </div>

      <div className="mt-4 grid flex-1 gap-3 md:grid-cols-2">
        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-3 shadow-2xl md:p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-yellow-100 md:text-sm">
            Tasks
          </h3>
          <ul className="space-y-1.5">
            {mockTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-xs md:text-sm">
                <span
                  className={`h-3 w-3 shrink-0 rounded border ${
                    task.is_done
                      ? "border-yellow-100 bg-yellow-100/80"
                      : "border-neutral-600"
                  }`}
                />
                <span
                  className={`flex-1 truncate ${
                    task.is_done
                      ? "text-neutral-500 line-through"
                      : "text-neutral-200"
                  }`}
                >
                  {task.title}
                </span>
                <span className="shrink-0 text-[10px] text-neutral-400 md:text-xs">
                  {task.assignee}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-3 shadow-2xl md:p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-yellow-100 md:text-sm">
            Notes
          </h3>
          {mockNotes.map((note) => (
            <div key={note.id} className="text-xs md:text-sm">
              <p className="font-semibold text-yellow-100">{note.title}</p>
              <p className="mt-1 line-clamp-3 text-neutral-300">{note.body}</p>
              <p className="mt-1 text-[10px] text-neutral-500 md:text-xs">
                {note.publisher}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
