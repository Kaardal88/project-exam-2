"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { ExternalLink, Home, Plus } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";
import { NavBar } from "@/components/NavBar";
import { BandCalendar } from "@/components/calendar/BandCalendar";

import "@daypicker/react/style.css";
import { EventForm } from "@/components/calendar/EventForm";

import { EditBandProfileModal } from "@/components/bandProfile/editBandProfileModal";
import { EventCard } from "@/components/calendar/EventCard";
import { UserPlus, UserX, LucidePanelBottomOpen } from "lucide-react";
import { Suspense } from "react";
import { BandProfileNav } from "@/components/bandProfile/BandProfileNav";

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
export type Band = {
  id: string | number;
  band_name: string;
  bio: string | null;
  image_url: string | null;
  header_image_url: string | null;
  slug: string;
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
  username: string;
  email: string;
  image_url?: string | null;
};

type BandMember = {
  band_id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  band: {
    id: string;
    band_name: string;
    image_url: string | null;
  };
  user: {
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

function BandProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bandId = searchParams.get("id");

  const [band, setBand] = useState<Band | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [editBandModalOpen, setEditBandModalOpen] = useState(false);
  const [band_name, setBandName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [showEventForm, setShowEventForm] = useState(false);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [membersOpen, setMembersOpen] = useState(false);
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

  useEffect(() => {
    async function loadBand() {
      const token = localStorage.getItem("token");
      try {
        if (!token) {
          setError("Unauthorized");
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/bands/${bandId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setError("Failed to load band");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setBand(data.band);
        setRole(data.role);
        setBandName(data.band?.band_name ?? "");
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

        const membership = data.membership;
        if (membership) {
          setRole(membership.role);
        }

        setLoading(false);
        setMembers(data.members);
      } catch (error) {
        setError("Failed to load band");
        setLoading(false);
      }
    }

    loadBand();
  }, [router, bandId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      return;
    }

    const response = await fetch(`/api/bands/${bandId} `, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        band_name,
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

    if (!response.ok) {
      setError("Failed to save band");
      return;
    }

    const data = await response.json();
    setBand(data.band ?? "");

    setBandName(data.band?.band_name ?? "");
    setBio(data.band?.bio ?? "");
    setImageUrl(data.band?.image_url ?? "");
    setHeaderImageUrl(data.band?.header_image_url ?? "");
    setEditBandModalOpen(false);
    setSpotifyUrl(data.band?.spotify_url ?? "");
    setBandcampUrl(data.band?.bandcamp_url ?? "");
    setYoutubeUrl(data.band?.youtube_url ?? "");
    setTidalUrl(data.band?.tidal_url ?? "");
    setInstagramUrl(data.band?.instagram_url ?? "");
    setFacebookUrl(data.band?.facebook_url ?? "");
    setTiktokUrl(data.band?.tiktok_url ?? "");
    setWebsiteUrl(data.band?.website_url ?? "");
    setError(null);
  }

  useEffect(() => {
    async function loadUsers() {
      const token = localStorage.getItem("token");

      try {
        if (!token) {
          setError("Unauthorized");
          return;
        }

        const response = await fetch(`/api/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setError("Failed to load users");
          return;
        }

        const data = await response.json();
        setUsers(data.users ?? data);
      } catch (error) {
        setError("Failed to load users");
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
        setError("Unauthorized");
        return;
      }
      const response = await fetch(`/api/bands/${bandId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        setError("Failed to add member");
        return;
      }

      setShowModal(false);
      window.location.reload();
    } catch (error) {
      setError("Failed to add member");
    }
  }

  async function handleRemoveMember(userId: string) {
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        setError("Unauthorized");
        return;
      }
      const response = await fetch(`/api/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError("Failed to remove member");
        return;
      }

      setShowModal(false);
      window.location.reload(); // Reload the page to show the new member in the list
    } catch (error) {
      setError("Failed to remove member");
    }
  }

  const fetchEvents = useCallback(async () => {
    if (!bandId) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      return;
    }

    try {
      const response = await fetch(`/api/bands/${bandId}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch events:", await response.text());
        setError("Failed to fetch events");
        return;
      }

      const data = await response.json();
      console.log("events from API:", data);

      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch events");
    }
  }, [bandId]);

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

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error}</p>
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

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error}</p>
        </section>
      </main>
    );
  }

  if (!bandId) {
    return <p>Band not found</p>;
  }

  return (
    <main className="w-full  min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />
      <Link
        href="/pages/userProfile?page?id=${user?.id}"
        className="flex items-center gap-2 ml-4 mt-4 w-fit rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
      >
        Back
      </Link>

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

        {/* Desktop sidebar */}
        <aside className="hidden md:block md:absolute md:left-[-240px] md:top-0 md:w-[220px]">
          <BandProfileNav
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        </aside>

        <div className="w-full">
          {/* Profile card */}
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

                {role === "band_leader" && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <button
                      onClick={() => setEditBandModalOpen(true)}
                      className="rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                    >
                      Edit profile
                    </button>

                    <Link
                      href={`/pages/songDashboard?bandId=${bandId}`}
                      className="flex items-center justify-center gap-2 rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-50 hover:text-black!"
                    >
                      <Plus className="h-4 w-4" />
                      New project
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/*Members section*/}
            <h3 className="text-sm md:text-xl lg:text-2xl font-bold text-yellow-100 mb-2 justify-center flex font-[family-name:var(--font-caveat)]  ">
              Members
            </h3>
            <div
              style={{
                backgroundImage: "url('/bg-components.jpg')",
              }}
              className="
    relative

    mx-auto
    flex
    max-w-2xl
    flex-wrap
    items-center
    justify-center
    gap-4
    rounded-md
    border
    border-neutral-600/70
    before:absolute before:inset-0 before:rounded-md before:border before:border-white/5
    p-4
mb-4

    bg-cover
    bg-center

    shadow-[inset_0_6px_6px_rgba(255,255,255,0.01),_0_10px_20px_rgba(0,0,0,0.3  )]
  "
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className=" absolute left-3 top-3 h-6 w-6 opacity-90 z-10">
                <img
                  src="/svg/hardware/panel-screw.png"
                  alt="Panel Screw"
                  className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="absolute right-3 top-3 z-10 h-6 w-6">
                <img
                  src="/svg/hardware/panel-screw.png"
                  alt="Panel Screw"
                  className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
              </div>
              <div className="absolute bottom-3 left-3 h-6 w-6 z-10">
                <img
                  src="/svg/hardware/panel-screw.png"
                  alt="Panel Screw"
                  className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="absolute bottom-3 right-3 h-6 w-6 z-10 opacity-90">
                <img
                  src="/svg/hardware/panel-screw.png"
                  alt="Panel Screw"
                  className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="flex gap-4 overflow-x-auto z-10 pb-2">
                {members.slice(0, 5).map((member) => (
                  <Link
                    key={member.user_id}
                    href={`/pages/userProfile?id=${member.user_id}`}
                    className="min-w-14 flex flex-col items-center gap-1"
                  >
                    {member.user.image_url ? (
                      <img
                        src={member.user.image_url}
                        alt={member.user.username}
                        className="h-11 w-11 rounded-full border border-neutral-600 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-sm font-bold text-yellow-100">
                        {member.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <span className="max-w-16 truncate text-xs text-yellow-100">
                      {member.user.username}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-6 rounded-md   p-4">
                <div className="mb-3 flex items-center justify-between gap-3 ">
                  <div className="flex gap-2 z-10">
                    {members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMembersOpen(true)}
                        className="flex items-center gap-1 rounded-full border border-neutral-600 px-3 py-1.5 text-xs text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                      >
                        See all
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {role === "band_leader" && (
                      <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="rounded-full border border-yellow-100 px-3 py-1.5 text-xs text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50" />
                </div>
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 p-4"
                        >
                          <Link
                            href={`/pages/userProfile?id=${member.user_id}`}
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
                          </Link>

                          {role === "band_leader" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-xs text-neutral-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Modal>
              )}

              {editBandModalOpen && (
                <EditBandProfileModal
                  isOpen={editBandModalOpen}
                  onClose={() => setEditBandModalOpen(false)}
                  onSave={handleSave}
                  bandName={band_name}
                  setBandName={setBandName}
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
            </div>

            {showModal && (
              <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <div className="w-[90vw] max-w-3xl max-h-[85vh] overflow-y-auto">
                  <h2 className="mb-4 text-xl font-bold text-yellow-100">
                    Invite new member
                  </h2>

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
                        <Link href={`/pages/userProfile?id=${user.id}`}>
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

          <section className="mt-6 mb-24 w-full">
            <div className="rounded-lg  shadow-2xl ">
              {activeSection === "Home" && (
                <HomeNav events={upComingEvents} bandId={bandId} role={role} />
              )}
              {activeSection === "Albums" && <Albums />}
              {activeSection === "Singles" && <Singles />}
              {activeSection === "Wip" && <WIP />}
              {activeSection === "Finished" && <Finished band={band} />}
              {activeSection === "Bio" && <Bio band={band} />}
              {activeSection === "Socials" && <SocialLinks band={band} />}
              {activeSection === "Tickets" && <Tickets />}
            </div>
          </section>
        </div>
      </div>

      {/* Main content */}
    </main>
  );
}

export default function BandProfilePage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <BandProfileContent />
    </Suspense>
  );
}
