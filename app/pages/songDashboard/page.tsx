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
  created_at: string | null;
  publisher: { id: string; username: string } | null;
};

const PHASE_NOTES: Record<Exclude<SongTab, "Dashboard">, string> = {
  Lyrics: "Rich text lyric editor coming in Phase 3.",
  Comments:
    "Full comment/ticket lifecycle (open → wip → done, history) coming in Phase 2.",
  Tasks: "Task creation and lifecycle coming in Phase 2.",
  Activity: "Activity feed coming soon.",
  "Song Info": "Editable BPM/key/time signature and file uploads coming soon.",
  "Notes & Ideas": "Rich text notes editor coming in Phase 3.",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SongTab>("Dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      const [bandRes, commentsRes, tasksRes, notesRes] = await Promise.all([
        fetch(`/api/bands/${song.project.band_id}`, { headers }),
        fetch(`/api/songs/${song.id}/comments`, { headers }),
        fetch(`/api/songs/${song.id}/tasks`, { headers }),
        fetch(`/api/songs/${song.id}/notes`, { headers }),
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
      <NavBar />

      <Link
        href={backHref}
        className="ml-4 mt-4 flex w-fit items-center gap-2 rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
      >
        ← Back to {song.project.type === "album" ? "album" : "single"}
      </Link>

      <div className="mx-auto mt-4 flex w-full max-w-7xl gap-6 px-4 pb-24">
        {band && (
          <SongSidebar band={band} onOpenSettings={() => setSettingsOpen(true)} />
        )}

        <div className="w-full min-w-0 space-y-6">
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
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
                    {song.status === "finished" ? "Finished" : "Work in progress"}
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        song.status === "finished" ? "bg-green-400" : "bg-yellow-100"
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
