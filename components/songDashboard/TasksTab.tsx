"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export type Task = {
  id: string;
  title: string;
  created_at: string | null;
  is_done: boolean;
  assignee: { id: string; username: string } | null;
};

type BandMember = {
  id: string;
  user_id: string;
  role: string;
  user: { id: string; username: string; image_url: string | null };
};

type TaskFilter = "open" | "done" | "all";

/**
 * The song's checklist.
 *
 * Flatter than the comments tab on purpose. A comment is somebody's opinion
 * about a moment in a take and needs an author, a status and a history; a task
 * is a line the band ticks off together. Everyone with access to the song can
 * add, tick and remove -- see the route for why there is nobody who "owns" a
 * task.
 */
export function TasksTab({
  songId,
  tasks,
  bandMembers,
  onTasksChanged,
}: {
  songId: string;
  tasks: Task[];
  bandMembers: BandMember[];
  onTasksChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("open");

  const done = tasks.filter((task) => task.is_done).length;

  const visible = tasks.filter((task) =>
    filter === "all" ? true : filter === "done" ? task.is_done : !task.is_done,
  );

  async function createTask(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || saving) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/songs/${songId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        assignee_id: assigneeId || null,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Couldn't add the task");
      return;
    }

    // Only the title clears. Adding five tasks for the same person before a
    // rehearsal is the common case, and re-picking them each time is friction
    // for no reason.
    //
    // No due date field: a deadline is an agreement about when, which is a
    // different conversation from what is left to do. The column is still in
    // the table if the band ever asks for one.
    setTitle("");
    onTasksChanged();
  }

  async function updateTask(taskId: string, changes: Partial<Task>) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    if (!response.ok) {
      setError("Couldn't save the change");
      return;
    }

    onTasksChanged();
  }

  async function deleteTask(taskId: string) {
    setError(null);

    const response = await fetch(`/api/songs/${songId}/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Couldn't delete the task");
      return;
    }

    onTasksChanged();
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-yellow-100">
          Tasks{" "}
          <span className="text-sm font-normal text-neutral-400">
            {done}/{tasks.length} done
          </span>
        </h2>

        <div className="flex gap-2">
          {(["open", "done", "all"] as TaskFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md border border-neutral-700 px-3 py-1 text-xs capitalize transition hover:cursor-pointer ${
                filter === value
                  ? "bg-yellow-100 text-black"
                  : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={createTask}
        className="mb-4 flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 sm:flex-row sm:items-center"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          maxLength={255}
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition placeholder:text-neutral-600 focus:border-yellow-200"
        />

        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          aria-label="Assignee"
          className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
        >
          <option value="">Unassigned</option>
          {bandMembers.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.username}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="rounded-md border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-yellow-100!"
        >
          Add
        </button>
      </form>

      {error && <p className="form-error mb-3">{error}</p>}

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {tasks.length === 0
            ? "No tasks yet"
            : filter === "open"
              ? "Nothing left to do"
              : "Nothing here"}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-3"
            >
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() =>
                  void updateTask(task.id, { is_done: !task.is_done })
                }
                aria-label={`Mark "${task.title}" as ${
                  task.is_done ? "not done" : "done"
                }`}
                className="h-4 w-4 shrink-0 rounded border-neutral-600 accent-yellow-100 hover:cursor-pointer"
              />

              <span
                className={`min-w-0 flex-1 break-words text-sm ${
                  task.is_done
                    ? "text-neutral-500 line-through"
                    : "text-neutral-200"
                }`}
              >
                {task.title}
              </span>

              <span className="shrink-0 text-xs text-neutral-400">
                {task.assignee?.username ?? "Unassigned"}
              </span>

              <span
                className="shrink-0 text-xs text-neutral-500"
                title="Added"
              >
                {task.created_at
                  ? new Date(task.created_at).toLocaleDateString("no-NO")
                  : "—"}
              </span>

              <button
                onClick={() => void deleteTask(task.id)}
                aria-label={`Delete "${task.title}"`}
                className="shrink-0 rounded p-1 text-neutral-500 transition hover:cursor-pointer hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
