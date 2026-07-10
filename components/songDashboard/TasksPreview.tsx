type Task = {
  id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  assignee: { id: string; username: string } | null;
};

type TasksPreviewProps = {
  tasks: Task[];
  onViewAll: () => void;
};

export function TasksPreview({ tasks, onViewAll }: TasksPreviewProps) {
  const preview = tasks.slice(0, 3);

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          Tasks
        </h3>
        <button
          disabled
          title="Coming in Phase 2"
          className="cursor-not-allowed rounded-md border border-neutral-800 px-3 py-1 text-xs text-neutral-600"
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
                readOnly
                disabled
                className="h-4 w-4 shrink-0 rounded border-neutral-600 accent-yellow-100"
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
              <span className="shrink-0 text-xs text-neutral-500">
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString("no-NO")
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
