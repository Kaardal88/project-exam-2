import { useState } from "react";
import { LucidePanelBottomOpen } from "lucide-react";
export function ProfileSection({
  title,
  children,
  className = "",
  defaultOpen = false,
  action,
  forceOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  /** Sits beside the collapse control -- an Edit button, for sections a leader owns. */
  action?: React.ReactNode;
  /**
   * Holds the section open regardless of the toggle. An edit form is taller
   * than the collapsed height and would be clipped mid-field otherwise.
   */
  forceOpen?: boolean;
}) {
  const [collapsedOpen, setCollapsedOpen] = useState(defaultOpen);
  const open = forceOpen || collapsedOpen;

  return (
    <section
      className={`rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl ${className}`}
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <h2 className="text-center text-yellow-100">{title}</h2>

        <button
          type="button"
          disabled={forceOpen}
          onClick={() => setCollapsedOpen((prev) => !prev)}
          className="rounded-full border border-dotted border-yellow-100 p-2 text-yellow-100 transition hover:border-yellow-200 hover:bg-yellow-200 hover:text-black"
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <LucidePanelBottomOpen
            className={`h-4 w-4 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {action}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[900px]" : "max-h-40"
        }`}
      >
        <div className={open ? "" : "line-clamp-5"}>{children}</div>
      </div>
    </section>
  );
}
