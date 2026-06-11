"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { NavBar } from "@/components/NavBar";
import { BandCalendar } from "@/components/calendar/BandCalendar";

import "@daypicker/react/style.css";
import { EventForm } from "@/components/calendar/EventForm";

import { EditBandProfileModal } from "@/components/bandProfile/editBandProfileModal";
import { EventCard } from "@/components/calendar/EventCard";
import { UserPlus, UserX, LucidePanelBottomOpen } from "lucide-react";
import { Suspense } from "react";

import countries from "world-countries";
import ReactCountryFlag from "react-country-flag";
import {
  FaSpotify,
  FaYoutube,
  FaBandcamp,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaMusic,
  FaGlobe,
} from "react-icons/fa";

type Band = {
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

function ProfileSection({
  title,
  children,
  className = "",
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl ${className}`}
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <h2 className="text-center text-yellow-100">{title}</h2>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-dotted border-yellow-100 p-2 text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black"
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <LucidePanelBottomOpen
            className={`h-4 w-4 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[900px]" : "max-h-40"
        }`}
      >
        <div className={open ? "" : "line-clamp-5"}>{children}</div>
      </div>
    </section>
  );
}

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
      <main className="auth-page">
        <section className="auth-card">
          <p>Loading band...</p>
        </section>
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
      <section className="mx-auto mt-1 flex flex-col w-full max-w-7xl rounded-md sm:48 md:w-3/4 overflow-hidden  bg-neutral-900/80 shadow-2xl">
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

          <h1 className="text-2xl font-bold text-yellow-100">
            {band?.band_name}
          </h1>
          {countryInfo && (
            <div className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
              <ReactCountryFlag countryCode={countryInfo.value} svg />
              <span>{countryInfo.label}</span>
            </div>
          )}

          <p className="mt-1 text-sm text-neutral-400">@{band?.band_name}</p>
          {role === "band_leader" && (
            <div className="mt-2 justify-end flex items-center  gap-2 text-sm text-neutral-300">
              <button
                className=" rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
                onClick={() => setEditBandModalOpen(true)}
              >
                <p className="text-xs md:text-sm lg:text-base">Edit profile</p>
              </button>
              <Link
                href={`/pages/songDashboard?bandId=${bandId}`}
                className="rounded-full border border-yellow-100 p-2 text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black md:text-sm lg:text-base justify-between flex items-center gap-2 hover:cursor-pointer"
              >
                <Plus className="h-4 w-4" /> New project
              </Link>
            </div>
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
      {/*Top content*/}
      <section className="rounded-md mt-6 shadow-2xl w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ProfileSection title="Members">
            {role === "band_leader" && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mx-auto rounded-full border  border-yellow-100 px-4 py-2 text-xs text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black hover:cursor-pointer  mb-4 flex items-center    gap-2"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
            <div className="flex flex-col gap-4">
              {members.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex flex-col items-center gap-2"
                    >
                      <Link href={`/pages/userProfile?id=${member.user_id}`}>
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
                      </Link>

                      <Link
                        href={`/pages/userProfile?id=${member.user_id}`}
                        className="max-w-20 truncate text-sm text-yellow-100"
                      >
                        {member.user.username}
                      </Link>

                      {role === "band_leader" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-xs text-neutral-400 hover:text-red-300 hover:cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-neutral-400">
                  No members yet.
                </p>
              )}
            </div>
          </ProfileSection>

          <ProfileSection title="Bio">
            <p className="text-sm text-neutral-300">
              {band?.bio || "No bio yet."}
            </p>
          </ProfileSection>

          <ProfileSection title="Tickets">
            <p className="text-sm text-neutral-400">Coming soon...</p>
          </ProfileSection>
        </div>
      </section>

      {/* Main content */}
      <section className="mx-auto mt-6 mb-10 w-full max-w-7xl space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <ProfileSection title="Social links">
              <div className="space-y-3">
                {band?.spotify_url && (
                  <a
                    href={band.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaSpotify className="h-5 w-5 text-green-500" />
                      <span>Spotify</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.bandcamp_url && (
                  <a
                    href={band.bandcamp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaBandcamp className="h-5 w-5 text-green-500" />
                      <span>Bandcamp</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.youtube_url && (
                  <a
                    href={band.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaYoutube className="h-5 w-5 text-red-500" />
                      <span>Youtube</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.facebook_url && (
                  <a
                    href={band.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaFacebook className="h-5 w-5 text-blue-500" />
                      <span>Facebook</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.instagram_url && (
                  <a
                    href={band.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaInstagram className="h-5 w-5 text-pink-500" />
                      <span>Instagram</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.tiktok_url && (
                  <a
                    href={band.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaTiktok className="h-5 w-5 text-black" />
                      <span>TikTok</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.tidal_url && (
                  <a
                    href={band.tidal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaMusic className="h-5 w-5 text-black" />
                      <span>Tidal</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band?.website_url && (
                  <a
                    href={band.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaGlobe className="h-5 w-5 text-blue-500" />
                      <span>Website</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}
              </div>
            </ProfileSection>

            <ProfileSection title="Albums">
              <p className="text-neutral-400">Albums here...</p>
            </ProfileSection>

            <ProfileSection title="Singles">
              <p className="text-neutral-400">Singles here...</p>
            </ProfileSection>

            <ProfileSection title="Upcoming events">
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-2">
                {upComingEvents.length > 0 ? (
                  upComingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <p className="text-sm text-neutral-400">No upcoming events</p>
                )}
              </div>
            </ProfileSection>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <ProfileSection title="Work in progress">
              <p className="text-neutral-400">Projects here...</p>
            </ProfileSection>

            <ProfileSection title="Finished">
              <p className="text-neutral-400">Finished projects here...</p>
            </ProfileSection>

            <ProfileSection title="Calendar">
              <div className="flex justify-center">
                <BandCalendar
                  events={events}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
              </div>

              {role === "band_leader" && (
                <button
                  onClick={() => setShowEventForm(true)}
                  className="mt-6 flex w-full justify-center rounded bg-yellow-200 px-4 py-2 text-black hover:cursor-pointer hover:bg-yellow-300"
                >
                  <span className="mr-2 text-2xl">+</span>
                  Add Event
                </button>
              )}
            </ProfileSection>
          </div>
        </div>
      </section>
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
