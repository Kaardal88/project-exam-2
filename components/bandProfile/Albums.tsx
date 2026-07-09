import Link from "next/link";
import { ProfileSection } from "./ProfileSection";

type Project = {
  id: string;
  title: string;
  cover_image_url: string | null;
};

export function Albums({
  projects,
  error,
}: {
  projects: Project[];
  error?: string | null;
}) {
  return (
    <ProfileSection title="Albums">
      {error ? (
        <p className="form-error">{error}</p>
      ) : projects.length === 0 ? (
        <p className="text-neutral-400">Albums will show up here...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/pages/projectDetails/${project.id}`}
              className="flex flex-col items-center rounded-md border border-neutral-700 bg-neutral-950/60 p-4 text-center transition hover:border-yellow-200"
            >
              {project.cover_image_url ? (
                <img
                  src={project.cover_image_url}
                  alt={project.title}
                  className="mb-2 h-20 w-20 rounded object-cover"
                />
              ) : (
                <div className="mb-2 flex h-20 w-20 items-center justify-center rounded bg-neutral-800 text-lg font-bold text-yellow-100">
                  {project.title.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="text-sm font-semibold text-yellow-100">
                {project.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
