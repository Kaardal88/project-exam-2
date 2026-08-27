"use client";

import { formatSongTime } from "@/lib/utils";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";

type Comment = {
  id: string;
  timestamp_seconds: number | null;
  body: string;
  status: TicketStatus;
  created_at: string | null;
  author: { id: string; username: string; image_url: string | null } | null;
  assignee: { id: string; username: string; image_url: string | null } | null;
};

type CommentsPreviewProps = {
  comments: Comment[];
  onNewComment: () => void;
  onViewAll: () => void;
  onSeek: (seconds: number) => void;
  /** takes the reader to this comment in the Comments tab */
  onOpenComment: (commentId: string) => void;
};

/**
 * Two, and no more.
 *
 * This sits in a row of three cards on the dashboard, so its height is shared
 * with its neighbours -- a card that grows with the number of comments pushes
 * the page around for reasons that have nothing to do with what the reader is
 * looking at. Two, each clamped to two lines, is a fixed and predictable box.
 * "View all comments" is right there for the rest.
 */
const PREVIEW_COUNT = 2;

export function CommentsPreview({
  comments,
  onNewComment,
  onViewAll,
  onSeek,
  onOpenComment,
}: CommentsPreviewProps) {
  const preview = comments.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          Latest comments
        </h3>
        <button
          onClick={onNewComment}
          className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
        >
          New comment
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500">No comments yet</p>
      ) : (
        <ul className="space-y-3">
          {preview.map((comment) => (
            <li key={comment.id} className="text-sm">
              {/* The whole card opens it in the Comments tab. The timestamp
                  below stays its own control -- one seeks, the other reads --
                  and a button inside a button is not valid markup anyway. */}
              <button
                onClick={() => onOpenComment(comment.id)}
                className="w-full rounded-sm text-left transition hover:cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-2">
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
                </div>

                <p className="mt-1 line-clamp-2 text-neutral-300">
                  {comment.body}
                </p>
              </button>

              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => comment.timestamp_seconds !== null &&
                  onSeek(comment.timestamp_seconds)}
                  className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                >
                  {comment.timestamp_seconds !== null
                    ? formatSongTime(comment.timestamp_seconds)
                    : "—"}
                </button>

                {comment.assignee && (
                  <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                    {comment.assignee.username}
                  </span>
                )}

                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${TICKET_STATUS_STYLES[comment.status].badge}`}
                >
                  {TICKET_STATUS_STYLES[comment.status].label}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onViewAll}
        className="mt-4 text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
      >
        {/* Two cards say nothing about whether there are twenty behind them.
            The number belongs here rather than beside the heading: it is the
            answer to "is there more", which is the question this link is. */}
        {comments.length > PREVIEW_COUNT
          ? `View all ${comments.length} comments →`
          : "View all comments →"}
      </button>
    </section>
  );
}
