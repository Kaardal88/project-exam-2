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
  timestamp_seconds: number | null;
  song_version_id: string | null;
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
  created_at: string | null;
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
  bandMembers: BandMember[];
  comments: Comment[];
  tasks: Task[];
  notes: Note[];
  onCommentsChanged: () => void;
  onTasksChanged: () => void;
  setActiveTab: (tab: SongTab) => void;
  seekSignal: { seconds: number; nonce: number } | null;
  onSeek: (seconds: number) => void;
  audioUrl: string | null;
  onAudioUrlExpired: () => void;
  /** the version the song currently is — what the player is playing */
  currentVersionId: string | null;
  /** switches to the Comments tab and scrolls to this one */
  onFocusComment: (commentId: string) => void;
};

export function DashboardTab({
  songId,
  bandMembers,
  comments,
  tasks,
  notes,
  onCommentsChanged,
  onTasksChanged,
  setActiveTab,
  seekSignal,
  onSeek,
  audioUrl,
  onAudioUrlExpired,
  currentVersionId,
  onFocusComment,
}: DashboardTabProps) {
  const [playerPosition, setPlayerPosition] = useState(0);
  // Closing hides the card for this visit rather than persisting a preference:
  // it is a "get this out of my way while I read the comments", not a setting.
  const [playerClosed, setPlayerClosed] = useState(false);
  const [addCommentSeconds, setAddCommentSeconds] = useState<number | null>(
    null,
  );

  return (
    <div className="space-y-6">
      {playerClosed ? (
        <button
          onClick={() => setPlayerClosed(false)}
          className="w-full rounded-md border border-dashed border-neutral-700 px-4 py-2 text-xs text-neutral-500 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
        >
          Show the player
        </button>
      ) : (
        <MediaPlayer
          songId={songId}
          audioUrl={audioUrl}
          comments={comments}
          onRequestAddComment={(seconds) => setAddCommentSeconds(seconds)}
          onPositionChange={setPlayerPosition}
          seekSignal={seekSignal}
          onAudioUrlExpired={onAudioUrlExpired}
          onOpenStudio={() => setActiveTab("Studio")}
          onClose={() => setPlayerClosed(true)}
          versionId={currentVersionId}
        />
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <CommentsPreview
          comments={comments}
          onNewComment={() => setAddCommentSeconds(playerPosition)}
          onViewAll={() => setActiveTab("Comments")}
          onSeek={onSeek}
          onOpenComment={onFocusComment}
        />
        <TasksPreview
          songId={songId}
          tasks={tasks}
          onViewAll={() => setActiveTab("Tasks")}
          onTasksChanged={onTasksChanged}
        />
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
          // The dashboard player always plays the current version, so anything
          // pinned to a moment here is pinned to that version.
          versionId={currentVersionId}
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
