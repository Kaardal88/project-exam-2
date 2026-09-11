"use client";

import { useEffect, useState } from "react";
import type { SongActivity, SongActivityKind } from "@/lib/songActivity";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";
import type { SongTab } from "./SongTabs";

type ActivityTabProps = {
  songId: string;
  setActiveTab: (tab: SongTab) => void;
  /** takes the reader to this comment in the Comments tab */
  onFocusComment: (commentId: string) => void;
};

function statusLabel(value: string | null) {
  return TICKET_STATUS_STYLES[value as TicketStatus]?.label ?? value ?? "?";
}

/**
 * The half-sentence after the name. A Record rather than a switch so a new
 * kind in lib/songActivity.ts is a type error here until it is given words.
 */
const HEADLINES: Record<SongActivityKind, (item: SongActivity) => string> = {
  song_created: () => "created the song",
  comment_posted: () => "posted a comment",
  comment_status: (item) => `marked a comment as ${statusLabel(item.detail)}`,
  comment_assigned: (item) =>
    item.detail ? `assigned a comment to ${item.detail}` : "unassigned a comment",
  note_added: (item) => (item.detail === "lyrics" ? "added lyrics" : "added a note"),
  note_edited: (item) =>
    item.detail === "lyrics" ? "edited the lyrics" : "edited a note",
  file_uploaded: () => "uploaded a file",
  take_uploaded: (item) => `uploaded a take to ${item.detail}`,
  version_created: (item) => `created ${item.detail}`,
  version_locked: (item) => `locked ${item.detail} for mix`,
};

/** Where a card leads, or null for one with nowhere better to go. */
function tabFor(item: SongActivity): SongTab | null {
  switch (item.kind) {
    case "comment_posted":
    case "comment_status":
    case "comment_assigned":
      return "Comments";
    case "note_added":
    case "note_edited":
      return item.detail === "lyrics" ? "Lyrics" : "Notes & Ideas";
    case "file_uploaded":
      return "Files";
    case "take_uploaded":
    case "version_created":
    case "version_locked":
      return "Studio";
    case "song_created":
      return null;
  }
}

/**
 * Cards shown at first, and added per "Load more".
 *
 * Revealed from what is already loaded rather than fetched page by page, the
 * way Connect and Artists do it. Those lists are unbounded; this one is capped
 * at SONG_ACTIVITY_LIMIT rows of a few short strings each, so a second request
 * would cost more than the rows it saved.
 */
const PAGE_SIZE = 10;

/** "11.09.2026, 14:32" -- the date format the rest of the dashboard uses, and the time. */
function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * What has happened to the song lately, newest first.
 *
 * Fetches for itself on mount rather than taking the page's lists: half of
 * what it shows -- stems, takes, versions, a comment's status changes -- the
 * page never loads. And because a tab is only mounted while it is open,
 * opening it is always a fresh read, with nothing to keep in step.
 */
export function ActivityTab({
  songId,
  setActiveTab,
  onFocusComment,
}: ActivityTabProps) {
  const [items, setItems] = useState<SongActivity[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/songs/${songId}/activity`);
      if (cancelled) return;

      if (!response.ok) {
        setFailed(true);
        return;
      }

      const data: SongActivity[] = await response.json();
      if (!cancelled) setItems(data);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  function open(item: SongActivity) {
    const tab = tabFor(item);
    if (!tab) return;

    if (tab === "Comments") onFocusComment(item.target_id);
    else setActiveTab(tab);
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <h2 className="mb-4 text-lg font-bold text-yellow-100">Activity</h2>

      {failed ? (
        <p className="form-error">Couldn&apos;t load the activity.</p>
      ) : items === null ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing has happened here yet</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.slice(0, shown).map((item) => {
              const name = item.actor?.username ?? "Someone";
              const clickable = tabFor(item) !== null;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(item)}
                    disabled={!clickable}
                    className="flex w-full items-start gap-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-left text-sm transition enabled:hover:cursor-pointer enabled:hover:border-neutral-600"
                  >
                    {item.actor?.image_url ? (
                      <img
                        src={item.actor.image_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-yellow-100">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-neutral-300">
                          <span className="font-semibold text-yellow-100">
                            {name}
                          </span>{" "}
                          {HEADLINES[item.kind](item)}
                        </p>
                        <time
                          dateTime={item.at}
                          className="shrink-0 text-xs text-neutral-500"
                        >
                          {formatWhen(item.at)}
                        </time>
                      </div>

                      {item.body && (
                        <p className="mt-1 line-clamp-2 break-words text-neutral-400">
                          {item.body}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {items.length > shown && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((count) => count + PAGE_SIZE)}
                className="rounded-full border border-neutral-600 px-6 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
