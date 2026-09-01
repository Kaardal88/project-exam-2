"use client";

import Link from "next/link";
import { Trash2, UserPlus } from "lucide-react";
import { ProfileSection } from "@/components/bandProfile/ProfileSection";
import {
  CollaboratorList,
  type Collaborator,
} from "@/components/collaborators/CollaboratorList";
import { bandRoles } from "@/lib/bandRoles";

export type BandMemberSummary = {
  user_id: string;
  role: string;
  status: string;
  user: {
    handle: string | null;
    username: string;
    image_url: string | null;
  };
};

type MembersProps = {
  members: BandMemberSummary[];
  collaborators: Collaborator[];
  /** The viewer's own role in this band. */
  role: string | null;
  bandId: string | null;
  actionError?: string | null;
  onChangeRole: (userId: string, nextRole: string) => void;
  onRemoveMember: (userId: string) => void;
};

/**
 * The band's line-up, as a section of its own.
 *
 * This was a card wedged into the profile header showing four avatars, with a
 * "See all" that opened a modal holding the actual list -- so the line-up was
 * two clicks deep while taking up the header, and the header ended up with
 * four controls at three different sizes. It is a tab now, beside Bio and
 * Socials, and the header keeps the two buttons that belong to a leader.
 *
 * forceOpen because this is a view you came to *use*: nobody wants to expand a
 * member list before they can change a role in it.
 */
export function Members({
  members,
  collaborators,
  role,
  bandId,
  actionError,
  onChangeRole,
  onRemoveMember,
}: MembersProps) {
  const isLeader = role === "band_leader";

  return (
    <ProfileSection
      title="Members"
      forceOpen
      action={
        // Inviting happens on Connect, which carries the band in the URL.
        isLeader && bandId ? (
          <Link
            href={`/users?inviteFor=${bandId}`}
            className="flex items-center gap-1.5 rounded-full border border-yellow-100 px-3 py-1.5 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black"
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </Link>
        ) : null
      }
    >
      {actionError && (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {actionError}
        </p>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-neutral-400">No members yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-700 bg-neutral-950/60 p-4"
            >
              <Link
                href={`/user/${member.user.handle ?? member.user_id}`}
                className="flex min-w-0 items-center gap-3"
              >
                {member.user.image_url ? (
                  <img
                    src={member.user.image_url}
                    alt={member.user.username}
                    className="h-12 w-12 shrink-0 rounded-full border border-neutral-600 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-lg font-bold text-yellow-100">
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-yellow-100">
                    {member.user.username}
                  </span>

                  {member.status !== "accepted" && (
                    <span className="mt-1 inline-block rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                      {member.status === "pending" ? "Invited" : "Declined"}
                    </span>
                  )}
                </span>
              </Link>

              {isLeader ? (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <select
                    value={member.role}
                    onChange={(event) =>
                      onChangeRole(member.user_id, event.target.value)
                    }
                    aria-label={`Role for ${member.user.username}`}
                    className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none focus:border-yellow-200"
                  >
                    {bandRoles.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* The same muted red the danger zones use -- red-300 on
                      red-900/60 -- rather than a new alarm colour. Removing
                      someone is destructive enough to be marked and ordinary
                      enough not to shout. */}
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member.user_id)}
                    className="flex items-center gap-1.5 rounded-full border border-red-900/60 px-2.5 py-1 text-xs text-red-300/90 transition hover:cursor-pointer hover:border-red-800 hover:bg-red-950/30 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-neutral-400">
                  {bandRoles.find((option) => option.value === member.role)
                    ?.label ?? member.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guests are invited per project and are deliberately not band members,
          so this is the only place the band sees who else is currently
          working with them. */}
      <h3 className="mb-2 mt-8 text-lg font-bold text-yellow-100">
        Collaborators
      </h3>

      <CollaboratorList
        collaborators={collaborators}
        showProject
        emptyText="No guests on any project right now."
      />
    </ProfileSection>
  );
}
