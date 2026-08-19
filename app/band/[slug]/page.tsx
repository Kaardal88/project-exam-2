"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { ExternalLink, Home, Plus } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";
import { NavBar } from "@/components/NavBar";
import { BandCalendar } from "@/components/calendar/BandCalendar";

import "@daypicker/react/style.css";
import { EventForm } from "@/components/calendar/EventForm";

import { EditBandProfileModal } from "@/components/bandProfile/editBandProfileModal";
import { NewProjectModal } from "@/components/bandProfile/NewProjectModal";
import { DeleteBandModal } from "@/components/bandProfile/DeleteBandModal";
import { bandRoles } from "@/lib/bandRoles";
import {
  CollaboratorList,
  type Collaborator,
} from "@/components/collaborators/CollaboratorList";
import { EventCard } from "@/components/calendar/EventCard";
import { UserPlus, UserX, LucidePanelBottomOpen } from "lucide-react";
import { Suspense } from "react";
import { BandProfileNav } from "@/components/bandProfile/BandProfileNav";
import { BackButton } from "@/components/BackButton";
import { SuccessMessage } from "@/components/SuccessMessage";
import {
  DEFAULT_BAND_VISIBILITY,
  type BandVisibility,
} from "@/lib/bandVisibility";

import countries from "world-countries";
import ReactCountryFlag from "react-country-flag";
import { SocialLinks } from "@/components/bandProfile/SocialLinks";
import { ProfileSection } from "@/components/bandProfile/ProfileSection";
import { Albums } from "@/components/bandProfile/Albums";
import { Singles } from "@/components/bandProfile/Singles";
import { WIP } from "@/components/bandProfile/WIP";
import { Finished } from "@/components/bandProfile/Finished";
import { HomeNav } from "@/components/bandProfile/Home";
import { Bio } from "@/components/bandProfile/Bio";
import { Tickets } from "@/components/bandProfile/Tickets";
import { ChevronRight } from "lucide-react";
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
  spotify_url: string | null;
  bandcamp_url: string | null;
  youtube_url: string | null;
  tidal_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
};

