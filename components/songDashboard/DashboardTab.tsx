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
  bandMembers: BandMember[];
  comments: Comment[];
  tasks: Task[];
  notes: Note[];
  onCommentsChanged: () => void;
  setActiveTab: (tab: SongTab) => void;
  seekSignal: { seconds: number; nonce: number } | null;
  onSeek: (seconds: number) => void;
  audioUrl: string | null;
  onAudioUploaded: () => void;
  onAudioUrlExpired: () => void;
};

export function DashboardTab({
  songId,
  bandMembers,
  comments,
  tasks,
  notes,
  onCommentsChanged,
  setActiveTab,
  seekSignal,
  onSeek,
  audioUrl,
  onAudioUploaded,
  onAudioUrlExpired,
}: DashboardTabProps) {
  const [playerPosition, setPlayerPosition] = useState(0);
  const [addCommentSeconds, setAddCommentSeconds] = useState<number | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <MediaPlayer
        songId={songId}
        audioUrl={audioUrl}
        comments={comments}
        onRequestAddComment={(seconds) => setAddCommentSeconds(seconds)}
        onPositionChange={setPlayerPosition}
        seekSignal={seekSignal}
        onAudioUploaded={onAudioUploaded}
        onAudioUrlExpired={onAudioUrlExpired}
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
