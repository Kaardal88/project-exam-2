"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { SongSidebar } from "@/components/songDashboard/SongSidebar";
import { SettingsModal } from "@/components/songDashboard/SettingsModal";
import { SongTabs, type SongTab } from "@/components/songDashboard/SongTabs";
import { PlaceholderTab } from "@/components/songDashboard/PlaceholderTab";
import { DashboardTab } from "@/components/songDashboard/DashboardTab";
import { CommentsTab } from "@/components/songDashboard/CommentsTab";
import { NotesTab } from "@/components/songDashboard/NotesTab";
import { FilesTab } from "@/components/songDashboard/FilesTab";
import type { TicketStatus } from "@/components/songDashboard/ticketStatus";

type Song = {
  id: string;
  title: string;
  status: string;
  bpm: number | null;
  key: string | null;
  time_signature: string | null;
  audio_url: string | null;
  artwork_url: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  project: {
    id: string;
    title: string;
    type: "album" | "single";
    band_id: string;
    cover_image_url: string | null;
  };
};

type Band = {
  id: string;
  band_name: string;
  image_url: string | null;
};

type BandMember = {
  id: string;
  user_id: string;
  role: string;
  user: { id: string; username: string; image_url: string | null };
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
  updated_at: string | null;
  published_by: string | null;
  updated_by: string | null;
  publisher: { id: string; username: string } | null;
  editor: { id: string; username: string } | null;
};

type SongFile = {
  id: string;
  filename: string;
  category: string;
  file_url: string | null;
  created_at: string | null;
  uploader: { id: string; username: string } | null;
};

const PHASE_NOTES: Record<
  Exclude<SongTab, "Dashboard" | "Comments" | "Lyrics" | "Notes & Ideas" | "Files">,
  string
> = {
  Tasks: "Task creation and lifecycle coming in Phase 2.",
  Activity: "Activity feed coming soon.",
  "Song Info": "Editable BPM/key/time signature coming soon.",
};

function SongDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const songId = searchParams.get("songId");

  const [song, setSong] = useState<Song | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<SongFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SongTab>("Dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [seekSignal, setSeekSignal] = useState<{
    seconds: number;
    nonce: number;
  } | null>(null);

  const requestSeekAndShow = useCallback((seconds: number) => {
    setActiveTab("Dashboard");
    setSeekSignal({ seconds, nonce: Date.now() });
  }, []);

  const fetchSong = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    if (!songId) {
      setError("Missing song id");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/songs/${songId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setError("Failed to load song");
      setLoading(false);
      return;
    }

    const data: Song = await response.json();
    setSong(data);
  }, [router, songId]);

  useEffect(() => {
    async function loadSong() {
      await fetchSong();
    }

    void loadSong();
  }, [fetchSong]);

  useEffect(() => {
    if (!song) return;

    async function loadBandAndData() {
      const token = localStorage.getItem("token");
      if (!token || !song) return;

      const headers = { Authorization: `Bearer ${token}` };

      const [bandRes, commentsRes, tasksRes, notesRes, filesRes, meRes] =
        await Promise.all([
          fetch(`/api/bands/${song.project.band_id}`, { headers }),
          fetch(`/api/songs/${song.id}/comments`, { headers }),
          fetch(`/api/songs/${song.id}/tasks`, { headers }),
          fetch(`/api/songs/${song.id}/notes`, { headers }),
          fetch(`/api/songs/${song.id}/files`, { headers }),
          fetch(`/api/auth/me`, { headers }),
        ]);

      if (bandRes.ok) {
        const bandData = await bandRes.json();
        setBand(bandData.band);
        setRole(bandData.role);
        setMembers(bandData.members);
      }

      if (commentsRes.ok) setComments(await commentsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
      if (filesRes.ok) setFiles(await filesRes.json());
      if (meRes.ok) setCurrentUserId((await meRes.json()).user.id);

      setLoading(false);
    }

    void loadBandAndData();
  }, [song]);

  const refreshComments = useCallback(async () => {
    if (!song) return;

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${song.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) setComments(await response.json());
  }, [song]);

  const refreshNotes = useCallback(async () => {
    if (!song) return;

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${song.id}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) setNotes(await response.json());
  }, [song]);

  const refreshFiles = useCallback(async () => {
    if (!song) return;

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${song.id}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) setFiles(await response.json());
  }, [song]);

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  }

  if (error || !song) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error ?? "Song not found"}</p>
        </section>
      </main>
    );
  }

  const backHref = `/pages/projectDetails/${song.project.id}`;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <div className="mx-auto mt-4 flex w-full  gap-6 px-4 pb-24">
        {band && (
          <SongSidebar
            band={band}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        <div className="w-full min-h-screen min-w-0 space-y-6">
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
            <Link
              href={backHref}
              className="mb-4 inline-block text-sm text-neutral-400 transition hover:text-yellow-100 border border-neutral-700 rounded-md px-2 py-1 hover:bg-amber-50/10"
            >
              &larr; Back to{" "}
              {song.project.type === "album" ? "Album" : "Single"}:{" "}
              {song.project.title}
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {song.project.cover_image_url ? (
                <img
                  src={song.project.cover_image_url}
                  alt={song.project.title}
                  className="h-20 w-20 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-neutral-800 text-2xl font-bold text-yellow-100">
                  {song.title.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-yellow-100">
                  {song.title}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
                  <Link
                    href={`/pages/projectDetails/${song.project.id}`}
                    className="transition hover:text-yellow-100"
                  >
                    {song.project.type === "album" ? "Album" : "Single"}:{" "}
                    {song.project.title}
                  </Link>

                  <span className="flex items-center gap-1.5">
                    Status:{" "}
                    {song.status === "finished"
                      ? "Finished"
                      : "Work in progress"}
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        song.status === "finished"
                          ? "bg-green-400"
                          : "bg-yellow-100"
                      }`}
                    />
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {song.bpm ? `${song.bpm} bpm` : "BPM —"}
                  </span>
                  <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {song.key ?? "Key —"}
                  </span>
                  <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {song.time_signature ?? "Time —"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <SongTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === "Dashboard" ? (
            <DashboardTab
              songId={song.id}
              createdBy={song.created_by}
              createdAt={song.created_at}
              updatedAt={song.updated_at}
              bandMembers={members}
              comments={comments}
              tasks={tasks}
              notes={notes}
              onCommentsChanged={refreshComments}
              setActiveTab={setActiveTab}
              seekSignal={seekSignal}
              onSeek={requestSeekAndShow}
            />
          ) : activeTab === "Comments" ? (
            <CommentsTab
              songId={song.id}
              comments={comments}
              bandMembers={members}
              role={role}
              currentUserId={currentUserId}
              onCommentsChanged={refreshComments}
              onSeekAndShow={requestSeekAndShow}
            />
          ) : activeTab === "Lyrics" ? (
            <NotesTab
              songId={song.id}
              kind="lyrics"
              label="Lyrics"
              notes={notes}
              onNotesChanged={refreshNotes}
            />
          ) : activeTab === "Notes & Ideas" ? (
            <NotesTab
              songId={song.id}
              kind="note"
              label="Notes & Ideas"
              notes={notes}
              onNotesChanged={refreshNotes}
            />
          ) : activeTab === "Files" ? (
            <FilesTab
              songId={song.id}
              files={files}
              role={role}
              currentUserId={currentUserId}
              onFilesChanged={refreshFiles}
            />
          ) : (
            <PlaceholderTab label={activeTab} note={PHASE_NOTES[activeTab]} />
          )}
        </div>
      </div>

      {band && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          songId={song.id}
          projectId={song.project.id}
          role={role}
        />
      )}
    </main>
  );
}

export default function SongDashboard() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SongDashboardPageContent />
    </Suspense>
  );
}
