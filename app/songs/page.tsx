"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { Upload } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { SongSidebar } from "@/components/songDashboard/SongSidebar";
import { type Collaborator } from "@/components/collaborators/CollaboratorList";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";
import { SettingsModal } from "@/components/songDashboard/SettingsModal";
import { SongTabs, type SongTab } from "@/components/songDashboard/SongTabs";
import { PlaceholderTab } from "@/components/songDashboard/PlaceholderTab";
import { DashboardTab } from "@/components/songDashboard/DashboardTab";
import { CommentsTab } from "@/components/songDashboard/CommentsTab";
import { NotesTab } from "@/components/songDashboard/NotesTab";
import { FilesTab } from "@/components/songDashboard/FilesTab";
import { UploadProgress } from "@/components/songDashboard/UploadProgress";
import type { TicketStatus } from "@/components/songDashboard/ticketStatus";
import { uploadToR2 } from "@/lib/uploadToR2";

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

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
  slug: string;
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
  Exclude<
    SongTab,
    "Dashboard" | "Comments" | "Lyrics" | "Notes & Ideas" | "Files"
  >,
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
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  // "band" or "collaborator" -- a guest has no band profile to open
  const [accessSource, setAccessSource] = useState<string | null>(null);
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
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [artworkDisplayUrl, setArtworkDisplayUrl] = useState<string | null>(
    null,
  );
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [artworkUploadProgress, setArtworkUploadProgress] = useState<
    number | null
  >(null);
  const [artworkUploadSuccess, setArtworkUploadSuccess] = useState(false);
  const [artworkUploadError, setArtworkUploadError] = useState<string | null>(
    null,
  );
  const artworkInputRef = useRef<HTMLInputElement>(null);

  const requestSeekAndShow = useCallback((seconds: number) => {
    setActiveTab("Dashboard");
    setSeekSignal({ seconds, nonce: Date.now() });
  }, []);

  const fetchSong = useCallback(async () => {
    if (!songId) {
      setError("Missing song id");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/songs/${songId}`);

    if (response.status === 401) {
      router.push("/login");
      return;
    }

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
      if (!song) return;

      const [bandRes, commentsRes, tasksRes, notesRes, filesRes, meRes] =
        await Promise.all([
          fetch(`/api/projects/${song.project.id}`),
          fetch(`/api/songs/${song.id}/comments`),
          fetch(`/api/songs/${song.id}/tasks`),
          fetch(`/api/songs/${song.id}/notes`),
          fetch(`/api/songs/${song.id}/files`),
          fetch(`/api/auth/me`),
        ]);

      // Context comes from the project, not the band: a collaborator is not a
      // band member, so /api/bands/:id would 404 for them on a private band
      // and leave this page without a sidebar or a role.
      if (bandRes.ok) {
        const projectData = await bandRes.json();
        setBand(projectData.band);
        setRole(projectData.role);
        setMembers(projectData.members ?? []);
        setCollaborators(projectData.collaborators ?? []);
        setAccessSource(projectData.access_source ?? null);
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

    const response = await fetch(`/api/songs/${song.id}/comments`);

    if (response.ok) setComments(await response.json());
  }, [song]);

  const refreshNotes = useCallback(async () => {
    if (!song) return;

    const response = await fetch(`/api/songs/${song.id}/notes`);

    if (response.ok) setNotes(await response.json());
  }, [song]);

  const refreshFiles = useCallback(async () => {
    if (!song) return;

    const response = await fetch(`/api/songs/${song.id}/files`);

    if (response.ok) setFiles(await response.json());
  }, [song]);

  const fetchAudioUrl = useCallback(async () => {
    if (!song?.audio_url) {
      setAudioPlaybackUrl(null);
      return;
    }

    const response = await fetch(`/api/songs/${song.id}/audio-url`);

    setAudioPlaybackUrl(response.ok ? (await response.json()).url : null);
  }, [song]);

  useEffect(() => {
    async function loadAudioUrl() {
      await fetchAudioUrl();
    }

    void loadAudioUrl();
  }, [fetchAudioUrl]);

  const fetchArtworkUrl = useCallback(async () => {
    if (!song?.artwork_url) {
      setArtworkDisplayUrl(null);
      return;
    }

    const response = await fetch(`/api/songs/${song.id}/artwork-url`);

    setArtworkDisplayUrl(response.ok ? (await response.json()).url : null);
  }, [song]);

  useEffect(() => {
    async function loadArtworkUrl() {
      await fetchArtworkUrl();
    }

    void loadArtworkUrl();
  }, [fetchArtworkUrl]);

  async function handleArtworkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !song) return;

    setArtworkUploadError(null);

    const lower = file.name.toLowerCase();
    const validExt =
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png");
    const validType = file.type === "image/jpeg" || file.type === "image/png";

    if (!validExt || !validType) {
      setArtworkUploadError("Only .jpg or .png files are allowed");
      return;
    }

    if (file.size > IMAGE_MAX_BYTES) {
      setArtworkUploadError("File too large. Max 10MB");
      return;
    }

    setArtworkUploading(true);
    setArtworkUploadProgress(0);
    setArtworkUploadSuccess(false);

    try {
      const { key } = await uploadToR2({
        songId: song.id,
        target: "artwork",
        file,
        onProgress: setArtworkUploadProgress,
      });

      const response = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ artwork_url: key }),
      });

      if (!response.ok) {
        throw new Error("Failed to save artwork");
      }

      await fetchSong();
      setArtworkUploadSuccess(true);
      setTimeout(() => setArtworkUploadSuccess(false), 2000);
    } catch (err) {
      setArtworkUploadError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setArtworkUploading(false);
      setArtworkUploadProgress(null);
    }
  }

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

  const creator = members.find((member) => member.user.id === song.created_by);

  const contributorIds = new Set<string>();
  if (song.created_by) contributorIds.add(song.created_by);
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

  const contributors = members.filter((member) =>
    contributorIds.has(member.user.id),
  );

  const backHref = `/projects/${song.project.id}`;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <div className="mx-auto mt-4 flex w-full  gap-6 px-4 pb-24">
        {band && (
          <SongSidebar
            band={band}
            onOpenSettings={() => setSettingsOpen(true)}
            canOpenBand={accessSource !== "collaborator"}
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
              <div className="relative h-20 w-20 shrink-0">
                {artworkDisplayUrl ? (
                  <img
                    src={artworkDisplayUrl}
                    alt={song.title}
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : song.project.cover_image_url ? (
                  <img
                    src={song.project.cover_image_url}
                    alt={song.project.title}
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded bg-neutral-800 text-2xl font-bold text-yellow-100">
                    {song.title.charAt(0).toUpperCase()}
                  </div>
                )}

                <input
                  ref={artworkInputRef}
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  onChange={handleArtworkUpload}
                  className="hidden"
                />

                {/* Always visible (not hover-only) so it's reachable on touch
                    devices too — hover only adds a subtle highlight. */}
                <button
                  onClick={() => artworkInputRef.current?.click()}
                  disabled={artworkUploading}
                  title="Upload artwork (JPG/PNG, max 10MB)"
                  className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-yellow-100 shadow-md transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800 disabled:cursor-not-allowed"
                >
                  <UploadProgress
                    progress={artworkUploadProgress}
                    success={artworkUploadSuccess}
                    compact
                  />
                  {artworkUploadProgress === null && !artworkUploadSuccess && (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="min-w-0 flex-1">
                {artworkUploadError && (
                  <p className="form-error mb-2">{artworkUploadError}</p>
                )}
                <h1 className="text-2xl font-bold text-yellow-100">
                  {song.title}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
                  <Link
                    href={`/projects/${song.project.id}`}
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

            <div className="mt-6 flex justify-end">
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
                      {song.created_at
                        ? new Date(song.created_at).toLocaleDateString("no-NO")
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Last updated</dt>
                    <dd className="text-yellow-100">
                      {song.updated_at
                        ? new Date(song.updated_at).toLocaleDateString("no-NO")
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-neutral-500">Contributors</dt>
                    <dd className="text-right text-yellow-100">
                      {contributors.length
                        ? contributors
                            .map((member) => member.user.username)
                            .join(", ")
                        : "—"}
                    </dd>
                  </div>

                  {/* Guests are not band members, so they never appear in
                      Contributors until they have actually left something
                      behind. Naming them here means the band can see who is
                      in the room. */}
                  {collaborators.length > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="shrink-0 text-neutral-500">Guests</dt>
                      <dd className="text-right text-yellow-100">
                        {collaborators
                          .map(
                            (collaborator) =>
                              `${collaborator.user.username} (${collaboratorRoleLabel(collaborator.role)})`,
                          )
                          .join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>

          <SongTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === "Dashboard" ? (
            <DashboardTab
              songId={song.id}
              bandMembers={members}
              comments={comments}
              tasks={tasks}
              notes={notes}
              onCommentsChanged={refreshComments}
              setActiveTab={setActiveTab}
              seekSignal={seekSignal}
              onSeek={requestSeekAndShow}
              audioUrl={audioPlaybackUrl}
              onAudioUploaded={fetchSong}
              onAudioUrlExpired={fetchAudioUrl}
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
    <Suspense
      fallback={
        <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
          <AmpLoader />
        </main>
      }
    >
      <SongDashboardPageContent />
    </Suspense>
  );
}
