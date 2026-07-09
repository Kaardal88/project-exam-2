"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { AddSongModal } from "@/components/projectDetails/AddSongModal";

type Song = {
  id: string;
  title: string;
  status: string;
  track_number: number | null;
};

type Project = {
  id: string;
  band_id: string;
  type: "album" | "single";
  title: string;
  description: string | null;
  cover_image_url: string | null;
  songs: Song[];
  role: string | null;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addSongOpen, setAddSongOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError("Failed to load project");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setProject(data);
      setLoading(false);
    } catch (error) {
      setError("Failed to load project");
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchProject();
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

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <Link
        href={`/pages/bandProfile?id=${project.band_id}`}
        className="flex items-center gap-2 ml-4 mt-4 w-fit rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
      >
        Back
      </Link>

      <div className="mx-auto mt-4 w-full max-w-4xl px-4 pb-24">
        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
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
                  href={`/pages/songDashboard?songId=${song.id}&bandId=${project.band_id}`}
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
      </div>

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
