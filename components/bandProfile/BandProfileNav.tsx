import { Fragment } from "react";
import Link from "next/link";

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
  // Home stays first, and Board sits directly under it: the two things a
  // member opens the profile for, before the sections that describe the band.
  const sections: Section[] = [
    "Home",
    "Albums",
    "Singles",
    "Bio",
    "Socials",
    "Tickets",
  ];

  // One look for every entry in this list. Board navigates rather than
  // switching a section, but a nav item that announces that with its own
  // colours just reads as the odd one out.
  const itemClass = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-md border border-neutral-700 px-4 py-2 text-center text-sm transition md:text-base ${
      active
        ? "bg-yellow-100 text-black"
        : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
    }`;

  return (
    <nav
      className="
    flex gap-2 overflow-x-auto pb-2
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    md:flex-col md:overflow-visible md:pb-0
  "
    >
      {sections.map((section) => (
        <Fragment key={section}>
          <button
            onClick={() => setActiveSection(section)}
            className={itemClass(activeSection === section)}
          >
            {section}
          </button>

          {section === "Home" && (
            <Link href={boardHref} className={itemClass(false)}>
              Board
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
