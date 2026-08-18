"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Search } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";

type User = {
  id: string;
  username: string;
  email: string;
  image_url?: string | null;
  header_image_url?: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    async function loadUsers() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load users");
        }

        setUsers(data);
      } catch (err) {
        setError("Could not load users");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  if (loading)
    return (
      <main className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  if (error) return <p>{error}</p>;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl  mb-12 mt-24 text-center font-[family-name:var(--font-caveat)] tracking-wide text-yellow-100 md:text-5xl">
          Connect with people in the industry
        </h1>
        <div className="flex justify-center mb-12">
          <Search className="w-6 h-6 md:w-8 md:h-8 lg:w-8 lg:h-8  mr-4 text-yellow-100 rotate-90  " />
          <input
            type="text"
            placeholder="Search by username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-4 border h-6 md:h-8 lg:h-10 border-neutral-700 rounded-md bg-neutral-900/80 text-yellow-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full max-w-6xl mx-auto justify-center bg-neutral-900/80 rounded-md p-6 border border-neutral-700">
          {filteredUsers.map((user) => (
            <Link
              className="flex flex-col items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/50 p-4 transition hover:bg-neutral-800/80"
              key={user.id}
              href={`/user?id=${user.id}`}
            >
              <img
                src={user.image_url || "/default-avatar.png"}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover mb-4"
              />

              <h3 className="text-lg font-bold text-yellow-100 tracking-wide ">
                {user.username}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
