import { Fragment } from "react";
import Link from "next/link";
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

type Section =
  | "Home"
  | "Albums"
  | "Bio"
  | "Socials"
  | "Singles"
  | "Members"
  | "Tickets";

/**
 * One icon per entry, so the column can be scanned rather than read.
 *
 * Albums and Singles are the pair that has to stay apart at a glance: a record
 * for the one, a note for the other, rather than two discs differing by a
 * ring.
 */
const SECTION_ICONS: Record<Section | "Board", LucideIcon> = {
  Home: Home,
  Board: LayoutGrid,
  Albums: Disc3,
  Singles: Music,
  Bio: BookOpen,
  Socials: Share2,
  Members: Users,
  Tickets: Ticket,
};

type BandSectionNavProps = {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  /**
   * The board is a page, not a section.
   *
   * "Wip" and "Finished" used to sit in this list as sections that were never
   * built, and they could not have been: a song's stage was in the database
   * but nothing in the app could set it. The board answers the question they
   * were reaching for -- where is every song right now -- and it needs a
   * screen rather than a collapsible card, so this entry navigates.
   */
  boardHref: string;
};

export function BandProfileNav({
  activeSection,
  setActiveSection,
  boardHref,
}: BandSectionNavProps) {
  // Home stays first, and Board sits directly under it: the two things a
  // member opens the profile for, before the sections that describe the band.
  const sections: Section[] = [
    "Home",
    "Albums",
    "Singles",
    "Bio",
    "Socials",
    // The line-up used to be a card in the profile header with the real list
    // hidden behind a modal. It is a destination like the rest now.
    "Members",
    "Tickets",
  ];

  // One look for every entry in this list. Board navigates rather than
  // switching a section, but a nav item that announces that with its own
  // colours just reads as the odd one out.
  const itemClass = (active: boolean) =>
    `flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md border border-neutral-700 px-4 py-2 text-sm transition md:text-base ${
      active
        ? "bg-yellow-100 text-black"
        : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
    }`;

  const BoardIcon = SECTION_ICONS.Board;

  return (
    <nav
      className="
    flex gap-2 overflow-x-auto pb-2
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    md:flex-col md:overflow-visible md:pb-0
  "
    >
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section];

        return (
          <Fragment key={section}>
            <button
              onClick={() => setActiveSection(section)}
              className={`${itemClass(activeSection === section)} hover:cursor-pointer`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {section}
            </button>

            {section === "Home" && (
              <Link href={boardHref} className={itemClass(false)}>
                <BoardIcon className="h-4 w-4 shrink-0" />
                Board
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
