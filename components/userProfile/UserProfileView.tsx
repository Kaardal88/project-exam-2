"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Modal } from "@/components/Modal";
import { BandCalendar } from "@/components/calendar/BandCalendar";
import { EventForm, EventFormEvent } from "@/components/calendar/EventForm";
import { EventCard } from "@/components/calendar/EventCard";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import type { EventOrigin } from "@/components/calendar/EventOriginLabel";
import { EditUserProfileModal } from "@/components/userProfile/EditUserProfileModal";
import { PersonStanding } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";
import { userTagMap } from "@/lib/userTags";
import { CollabProjects } from "@/components/userProfile/CollabProjects";

type User = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  image_url: string;
  header_image_url: string | null;
  tags: string[];
};

type BandMember = {
  band_id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  band: {
    id: string;
    slug: string;
    band_name: string;
    image_url: string | null;
  };
};

type BandEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  band_id: string | number;
};

type PrivateEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
};

type ProfileEvent = (BandEvent | PrivateEvent) & {
  source: "band" | "private";
};

export function UserProfileView({
  profileIdentifier = null,
}: {
  /** handle or UUID of the profile to show; null means the signed-in user */
  profileIdentifier?: string | null;
}) {
  const router = useRouter();

  const profileUserId = profileIdentifier;

  // Derived from identity, not from whether the URL carries an identifier.
  // /user canonicalises to /user/<your handle>, so "the URL has no id" stops
  // meaning "this is mine" the moment that redirect fires.
  const [isOwnProfile, setIsOwnProfile] = useState(!profileIdentifier);

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<BandMember[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openEditModal = () => {
    setSaveSuccess(false);
    setEditOpen(true);
  };
  const closeEditModal = () => setEditOpen(false);
  const [imageUrl, setImageUrl] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [privateEvents, setPrivateEvents] = useState<PrivateEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showPrivateEventForm, setShowPrivateEventForm] = useState(false);
  const [editingPrivateEvent, setEditingPrivateEvent] =
    useState<EventFormEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ProfileEvent | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    async function loadUser() {
      // Always establish who is signed in, so ownership can be decided by
      // comparing ids rather than by inspecting the URL.
      const meResponse = await fetch("/api/auth/me");

      if (meResponse.status === 401) {
        router.push("/login");
        return;
      }

      const me = meResponse.ok ? await meResponse.json() : null;

      const response = profileUserId
        ? await fetch(`/api/users/${profileUserId}`)
        : meResponse;

      const data = profileUserId ? await response.json() : me;

      if (!response.ok || !data?.user) {
        setError(data?.error || "Could not load profile");
        setLoading(false);
        return;
      }

      setIsOwnProfile(me?.user?.id === data.user.id);

      // Park the address bar on a link that works for anyone. Visiting /user
      // resolves from the reader's own token, so a shared /user link shows the
      // recipient their own profile instead of this one -- silently wrong
      // rather than broken, which is worse.
      if (!profileUserId && data.user.handle) {
        router.replace(`/user/${data.user.handle}`);
      }

      setUsername(data.user.username ?? "");
      setImageUrl(data.user.image_url ?? "");
      setHeaderImageUrl(data.user.header_image_url ?? "");
      setUser(data.user);
      setMembers(data.bandMembers ?? []);
      setTags(data.user.tags ?? []);
      setLoading(false);
    }

    loadUser();
  }, [router, profileUserId]);

  const fetchUserEvents = useCallback(async () => {
    if (!user?.id) return;

    const response = await fetch(`/api/users/me/events`);

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not load events");
      return;
    }

    setEvents(Array.isArray(data) ? data : (data.events ?? []));
  }, [user?.id, router]);

  const fetchPrivateEvents = useCallback(async () => {
    if (!user?.id || !isOwnProfile) return;

    const response = await fetch(`/api/users/me/private-events`);

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not load private events");
      return;
    }

    setPrivateEvents(Array.isArray(data) ? data : []);
  }, [user?.id, isOwnProfile, router]);

  const allEvents: ProfileEvent[] = [
    ...events.map((event) => ({ ...event, source: "band" as const })),
    ...privateEvents.map((event) => ({ ...event, source: "private" as const })),
  ];

  function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const selectedEvents = selectedDate
    ? allEvents.filter((event) => {
        const selected = startOfDay(selectedDate);
        const start = startOfDay(new Date(event.start_date));
        const end = startOfDay(new Date(event.end_date ?? event.start_date));
        return selected >= start && selected <= end;
      })
    : [];

  const upComingEvents = selectedDate
    ? selectedEvents
    : allEvents.filter((event) => {
        const endDate = new Date(event.end_date ?? event.start_date);
        return endDate >= new Date();
      });

  useEffect(() => {
    async function loadEvents() {
      await fetchUserEvents();
      await fetchPrivateEvents();
    }

    void loadEvents();
  }, [fetchUserEvents, fetchPrivateEvents]);

  function openCreatePrivateEvent() {
    setEditingPrivateEvent(null);
    setShowPrivateEventForm(true);
  }

  function originForEvent(event: ProfileEvent): EventOrigin {
    if (event.source !== "band") return { type: "private" };

    const bandId = (event as BandEvent).band_id;
    const band = members.find((member) => member.band_id === bandId)?.band;

    return {
      type: "band",
      bandName: band?.band_name ?? "Unknown band",
      bandHref: `/band/${band?.slug ?? bandId}`,
    };
  }

  function openEditPrivateEvent(event: PrivateEvent) {
    setSelectedEvent(null);
    setEditingPrivateEvent({
      id: event.id,
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
    });
    setShowPrivateEventForm(true);
  }

  async function handleDeletePrivateEvent(eventId: string) {
    if (!window.confirm("Delete this event?")) return false;

    const response = await fetch(`/api/users/me/private-events/${eventId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error("Failed to delete event", await response.text());
      return false;
    }

    await fetchPrivateEvents();
    return true;
  }

  async function deletePrivateEventFromDetails(eventId: string) {
    const deleted = await handleDeletePrivateEvent(eventId);
    if (deleted) setSelectedEvent(null);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user?.id) {
      setError("Missing user id");
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,

        image_url: imageUrl,
        header_image_url: headerImageUrl,
        tags: tags,
      }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error || "Could not update profile");
      return;
    }

    setUser(data.user);
    setUsername(data.user.username ?? "");
    setImageUrl(data.user.image_url ?? "");
    setHeaderImageUrl(data.user.header_image_url ?? "");
    setTags(data.user.tags ?? []);

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      closeEditModal();
    }, 900);
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
          <p className="rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
          <button
            className="btn"
            onClick={() => router.push("/login")}
          >
            Log in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page ">
      <NavBar />

      <section className="mx-auto mt-10 flex flex-col w-full max-w-7xl rounded-md sm:48 md:w-3/4 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl">
        {/* Header image */}
        <div className="relative h-32 sm:h-48 md:h-72 lg:h-110 w-full overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-800 to-slate-900 shadow">
          {user?.header_image_url ? (
            <img
              src={user.header_image_url}
              alt="Header"
              className="h-full w-full object-cover opacity-80"
            />
          ) : null}
        </div>

        {/* Profile info */}
        <div className="relative px-8 pb-8 pt-16">
          <div className="absolute -top-16 left-8 h-32 w-32 overflow-hidden rounded-full border-4 border-neutral-900 bg-slate-700 shadow-xl object-fill">
            {user?.image_url ? (
              <img
                src={user.image_url}
                alt={user.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-yellow-100">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-yellow-100">
            {user?.username}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">@{user?.username}</p>

          {user?.tags && user.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {user.tags.map((tag) => {
                const tagInfo = userTagMap[tag];

                return (
                  <span
                    key={tag}
                    className="flex items-center gap-2 rounded-full border border-yellow-200/20 bg-black/40 px-3 py-1 text-sm text-yellow-100"
                  >
                    {tagInfo?.icon && <span>{tagInfo?.icon}</span>}
                    {!tagInfo?.icon && (
                      <span>
                        <PersonStanding />
                      </span>
                    )}
                    <span>{tagInfo?.label ?? tag}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className=" flex flex-row justify-end mb-2 mr-4 gap-2">
          {isOwnProfile && (
            <button
              onClick={openEditModal}
              className="  rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
            >
              <p className="text-xs md:text-sm lg:text-base">Edit profile</p>
            </button>
          )}
          {isOwnProfile && (
            <>
              <button
                className="  rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
                onClick={() => router.push("/bands/new")}
              >
                <p className="text-xs md:text-sm lg:text-base">
                  Create artist{" "}
                </p>
              </button>

              <EditUserProfileModal
                isOpen={editOpen}
                onClose={closeEditModal}
                onSave={handleSave}
                saving={saving}
                success={saveSuccess}
                username={username}
                setUsername={setUsername}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                headerImageUrl={headerImageUrl}
                setHeaderImageUrl={setHeaderImageUrl}
                tags={tags}
                setTags={setTags}
              />
            </>
          )}
        </div>
      </section>
      {isOwnProfile && <CollabProjects />}

      <section className="mx-auto mt-6  mb-10 w-full max-w-7xl md:w-3/4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-3">
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-4">
            <div className="mt-4">
              <p className="mb-4 text-lg font-bold text-yellow-100">
                <strong>{user?.username}&apos;s artistpages</strong>
              </p>

              {members.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <Link
                      key={member.band_id}
                      href={`/band/${member.band.slug ?? member.band_id}`}
                      style={{ backgroundImage: "url('/bg-components.jpg')" }}
                      className="relative flex w-full flex-col items-center overflow-hidden rounded-md border border-neutral-600/70 bg-cover bg-center p-4 text-center shadow-[inset_0_4px_6px_rgba(255,255,255,0.01),0_8px_16px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:scale-[1.03] hover:border-yellow-200/60"
                    >
                      <div className="absolute inset-0 bg-black/55" />

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

                      <div className="relative z-10 flex flex-col items-center">
                        {member.band.image_url ? (
                          <img
                            src={member.band.image_url}
                            alt={member.band.band_name}
                            className="mb-3 h-24 w-24 rounded-full object-cover shadow-[0_0_16px_rgba(245,158,11,0.4)]"
                          />
                        ) : (
                          <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-yellow-100 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                            {member.band.band_name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <h3 className="font-semibold text-yellow-100">
                          {member.band.band_name}
                        </h3>

                        <p className="mt-1 text-sm text-neutral-400">
                          {member.role}
                        </p>

                        <p className="mt-2 text-xs text-neutral-500">
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString()
                            : "No join date"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-neutral-400">None</p>
              )}
            </div>
          </section>
          {/* Upcoming events */}
          <section className="mx-auto mt-2 mb-8 w-full max-w-7xl overflow-hidden rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
            <h2 className="mb-4 text-center text-yellow-100">
              {selectedDate ? "Events on selected date" : "Upcoming events"}
            </h2>
            <div className="mb-4 flex flex-col  gap-4 divide-y divide-yellow-100">
              {upComingEvents.length === 0 ? (
                <p className="text-center text-sm text-neutral-400">
                  No events
                </p>
              ) : (
                upComingEvents.map((event) => {
                  const isBandEvent = event.source === "band";

                  return (
                    <EventCard
                      key={`${event.source}-${event.id}`}
                      event={event}
                      origin={originForEvent(event)}
                      canManage={isOwnProfile && !isBandEvent}
                      onOpen={() => setSelectedEvent(event)}
                      onEdit={() => openEditPrivateEvent(event as PrivateEvent)}
                      onDelete={() => void handleDeletePrivateEvent(event.id)}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Calendar */}
          <section className="mx-auto mt-2 mb-8 w-full max-w-7xl overflow-hidden rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-2">
            <h2 className="mb-4 text-center text-yellow-100">Calendar</h2>
            <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                <BandCalendar
                  events={allEvents}
                  selectedDate={selectedDate}
                  onSelect={(date) => setSelectedDate(date)}
                  showLegend
                />
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="mx-auto text-xs text-neutral-400 underline hover:cursor-pointer hover:text-yellow-100"
                >
                  Clear selected date
                </button>
              )}

              {isOwnProfile && (
                <button
                  onClick={openCreatePrivateEvent}
                  className="mt-2 flex w-full justify-center rounded bg-yellow-200 px-4 py-2 text-black hover:cursor-pointer hover:bg-yellow-300"
                >
                  <span className="mr-2 text-2xl">+</span>
                  Add private event
                </button>
              )}
            </div>
          </section>
        </div>
      </section>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          origin={originForEvent(selectedEvent)}
          canManage={isOwnProfile && selectedEvent.source !== "band"}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEditPrivateEvent(selectedEvent as PrivateEvent)}
          onDelete={() => void deletePrivateEventFromDetails(selectedEvent.id)}
        />
      )}

      {isOwnProfile && showPrivateEventForm && (
        <Modal
          isOpen={showPrivateEventForm}
          onClose={() => setShowPrivateEventForm(false)}
        >
          <div className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold text-yellow-100">
              {editingPrivateEvent ? "Edit private event" : "Add private event"}
            </h2>

            <EventForm
              mode="private"
              canSubmit={isOwnProfile}
              initialEvent={editingPrivateEvent}
              onSaved={async () => {
                setShowPrivateEventForm(false);
                setEditingPrivateEvent(null);
                await fetchPrivateEvents();
              }}
            />
          </div>
        </Modal>
      )}
    </main>
  );
}
