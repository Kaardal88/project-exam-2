"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { SuccessMessage } from "@/components/SuccessMessage";
import {
  collaboratorRoles,
  suggestedRoleForTags,
  type CollaboratorRole,
} from "@/lib/collaboratorRoles";
import { userTagMap } from "@/lib/userTags";

type User = {
  id: string;
  handle: string | null;
  username: string;
  image_url?: string | null;
  tags?: string[] | null;
};

type InviteCollaboratorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  onInvited: () => void;
};

export function InviteCollaboratorModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  onInvited,
}: InviteCollaboratorModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [role, setRole] = useState<CollaboratorRole>("guest_musician");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      const response = await fetch("/api/users");

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : (data.users ?? []));
      }
    }

    load();
  }, [isOpen]);

  function pick(user: User) {
    setSelected(user);
    setError(null);
    // What they say they do is a decent first guess at what they are here for,
    // but it stays a guess -- the role is stored on the invitation, not read
    // back off their profile, so changing their tags later cannot move them.
    setRole(suggestedRoleForTags(user.tags));
  }

  async function send() {
    if (!selected) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: selected.id, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not send invitation");
        setSending(false);
        return;
      }

      setSent(true);
      setSending(false);
      onInvited();

      setTimeout(() => {
        setSent(false);
        setSelected(null);
        setSearch("");
      }, 1200);
    } catch {
      setError("Could not send invitation");
      setSending(false);
    }
  }

  if (!isOpen) return null;

  const filtered = users
    .filter((user) =>
      user.username.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 12);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <h2 className="mb-1 text-xl font-bold text-yellow-100">
          Invite a collaborator
        </h2>

        <p className="mb-6 text-xs text-neutral-400">
          They get access to <span className="text-yellow-100">{projectTitle}</span>{" "}
          only — not the rest of the band&apos;s work.
        </p>

        {error && (
          <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {sent && <SuccessMessage message="Invitation sent" className="mb-4" />}

        {selected ? (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 p-4">
              <div className="flex items-center gap-3">
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.username}
                    className="h-10 w-10 rounded-full border border-neutral-600 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-sm font-bold text-yellow-100">
                    {selected.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-yellow-100">
                    {selected.username}
                  </p>
                  {selected.tags?.length ? (
                    <p className="text-xs text-neutral-500">
                      {selected.tags
                        .map((tag) => userTagMap[tag]?.label ?? tag)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-neutral-400 hover:text-yellow-100"
              >
                Change
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Here as
            </label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            >
              {collaboratorRoles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-neutral-400">
              {
                collaboratorRoles.find((option) => option.value === role)
                  ?.description
              }
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-600 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-100 hover:text-black disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-500 focus:border-yellow-200"
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => pick(user)}
                  className="flex flex-col items-center rounded-md border border-neutral-700 p-4 text-center transition hover:border-yellow-200/60"
                >
                  {user.image_url ? (
                    <img
                      src={user.image_url}
                      alt={user.username}
                      className="mb-2 h-14 w-14 rounded-full border border-neutral-600 object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-lg font-bold text-yellow-100">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="max-w-full truncate text-sm text-yellow-100">
                    {user.username}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