type User = {
  id: string;
  handle: string | null;
  username: string;
  email: string;
  image_url?: string | null;
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
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [editBandModalOpen, setEditBandModalOpen] = useState(false);
  const [savingBand, setSavingBand] = useState(false);
  const [bandSaveSuccess, setBandSaveSuccess] = useState(false);
  const [memberAddSuccess, setMemberAddSuccess] = useState(false);
  const [band_name, setBandName] = useState("");
  const [visibility, setVisibility] = useState<BandVisibility>(
    DEFAULT_BAND_VISIBILITY,
  );
  const [bandSlug, setBandSlug] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [showEventForm, setShowEventForm] = useState(false);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [deleteBandModalOpen, setDeleteBandModalOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tidalUrl, setTidalUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [activeSection, setActiveSection] = useState<
    | "Home"
    | "Albums"
    | "Wip"
    | "Finished"
    | "Bio"
    | "Socials"
    | "Singles"
    | "Tickets"
  >("Home");
  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }));

  const countryInfo = countryOptions.find(
    (option) => option.value === band?.country,
  );

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase()),
  );

  const visibleUsers = filteredUsers.slice(0, visibleCount);

  // the avatar strip is the band line-up, so people who have been asked but
  // have not answered do not belong in it
  const acceptedMembers = members.filter(
    (member) => member.status === "accepted",
  );

  useEffect(() => {
    async function loadBand() {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(`/api/bands/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

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
        setBandName(data.band?.band_name ?? "");
        setVisibility(data.band?.visibility ?? DEFAULT_BAND_VISIBILITY);
        setBandSlug(data.band?.slug ?? "");

    if (data.band?.slug && data.band.slug !== slug) {
      router.replace(`/band/${data.band.slug}`);
    }
        setBio(data.band?.bio ?? "");
        setImageUrl(data.band?.image_url ?? "");
        setHeaderImageUrl(data.band?.header_image_url ?? "");
        setSpotifyUrl(data.band?.spotify_url ?? "");
        setBandcampUrl(data.band?.bandcamp_url ?? "");
        setYoutubeUrl(data.band?.youtube_url ?? "");
        setTidalUrl(data.band?.tidal_url ?? "");
        setInstagramUrl(data.band?.instagram_url ?? "");
        setFacebookUrl(data.band?.facebook_url ?? "");
        setTiktokUrl(data.band?.tiktok_url ?? "");
        setWebsiteUrl(data.band?.website_url ?? "");

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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setActionError("Unauthorized");
      return;
    }

    setActionError(null);
    setSavingBand(true);

    const response = await fetch(`/api/bands/${bandId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        band_name,
        visibility,
        slug: bandSlug,
        bio,
        image_url: imageUrl,
        header_image_url: headerImageUrl,
        country: countryInfo?.value,
        spotify_url: spotifyUrl,
        bandcamp_url: bandcampUrl,
        youtube_url: youtubeUrl,
        tidal_url: tidalUrl,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        tiktok_url: tiktokUrl,
        website_url: websiteUrl,
      }),
    });

    setSavingBand(false);

    if (!response.ok) {
      setActionError("Failed to save band");
      return;
    }

    const data = await response.json();
    setBand(data.band ?? "");

    setBandName(data.band?.band_name ?? "");
    setVisibility(data.band?.visibility ?? DEFAULT_BAND_VISIBILITY);
    setBandSlug(data.band?.slug ?? "");
    setBio(data.band?.bio ?? "");
    setImageUrl(data.band?.image_url ?? "");
    setHeaderImageUrl(data.band?.header_image_url ?? "");
    setSpotifyUrl(data.band?.spotify_url ?? "");
    setBandcampUrl(data.band?.bandcamp_url ?? "");
    setYoutubeUrl(data.band?.youtube_url ?? "");
    setTidalUrl(data.band?.tidal_url ?? "");
    setInstagramUrl(data.band?.instagram_url ?? "");
    setFacebookUrl(data.band?.facebook_url ?? "");
    setTiktokUrl(data.band?.tiktok_url ?? "");
    setWebsiteUrl(data.band?.website_url ?? "");
    setActionError(null);

    setBandSaveSuccess(true);
    setTimeout(() => {
      setBandSaveSuccess(false);
      setEditBandModalOpen(false);
    }, 900);
  }

  useEffect(() => {
    async function loadUsers() {
      const token = localStorage.getItem("token");

      try {
        if (!token) {
          setActionError("Unauthorized");
          return;
        }

        setActionError(null);

        const response = await fetch(`/api/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setActionError("Failed to load users");
          return;
        }

        const data = await response.json();
        setUsers(data.users ?? data);
      } catch (error) {
        setActionError("Failed to load users");
      }
    }

    if (showModal) {
      loadUsers();
    }
  }, [showModal, users.length]);

  async function handleAddMember(userId: string) {
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        setActionError("Unauthorized");
        return;
      }

      setActionError(null);

      const response = await fetch(`/api/bands/${bandId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        setActionError("Failed to add member");
        return;
      }

      setMemberAddSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (error) {
      setActionError("Failed to add member");
    }
  }

  async function handleChangeRole(memberUserId: string, nextRole: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      setActionError("Unauthorized");
      return;
    }

    setActionError(null);

    try {
      const response = await fetch(
        `/api/bands/${bandId}/members/${memberUserId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        setActionError("Unauthorized");
        return;
      }

      setActionError(null);

      const response = await fetch(`/api/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setActionError("Failed to remove member");
        return;
      }

      setShowModal(false);
      window.location.reload(); // Reload the page to show the new member in the list
    } catch (error) {
      setActionError("Failed to remove member");
    }
  }

  const fetchEvents = useCallback(async () => {
    if (!bandId || !authenticated) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setEventsError("Unauthorized");
      return;
    }

    setEventsError(null);

    try {
      const response = await fetch(`/api/bands/${bandId}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

    const token = localStorage.getItem("token");

    if (!token) {
      setProjectsError("Unauthorized");
      return;
    }

    setProjectsError(null);

    try {
      const response = await fetch(`/api/bands/${bandId}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
          />
        </aside>

        <div className="w-full min-w-0">
          <BackButton className="flex items-center gap-2 ml-4 mt-4 w-fit rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer" />

          <div className="relative mx-auto mt-4 w-full max-w-7xl px-4">
            {/* Mobile nav */}
            <div className="relative mb-4 md:hidden">
              <BandProfileNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
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
              {band?.header_image_url ? (
                <img
                  src={band.header_image_url}
                  alt="Header"
                  className="h-full w-full object-cover opacity-80"
                />
              ) : null}
            </div>

            {/* Profile info */}
            <div className="relative px-8 pb-8 pt-16">
              <div className="absolute -top-16 left-8 h-32 w-32 overflow-hidden rounded-full border-4 border-neutral-900 bg-slate-700 shadow-xl object-fill">
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
              </div>

              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
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

                {/* Members card */}
                <div
                  style={{
                    backgroundImage: "url('/bg-components.jpg')",
                  }}
                  className="relative w-full overflow-hidden rounded-md border border-neutral-600/70 bg-cover bg-center p-4 shadow-[inset_0_4px_6px_rgba(255,255,255,0.01),0_8px_16px_rgba(0,0,0,0.3)] sm:w-64"
                >
                  <div className="absolute inset-0 bg-black/20" />

                  <div className="absolute left-2 top-2 z-10 h-4 w-4 opacity-90">
                    <img
                      src="/svg/hardware/panel-screw.png"
                      alt="Panel Screw"
                      className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                  <div className="absolute right-2 top-2 z-10 h-4 w-4">
                    <img
                      src="/svg/hardware/panel-screw.png"
                      alt="Panel Screw"
                      className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 z-10 h-4 w-4">
                    <img
                      src="/svg/hardware/panel-screw.png"
                      alt="Panel Screw"
                      className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                  <div className="absolute bottom-2 right-2 z-10 h-4 w-4 opacity-90">
                    <img
                      src="/svg/hardware/panel-screw.png"
                      alt="Panel Screw"
                      className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    />
                  </div>

                  <h3 className="relative z-10 mb-3 text-center text-sm font-bold text-yellow-100 font-[family-name:var(--font-caveat)]">
                    Members
                  </h3>

                  <div className="relative z-10 grid grid-cols-4 gap-2">
                    {acceptedMembers.slice(0, 4).map((member) => (
                      <Link
                        key={member.user_id}
                        href={`/user/${member.user.handle ?? member.user_id}`}
                        className="flex flex-col items-center gap-1"
                      >
                        {member.user.image_url ? (
                          <img
                            src={member.user.image_url}
                            alt={member.user.username}
                            className="h-9 w-9 rounded-full border border-neutral-600 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-xs font-bold text-yellow-100">
                            {member.user.username.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span className="max-w-12 truncate text-[10px] text-yellow-100">
                          {member.user.username}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2">
                    {acceptedMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMembersOpen(true)}
                        className="flex items-center gap-0.5 rounded-full border border-neutral-600 px-1.5 py-0.5 text-[9px] text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                      >
                        See all
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    )}

                    {role === "band_leader" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberAddSuccess(false);
                          setShowModal(true);
                        }}
                        className="flex items-center gap-0.5 rounded-full border border-yellow-100 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black"
                      >
                        <UserPlus className="h-2.5 w-2.5" />
                        Add member
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {role === "band_leader" && (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => {
                      setBandSaveSuccess(false);
                      setEditBandModalOpen(true);
                    }}
                    className="rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    Edit profile
                  </button>

                  <button
                    onClick={() => setNewProjectModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-50 hover:text-black!"
                  >
                    <Plus className="h-4 w-4" />
                    New project
                  </button>
                </div>
              )}
            </div>

              {membersOpen && (
                <Modal
                  isOpen={membersOpen}
                  onClose={() => setMembersOpen(false)}
                >
                  <div className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
                    <h2 className="mb-6 text-xl font-bold text-yellow-100">
                      Members
                    </h2>

                    {actionError && (
                      <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                        {actionError}
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 p-4"
                        >
                          <Link
                            href={`/user/${member.user.handle ?? member.user_id}`}
                            className="flex items-center gap-3"
                          >
                            {member.user.image_url ? (
                              <img
                                src={member.user.image_url}
                                alt={member.user.username}
                                className="h-12 w-12 rounded-full border border-neutral-600 object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-lg font-bold text-yellow-100">
                                {member.user.username.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <span className="text-sm font-semibold text-yellow-100">
                              {member.user.username}
                            </span>

                            {member.status !== "accepted" && (
                              <span className="rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                                {member.status === "pending"
                                  ? "Invited"
                                  : "Declined"}
                              </span>
                            )}
                          </Link>

                          {role === "band_leader" && (
                            <div className="flex flex-col items-end gap-2">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleChangeRole(
                                    member.user_id,
                                    e.target.value,
                                  )
                                }
                                className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none focus:border-yellow-200"
                              >
                                {bandRoles.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveMember(member.user_id)
                                }
                                className="text-xs text-neutral-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Guests are invited per project and are deliberately not
                        band members, so this is the only place the band sees
                        who else is currently working with them. */}
                    <h3 className="mb-2 mt-8 text-lg font-bold text-yellow-100">
                      Collaborators
                    </h3>

                    <CollaboratorList
                      collaborators={collaborators}
                      showProject
                      emptyText="No guests on any project right now."
                    />
                  </div>
                </Modal>
              )}

              {editBandModalOpen && (
                <EditBandProfileModal
                  isOpen={editBandModalOpen}
                  onClose={() => setEditBandModalOpen(false)}
                  onSave={handleSave}
                  error={actionError}
                  saving={savingBand}
                  success={bandSaveSuccess}
                  bandName={band_name}
                  setBandName={setBandName}
                  visibility={visibility}
                  setVisibility={setVisibility}
                  slug={bandSlug}
                  setSlug={setBandSlug}
                  onRequestDelete={() => {
                    setEditBandModalOpen(false);
                    setDeleteBandModalOpen(true);
                  }}
                  bio={bio}
                  setBio={setBio}
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  headerImageUrl={headerImageUrl}
                  setHeaderImageUrl={setHeaderImageUrl}
                  spotifyUrl={spotifyUrl}
                  setSpotifyUrl={setSpotifyUrl}
                  bandcampUrl={bandcampUrl}
                  setBandcampUrl={setBandcampUrl}
                  youtubeUrl={youtubeUrl}
                  setYoutubeUrl={setYoutubeUrl}
                  tidalUrl={tidalUrl}
                  setTidalUrl={setTidalUrl}
                  instagramUrl={instagramUrl}
                  setInstagramUrl={setInstagramUrl}
                  facebookUrl={facebookUrl}
                  setFacebookUrl={setFacebookUrl}
                  tiktokUrl={tiktokUrl}
                  setTiktokUrl={setTiktokUrl}
                  websiteUrl={websiteUrl}
                  setWebsiteUrl={setWebsiteUrl}
                />
              )}

            {showModal && (
              <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <div className="w-[90vw] max-w-3xl max-h-[85vh] overflow-y-auto">
                  <h2 className="mb-4 text-xl font-bold text-yellow-100">
                    Invite new member
                  </h2>

                  {actionError && (
                    <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                      {actionError}
                    </p>
                  )}

                  {memberAddSuccess && (
                    <SuccessMessage message="Invitation sent" className="mb-4" />
                  )}

                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleCount(20);
                    }}
                    className="mb-6 w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-500 focus:border-yellow-200"
                  />

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {visibleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col items-center rounded-md  p-4 text-center shadow-xl"
                      >
                        <Link href={`/user/${user.handle ?? user.id}`}>
                          {user.image_url ? (
                            <img
                              src={user.image_url}
                              alt={user.username}
                              className="mb-3 h-20 w-20 rounded-full object-cover border border-neutral-600"
                            />
                          ) : (
                            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-lg font-bold text-yellow-100">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="mb-3 max-w-full truncate text-sm font-semibold text-yellow-100">
                            {user.username}
                          </div>
                        </Link>

                        <button
                          className="rounded-md border border-yellow-100 px-3 py-1 text-xs text-yellow-100 transition hover:bg-yellow-100 hover:text-black hover:cursor-pointer"
                          onClick={() => handleAddMember(user.id)}
                        >
                          Invite
                        </button>
                      </div>
                    ))}

                    {visibleCount < filteredUsers.length && (
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 20)}
                        className="mx-auto mt-6 block rounded-md border border-neutral-600 px-4 py-2 text-sm text-yellow-100 transition hover:border-yellow-100 hover:bg-neutral-800 hover:cursor-pointer"
                      >
                        See all
                      </button>
                    )}
                  </div>
                </div>
              </Modal>
            )}
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
              {activeSection === "Wip" && <WIP />}
              {activeSection === "Finished" && <Finished />}
              {activeSection === "Bio" && <Bio band={band} />}
              {activeSection === "Socials" && <SocialLinks band={band} />}
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

      {deleteBandModalOpen && bandId && band && (
        <DeleteBandModal
          isOpen={deleteBandModalOpen}
          onClose={() => setDeleteBandModalOpen(false)}
          bandId={bandId}
          bandName={band.band_name}
          projectCount={projects.length}
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
