export type SongTab =
  | "Dashboard"
  | "Studio"
  | "Lyrics"
  | "Comments"
  | "Tasks"
  | "Activity"
  | "Song Info"
  | "Notes & Ideas"
  | "Files";

type SongTabsProps = {
  activeTab: SongTab;
  setActiveTab: (tab: SongTab) => void;
};

export const SONG_TABS: SongTab[] = [
  "Dashboard",
  "Studio",
  "Lyrics",
  "Comments",
  "Tasks",
  "Activity",
  "Song Info",
  "Notes & Ideas",
  "Files",
];

/**
 * The active tab lives in the URL, and the URL is typed by hand as often as it
 * is clicked. This is the one place that decides whether a `?tab=` value is a
 * tab at all.
 */
export function isSongTab(value: string | null): value is SongTab {
  return value !== null && (SONG_TABS as string[]).includes(value);
}

export function SongTabs({ activeTab, setActiveTab }: SongTabsProps) {
  return (
    <nav
      className="
    flex gap-2 overflow-x-auto pb-2
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
  "
    >
      {SONG_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`shrink-0 whitespace-nowrap rounded-md border border-neutral-700 px-4 py-2 text-sm transition hover:cursor-pointer
        ${
          activeTab === tab
            ? "bg-yellow-100 text-black"
            : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
        }
      `}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
