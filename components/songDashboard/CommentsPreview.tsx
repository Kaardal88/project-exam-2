"use client";

import { formatSongTime } from "@/lib/utils";

type Comment = {
  id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string | null;
  author: { id: string; username: string; image_url: string | null } | null;
  assignee: { id: string; username: string; image_url: string | null } | null;
};

type CommentsPreviewProps = {
  comments: Comment[];
  onNewComment: () => void;
  onViewAll: () => void;
  onSeek: (seconds: number) => void;
};

export function CommentsPreview({
  comments,
  onNewComment,
  onViewAll,
  onSeek,
}: CommentsPreviewProps) {
  const preview = comments.slice(0, 3);

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-100">
          Comments
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

              <p className="mt-1 text-neutral-300">{comment.body}</p>

              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => onSeek(comment.timestamp_seconds)}
                  className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                >
                  {formatSongTime(comment.timestamp_seconds)}
                </button>

                {comment.assignee && (
                  <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                    {comment.assignee.username}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onViewAll}
        className="mt-4 text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
      >
        View all comments →
      </button>
    </section>
  );
}
