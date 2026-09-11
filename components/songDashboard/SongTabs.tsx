import {
  Activity,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessageSquare,
  MicVocal,
  SlidersVertical,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarNav,
  type SidebarNavGroup,
} from "@/components/sidebar/SidebarNav";

/**
 * Every tab, grouped and in the order it is shown.
 *
 * Dashboard and Activity sit together at the top without a heading: the two
 * that are about the whole song rather than one part of it. The groups below
 * are where the next tab goes -- a new kind of thing gets a new group, rather
 * than being slotted into the flat row this used to be.
 *
 * Song Info was here, promising editable BPM, key and time signature. It never
 * did anything, and the header above already shows all three, so it went the
 * same way as the sidebar's Calendar.
 */
const SONG_TAB_GROUPS = [
  { items: ["Dashboard", "Activity"] },
  { title: "Production", items: ["Studio", "Files"] },
  { title: "Writing", items: ["Lyrics", "Notes & Ideas"] },
  { title: "Collaboration", items: ["Comments", "Tasks"] },
] as const satisfies readonly SidebarNavGroup<string>[];

export type SongTab = (typeof SONG_TAB_GROUPS)[number]["items"][number];

export const SONG_TABS: readonly SongTab[] = SONG_TAB_GROUPS.flatMap(
  (group) => group.items,
);

/**
 * Comments and Tasks borrow the icons the board's cards already use for open
 * comments and task progress, so the same thing is drawn the same way on both
 * screens.
 */
const SONG_TAB_ICONS: Record<SongTab, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Activity: Activity,
  Studio: SlidersVertical,
  Files: FolderOpen,
  Lyrics: MicVocal,
  "Notes & Ideas": Lightbulb,
  Comments: MessageSquare,
  Tasks: ListChecks,
};

/**
 * The active tab lives in the URL, and the URL is typed by hand as often as it
 * is clicked. This is the one place that decides whether a `?tab=` value is a
 * tab at all.
 */
export function isSongTab(value: string | null): value is SongTab {
  return value !== null && (SONG_TABS as readonly string[]).includes(value);
}

export function SongTabs({
  activeTab,
  setActiveTab,
  collapsed = false,
}: {
  activeTab: SongTab;
  setActiveTab: (tab: SongTab) => void;
  /** Icons only, for the folded sidebar. */
  collapsed?: boolean;
}) {
  return (
    <SidebarNav
      label="Song tabs"
      groups={SONG_TAB_GROUPS}
      icons={SONG_TAB_ICONS}
      active={activeTab}
      onSelect={setActiveTab}
      collapsed={collapsed}
    />
  );
}
