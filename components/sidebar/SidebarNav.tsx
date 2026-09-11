"use client";

import { Fragment } from "react";
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";

export type SidebarNavGroup<T extends string> = {
  /**
   * Left out for the group at the top -- Home, Dashboard -- which is where you
   * start rather than a kind of thing.
   */
  title?: string;
  items: readonly T[];
};

/**
 * The list of sections down the side of a page, shared by the band profile
 * and the song dashboard so the two read as one app.
 *
 * Grouped under small headings, and the groups do not fold. A flat list stops
 * being scannable somewhere past eight entries, and both of these lists are
 * meant to keep growing -- the headings say where the next entry belongs as
 * much as they help anyone find one. Folding groups would hide entries behind
 * a click and has nothing to show once the sidebar is down to icons; folded,
 * each heading becomes a hairline instead, so the groups still read.
 *
 * One component for both breakpoints. Below md it is a row that scrolls
 * sideways and the headings drop out, because a heading in a row of pills
 * reads as one more pill.
 */
export function SidebarNav<T extends string>({
  label,
  groups,
  icons,
  active,
  onSelect,
  collapsed = false,
}: {
  /** Names the landmark for a screen reader: "Band sections", "Song tabs". */
  label: string;
  groups: readonly SidebarNavGroup<T>[];
  icons: Record<T, LucideIcon>;
  active: T;
  onSelect: (item: T) => void;
  /** Icons only. Meant for the desktop sidebar; the mobile row never folds. */
  collapsed?: boolean;
}) {
  const itemClass = (isActive: boolean) =>
    `flex shrink-0 items-center whitespace-nowrap rounded-md border border-neutral-700 py-2 text-sm transition hover:cursor-pointer ${
      collapsed ? "justify-center px-2.5" : "gap-2.5 px-4"
    } ${
      isActive
        ? "bg-yellow-100 text-black"
        : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
    }`;

  return (
    <nav
      aria-label={label}
      className="
    flex gap-2 overflow-x-auto pb-2
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    md:flex-col md:overflow-visible md:pb-0
  "
    >
      {groups.map((group, index) => (
        <Fragment key={group.title ?? index}>
          {group.title &&
            (collapsed ? (
              <div
                role="separator"
                className="mx-1 my-1 hidden border-t border-neutral-800 md:block"
              />
            ) : (
              <p className="mt-2 hidden px-1 text-[11px] uppercase tracking-[0.2em] text-neutral-500 md:block">
                {group.title}
              </p>
            ))}

          {group.items.map((item) => {
            const Icon: LucideIcon = icons[item];
            const isActive = item === active;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                aria-current={isActive ? "page" : undefined}
                // With the label hidden the name has to come from somewhere:
                // the tooltip for a pointer, aria-label for a screen reader.
                title={collapsed ? item : undefined}
                aria-label={collapsed ? item : undefined}
                className={itemClass(isActive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item}
              </button>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}

/** The fold/unfold control, placed by each sidebar where it fits its top. */
export function SidebarCollapseToggle({
  collapsed,
  onToggle,
  className = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = collapsed ? "Expand menu" : "Collapse menu";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-md p-2 text-neutral-400 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100 ${className}`}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </button>
  );
}
