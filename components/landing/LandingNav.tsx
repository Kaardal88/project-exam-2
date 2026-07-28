const sections = [
  { id: "home", label: "Home" },
  { id: "preview", label: "Preview" },
  { id: "features", label: "Features" },
  { id: "bands", label: "Bands" },
];

// Simple in-page section nav for the landing page. Plain hash anchors +
// the global `scroll-smooth` on <html> (see app/layout.tsx) handle the
// smooth scrolling — no JS scroll handler or extra dependency needed.
export function LandingNav() {
  return (
    <nav
      aria-label="Section navigation"
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-3 md:justify-end md:px-6"
    >
      <div className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-950/70 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-yellow-100/80 transition hover:bg-neutral-800 hover:text-yellow-100 sm:text-sm"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
