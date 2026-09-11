"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { EditableProfileImage } from "@/components/EditableProfileImage";
import { AddSongModal } from "@/components/projectDetails/AddSongModal";
import { InviteCollaboratorModal } from "@/components/projectDetails/InviteCollaboratorModal";
import { UserPlus } from "lucide-react";
import {
  CollaboratorList,
  type Collaborator,
} from "@/components/collaborators/CollaboratorList";

type Song = {
  id: string;
  title: string;
  status: string;
  track_number: number | null;
};

type Project = {
  id: string;
  band_id: string;
  band_slug: string | null;
  band: { band_name: string } | null;
  access_source: "band" | "collaborator";
  type: "album" | "single";
  title: string;
  description: string | null;
  cover_image_url: string | null;
  songs: Song[];
  role: string | null;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setError("Failed to load project");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setProject(data);
      setLoading(false);

      const collaboratorsResponse = await fetch(
        `/api/projects/${projectId}/collaborators`,
      );

      if (collaboratorsResponse.ok) {
        setCollaborators(await collaboratorsResponse.json());
      }
    } catch (error) {
      setError("Failed to load project");
      setLoading(false);
    }
  }, [projectId, router]);

  async function removeCollaborator(collaborator: Collaborator) {
    const response = await fetch(
      `/api/projects/${projectId}/collaborators/${collaborator.user.id}`,
      { method: "DELETE" },
    );

    if (response.ok) {
      // their comments, notes and files stay with the project; only the
      // access goes away
      setCollaborators((current) =>
        current.filter((entry) => entry.id !== collaborator.id),
      );
    }
  }

  useEffect(() => {
    async function loadProject() {
      await fetchProject();
    }

    void loadProject();
  }, [fetchProject]);

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center">
        <AmpLoader />
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error ?? "Project not found"}</p>
        </section>
      </main>
    );
  }

  // A collaborator is not in the band, so sending them "back" to the band
  // profile lands them on a guest card at best and a 404 if it is private.
  // Their way in was their own profile, so that is where back goes.
  const isGuest = project.access_source === "collaborator";
  const backHref = isGuest
    ? "/user"
    : `/band/${project.band_slug ?? project.band_id}`;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto mt-4 w-full max-w-4xl px-4 pb-24">
        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
          {/* Up one level, named -- the same link the song dashboard opens
              with. It used to be a bare "Back" pill floating above the card,
              which read as a history button and looked like no other link. */}
          <Link
            href={backHref}
            className="mb-4 inline-block text-sm text-neutral-400 transition hover:text-yellow-100 border border-neutral-700 rounded-md px-2 py-1 hover:bg-amber-50/10"
          >
            &larr; Back to{" "}
            {isGuest ? "your profile" : (project.band?.band_name ?? "the band")}
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {/* The cover is set here and nowhere else. A project has no id
                  until it exists, so the New project modal cannot offer this
                  -- and this is the page you land on straight afterwards. */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded">
                <EditableProfileImage
                  canEdit={project.role === "band_leader"}
                  owner="project"
                  ownerId={project.id}
                  target="cover"
                  label={project.type === "album" ? "album art" : "cover art"}
                  onSaved={(url) =>
                    setProject((current) =>
                      current ? { ...current, cover_image_url: url } : current,
                    )
                  }
                >
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-neutral-800 text-2xl font-bold text-yellow-100">
                      {project.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </EditableProfileImage>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  {project.type}
                </span>
                <h1 className="text-2xl font-bold text-yellow-100">
                  {project.title}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-neutral-400">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {project.role === "band_leader" && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full border border-neutral-600 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite collaborator
                </button>
              )}

              {project.type === "album" && (
                <button
                  onClick={() => setAddSongOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-50 hover:text-black!"
                >
                  <Plus className="h-4 w-4" />
                  Add song
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
          <h2 className="mb-4 text-lg font-bold text-yellow-100">Songs</h2>

          {project.songs.length === 0 ? (
            <p className="text-sm text-neutral-400">No songs yet</p>
          ) : (
            <div className="space-y-3">
              {project.songs.map((song) => (
                <Link
                  key={song.id}
                  href={`/songs?songId=${song.id}&bandId=${project.band_id}`}
                  className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 p-4 transition hover:border-yellow-200"
                >
                  <span className="text-sm font-semibold text-yellow-100">
                    {song.title}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      song.status === "finished"
                        ? "border-green-400 text-green-300"
                        : "border-yellow-100 text-yellow-100"
                    }`}
                  >
                    {song.status === "finished" ? "Finished" : "WIP"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
          <h2 className="mb-1 text-lg font-bold text-yellow-100">
            Collaborators
          </h2>

          <p className="mb-4 text-xs text-neutral-400">
            Guests with access to this project only.
          </p>

          <CollaboratorList
            collaborators={collaborators}
            onRemove={
              project.role === "band_leader" ? removeCollaborator : undefined
            }
            emptyText="Nobody outside the band is working on this yet."
          />
        </section>
      </div>

      {inviteOpen && (
        <InviteCollaboratorModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          projectId={project.id}
          projectTitle={project.title}
          onInvited={() => void fetchProject()}
        />
      )}

      {addSongOpen && (
        <AddSongModal
          isOpen={addSongOpen}
          onClose={() => setAddSongOpen(false)}
          projectId={project.id}
          onCreated={() => {
            setAddSongOpen(false);
            void fetchProject();
          }}
        />
      )}
    </main>
  );
}
