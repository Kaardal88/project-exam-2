"use client";

import { useState } from "react";
import { MediaPlayer } from "./MediaPlayer";
import { AddCommentModal } from "./AddCommentModal";
import { CommentsPreview } from "./CommentsPreview";
import { TasksPreview } from "./TasksPreview";
import { NotesPreview } from "./NotesPreview";
import type { SongTab } from "./SongTabs";
import type { TicketStatus } from "./ticketStatus";

type BandMember = {
  user_id: string;
  user: { id: string; username: string; image_url?: string | null };
};

type Comment = {
  id: string;
  timestamp_seconds: number;
  body: string;
  status: TicketStatus;
  resolved_at: string | null;
  created_at: string | null;
  author: { id: string; username: string; image_url: string | null } | null;
  assignee: { id: string; username: string; image_url: string | null } | null;
};

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  assignee: { id: string; username: string } | null;
};

type Note = {
  id: string;
  title: string;
  body: string;
  kind: "note" | "lyrics";
  created_at: string | null;
  publisher: { id: string; username: string } | null;
};

type DashboardTabProps = {
  songId: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  bandMembers: BandMember[];
  comments: Comment[];
  tasks: Task[];
  notes: Note[];
  onCommentsChanged: () => void;
  setActiveTab: (tab: SongTab) => void;
  seekSignal: { seconds: number; nonce: number } | null;
  onSeek: (seconds: number) => void;
};

export function DashboardTab({
  songId,
  createdBy,
  createdAt,
  updatedAt,
  bandMembers,
  comments,
  tasks,
  notes,
  onCommentsChanged,
  setActiveTab,
  seekSignal,
  onSeek,
}: DashboardTabProps) {
  const [playerPosition, setPlayerPosition] = useState(0);
  const [addCommentSeconds, setAddCommentSeconds] = useState<number | null>(
    null,
  );

  const creator = bandMembers.find((member) => member.user.id === createdBy);

  const contributorIds = new Set<string>();
  if (createdBy) contributorIds.add(createdBy);
  comments.forEach((comment) => {
    if (comment.author?.id) contributorIds.add(comment.author.id);
    if (comment.assignee?.id) contributorIds.add(comment.assignee.id);
  });
  tasks.forEach((task) => {
    if (task.assignee?.id) contributorIds.add(task.assignee.id);
  });
  notes.forEach((note) => {
    if (note.publisher?.id) contributorIds.add(note.publisher.id);
  });

  const contributors = bandMembers.filter((member) =>
    contributorIds.has(member.user.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
          <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-neutral-500">
            — Song dashboard —
          </p>

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Created by</dt>
              <dd className="text-yellow-100">
                {creator?.user.username ?? "Unknown"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Created at</dt>
              <dd className="text-yellow-100">
                {createdAt
                  ? new Date(createdAt).toLocaleDateString("no-NO")
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Last updated</dt>
              <dd className="text-yellow-100">
                {updatedAt
                  ? new Date(updatedAt).toLocaleDateString("no-NO")
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-neutral-500">Contributors</dt>
              <dd className="text-right text-yellow-100">
                {contributors.length
                  ? contributors.map((member) => member.user.username).join(", ")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <MediaPlayer
        comments={comments}
        onRequestAddComment={(seconds) => setAddCommentSeconds(seconds)}
        onPositionChange={setPlayerPosition}
        seekSignal={seekSignal}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <CommentsPreview
          comments={comments}
          onNewComment={() => setAddCommentSeconds(playerPosition)}
          onViewAll={() => setActiveTab("Comments")}
          onSeek={onSeek}
        />
        <TasksPreview tasks={tasks} onViewAll={() => setActiveTab("Tasks")} />
        <NotesPreview
          notes={notes}
          onViewAll={() => setActiveTab("Notes & Ideas")}
        />
      </div>

      {addCommentSeconds !== null && (
        <AddCommentModal
          isOpen
          onClose={() => setAddCommentSeconds(null)}
          songId={songId}
          timestampSeconds={addCommentSeconds}
          bandMembers={bandMembers}
          onCreated={() => {
            setAddCommentSeconds(null);
            onCommentsChanged();
          }}
        />
      )}
    </div>
  );
}
