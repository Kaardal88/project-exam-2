"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Home, Plus } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";
import { NavBar } from "@/components/NavBar";
import { BandCalendar } from "@/components/calendar/BandCalendar";

import "@daypicker/react/style.css";
import { EventForm } from "@/components/calendar/EventForm";

import { EditableProfileImage } from "@/components/EditableProfileImage";
import { NewProjectModal } from "@/components/bandProfile/NewProjectModal";
import { type Collaborator } from "@/components/collaborators/CollaboratorList";
import { EventCard } from "@/components/calendar/EventCard";
import { Settings, UserX, LucidePanelBottomOpen } from "lucide-react";
import { Suspense } from "react";
import { BandProfileNav } from "@/components/bandProfile/BandProfileNav";
import { BackButton } from "@/components/BackButton";
import { type BandVisibility } from "@/lib/bandVisibility";

import countries from "world-countries";
import ReactCountryFlag from "react-country-flag";
import { SocialLinks } from "@/components/bandProfile/SocialLinks";
import { ProfileSection } from "@/components/bandProfile/ProfileSection";
import { Albums } from "@/components/bandProfile/Albums";
import { Singles } from "@/components/bandProfile/Singles";
import { HomeNav } from "@/components/bandProfile/Home";
import { Bio } from "@/components/bandProfile/Bio";
import { Tickets } from "@/components/bandProfile/Tickets";
import { Members } from "@/components/bandProfile/Members";
import {
  BandPublicInfoCard,
  type PublicBand,
  type PublicMember,
} from "@/components/band/BandPublicInfoCard";
export type Band = {
  id: string | number;
  band_name: string;
  bio: string | null;
  image_url: string | null;
  header_image_url: string | null;
  slug: string;
  visibility: BandVisibility;
  created_by: string;
  created_at: string | null;
  country: string | null;
  genre: string | null;
  spotify_url: string | null;
  bandcamp_url: string | null;
  youtube_url: string | null;
  tidal_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
};

type BandMember = {
  band_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  band: {
    id: string;
    band_name: string;
    image_url: string | null;
  };
  user: {
    handle: string | null;
    username: string;
    image_url: string;
  };
};

type BandEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  band_id: {
    id: string;
    band_name: string;
    image_url: string | null;
  };
};

type Project = {
  id: string;
  band_id: string;
  type: "album" | "single";
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string | null;
};

