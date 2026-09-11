"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import countries from "world-countries";
import { X } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import AmpLoader from "@/components/AmpLoader";
import {
  ConnectUserCard,
  type ConnectUser,
} from "@/components/connect/ConnectUserCard";
import {
  ConnectFilters,
  type ConnectFilterState,
} from "@/components/connect/ConnectFilters";
import {
  InviteFromConnectModal,
  type InviteBand,
  type InviteProject,
} from "@/components/connect/InviteFromConnectModal";
import { userTagMap } from "@/lib/userTags";
import {
  CONNECT_PAGE_SIZE,
  CONNECT_PREVIEW_SIZE,
  DEFAULT_CONNECT_SORT,
  connectRoles,
} from "@/lib/connectFilters";
import { BAND_LEADER } from "@/lib/bandRoles";

const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

const countryLabels = new Map(
  countryOptions.map((country) => [country.value, country.label]),
);

type LeaderBand = {
  band_id: string;
  role: string;
  band: { id: string; slug: string; band_name: string };
};

const EMPTY_FILTERS: ConnectFilterState = {
  q: "",
  tags: [],
  roles: [],
  country: "",
  sort: DEFAULT_CONNECT_SORT,
};

/**
 * Connect: the people directory, and the only place invitations start.
 *
 * The band profile used to open a modal listing every user on the platform.
 * That could not scale past a screenful and could only ever invite band
 * members, because a modal over a band page has no way to ask "onto which
 * project". Both problems moved here: this page already had search, it now has
 * filters and paging, and it can carry a band in the URL as `?inviteFor=<id>`
 * so a card can offer a real invitation.
 *
 * Without that parameter it is browsing, and no card offers anything.
 */
function ConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFor = searchParams.get("inviteFor");

  const [meId, setMeId] = useState<string | null>(null);
  const [leaderBands, setLeaderBands] = useState<LeaderBand[]>([]);

  const [filters, setFilters] = useState<ConnectFilterState>(EMPTY_FILTERS);
  // The search box types faster than the database answers, so the query the
  // fetch runs on lags the one the input shows.
  const [debouncedQ, setDebouncedQ] = useState("");

  const [people, setPeople] = useState<ConnectUser[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [band, setBand] = useState<InviteBand | null>(null);
  const [bandProjects, setBandProjects] = useState<InviteProject[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<ConnectUser | null>(null);

  const hasFilters =
    debouncedQ.trim().length > 0 ||
    filters.tags.length > 0 ||
    filters.roles.length > 0 ||
    filters.country.length > 0;

  // Clearing the filters while sorting by relevance would leave the list
  // ordered by how well each person matches nothing.
  const effectiveSort =
    filters.sort === "relevant" && !hasFilters
      ? DEFAULT_CONNECT_SORT
      : filters.sort;

  const pageSize = hasFilters ? CONNECT_PAGE_SIZE : CONNECT_PREVIEW_SIZE;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    async function loadMe() {
      const response = await fetch("/api/auth/me");

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) return;

      const data = await response.json();

      setMeId(data.user?.id ?? null);
      setLeaderBands(
        (data.bandMembers ?? []).filter(
          (membership: LeaderBand) => membership.role === BAND_LEADER,
        ),
      );
    }

    loadMe();
  }, [router]);

  const buildQuery = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();

      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (filters.tags.length) params.set("tags", filters.tags.join(","));
      if (filters.roles.length) params.set("roles", filters.roles.join(","));
      if (filters.country) params.set("country", filters.country);
      if (inviteFor) params.set("band_id", inviteFor);

      params.set("sort", effectiveSort);
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));

      return params.toString();
    },
    [debouncedQ, filters.tags, filters.roles, filters.country, effectiveSort, pageSize, inviteFor],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users?${buildQuery(0)}`);
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || "Could not load people");
          setPeople([]);
          setLoading(false);
          return;
        }

        setPeople(data.users ?? []);
        setTotal(data.total ?? 0);
        setHasMore(Boolean(data.hasMore));
      } catch {
        if (!cancelled) setError("Could not load people");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // A slow first request must not overwrite the results of a faster second
    // one -- the search box can fire several of these in a second.
    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  async function loadMore() {
    setLoadingMore(true);

    try {
      const response = await fetch(`/api/users?${buildQuery(people.length)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load more people");
        return;
      }

      setPeople((current) => [...current, ...(data.users ?? [])]);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setError("Could not load more people");
    } finally {
      setLoadingMore(false);
    }
  }

  // The band named in the URL, and whether the reader may actually invite for
  // it. The routes check this too; this is so the page does not offer a button
  // it already knows will be refused.
  useEffect(() => {
    let cancelled = false;

    async function loadBandContext() {
      setContextError(null);

      if (!inviteFor) {
        setBand(null);
        setBandProjects([]);
        return;
      }

      const [bandResponse, projectsResponse] = await Promise.all([
        fetch(`/api/bands/${inviteFor}`),
        fetch(`/api/bands/${inviteFor}/projects`),
      ]);

      if (cancelled) return;

      if (!bandResponse.ok) {
        setContextError("That band could not be found.");
        setBand(null);
        return;
      }

      const data = await bandResponse.json();

      if (!data.authenticated || data.role !== BAND_LEADER) {
        setContextError(
          "Only a band leader can invite people to a band, so this is just the directory for now.",
        );
        setBand(null);
        return;
      }

      setBand({
        id: data.band.id,
        slug: data.band.slug,
        band_name: data.band.band_name,
      });

      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        setBandProjects(Array.isArray(projects) ? projects : []);
      }
    }

    loadBandContext();

    return () => {
      cancelled = true;
    };
  }, [inviteFor]);

  function setInviteContext(bandId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (bandId) params.set("inviteFor", bandId);
    else params.delete("inviteFor");

    router.replace(params.toString() ? `/users?${params}` : "/users");
  }

  /**
   * Reflect a sent invitation on the card without refetching the page. The
   * server is the authority; this only stops the same button being pressed
   * twice while the reader is still looking at it.
   */
  function markInvited(userId: string, projectId?: string) {
    setPeople((current) =>
      current.map((person) => {
        if (person.id !== userId) return person;

        const invite = person.invite ?? { band: null, projects: {} };

        return {
          ...person,
          invite: projectId
            ? {
                ...invite,
                projects: { ...invite.projects, [projectId]: "pending" },
              }
            : { ...invite, band: "pending" },
        };
      }),
    );
  }

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];

    if (debouncedQ.trim()) parts.push(`“${debouncedQ.trim()}”`);

    for (const tag of filters.tags) {
      parts.push(userTagMap[tag]?.label ?? tag);
    }

    for (const role of filters.roles) {
      parts.push(
        connectRoles.find((option) => option.value === role)?.label ?? role,
      );
    }

    const country = countryLabels.get(filters.country);

    return { parts, country };
  }, [debouncedQ, filters.tags, filters.roles, filters.country]);

  const inviting = Boolean(band);

  return (
    <main className="flex w-full min-h-screen flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto w-full max-w-7xl px-4 pb-24">
        <h1 className="mb-8 mt-20 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Connect with people in the industry
        </h1>

        {contextError && (
          <p className="mb-6 rounded-md border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {contextError}
          </p>
        )}

        {band && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-yellow-200/40 bg-yellow-100/5 px-4 py-3">
            <p className="text-sm text-yellow-100">
              You&apos;re inviting to{" "}
              <Link
                href={`/band/${band.slug}`}
                className="font-semibold underline"
              >
                {band.band_name}
              </Link>
            </p>

            <button
              type="button"
              onClick={() => setInviteContext("")}
              className="flex items-center gap-1 rounded-full border border-neutral-600 px-3 py-1 text-xs text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
            >
              <X className="h-3 w-3" />
              Just browsing
            </button>
          </div>
        )}

        {/* Without a band in the URL there is nobody to invite on behalf of.
            A leader of several bands has to say which one, and a leader of one
            still has to choose it deliberately -- an invitation sent to the
            wrong band is not something to make one click cheap. */}
        {!inviteFor && leaderBands.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900/60 px-4 py-3">
            <label
              htmlFor="invite-band"
              className="text-sm text-neutral-300"
            >
              Looking for someone to join one of your bands?
            </label>

            <select
              id="invite-band"
              value=""
              onChange={(event) => setInviteContext(event.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-yellow-100 outline-none focus:border-yellow-200"
            >
              <option value="">Invite on behalf of…</option>

              {leaderBands.map((membership) => (
                <option key={membership.band_id} value={membership.band_id}>
                  {membership.band.band_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <ConnectFilters
          value={filters}
          onChange={setFilters}
          countryOptions={countryOptions}
          hasFilters={hasFilters}
        />

        {error && (
          <p className="mt-6 rounded-md border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <AmpLoader />
          </div>
        ) : hasFilters ? (
          <section className="mt-8">
            <p className="mb-4 text-sm text-neutral-400">
              {total} {total === 1 ? "person" : "people"} found
            </p>

            {people.length === 0 ? (
              <EmptyResult summary={activeFilterSummary} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {people.map((person) => (
                    <ConnectUserCard
                      key={person.id}
                      user={person}
                      countryLabel={
                        person.country
                          ? countryLabels.get(person.country)
                          : undefined
                      }
                      isSelf={person.id === meId}
                      onInvite={
                        inviting ? (user) => setInviteTarget(user) : undefined
                      }
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full border border-neutral-600 px-6 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <Landing
            people={people}
            meId={meId}
            inviting={inviting}
            onInvite={(user) => setInviteTarget(user)}
          />
        )}
      </div>

      {inviteTarget && band && (
        <InviteFromConnectModal
          // Keyed per invitee so the role and project pickers start clean for
          // each one rather than carrying the previous choice over.
          key={inviteTarget.id}
          isOpen={Boolean(inviteTarget)}
          onClose={() => setInviteTarget(null)}
          user={inviteTarget}
          band={band}
          projects={bandProjects}
          onInvited={markInvited}
        />
      )}

      <Footer />
    </main>
  );
}

/**
 * What Connect shows before anyone has asked it anything.
 *
 * Not the whole user base. Rendering every account by default was the old
 * behaviour and it made the page a wall rather than a tool -- and it is the
 * one view where the reader has told you nothing about who they are looking
 * for, so showing them everyone is the least useful answer available.
 */
function Landing({
  people,
  meId,
  inviting,
  onInvite,
}: {
  people: ConnectUser[];
  meId: string | null;
  inviting: boolean;
  onInvite: (user: ConnectUser) => void;
}) {
  return (
    <section className="mt-8">
      <div className="rounded-md border border-neutral-700 bg-neutral-900/60 p-6">
        <h2 className="mb-2 text-lg font-bold text-yellow-100">
          Find the person you need
        </h2>

        <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
          Everyone on StemLock says what they do — drums, vocals, mixing,
          management. Tap those as filters and combine them with a country to
          narrow the list, or search by name if you already know who you are
          looking for. From a band you lead, an invitation goes out from here:
          into the band itself, or onto a single project as a guest.
        </p>
      </div>

      {people.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Recently joined
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {people.map((person) => (
              <ConnectUserCard
                key={person.id}
                user={person}
                countryLabel={
                  person.country ? countryLabels.get(person.country) : undefined
                }
                isSelf={person.id === meId}
                onInvite={inviting ? onInvite : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** An empty result that says what was asked for, rather than only that it failed. */
function EmptyResult({
  summary,
}: {
  summary: { parts: string[]; country: string | undefined };
}) {
  const what = summary.parts.join(" · ");

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/60 p-8 text-center">
      <p className="text-sm text-neutral-300">
        No matches for{" "}
        <span className="text-yellow-100">{what || "those filters"}</span>
        {summary.country && (
          <>
            {" "}
            in <span className="text-yellow-100">{summary.country}</span>
          </>
        )}
        .
      </p>

      <p className="mt-2 text-xs text-neutral-500">
        Try widening the filters — fewer tags, or anywhere instead of one
        country.
      </p>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
          <AmpLoader />
        </main>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
