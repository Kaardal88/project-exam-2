"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { EventCard } from "@/components/calendar/EventCard";
import { EditUserProfileModal } from "@/components/userProfile/EditUserProfileModal";
import { ExternalLink } from "lucide-react";

type User = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  image_url: string;
  header_image_url: string | null;
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
};

type BandEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  band_id: string | number;
};

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const profileUserId = searchParams.get("id");
  const isOwnProfile = !profileUserId;
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<BandMember[]>([]);

  const [editOpen, setEditOpen] = useState(false);

  const closeEditModal = () => setEditOpen(false);
  const [imageUrl, setImageUrl] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [username, setUsername] = useState("");
  const [events, setEvents] = useState<BandEvent[]>([]);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/pages/auth/login");
        return;
      }

      const endpoint = profileUserId
        ? `/api/users/${profileUserId}`
        : "/api/auth/me";

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load profile");
        setLoading(false);
        return;
      }

      setUsername(data.user.username ?? "");
      setImageUrl(data.user.image_url ?? "");
      setHeaderImageUrl(data.user.header_image_url ?? "");
      setUser(data.user);
      setMembers(data.bandMembers ?? []);

      setLoading(false);
    }

    loadUser();
  }, [router, profileUserId]);

  const fetchUserEvents = useCallback(async () => {
    if (!user?.id) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    const response = await fetch(`/api/users/me/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    console.log("user events:", data);

    if (!response.ok) {
      setError(data.error || "Could not load events");
      return;
    }

    setEvents(Array.isArray(data) ? data : (data.events ?? []));
  }, [user?.id, router]);

  const upComingEvents = events.filter((event) => {
    const endDate = new Date(event.end_date ?? event.start_date);
    return endDate >= new Date();
  });

  useEffect(() => {
    async function loadEvents() {
      await fetchUserEvents();
    }

    void loadEvents();
  }, [fetchUserEvents]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!user?.id) {
      setError("Missing user id");
      return;
    }

    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,

        image_url: imageUrl,
        header_image_url: headerImageUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not update profile");
      return;
    }

    setUser(data.user);
    setUsername(data.user.username ?? "");
    setImageUrl(data.user.image_url ?? "");
    setHeaderImageUrl(data.user.header_image_url ?? "");

    closeEditModal();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>Loading profile...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error}</p>
          <button
            className="btn"
            onClick={() => router.push("/pages/auth/login")}
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

          <p className="mt-1 text-sm text-neutral-400">@{user?.username}</p>
        </div>
        <div className=" flex flex-row justify-end mb-2 mr-4 gap-2">
          {isOwnProfile && (
            <button
              onClick={() => setEditOpen(true)}
              className="  rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
            >
              Edit profile
            </button>
          )}
          {isOwnProfile && (
            <>
              <button
                className="  rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
                onClick={() => router.push("/pages/auth/createBand")}
              >
                Create band/artist
              </button>

              <button
                className=" rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
                onClick={handleLogout}
              >
                Log out
              </button>
              <EditUserProfileModal
                isOpen={editOpen}
                onClose={closeEditModal}
                onSave={handleSave}
                username={username}
                setUsername={setUsername}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                headerImageUrl={headerImageUrl}
                setHeaderImageUrl={setHeaderImageUrl}
              />
            </>
          )}
        </div>
      </section>
      <section className="mx-auto mt-6  mb-10 w-full max-w-7xl md:w-3/4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl lg:col-span-4">
            <div className="mt-4">
              <p className="mb-4 text-lg font-bold text-yellow-100">
                <strong>{user?.username}&apos;s artistpages</strong>
              </p>

              {members.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {members.map((member) => (
                    <Link
                      key={member.band_id}
                      href={`/pages/bandProfile?id=${member.band_id}`}
                      className="flex w-44 flex-col items-center rounded-md border border-neutral-700  p-4 text-center transition hover:bg-neutral-800"
                    >
                      {member.band.image_url ? (
                        <img
                          src={member.band.image_url}
                          alt={member.band.band_name}
                          className="mb-3 h-24 w-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-yellow-100">
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
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">None</p>
              )}
            </div>
          </section>
          {/* Upcoming events */}
          <section className="mx-auto mt-2 mb-8 w-full max-w-7xl overflow-hidden rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
            <h2 className="mb-4 text-center text-yellow-100">
              Upcoming events
            </h2>
            <div className="mb-4 flex flex-col  gap-4 divide-y divide-yellow-100">
              {upComingEvents.map((event) => {
                const bandName = members.find(
                  (member) => member.band_id === event.band_id,
                )?.band.band_name;

                return (
                  <div
                    key={event.id}
                    className="pt-3 bg-neutral-950 border border-neutral-700 p-4 rounded-md "
                  >
                    <Link
                      className="mb-2 flex flex-row items-center gap-2  font-semibold text-yellow-100"
                      href={`/pages/bandProfile?id=${event.band_id}`}
                    >
                      <p className="mb-2 text-md font-semibold text-yellow-100">
                        {bandName ?? "Unknown band"}
                      </p>
                      <ExternalLink className="mb-2 text-xs text-neutral-400" />
                    </Link>

                    <EventCard event={event} />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
