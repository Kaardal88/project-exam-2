"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import Link from "next/link";

import { NavBar } from "@/components/NavBar";
import { BandCalendar } from "@/components/calendar/BandCalendar";

import "@daypicker/react/style.css";
import { EventForm } from "@/components/calendar/EventForm";

import { EditBandProfileModal } from "@/components/bandProfile/editBandProfileModal";
import { EventCard } from "@/components/calendar/EventCard";
import { UserPlus, UserX, LucidePanelBottomOpen } from "lucide-react";
import { Suspense } from "react";

type Band = {
  id: string | number;
  band_name: string;
  bio: string | null;
  image_url: string | null;
  header_image_url: string | null;
  slug: string;
  created_by: string;
  created_at: string | null;
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
      window.location.reload(); // Reload the page to show the new member in the list
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
      <section className="mx-auto mt-1 flex flex-col w-full max-w-7xl rounded-md sm:48 md:w-3/4 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl">
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

          <p className="mt-1 text-sm text-neutral-400">@{band?.band_name}</p>
          {role === "band_leader" && (
            <button
              className="absolute top-4 right-4 rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
              onClick={() => setEditBandModalOpen(true)}
            >
              Edit profile
            </button>
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
      <section className="mx-auto mt-6  mb-10 w-full max-w-7xl md:w-3/4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Bio */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-4">
            <h2 className="mb-4 text-center text-yellow-100">Bio</h2>
            <p className="text-sm text-neutral-300">
              {band?.bio || "No bio yet."}
            </p>
          </section>

          {/* Members */}
          <section className="relative rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl lg:col-span-4">
            <div className="mb-3 flex items-center justify-center gap-3 ">
              <h2 className="text-yellow-100 ">Members</h2>

              <button
                type="button"
                onClick={() => setMembersOpen((prev) => !prev)}
                className="rounded-full  border border-dotted border-yellow-100  p-2 text-sm text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black hover:cursor-pointer ml-4"
              >
                <span
                  className={`block transition-transform duration-300 ${
                    membersOpen ? "rotate-180" : ""
                  }`}
                >
                  <LucidePanelBottomOpen className="h-4 w-4" />
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {members?.slice(0, 6).map((member) => (
                <Link
                  key={member.user_id}
                  href={`/pages/userProfile?id=${member.user_id}`}
                >
                  <img
                    src={member.user.image_url}
                    alt={member.user.username}
                    title={member.user.username}
                    className="h-10 w-10 rounded-full border border-neutral-700 object-cover transition hover:scale-105 hover:border-yellow-200"
                  />
                </Link>
              ))}
            </div>

            {membersOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
                  onClick={() => setMembersOpen(false)}
                />

                <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-950/95 p-4 shadow-2xl sm:max-w-md sm:p-5 md:max-w-lg lg:max-w-xl">
                  <button
                    type="button"
                    onClick={() => setMembersOpen(false)}
                    className="absolute right-3 top-3 rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-xs text-neutral-300 transition hover:border-yellow-200 hover:text-yellow-100"
                    aria-label="Close members"
                  >
                    ✕
                  </button>

                  <h3 className="mb-4 pr-8 text-lg font-semibold text-yellow-100 sm:text-xl">
                    Band members
                  </h3>

                  <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {members?.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-transparent p-2 transition hover:border-neutral-700 hover:bg-neutral-900/80 sm:p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <img
                            src={member.user.image_url}
                            alt={member.user.username}
                            className="h-11 w-11 rounded-full border border-neutral-700 object-cover sm:h-12 sm:w-12 md:h-14 md:w-14"
                          />

                          <div className="min-w-0">
                            <Link
                              href={`/pages/userProfile?id=${member.user_id}`}
                              className="block truncate text-sm font-semibold text-yellow-100 hover:underline sm:text-base"
                            >
                              {member.user.username}
                            </Link>

                            <p className="text-xs text-neutral-400 sm:text-sm">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        {role === "band_leader" &&
                          member.role !== "band_leader" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="shrink-0 rounded-full border border-red-500/40 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
                              aria-label={`Remove ${member.user.username}`}
                              title="Remove member"
                            >
                              <UserX className="h-5 w-5" />
                            </button>
                          )}
                      </div>
                    ))}
                  </div>

                  {role === "band_leader" && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-5 ml-auto flex w-fit rounded-full border border-neutral-600 bg-neutral-900 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Add member
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
          {/* Tickets / Events / whatever */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-4">
            <h2 className="mb-4 text-center text-yellow-100">Tickets</h2>
            <p className="text-sm text-neutral-400">Coming soon...</p>
          </section>

          {/* Work in progress */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6">
            <h2 className="mb-4 text-center text-yellow-100">
              Work in progress
            </h2>
            <p className="text-sm text-neutral-400">Projects here...</p>
          </section>

          {/* Albums */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6">
            <h2 className="mb-4 text-center text-yellow-100">Albums</h2>
            <p className="text-sm text-neutral-400">Albums here...</p>
          </section>

          {/* Finished */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6">
            <h2 className="mb-4 text-center text-yellow-100">Finished</h2>
            <p className="text-sm text-neutral-400">
              Finished projects here...
            </p>
          </section>

          {/* Singles */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6">
            <h2 className="mb-4 text-center text-yellow-100">Singles</h2>
            <p className="text-sm text-neutral-400">Singles here...</p>
          </section>

          {/* Calendar */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6">
            <h2 className="mb-4 text-center text-yellow-100">Calendar</h2>

            <div className="mb-4 flex   ">
              <BandCalendar
                events={events}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>
            {role === "band_leader" && (
              <button
                onClick={() => setShowEventForm(true)}
                className="rounded bg-yellow-200  hover:bg-yellow-300 px-4 py-2 mt-6 mx-auto w-full justify-center flex text-black hover:cursor-pointer"
              >
                <span className="mr-2 text-2xl ">+</span> Add Event
              </button>
            )}

            {showEventForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="w-full max-w-lg rounded-xl border border-neutral-700 bg-neutral-900 p-6">
                  <div className="mb-4  flex items-center justify-between">
                    <h2 className="text-xl font-bold text-yellow-100">
                      Add event
                    </h2>

                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="text-neutral-300 hover:text-white hover:cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <EventForm
                    bandId={bandId}
                    canCreateEvent={role === "band_leader"}
                    onCreated={() => {
                      fetchEvents();

                      setShowEventForm(false);
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Upcoming events */}
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-6 block h-[40vh] overflow-y-scroll">
            <h2 className="mb-4 text-center text-yellow-100">
              Upcoming events
            </h2>
            {upComingEvents.length > 0 ? (
              <div className="space-y-3">
                {upComingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No upcoming events</p>
            )}
          </section>
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
