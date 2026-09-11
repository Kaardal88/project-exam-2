"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import {
  SongSidebar,
  type SidebarUser,
} from "@/components/songDashboard/SongSidebar";
import { type Collaborator } from "@/components/collaborators/CollaboratorList";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";
import { SettingsModal } from "@/components/songDashboard/SettingsModal";
import { useSidebarCollapsed } from "@/components/sidebar/useSidebarCollapsed";
import {
  SongTabs,
  isSongTab,
  type SongTab,
} from "@/components/songDashboard/SongTabs";
import { PlaceholderTab } from "@/components/songDashboard/PlaceholderTab";
import { DashboardTab } from "@/components/songDashboard/DashboardTab";
import { StudioTab } from "@/components/songDashboard/studio/StudioTab";
import { CommentsTab } from "@/components/songDashboard/CommentsTab";
import { NotesTab } from "@/components/songDashboard/NotesTab";
import { FilesTab } from "@/components/songDashboard/FilesTab";
import { TasksTab } from "@/components/songDashboard/TasksTab";
import type { TicketStatus } from "@/components/songDashboard/ticketStatus";
import {
  SONG_STATUSES,
  SONG_STATUS_STYLES,
  toSongStatus,
  type SongStatus,
} from "@/lib/songStatus";

type Song = {
  id: string;
  title: string;
  status: string;
  bpm: number | null;
  key: string | null;
  time_signature: string | null;
  audio_url: string | null;
  current_version_id: string | null;
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
    | "Dashboard"
    | "Studio"
    | "Comments"
    | "Lyrics"
    | "Notes & Ideas"
    | "Files"
    | "Tasks"
  >,
  string
> = {
  Activity: "Activity feed coming soon.",
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();
  /** Set when a dashboard preview card is clicked. The nonce makes clicking
      the same card twice a fresh request rather than a no-op. */
  const [focusComment, setFocusComment] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  /** Who is signed in, for the sidebar's Account button and its menu. */
  const [currentUser, setCurrentUser] = useState<SidebarUser | null>(null);
  const [seekSignal, setSeekSignal] = useState<{
    seconds: number;
    nonce: number;
  } | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  /**
   * The tab is in the URL, not in state.
   *
   * As state, the whole dashboard was a single history entry: moving through
   * five tabs and pressing back left the song altogether and landed on the
   * project, so getting back to where you were meant clicking in from the top
   * again. Read from `?tab=` and written with pushState, each tab is an entry
   * of its own -- back steps one tab at a time, and a tab can be linked to.
   *
   * pushState rather than router.push because Next syncs the native history
   * API into the router: useSearchParams re-renders and this component stays
   * mounted, so switching tabs still costs nothing -- no refetch of the song,
   * its comments, notes or files.
   */
  const tabParam = searchParams.get("tab");
  const activeTab: SongTab = isSongTab(tabParam) ? tabParam : "Dashboard";

  const setActiveTab = useCallback(
    (tab: SongTab) => {
      // Asking for the tab already open is not a navigation. Pushing it anyway
      // would stack duplicate entries, and a back button that has to be
      // pressed twice before anything moves looks broken.
      if (tab === activeTab) return;

      const params = new URLSearchParams(searchParams.toString());

      // Dashboard is the default, so it stays out of the URL: the address a
      // song is normally shared under keeps the shape it has always had.
      if (tab === "Dashboard") params.delete("tab");
      else params.set("tab", tab);

      window.history.pushState(null, "", `?${params.toString()}`);
    },
    [activeTab, searchParams],
  );

  const requestSeekAndShow = useCallback(
    (seconds: number) => {
      setActiveTab("Dashboard");
      setSeekSignal({ seconds, nonce: Date.now() });
    },
    [setActiveTab],
  );

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
      if (meRes.ok) {
        const { user } = await meRes.json();
        setCurrentUserId(user.id);
        setCurrentUser(user);
      }

      setLoading(false);
    }

    void loadBandAndData();
  }, [song]);

  const refreshComments = useCallback(async () => {
    if (!song) return;

    const response = await fetch(`/api/songs/${song.id}/comments`);

    if (response.ok) setComments(await response.json());
  }, [song]);

  const refreshTasks = useCallback(async () => {
    if (!song) return;

    const response = await fetch(`/api/songs/${song.id}/tasks`);

    if (response.ok) setTasks(await response.json());
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

  const updateStatus = useCallback(
    async (status: SongStatus) => {
      if (!song || status === song.status) return;

      setStatusError(null);

      const response = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setStatusError("Couldn't change the status");
        return;
      }

      await fetchSong();
    },
    [song, fetchSong],
  );

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
            user={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
            onOpenSettings={() => setSettingsOpen(true)}
            canOpenBand={accessSource !== "collaborator"}
          />
        )}

        {/* relative: the expanded media player anchors its blurred overlay to
            this column, so it covers the dashboard and stops at the sidebar. */}
        <div className="relative w-full min-h-screen min-w-0 space-y-6">
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
            <Link
              href={backHref}
              className="mb-4 inline-block text-sm text-neutral-400 transition hover:text-yellow-100 border border-neutral-700 rounded-md px-2 py-1 hover:bg-amber-50/10"
            >
              &larr; Back to{" "}
              {song.project.type === "album" ? "Album" : "Single"}:{" "}
              {song.project.title}
            </Link>
            {/* The metadata card used to hang underneath everything, pinned
                to the right with a wide empty strip beside it. It answers
                header questions -- who made this, when was it touched -- so it
                belongs level with the header rather than below it. */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
              {/* The artwork belongs to the release, not the track. A song on
                  an album has never had its own sleeve, and a single's sleeve
                  is the single's -- so both read the project's cover, set on
                  the project page. */}
              <Link
                href={`/projects/${song.project.id}`}
                title={`Artwork for ${song.project.title} — change it on the project page`}
                className="h-20 w-20 shrink-0"
              >
                {song.project.cover_image_url ? (
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
              </Link>

              <div className="min-w-0 flex-1">
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

                  {/* Settable here as well as on the board. Somebody who has
                      just finished a mix is inside the song, not looking at a
                      board, and making them go and find one to say so is how a
                      stage stops being kept up to date. */}
                  <label className="flex items-center gap-1.5">
                    Status
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        SONG_STATUS_STYLES[toSongStatus(song.status)].dot
                      }`}
                    />
                    <select
                      value={toSongStatus(song.status)}
                      onChange={(e) =>
                        void updateStatus(e.target.value as SongStatus)
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none transition focus:border-yellow-200"
                    >
                      {SONG_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {SONG_STATUS_STYLES[status].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {statusError && (
                    <span className="text-xs text-red-300">{statusError}</span>
                  )}
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

              <div className="w-full shrink-0 rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl lg:w-80">
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

          {/* The tabs live in the sidebar on desktop. This row is for phones,
              where there is no sidebar -- and for the rare desktop load where
              the band did not come back and so neither did the sidebar,
              which would otherwise leave no way between tabs at all. */}
          <div className={band ? "md:hidden" : ""}>
            <SongTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {activeTab === "Dashboard" ? (
            <DashboardTab
              songId={song.id}
              bandMembers={members}
              comments={comments}
              tasks={tasks}
              notes={notes}
              onCommentsChanged={refreshComments}
              onTasksChanged={refreshTasks}
              setActiveTab={setActiveTab}
              seekSignal={seekSignal}
              onSeek={requestSeekAndShow}
              audioUrl={audioPlaybackUrl}
              onAudioUrlExpired={fetchAudioUrl}
              currentVersionId={song.current_version_id}
              onFocusComment={(commentId) => {
                setFocusComment({ id: commentId, nonce: Date.now() });
                setActiveTab("Comments");
              }}
            />
          ) : activeTab === "Studio" ? (
            <StudioTab
              songId={song.id}
              songTitle={song.title}
              bandMembers={members}
              onCommentsChanged={refreshComments}
              isLeader={role === "band_leader"}
              currentUserId={currentUserId}
              onSongChanged={fetchSong}
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
              currentVersionId={song.current_version_id}
              focusComment={focusComment}
            />
          ) : activeTab === "Tasks" ? (
            <TasksTab
              songId={song.id}
              tasks={tasks}
              bandMembers={members}
              onTasksChanged={refreshTasks}
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
