import Link from "next/link";
import { KanbanSquare } from "lucide-react";

type Section =
  | "Home"
  | "Albums"
  | "Bio"
  | "Socials"
  | "Singles"
  | "Tickets";

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
  const sections: Section[] = [
    "Home",
    "Albums",
    "Singles",
    "Bio",
    "Socials",
    "Tickets",
  ];

  return (
    <nav
      className="
    flex gap-2 overflow-x-auto pb-2
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    md:flex-col md:overflow-visible md:pb-0
  "
    >
      <Link
        href={boardHref}
        className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-yellow-100 bg-neutral-900 px-4 py-2 text-sm text-yellow-100 transition hover:bg-yellow-100 hover:text-black md:text-base"
      >
        <KanbanSquare className="h-4 w-4" />
        Board
      </Link>

      {sections.map((section) => (
        <button
          key={section}
          onClick={() => setActiveSection(section)}
          className={`shrink-0 whitespace-nowrap rounded-md border border-neutral-700 px-4 py-2 text-sm transition md:text-base
        ${
          activeSection === section
            ? "bg-yellow-100 text-black"
            : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
        }
      `}
        >
          {section}
        </button>
      ))}
    </nav>
  );
}
