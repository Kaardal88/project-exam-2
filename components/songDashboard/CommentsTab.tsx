"use client";

import { useState } from "react";
import { formatSongTime } from "@/lib/utils";
import { TICKET_STATUSES, TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";

type BandMember = {
  user_id: string;
  user: { id: string; username: string; image_url?: string | null };
};

type Comment = {
  id: string;
  timestamp_seconds: number;
  body: string;
  status: TicketStatus;
  created_at: string | null;
  resolved_at: string | null;
  author: { id: string; username: string; image_url: string | null } | null;
  assignee: { id: string; username: string; image_url: string | null } | null;
};

type HistoryEvent = {
  id: string;
  event_type: "status_change" | "reassigned";
  from_value: string | null;
  to_value: string | null;
  created_at: string | null;
  actor: { id: string; username: string; image_url: string | null } | null;
};

type CommentsTabProps = {
  songId: string;
  comments: Comment[];
  bandMembers: BandMember[];
  role: string | null;
  currentUserId: string | null;
  onCommentsChanged: () => void;
  onSeekAndShow: (seconds: number) => void;
};

const FILTERS: { label: string; value: "all" | TicketStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "WIP", value: "wip" },
  { label: "Done", value: "done" },
];

function resolveUserName(
  idOrUnassigned: string | null,
  bandMembers: BandMember[],
) {
  if (!idOrUnassigned || idOrUnassigned === "unassigned") return "Unassigned";
  return (
    bandMembers.find((member) => member.user.id === idOrUnassigned)?.user
      .username ?? "Unknown"
  );
}

function formatHistoryLine(event: HistoryEvent, bandMembers: BandMember[]) {
  const actorName = event.actor?.username ?? "Someone";
  const date = event.created_at
    ? new Date(event.created_at).toLocaleDateString("no-NO")
    : "";

  if (event.event_type === "status_change") {
    const from = event.from_value
      ? TICKET_STATUS_STYLES[event.from_value as TicketStatus]?.label ?? event.from_value
      : "?";
    const to = event.to_value
      ? TICKET_STATUS_STYLES[event.to_value as TicketStatus]?.label ?? event.to_value
      : "?";
    return `${actorName} changed status ${from} → ${to} · ${date}`;
  }

  const from = resolveUserName(event.from_value, bandMembers);
  const to = resolveUserName(event.to_value, bandMembers);
  return `${actorName} reassigned ${from} → ${to} · ${date}`;
}

export function CommentsTab({
  songId,
  comments,
  bandMembers,
  role,
  currentUserId,
  onCommentsChanged,
  onSeekAndShow,
}: CommentsTabProps) {
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEvent[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const filtered =
    filter === "all" ? comments : comments.filter((c) => c.status === filter);

  async function toggleHistory(commentId: string) {
    if (expandedId === commentId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(commentId);

    if (history[commentId]) return;

    setHistoryLoading(commentId);

    const response = await fetch(
      `/api/songs/${songId}/comments/${commentId}/history`,
    );

    if (response.ok) {
      const data: HistoryEvent[] = await response.json();
      setHistory((prev) => ({ ...prev, [commentId]: data }));
    }

    setHistoryLoading(null);
  }

  async function updateComment(
    commentId: string,
    updates: { status?: TicketStatus; assignee_id?: string | null },
  ) {
    const response = await fetch(
      `/api/songs/${songId}/comments/${commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      },
    );

    if (response.ok) {
      onCommentsChanged();
      setHistory((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:cursor-pointer ${
              filter === f.value
                ? "border-yellow-100 bg-yellow-100 text-black"
                : "border-neutral-700 text-neutral-300 hover:border-yellow-200 hover:text-yellow-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">No tickets in this view</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((comment) => {
            const canManage =
              comment.assignee?.id === currentUserId || role === "band_leader";

            return (
              <li
                key={comment.id}
                className="rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {comment.author?.image_url ? (
                    <img
                      src={comment.author.image_url}
                      alt={comment.author.username}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-yellow-100">
                      {(comment.author?.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-yellow-100">
                    {comment.author?.username ?? "Unknown"}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleDateString("no-NO")
                      : ""}
                  </span>

                  <button
                    onClick={() => onSeekAndShow(comment.timestamp_seconds)}
                    className="ml-auto rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                  >
                    {formatSongTime(comment.timestamp_seconds)}
                  </button>
                </div>

                <p className="mt-2 text-neutral-300">{comment.body}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    Status
                    <select
                      value={comment.status}
                      disabled={!canManage}
                      title={
                        canManage
                          ? undefined
                          : "Only the assignee or band leader can change status"
                      }
                      onChange={(e) =>
                        updateComment(comment.id, {
                          status: e.target.value as TicketStatus,
                        })
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none transition focus:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {TICKET_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TICKET_STATUS_STYLES[status].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    Assignee
                    <select
                      value={comment.assignee?.id ?? ""}
                      disabled={!canManage}
                      title={
                        canManage
                          ? undefined
                          : "Only the current assignee or band leader can reassign"
                      }
                      onChange={(e) =>
                        updateComment(comment.id, {
                          assignee_id: e.target.value || null,
                        })
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none transition focus:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <option value="">Unassigned</option>
                      {bandMembers.map((member) => (
                        <option key={member.user_id} value={member.user.id}>
                          {member.user.username}
                        </option>
                      ))}
                    </select>
                  </label>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${TICKET_STATUS_STYLES[comment.status].badge}`}
                  >
                    {TICKET_STATUS_STYLES[comment.status].label}
                  </span>

                  {comment.resolved_at && (
                    <span className="text-xs text-neutral-500">
                      Resolved{" "}
                      {new Date(comment.resolved_at).toLocaleDateString("no-NO")}
                    </span>
                  )}

                  <button
                    onClick={() => toggleHistory(comment.id)}
                    className="ml-auto text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
                  >
                    {expandedId === comment.id ? "Hide history" : "History"}
                  </button>
                </div>

                {expandedId === comment.id && (
                  <div className="mt-3 border-t border-neutral-800 pt-3">
                    {historyLoading === comment.id ? (
                      <p className="text-xs text-neutral-500">Loading…</p>
                    ) : history[comment.id]?.length ? (
                      <ul className="space-y-1">
                        {history[comment.id].map((event) => (
                          <li key={event.id} className="text-xs text-neutral-400">
                            {formatHistoryLine(event, bandMembers)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-500">No changes yet</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
