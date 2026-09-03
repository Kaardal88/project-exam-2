"use client";

import Link from "next/link";
import ReactCountryFlag from "react-country-flag";
import { PersonStanding } from "lucide-react";
import { userTagMap } from "@/lib/userTags";
import { bandRoleLabel } from "@/lib/bandRoles";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";
import type { InviteStatus } from "@/lib/inviteStatus";

export type ConnectUser = {
  id: string;
  handle: string | null;
  username: string;
  image_url: string | null;
  header_image_url: string | null;
  tags: string[] | null;
  country: string | null;
  created_at: string | null;
  band_roles: string[];
  guest_roles: string[];
  invite?: {
    band: InviteStatus | null;
    projects: Record<string, InviteStatus>;
  };
};

type ConnectUserCardProps = {
  user: ConnectUser;
  countryLabel?: string;
  /**
   * Absent when Connect is being used to browse rather than to invite, which
   * is the only difference between the two modes as far as a card is
   * concerned.
   */
  onInvite?: (user: ConnectUser) => void;
  /** So nobody is offered a button to invite themselves. */
  isSelf?: boolean;
};

/**
 * One person in the Connect directory.
 *
 * The same card in both modes -- browsing and inviting -- because they are the
 * same list looked at with a different intention, and a second card would drift
 * from this one the first time either changed. The invite footer is the whole
 * difference, and it is absent rather than disabled when there is no band
 * context.
 */
export function ConnectUserCard({
  user,
  countryLabel,
  onInvite,
  isSelf = false,
}: ConnectUserCardProps) {
  const profileHref = `/user/${user.handle ?? user.id}`;

  const bandStatus = user.invite?.band ?? null;

  // "declined" deliberately falls through to an active button: the row is kept
  // so the leader can see the answer, and re-inviting flips it back to pending.
  const settled =
    bandStatus === "accepted"
      ? "Already a member"
      : bandStatus === "pending"
        ? "Already invited"
        : null;

  return (
    <div
      style={{ backgroundImage: "url('/bg-components.jpg')" }}
      className="relative flex flex-col overflow-hidden rounded-md border border-neutral-600/70 bg-cover bg-center p-5 text-center shadow-[inset_0_4px_6px_rgba(255,255,255,0.01),0_8px_16px_rgba(0,0,0,0.4)] transition hover:border-yellow-200/60"
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-1 flex-col items-center">
        <Link
          href={profileHref}
          className="flex w-full min-w-0 flex-col items-center"
        >
          {user.image_url ? (
            <img
              src={user.image_url}
              alt={user.username}
              className="mb-3 h-20 w-20 rounded-full border border-neutral-600 object-cover shadow-[0_0_16px_rgba(245,158,11,0.25)]"
            />
          ) : (
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-2xl font-bold text-yellow-100">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Wraps rather than truncates: a long name is still the thing
              somebody is scanning the card for, and the grid row stretches to
              the tallest card anyway. */}
          <h3 className="w-full text-balance break-words font-semibold text-yellow-100">
            {user.username}
          </h3>

          {user.handle && (
            <p className="w-full break-words text-xs text-neutral-400">
              @{user.handle}
            </p>
          )}
        </Link>

        {countryLabel && user.country && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-neutral-300">
            <ReactCountryFlag countryCode={user.country} svg />
            <span className="truncate">{countryLabel}</span>
          </div>
        )}

        {user.tags && user.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {user.tags.map((tag) => {
              const info = userTagMap[tag];

              return (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-yellow-200/20 bg-black/50 px-2 py-0.5 text-[11px] text-yellow-100"
                >
                  {info?.icon ? (
                    <span>{info.icon}</span>
                  ) : (
                    <PersonStanding className="h-3 w-3" />
                  )}
                  <span>{info?.label ?? tag}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* What they already are on the platform, as opposed to what they say
            they do. Deduplicated because holding the same role in three bands
            is one fact about a person, not three. */}
        {(user.band_roles.length > 0 || user.guest_roles.length > 0) && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {Array.from(new Set(user.band_roles)).map((role) => (
              <span
                key={`band-${role}`}
                className="rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300"
              >
                {bandRoleLabel(role)}
              </span>
            ))}

            {Array.from(new Set(user.guest_roles)).map((role) => (
              <span
                key={`guest-${role}`}
                className="rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300"
              >
                {collaboratorRoleLabel(role)}
              </span>
            ))}
          </div>
        )}
      </div>

      {onInvite && !isSelf && (
        <div className="relative z-10 mt-4">
          {settled ? (
            <span className="block w-full cursor-not-allowed rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-500">
              {settled}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onInvite(user)}
              className="w-full rounded-full border border-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-100 hover:text-black"
            >
              {bandStatus === "declined" ? "Ask again" : "Invite"}
            </button>
          )}
        </div>
      )}

      {onInvite && isSelf && (
        <div className="relative z-10 mt-4">
          <span className="block w-full rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500">
            That&apos;s you
          </span>
        </div>
      )}
    </div>
  );
}
