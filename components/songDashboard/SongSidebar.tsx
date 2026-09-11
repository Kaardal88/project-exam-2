"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { StemLockLogo } from "@/components/StemLockLogo";
import { SidebarCollapseToggle } from "@/components/sidebar/SidebarNav";
import { SongTabs, type SongTab } from "./SongTabs";

type Band = {
  id: string;
  slug: string;
  band_name: string;
  image_url?: string | null;
};

export type SidebarUser = {
  id: string;
  username: string;
  image_url?: string | null;
};

type SongSidebarProps = {
  band: Band;
  /** Null until /auth/me answers, or if it never does. */
  user: SidebarUser | null;
  activeTab: SongTab;
  setActiveTab: (tab: SongTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  /**
   * False for a collaborator. A guest is invited to one project, not to the
   * band, so the band profile is not theirs to open -- it is a guest card at
   * best and a 404 if the band is private. The band is still named here,
   * because knowing whose project this is matters; it just is not a link.
   */
  canOpenBand?: boolean;
};

/** A round picture, or the first letter when there is no picture. */
function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${className} shrink-0 rounded-full border border-neutral-700 object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 font-bold text-yellow-100`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const MENU_ROW_CLASS =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-yellow-100";

/**
 * The song dashboard's only way back into the rest of the app.
 *
 * This page has no navbar -- the workspace wants the height -- so the sidebar
 * carries the way out: the logo goes to your own page exactly as it does in
 * the navbar, the band card under it goes to the band, and Account at the
 * bottom opens a small menu of the same two places, drawn with the pictures
 * that belong to them, plus the song's settings.
 *
 * That menu is deliberately not the account panel the navbar opens. It was,
 * briefly, and a panel sliding in from the right-hand edge when you had just
 * clicked something at the bottom left read as the page doing something else
 * entirely. A menu that opens where you clicked does not.
 *
 * The tabs lived in a row above the workspace, and a Calendar that was never
 * built sat here in their place. Moving them in fills the column with what it
 * is for, and gives the workspace back the row.
 */
export function SongSidebar({
  band,
  user,
  activeTab,
  setActiveTab,
  collapsed,
  onToggleCollapsed,
  onOpenSettings,
  canOpenBand = true,
}: SongSidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // A click anywhere else, or Escape, closes the menu. Without this it stayed
  // open until one of its own entries or the button itself was clicked again.
  useEffect(() => {
    if (!accountOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  const bandHref = `/band/${band.slug ?? band.id}`;

  const bandCardClass = `mb-4 flex items-center rounded-md border border-neutral-800 bg-neutral-900/60 p-2 ${
    collapsed ? "justify-center" : "gap-3"
  }`;

  const bandIdentity = (
    <>
      <Avatar src={band.image_url} name={band.band_name} className="h-9 w-9 text-sm" />
      {collapsed ? (
        <span className="sr-only">{band.band_name}</span>
      ) : (
        <span className="truncate text-sm font-semibold text-yellow-100">
          {band.band_name}
        </span>
      )}
    </>
  );

  return (
    <aside
      // z-20: sticky makes the sidebar a stacking context of its own, and
      // without a level the workspace beside it -- positioned, and later in
      // the page -- paints over the Account menu when it opens sideways.
      className={`hidden md:flex md:h-[calc(100vh-2rem)] md:shrink-0 md:flex-col md:self-start md:sticky md:top-4 md:z-20 md:border-r md:border-neutral-800/60 md:py-2 md:transition-[width] md:duration-200 ${
        collapsed ? "md:w-[72px] md:px-3" : "md:w-[220px] md:px-4"
      }`}
    >
      {/* Logo and the fold control share the top row; folded, there is
          room for one of them across, so they stack. */}
      <div
        className={`mb-5 flex ${
          collapsed
            ? "flex-col items-center gap-3"
            : "items-center justify-between gap-2"
        }`}
      >
        <Link href="/user" title="Your profile">
          <StemLockLogo size={collapsed ? "mark" : "sidebar"} />
        </Link>

        <SidebarCollapseToggle
          collapsed={collapsed}
          onToggle={onToggleCollapsed}
        />
      </div>

      {canOpenBand ? (
        <Link
          href={bandHref}
          title={collapsed ? band.band_name : undefined}
          className={`${bandCardClass} transition hover:border-yellow-200`}
        >
          {bandIdentity}
        </Link>
      ) : (
        <div
          title={collapsed ? band.band_name : undefined}
          className={bandCardClass}
        >
          {bandIdentity}
        </div>
      )}

      {/* The one part that scrolls, so a short window squeezes the tabs
          rather than pushing Account off the bottom of the screen. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SongTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={collapsed}
        />
      </div>

      <div className="mt-4 border-t border-neutral-800/60 pt-2">
        <div ref={accountRef} className="relative">
          {/* Opens upward from the button while there is width for it, and
              out to the side once the sidebar is one icon wide -- a menu the
              width of a folded sidebar would cut every label off. */}
          {accountOpen && (
            <div
              role="menu"
              className={`absolute z-30 rounded-md border border-neutral-700 bg-neutral-900 p-2 shadow-2xl ${
                collapsed
                  ? "bottom-0 left-full ml-3 w-52"
                  : "bottom-full left-0 mb-2 w-full"
              }`}
            >
              {canOpenBand && (
                <Link
                  href={bandHref}
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                  className={MENU_ROW_CLASS}
                >
                  <Avatar
                    src={band.image_url}
                    name={band.band_name}
                    className="h-6 w-6 text-[10px]"
                  />
                  Band profile
                </Link>
              )}

              <Link
                href="/user"
                role="menuitem"
                onClick={() => setAccountOpen(false)}
                className={MENU_ROW_CLASS}
              >
                <Avatar
                  src={user?.image_url}
                  name={user?.username ?? "?"}
                  className="h-6 w-6 text-[10px]"
                />
                User profile
              </Link>

              {/* The song's settings, not the account's. Account settings
                  are a navbar matter and have no business in a song's
                  workspace; this is the one setting that belongs here. */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenSettings();
                }}
                className={`${MENU_ROW_CLASS} w-full text-left hover:cursor-pointer`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                Song settings
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAccountOpen((previous) => !previous)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={collapsed ? "Account" : undefined}
            title={collapsed ? "Account" : undefined}
            className={`group flex w-full items-center rounded-md py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100 ${
              collapsed ? "justify-center px-1" : "gap-2.5 px-2"
            }`}
          >
            <Avatar
              src={user?.image_url}
              name={user?.username ?? "?"}
              className="h-7 w-7 text-xs transition group-hover:border-yellow-200"
            />

            {!collapsed && (
              <>
                <span className="flex-1 text-left">Account</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
