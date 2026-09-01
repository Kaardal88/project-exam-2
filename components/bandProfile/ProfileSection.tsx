"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * How tall a section is before it is cut off, in pixels.
 *
 * A number rather than a Tailwind class because the overflow check below
 * compares against it, and a class name cannot be measured.
 */
const COLLAPSED_MAX_PX = 160;

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
  /** Sits beside the title -- an Edit button, for sections a leader owns. */
  action?: React.ReactNode;
  /**
   * Holds the section open regardless of the toggle. An edit form is taller
   * than the collapsed height and would be clipped mid-field otherwise.
   */
  forceOpen?: boolean;
}) {
  const [collapsedOpen, setCollapsedOpen] = useState(defaultOpen);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const open = forceOpen || collapsedOpen;

  /*
   * Whether there is anything behind the cut-off.
   *
   * This used to be assumed: every section drew the control whether or not it
   * had more to show, so Tickets with one line offered to expand into the same
   * one line. Measuring is the difference between a control that means
   * something and one that lies.
   *
   * A ResizeObserver rather than a check on mount, because the content that
   * decides this arrives after the first paint -- album covers load, a bio is
   * fetched -- and a section that grew past the cut-off afterwards would
   * otherwise never offer to open.
   */
  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    const check = () =>
      setOverflows(element.scrollHeight > COLLAPSED_MAX_PX + 4);

    check();

    const observer = new ResizeObserver(check);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children]);

  const showToggle = overflows && !forceOpen;

  return (
    <section
      className={`rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl ${className}`}
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <h2 className="text-center text-yellow-100">{title}</h2>

        {action}
      </div>

      <div className="relative">
        <div
          className="overflow-hidden transition-[max-height] duration-300"
          style={{ maxHeight: open ? "none" : `${COLLAPSED_MAX_PX}px` }}
        >
          <div ref={contentRef}>{children}</div>
        </div>

        {/* Content fading out is the honest signal that it continues. The
            button underneath says what to do about it -- which the old icon,
            a rotating panel glyph in a dotted circle, never did. */}
        {showToggle && !open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-900 to-transparent" />
        )}
      </div>

      {showToggle && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setCollapsedOpen((previous) => !previous)}
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-neutral-800"
          >
            {open ? "Show less" : "Show more"}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      )}
    </section>
  );
}