function BandProfileContent() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // The URL addresses the band by slug, but every other endpoint
  // (events, projects, members) is keyed on the band's UUID, so the id is
  // captured from the profile response and used for all follow-up calls.
  const [bandId, setBandId] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [publicBand, setPublicBand] = useState<PublicBand | null>(null);
  const [publicMembers, setPublicMembers] = useState<PublicMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    | "Home"
    | "Albums"
    | "Bio"
    | "Socials"
    | "Singles"
    | "Members"
    | "Tickets"
  >("Home");
  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }));

  const countryInfo = countryOptions.find(
    (option) => option.value === band?.country,
  );

  // the avatar strip is the band line-up, so people who have been asked but
  // have not answered do not belong in it
  const acceptedMembers = members.filter(
    (member) => member.status === "accepted",
  );

  useEffect(() => {
    async function loadBand() {
      try {
        const response = await fetch(`/api/bands/${slug}`);

        if (!response.ok) {
          setError("Failed to load band");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAuthenticated(data.authenticated);
        setBandId(data.band?.id ?? null);

        // The band resolves from a retired slug or a UUID too, so point the
        // address bar at the canonical slug rather than leaving whatever the
        // visitor arrived with. replace(), not push(), so Back still leaves
        // the page instead of bouncing through the old address.
        const canonicalSlug = data.band?.slug;
        if (canonicalSlug && canonicalSlug !== slug) {
          router.replace(`/band/${canonicalSlug}`);
        }

        if (!data.authenticated) {
          setPublicBand(data.band);
          setPublicMembers(data.members ?? []);
          setLoading(false);
          return;
        }

        setBand(data.band);
        setRole(data.role);

    if (data.band?.slug && data.band.slug !== slug) {
      router.replace(`/band/${data.band.slug}`);
    }
        setMembers(data.members);
        setCollaborators(data.collaborators ?? []);
        setLoading(false);
      } catch (error) {
        setError("Failed to load band");
        setLoading(false);
      }
    }

    loadBand();
  }, [router, slug]);

  async function handleChangeRole(memberUserId: string, nextRole: string) {
    setActionError(null);

    try {
      const response = await fetch(
        `/api/bands/${bandId}/members/${memberUserId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: nextRole }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // the server refuses to leave a band without a leader; surface its
        // wording rather than a generic failure so the fix is obvious
        setActionError(data.error || "Could not change role");
        return;
      }

      setMembers((current) =>
        current.map((member) =>
          member.user_id === memberUserId
            ? { ...member, role: nextRole }
            : member,
        ),
      );
    } catch {
      setActionError("Could not change role");
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      setActionError(null);

      const response = await fetch(`/api/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setActionError("Failed to remove member");
        return;
      }

      window.location.reload(); // Reload the page to show the new member in the list
    } catch (error) {
      setActionError("Failed to remove member");
    }
  }

  const fetchEvents = useCallback(async () => {
    if (!bandId || !authenticated) return;

    setEventsError(null);

    try {
      const response = await fetch(`/api/bands/${bandId}/events`);

      if (!response.ok) {
        console.error("Failed to fetch events:", await response.text());
        setEventsError("Failed to fetch events");
        return;
      }

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEventsError("Failed to fetch events");
    }
  }, [bandId, authenticated]);

  function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const selectedEvents = selectedDate
    ? events.filter((event) => {
        const selected = startOfDay(selectedDate);

        const start = startOfDay(new Date(event.start_date));
        const end = startOfDay(new Date(event.end_date ?? event.start_date));

        return selected >= start && selected <= end;
      })
    : [];

  const upComingEvents = selectedDate
    ? selectedEvents
    : events.filter((event) => {
        const eventDate = new Date(event.start_date);
        return eventDate >= new Date();
      });

  useEffect(() => {
    async function loadEvents() {
      await fetchEvents();
    }

    void loadEvents();
  }, [fetchEvents]);

  const fetchProjects = useCallback(async () => {
    if (!bandId || !authenticated) return;

    setProjectsError(null);

    try {
      const response = await fetch(`/api/bands/${bandId}/projects`);

      if (!response.ok) {
        setProjectsError("Failed to fetch projects");
        return;
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      setProjectsError("Failed to fetch projects");
    }
  }, [bandId, authenticated]);

  useEffect(() => {
    async function loadProjects() {
      await fetchProjects();
    }

    void loadProjects();
  }, [fetchProjects]);

  const albumProjects = projects.filter((project) => project.type === "album");
  const singleProjects = projects.filter(
    (project) => project.type === "single",
  );

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="w-full h-screen flex items-center justify-center">
        <AmpLoader />
      </main>
    );
  }

  if (!slug) {
    return <p>Band not found</p>;
  }

  if (authenticated === false) {
    return (
      <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
        <NavBar />
        <div className="mx-auto max-w-4xl px-4 py-8">
          {publicBand && (
            <BandPublicInfoCard band={publicBand} members={publicMembers} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full  min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:self-start md:sticky md:top-4 md:border-r md:border-neutral-800/60 md:px-4 md:py-2">
          <BandProfileNav
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            boardHref={`/band/${slug}/board`}
          />
        </aside>

        <div className="w-full min-w-0">
          <BackButton className="ml-4 mt-4" />

          <div className="relative mx-auto mt-4 w-full max-w-7xl px-4">
            {/* Mobile nav */}
            <div className="relative mb-4 md:hidden">
              <BandProfileNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                boardHref={`/band/${slug}/board`}
              />
              <div
                className="
          pointer-events-none
          absolute right-0 top-0 h-full w-8
          bg-gradient-to-l from-neutral-950/80 to-transparent
        "
              ></div>
            </div>

            <div className="w-full">
              {/* Profile card */}
          {activeSection === "Home" && (
          <section className="w-full overflow-hidden rounded-md bg-neutral-900/80 shadow-2xl">
            {/* Header image */}
            <div className="relative h-32 sm:h-48 md:h-72 lg:h-110 w-full overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-800 to-slate-900 shadow">
              <EditableProfileImage
                canEdit={role === "band_leader"}
                owner="band"
                ownerId={bandId ?? ""}
                target="header"
                label="header image"
                onSaved={(url) =>
                  setBand((current) =>
                    current ? { ...current, header_image_url: url } : current,
                  )
                }
              >
                {band?.header_image_url ? (
                  <img
                    src={band.header_image_url}
                    alt="Header"
                    className="h-full w-full object-cover opacity-80"
                  />
                ) : null}
              </EditableProfileImage>
            </div>

            {/* Profile info.
                The panel texture the members card used to carry, now that the
                card is gone and this strip is what the eye lands on under the
                header image. Darker than the card was -- it sits behind text
                rather than behind four avatars. */}
            <div
              style={{ backgroundImage: "url('/bg-components.jpg')" }}
              className="relative bg-cover bg-center px-8 pb-8 pt-16"
            >
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute -top-16 left-8 h-32 w-32 overflow-hidden rounded-full border-4 border-neutral-900 bg-slate-700 shadow-xl object-fill">
                <EditableProfileImage
                  canEdit={role === "band_leader"}
                  owner="band"
                  ownerId={bandId ?? ""}
                  target="avatar"
                  label="band picture"
                  overlayClassName="rounded-full"
                  onSaved={(url) =>
                    setBand((current) =>
                      current ? { ...current, image_url: url } : current,
                    )
                  }
                >
                  {band?.image_url ? (
                    <img
                      src={band.image_url}
                      alt={band.band_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-yellow-100">
                      {band?.band_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </EditableProfileImage>
              </div>

              {/* The flex row that used to live here held the name against
                  the members card. With the line-up moved to its own tab
                  there is nothing to sit opposite, so the name is simply the
                  name and the leader's two buttons follow it. */}
              <div className="relative z-10">
                <h1 className="text-2xl font-bold text-yellow-100">
                  {band?.band_name}
                </h1>

                {countryInfo && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
                    <ReactCountryFlag countryCode={countryInfo.value} svg />
                    <span>{countryInfo.label}</span>
                  </div>
                )}

                <p className="mt-1 text-sm text-neutral-400">
                  @{band?.band_name}
                </p>
              </div>

              {role === "band_leader" && (
                <div className="relative z-10 mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {/* Identical shape, because they sit side by side and the
                      only difference that should read is which one is the
                      primary action. The settings link used to be laid out
                      as text rather than as a flex row, which made it a
                      couple of pixels shorter than the button beside it. */}
                  <Link
                    href={`/band/${slug}/settings`}
                    className="flex items-center justify-center gap-2 rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <Settings className="h-4 w-4" />
                    Band settings
                  </Link>

                  <button
                    onClick={() => setNewProjectModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-yellow-50 hover:text-black!"
                  >
                    <Plus className="h-4 w-4" />
                    New project
                  </button>
                </div>
              )}
            </div>

          </section>
          )}

          <section className="mt-6 mb-24 w-full">
            <div className="rounded-lg  shadow-2xl ">
              {activeSection === "Home" && bandId && (
                <HomeNav
                  events={upComingEvents}
                  bandId={bandId}
                  role={role}
                  eventsError={eventsError}
                  onEventsChanged={fetchEvents}
                />
              )}
              {activeSection === "Albums" && (
                <Albums projects={albumProjects} error={projectsError} />
              )}
              {activeSection === "Singles" && (
                <Singles projects={singleProjects} error={projectsError} />
              )}
              {activeSection === "Bio" && (
                <Bio
                  band={band}
                  canEdit={role === "band_leader"}
                  bandId={bandId}
                  onSaved={(savedBio) =>
                    setBand((current) =>
                      current ? { ...current, bio: savedBio } : current,
                    )
                  }
                />
              )}
              {activeSection === "Socials" && (
                <SocialLinks
                  band={band}
                  canEdit={role === "band_leader"}
                  bandId={bandId}
                  onSaved={(links) =>
                    setBand((current) =>
                      current ? { ...current, ...links } : current,
                    )
                  }
                />
              )}
              {activeSection === "Members" && (
                <Members
                  members={members}
                  collaborators={collaborators}
                  role={role}
                  bandId={bandId}
                  actionError={actionError}
                  onChangeRole={handleChangeRole}
                  onRemoveMember={handleRemoveMember}
                />
              )}
              {activeSection === "Tickets" && <Tickets />}
            </div>
          </section>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}

      {newProjectModalOpen && bandId && (
        <NewProjectModal
          isOpen={newProjectModalOpen}
          onClose={() => setNewProjectModalOpen(false)}
          bandId={bandId}
        />
      )}

    </main>
  );
}

export default function BandProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="w-full h-screen flex items-center justify-center">
          <AmpLoader />
        </main>
      }
    >
      <BandProfileContent />
    </Suspense>
  );
}
