"use client";

import Link from "next/link";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";

export type Collaborator = {
  id: string;
  role: string;
  user: {
    id: string;
    handle: string | null;
    username: string;
    image_url: string | null;
  };
  /** present when the list spans more than one project */
  project?: { id: string; title: string; type: string };
};

/**
 * Who is working on this without being in the band.
 *
 * Collaborators live in their own table and are deliberately kept out of the
 * band's member list, which meant they were invisible everywhere -- you only
 * learned a guest existed if they happened to leave a comment. This is the
 * shared display for the band profile, the project page and the song
 * dashboard, so the three cannot drift apart.
 */
export function CollaboratorList({
  collaborators,
  showProject = false,
  onRemove,
  emptyText,
}: {
  collaborators: Collaborator[];
  /** show which project each one is on -- for band-level lists */
  showProject?: boolean;
  /** band leaders only; omit to render read-only */
  onRemove?: (collaborator: Collaborator) => void;
  emptyText?: string;
}) {
  if (collaborators.length === 0) {
    return emptyText ? (
      <p className="text-xs text-neutral-500">{emptyText}</p>
    ) : null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {collaborators.map((collaborator) => (
        <li
          key={collaborator.id}
          className="flex items-center justify-between gap-3 rounded-md border border-neutral-700/70 bg-neutral-950/40 p-2"
        >
          <Link
            href={`/user/${collaborator.user.handle ?? collaborator.user.id}`}
            className="flex min-w-0 items-center gap-3"
          >
            {collaborator.user.image_url ? (
              <img
                src={collaborator.user.image_url}
                alt={collaborator.user.username}
                className="h-9 w-9 shrink-0 rounded-full border border-neutral-600 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-xs font-bold text-yellow-100">
                {collaborator.user.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-yellow-100">
                {collaborator.user.username}
              </p>
              <p className="truncate text-[11px] text-neutral-400">
                {collaboratorRoleLabel(collaborator.role)}
                {showProject && collaborator.project
                  ? ` · ${collaborator.project.title}`
                  : ""}
              </p>
            </div>
          </Link>

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(collaborator)}
              className="shrink-0 text-xs text-neutral-400 transition hover:text-red-300"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
