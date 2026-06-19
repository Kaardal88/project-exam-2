type Section =
  | "Home"
  | "Albums"
  | "Wip"
  | "Finished"
  | "Bio"
  | "Socials"
  | "Singles"
  | "Tickets";

type BandSectionNavProps = {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
};

export function BandProfileNav({
  activeSection,
  setActiveSection,
}: BandSectionNavProps) {
  const sections: Section[] = [
    "Home",
    "Albums",
    "Wip",
    "Finished",
    "Bio",
    "Socials",
    "Singles",
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
