type Task = {
  id: string;
  title: string;
  created_at: string | null;
  is_done: boolean;
  assignee: { id: string; username: string } | null;
};

type TasksPreviewProps = {
  songId: string;
  tasks: Task[];
  onViewAll: () => void;
  onTasksChanged: () => void;
};

export function TasksPreview({
  songId,
  tasks,
  onViewAll,
  onTasksChanged,
}: TasksPreviewProps) {
  // Open first. Three rows is barely a list, and spending them on things
  // already ticked off would leave the card saying nothing.
  const preview = [...tasks]
    .sort((a, b) => Number(a.is_done) - Number(b.is_done))
    .slice(0, 3);

  const done = tasks.filter((task) => task.is_done).length;

  async function toggle(task: Task) {
    const response = await fetch(`/api/songs/${songId}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_done: !task.is_done }),
    });

    if (response.ok) onTasksChanged();
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          Tasks{" "}
          {tasks.length > 0 && (
            <span className="font-normal normal-case tracking-normal text-neutral-400">
              {done}/{tasks.length}
            </span>
          )}
        </h3>
        {/* The form lives on the tab. This is a preview, and giving it a second
            place to type a task would be two things to keep in step. */}
        <button
          onClick={onViewAll}
          className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-yellow-100 transition hover:cursor-pointer hover:bg-neutral-800"
        >
          + New task
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500">No tasks yet</p>
      ) : (
        <ul className="space-y-2">
          {preview.map((task) => (
            <li key={task.id} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => void toggle(task)}
                aria-label={`Mark "${task.title}" as ${
                  task.is_done ? "not done" : "done"
                }`}
                className="h-4 w-4 shrink-0 rounded border-neutral-600 accent-yellow-100 hover:cursor-pointer"
              />
              <span
                className={`flex-1 truncate ${
                  task.is_done ? "text-neutral-500 line-through" : "text-neutral-200"
                }`}
              >
                {task.title}
              </span>
              <span className="shrink-0 text-xs text-neutral-400">
                {task.assignee?.username ?? "Unassigned"}
              </span>
              <span className="shrink-0 text-xs text-neutral-500" title="Added">
                {task.created_at
                  ? new Date(task.created_at).toLocaleDateString("no-NO")
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onViewAll}
        className="mt-4 text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
      >
        View all tasks →
      </button>
    </section>
  );
}
