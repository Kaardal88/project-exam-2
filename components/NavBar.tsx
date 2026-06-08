"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  image_url?: string | null;
};

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      }
    }

    loadUser();
  }, []);

  return (
    <nav className="relative h-26 w-full overflow-hidden shadow-mist-400 bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
      {/* Background image */}
      <img
        src="/bg-components.jpg"
        alt="Navbar background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

      {/* Navbar content */}
      <div className="relative z-10 flex h-full items-center justify-between px-6 lg:px-10 text-white  space-x-0 md:space-x-4">
        {/* Left side - Logo */}
        <div
          className="flex w-max justify-center
    bg-[#f3e7b6] text-neutral-950
    px-10 py-3
    font-black
    shadow-[0_8px_25px_rgba(0,0,0,0.45)]
    -rotate-3
    [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)] "
        >
          <Link href="/pages/allBandsPage">
            <span className=" text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              Vardo
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-8">
          <ul className="flex items-center gap-6  ">
            <li>
              <Link
                href="/pages/usersPage"
                className="transition text-yellow-200 font-[family-name:var(--font-caveat)] text-xl"
              >
                Connect
              </Link>
            </li>

            <li>
              <Link
                href="#"
                className="transition text-yellow-200 font-[family-name:var(--font-caveat)] text-xl"
              >
                About
              </Link>
            </li>

            <li>
              <Link
                href="#"
                className="transition text-yellow-200 font-[family-name:var(--font-caveat)] text-xl"
              >
                Contact
              </Link>
            </li>
          </ul>

          {/* User profile */}
          {user && (
            <Link href="/pages/userProfile" className="group flex items-center">
              {user.image_url ? (
                <img
                  src={user.image_url}
                  alt={user.username}
                  className="h-12 w-12 rounded-full object-cover border border-neutral-400 shadow-md transition duration-300 group-hover:scale-105 group-hover:border-yellow-200"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-500 bg-neutral-700 text-lg font-bold transition group-hover:bg-neutral-600">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
