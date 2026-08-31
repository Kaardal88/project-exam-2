"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { SuccessMessage } from "@/components/SuccessMessage";
import {
  collaboratorRoles,
  type CollaboratorRole,
} from "@/lib/collaboratorRoles";
import { userTagMap } from "@/lib/userTags";
import type { ConnectUser } from "@/components/connect/ConnectUserCard";

export type InviteBand = {
  id: string;
  slug: string;
  band_name: string;
};

export type InviteProject = {
  id: string;
  title: string;
  type: string;
};

type InviteFromConnectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: ConnectUser;
  band: InviteBand;
  projects: InviteProject[];
  /** projectId is present only for a guest invitation, which is what the
   *  page needs to know to grey the right thing out afterwards. */
  onInvited: (userId: string, projectId?: string) => void;
};

/**
 * The one step between "Invite" on a card and an invitation being sent: what
 * are you inviting them as.
 *
 * The plan asked for four choices -- band member, guest manager, guest
 * producer, guest musician -- as if they were four values of one field. They
 * are not, and the modal says so out loud. A band member is a row in
 * band_members and belongs to the whole band; a guest is a row in
 * project_collaborators and belongs to one album or single, deliberately, so
 * that a session drummer hired for one single does not turn up in the band's
 * line-up or reach the rest of its work.
 *
 * So picking a guest role reveals a project picker rather than sending
 * anything. That is not friction added for its own sake -- there is no such
 * thing as a guest of a band, and offering one would have meant either
 * inventing a second kind of guest row or quietly picking a project on the
 * inviter's behalf.
 */
export function InviteFromConnectModal({
  isOpen,
  onClose,
  user,
  band,
  projects,
  onInvited,
}: InviteFromConnectModalProps) {
  // No reset effect: the page mounts this per invitee, keyed on their id, so
  // a fresh modal starts from these values every time it opens.
  const [role, setRole] = useState<"member" | CollaboratorRole>("member");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isGuestRole = role !== "member";

  // Projects they are already on, so the picker can say so rather than letting
  // the reader find out from a 409 after choosing.
  const availableProjects = useMemo(() => {
    const status = user.invite?.projects ?? {};

    return projects.map((project) => ({
      ...project,
      taken:
        status[project.id] === "accepted" || status[project.id] === "pending",
      status: status[project.id],
    }));
  }, [projects, user.invite]);

  async function send() {
    setSending(true);
    setError(null);

    try {
      // Two endpoints because they write two different tables. Both already
      // check band_leader server-side; this modal only decides which to call.
      const response = isGuestRole
        ? await fetch(`/api/projects/${projectId}/collaborators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, role }),
          })
        : await fetch(`/api/bands/${band.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // The routes answer with real sentences -- "Already invited, waiting
        // for an answer" -- so pass them through rather than flattening them.
        setError(data.error || "Could not send invitation");
        setSending(false);
        return;
      }

      setSent(true);
      setSending(false);
      onInvited(user.id, isGuestRole ? projectId : undefined);

      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1000);
    } catch {
      setError("Could not send invitation");
      setSending(false);
    }
  }

  if (!isOpen) return null;

  const canSend = !sending && !sent && (!isGuestRole || Boolean(projectId));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="mb-1 text-xl font-bold text-yellow-100">
          Invite {user.username}
        </h2>

        <p className="mb-6 text-xs text-neutral-400">
          to <span className="text-yellow-100">{band.band_name}</span>
        </p>

        {user.tags?.length ? (
          <p className="mb-4 text-xs text-neutral-500">
            {user.tags.map((tag) => userTagMap[tag]?.label ?? tag).join(", ")}
          </p>
        ) : null}

        {error && (
          <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {sent && <SuccessMessage message="Invitation sent" className="mb-4" />}

        <label className="mb-2 block text-sm font-semibold text-yellow-100">
          Here as
        </label>

        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as "member" | CollaboratorRole);
            setProjectId("");
            setError(null);
          }}
          className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
        >
          <option value="member">🎵 Band member</option>

          {collaboratorRoles.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} Guest · {option.label}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-neutral-400">
          {isGuestRole
            ? collaboratorRoles.find((option) => option.value === role)
                ?.description
            : "Part of the band. Can work on every project."}
        </p>

        {isGuestRole && (
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              On which project
            </label>

            {projects.length === 0 ? (
              <p className="rounded-md border border-neutral-700 bg-neutral-950/60 px-3 py-3 text-xs text-neutral-400">
                {band.band_name} has no projects yet. A guest is invited onto an
                album or a single rather than into the band, so there has to be
                one first —{" "}
                <Link
                  href={`/band/${band.slug}`}
                  className="text-yellow-100 underline"
                >
                  create one on the band page
                </Link>
                .
              </p>
            ) : (
              <>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                >
                  <option value="">Choose a project…</option>

                  {availableProjects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                      disabled={project.taken}
                    >
                      {project.title}
                      {project.taken
                        ? project.status === "accepted"
                          ? " — already a collaborator"
                          : " — already invited"
                        : ""}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-neutral-400">
                  They get access to that project only — not the rest of the
                  band&apos;s work.
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-600 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
