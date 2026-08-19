"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { collaboratorRoleLabel } from "@/lib/collaboratorRoles";

type Band = {
  id: string;
  slug: string | null;
  band_name: string;
  image_url: string | null;
  visibility: string;
};

type BandInvitation = {
  kind: "band";
  id: string;
  band_id: string;
  role: string;
  invited_at: string | null;
  band: Band;
};

type ProjectInvitation = {
  kind: "project";
  id: string;
  project_id: string;
  role: string;
  invited_at: string | null;
  project: {
    id: string;
    title: string;
    type: string;
    cover_image_url: string | null;
    band: Band;
  };
};

/** One inbox, two sources -- the reader does not care which table it came from. */
type Invitation = BandInvitation | ProjectInvitation;

function bandOf(invitation: Invitation): Band {
  return invitation.kind === "band"
    ? invitation.band
    : invitation.project.band;
}

function BandAvatar({ band }: { band: Band }) {
  if (band.image_url) {
    return (
      <img
        src={band.image_url}
        alt={band.band_name}
        className="h-14 w-14 rounded-full border border-neutral-600 object-cover"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-xl font-bold text-yellow-100">
      {band.band_name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * The band you have been invited to, linked when the link would actually work.
 *
 * A public or unlisted band renders its guest card to anyone, so previewing it
 * before answering is useful -- that is exactly when you want to see who these
 * people are. A private band 404s to a non-member, so following the link would
 * dump the reader on an error page instead of explaining anything.
 */
function InvitationIdentity({
  invitation,
  blocked,
  onBlockedClick,
}: {
  invitation: Invitation;
  blocked: boolean;
  onBlockedClick: () => void;
}) {
  const band = bandOf(invitation);
  const isPrivate = band.visibility === "private";

  const title =
    invitation.kind === "band"
      ? band.band_name
      : `${band.band_name} — ${invitation.project.title}`;

  const subtitle =
    invitation.kind === "band"
      ? "invited you to join"
      : `invited you to collaborate on this ${invitation.project.type}`;

  const identity = (
    <>
      <BandAvatar band={band} />

      <div className="text-left">
        <p className="font-semibold text-yellow-100">{title}</p>
        <p className="text-xs text-neutral-400">{subtitle}</p>

        {/* the role only says something useful for a collaborator; a band
            invitation is always "member" */}
        {invitation.kind === "project" && (
          <p className="mt-1 text-xs text-neutral-500">
            as {collaboratorRoleLabel(invitation.role)}
          </p>
        )}

        {blocked && (
          <p className="mt-1 text-xs text-yellow-200">
            {invitation.kind === "project"
              ? "Accept the invitation to open this project."
              : "This band is private. Accept the invitation to open it."}
          </p>
        )}
      </div>
    </>
  );

  // A project invitation never links out: the project page is members-only
  // regardless of the band's visibility, so there is nothing to preview yet.
  if (isPrivate || invitation.kind === "project") {
    return (
      <button
        type="button"
        onClick={onBlockedClick}
        className="flex items-center gap-4 text-left"
      >
        {identity}
      </button>
    );
  }

  return (
    <Link
      href={`/band/${band.slug ?? band.id}`}
      className="flex items-center gap-4"
    >
      {identity}
    </Link>
  );
}

export default function InvitationsPage() {
  const router = useRouter();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);

  // which private band the reader just tried to open before accepting
  const [blockedPreview, setBlockedPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/users/me/invitations", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Could not load invitations");
          setLoading(false);
          return;
        }

        setInvitations(data.invitations ?? []);
        setLoading(false);
      } catch {
        setError("Could not load invitations");
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function respond(
    invitation: Invitation,
    answer: "accept" | "decline",
  ) {
    const id = invitation.id;
    const token = localStorage.getItem("token");

    if (!token) return;

    setAnswering(id);
    setError(null);

    try {
      const response = await fetch(`/api/users/me/invitations/${id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer, kind: invitation.kind }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Could not answer invitation");
        setAnswering(null);
        return;
      }

      // drop it from the list either way; accepting takes you to what you
      // just gained access to
      setInvitations((current) => current.filter((invite) => invite.id !== id));
      setAnswering(null);

      if (answer === "accept") {
        if (invitation.kind === "band") {
          const band = invitation.band;
          router.push(`/band/${band.slug ?? band.id}`);
        } else {
          router.push(`/projects/${invitation.project_id}`);
        }
      }
    } catch {
      setError("Could not answer invitation");
      setAnswering(null);
    }
  }

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Mail className="h-5 w-5" />
          <h1 className="text-2xl font-bold text-yellow-100">Invitations</h1>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {invitations.length === 0 ? (
          <div className="rounded-md border border-neutral-700 bg-neutral-900/80 p-8 text-center">
            <p className="text-sm text-neutral-400">
              No invitations right now. When a band asks you to join, it shows
              up here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-4 rounded-md border border-neutral-700 bg-neutral-900/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <InvitationIdentity
                  invitation={invitation}
                  blocked={blockedPreview === invitation.id}
                  onBlockedClick={() => setBlockedPreview(invitation.id)}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={answering === invitation.id}
                    onClick={() => respond(invitation, "decline")}
                    className="rounded-full border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-red-900/60 hover:text-red-300 disabled:opacity-40"
                  >
                    Decline
                  </button>

                  <button
                    type="button"
                    disabled={answering === invitation.id}
                    onClick={() => respond(invitation, "accept")}
                    className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-100 hover:text-black disabled:opacity-40"
                  >
                    Accept
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
