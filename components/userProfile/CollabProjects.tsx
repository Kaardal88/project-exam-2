"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";

type CollabProject = {
  id: string;
  role: string;
  project: {
    id: string;
    title: string;
    type: string;
    cover_image_url: string | null;
    band: {
      id: string;
      slug: string | null;
      band_name: string;
      image_url: string | null;
    };
  };
};

/**
 * Projects this user is a guest on.
 *
 * Separate from the bands section because it is a different relationship: a
 * collaborator reaches one album or single, not the band's whole workspace,
 * and this is the only route they have into it.
 *
 * Own profile only -- the endpoint is /me, and who someone is quietly
 * collaborating with is not obviously public.
 */
export function CollabProjects() {
  const [collabs, setCollabs] = useState<CollabProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("/api/users/me/collab-projects", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setCollabs(data.projects ?? []);
        }
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, []);

  // stay out of the way entirely until there is something to show
  if (!loaded || collabs.length === 0) return null;

  return (
    <section className="mx-auto mt-6 mb-10 w-full max-w-7xl md:w-3/4">
      <div className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
        <p className="mb-1 text-lg font-bold text-yellow-100">
          <strong>Collab projects</strong>
        </p>

        <p className="mb-4 text-xs text-neutral-400">
          Projects you have been invited to work on, without being in the band.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collabs.map((collab) => (
            <Link
              key={collab.id}
              href={`/projects/${collab.project.id}`}
              className="flex items-center gap-4 rounded-md border border-neutral-700 bg-neutral-950/60 p-4 transition hover:border-yellow-200/60"
            >
              {collab.project.cover_image_url ? (
                <img
                  src={collab.project.cover_image_url}
                  alt={collab.project.title}
                  className="h-14 w-14 rounded-md border border-neutral-600 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-neutral-600 bg-neutral-950 text-xl font-bold text-yellow-100">
                  {collab.project.title.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate font-semibold text-yellow-100">
                  {collab.project.title}
                </p>
                <p className="truncate text-xs text-neutral-400">
                  {collab.project.band.band_name}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {collaboratorRoleLabel(collab.role)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
