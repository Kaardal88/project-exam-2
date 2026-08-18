"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, Calendar, ChevronDown, Settings } from "lucide-react";

type Band = {
  id: string;
  slug: string;
  band_name: string;
  image_url?: string | null;
};

type SongSidebarProps = {
  band: Band;
  onOpenSettings: () => void;
};

export function SongSidebar({ band, onOpenSettings }: SongSidebarProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  return (
    <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:justify-between md:self-start md:sticky md:top-4 md:border-r md:border-neutral-800/60 md:px-4 md:py-2 md:h-[calc(100vh-2rem)]">
      <div>
        <Link
          href={`/band/${band.slug ?? band.id}`}
          className="mb-6 flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900/60 p-2 transition hover:border-yellow-200"
        >
          {band.image_url ? (
            <img
              src={band.image_url}
              alt={band.band_name}
              className="h-9 w-9 rounded-full object-cover border border-neutral-700"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-sm font-bold text-yellow-100">
              {band.band_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-yellow-100">
            {band.band_name}
          </span>
        </Link>

        <nav className="flex flex-col gap-2">
          <span className="flex items-center gap-3 rounded-md bg-yellow-100 px-3 py-2 text-sm font-semibold text-black">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </span>

          <span
            className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-500"
            title="Coming soon"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </span>
        </nav>
      </div>

      <div className="relative border-t border-neutral-800/60 pt-2">
        {flyoutOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full rounded-md border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
            <Link
              href={`/band/${band.slug ?? band.id}`}
              className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-100"
              onClick={() => setFlyoutOpen(false)}
            >
              Band profile
            </Link>
            <Link
              href="/user"
              className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-100"
              onClick={() => setFlyoutOpen(false)}
            >
              User profile
            </Link>
            <button
              onClick={() => {
                setFlyoutOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-100 hover:cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        )}

        <button
          onClick={() => setFlyoutOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-100 hover:cursor-pointer"
        >
          Account
          <ChevronDown
            className={`h-4 w-4 transition-transform ${flyoutOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </aside>
  );
}
