"use client";

import {
  BookOpen,
  Disc3,
  Home,
  LayoutGrid,
  Music,
  Share2,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarNav,
  type SidebarNavGroup,
} from "@/components/sidebar/SidebarNav";

/**
 * Every entry in the menu, grouped and in the order it is shown.
 *
 * Home stays first, and Board sits directly under it: the two things a member
 * opens the profile for, before the sections that describe the band.
 *
 * Board is one of these now rather than a link beside them. It navigated to a
 * page of its own while everything around it swapped the panel in place, and
 * that difference was invisible until it was clicked -- which is exactly how
 * people kept finding it.
 */
const BAND_SECTION_GROUPS = [
  { items: ["Home", "Board"] },
  { title: "Music", items: ["Albums", "Singles"] },
  {
    title: "Band",
    // The line-up used to be a card in the profile header with the real list
    // hidden behind a modal. It is a destination like the rest now.
    items: ["Bio", "Socials", "Members", "Tickets"],
  },
] as const satisfies readonly SidebarNavGroup<string>[];

export type BandSection =
  (typeof BAND_SECTION_GROUPS)[number]["items"][number];

const BAND_SECTIONS: readonly BandSection[] = BAND_SECTION_GROUPS.flatMap(
  (group) => group.items,
);

export function isBandSection(value: unknown): value is BandSection {
  return (
    typeof value === "string" &&
    (BAND_SECTIONS as readonly string[]).includes(value)
  );
}

/**
 * One icon per entry, so the column can be scanned rather than read -- and,
 * folded, the icon is all there is.
 *
 * Albums and Singles are the pair that has to stay apart at a glance: a record
 * for the one, a note for the other, rather than two discs differing by a
 * ring.
 */
const SECTION_ICONS: Record<BandSection, LucideIcon> = {
  Home: Home,
  Board: LayoutGrid,
  Albums: Disc3,
  Singles: Music,
  Bio: BookOpen,
  Socials: Share2,
  Members: Users,
  Tickets: Ticket,
};

export function BandProfileNav({
  activeSection,
  setActiveSection,
  collapsed = false,
}: {
  activeSection: BandSection;
  setActiveSection: (section: BandSection) => void;
  /** Icons only. Meant for the desktop sidebar; the mobile row scrolls instead. */
  collapsed?: boolean;
}) {
  return (
    <SidebarNav
      label="Band sections"
      groups={BAND_SECTION_GROUPS}
      icons={SECTION_ICONS}
      active={activeSection}
      onSelect={setActiveSection}
      collapsed={collapsed}
    />
  );
}
