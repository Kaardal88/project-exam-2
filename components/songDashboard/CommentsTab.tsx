"use client";

import { useEffect, useState } from "react";
import { AddCommentModal } from "./AddCommentModal";
import { formatSongTime } from "@/lib/utils";
import { TICKET_STATUSES, TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";

type BandMember = {
  user_id: string;
  user: { id: string; username: string; image_url?: string | null };
};

type Comment = {
  id: string;
  /** null for a comment about the song rather than a moment in it */
  timestamp_seconds: number | null;
  /** null for a comment that holds whatever version is current */
  song_version_id: string | null;
  body: string;
  status: TicketStatus;
  created_at: string | null;
  resolved_at: string | null;
  author: { id: string; username: string; image_url: string | null } | null;
  assignee: { id: string; username: string; image_url: string | null } | null;
};

type HistoryEvent = {
  id: string;
  event_type: "status_change" | "reassigned";
  from_value: string | null;
  to_value: string | null;
  created_at: string | null;
  actor: { id: string; username: string; image_url: string | null } | null;
};

type VersionRef = { id: string; version_number: number; label: string };

type CommentsTabProps = {
  songId: string;
  comments: Comment[];
  bandMembers: BandMember[];
  role: string | null;
  currentUserId: string | null;
  onCommentsChanged: () => void;
  onSeekAndShow: (seconds: number) => void;
  /** the version the song currently is, for grouping */
  currentVersionId: string | null;
  /**
   * A comment to scroll to and highlight, sent from the dashboard preview.
   *
   * Carries a nonce for the same reason the player's seek signal does: clicking
   * the same card twice is a real request, and an id alone would look
   * unchanged and do nothing the second time.
   */
  focusComment?: { id: string; nonce: number } | null;
};

const FILTERS: { label: string; value: "all" | TicketStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "WIP", value: "wip" },
  { label: "Done", value: "done" },
];

function resolveUserName(
  idOrUnassigned: string | null,
  bandMembers: BandMember[],
) {
  if (!idOrUnassigned || idOrUnassigned === "unassigned") return "Unassigned";
  return (
    bandMembers.find((member) => member.user.id === idOrUnassigned)?.user
      .username ?? "Unknown"
  );
}

function formatHistoryLine(event: HistoryEvent, bandMembers: BandMember[]) {
  const actorName = event.actor?.username ?? "Someone";
  const date = event.created_at
    ? new Date(event.created_at).toLocaleDateString("no-NO")
    : "";

  if (event.event_type === "status_change") {
    const from = event.from_value
      ? TICKET_STATUS_STYLES[event.from_value as TicketStatus]?.label ?? event.from_value
      : "?";
    const to = event.to_value
      ? TICKET_STATUS_STYLES[event.to_value as TicketStatus]?.label ?? event.to_value
      : "?";
    return `${actorName} changed status ${from} → ${to} · ${date}`;
  }

  const from = resolveUserName(event.from_value, bandMembers);
  const to = resolveUserName(event.to_value, bandMembers);
  return `${actorName} reassigned ${from} → ${to} · ${date}`;
}

export function CommentsTab({
  songId,
  comments,
  bandMembers,
  role,
  currentUserId,
  onCommentsChanged,
  onSeekAndShow,
  currentVersionId,
  focusComment,
}: CommentsTabProps) {
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEvent[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const [showEarlier, setShowEarlier] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [appliedFocus, setAppliedFocus] = useState(focusComment);

  // Only needed to print "v7" next to a comment and to name the current
  // version in a heading, so it is fetched here rather than threaded through
  // the page for one label.
  const [versions, setVersions] = useState<VersionRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/songs/${songId}/versions`);
      if (!response.ok || cancelled) return;
      setVersions(await response.json());
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  const filtered =
    filter === "all" ? comments : comments.filter((c) => c.status === filter);

  /**
   * Three groups, because a comment has two independent facts about it: which
   * moment it is about, and which version.
   *
   * "About the song" is everything with no version — it stays true whatever is
   * current, so it never goes stale and never gets buried. The rest splits into
   * the version you are on and everything behind it, which is GitHub's
   * treatment of comments on an outdated diff: collapsed, not deleted.
   */
  const aboutSong = filtered.filter(
    (comment) => comment.song_version_id === null,
  );

  const onCurrent = filtered.filter(
    (comment) =>
      comment.song_version_id !== null &&
      comment.song_version_id === currentVersionId,
  );

  const earlier = filtered.filter(
    (comment) =>
      comment.song_version_id !== null &&
      comment.song_version_id !== currentVersionId,
  );

  const currentVersion = versions.find(
    (version) => version.id === currentVersionId,
  );

  /**
   * Arriving from the dashboard preview.
   *
   * Adjusting state during render rather than in an effect, the same pattern
   * the media player uses for its seek signal. Both adjustments matter: the
   * wanted comment may be filtered out by the status buttons, or folded away
   * under "earlier versions", and scrolling to something that is not rendered
   * lands on nothing at all.
   */
  if (focusComment && focusComment.nonce !== appliedFocus?.nonce) {
    setAppliedFocus(focusComment);

    const target = comments.find(
      (comment) => comment.id === focusComment.id,
    );

    if (target) {
      if (filter !== "all" && target.status !== filter) setFilter("all");

      if (
        target.song_version_id !== null &&
        target.song_version_id !== currentVersionId
      ) {
        setShowEarlier(true);
      }
    }
  }

  useEffect(() => {
    if (!appliedFocus) return;

    // After paint, so the group it lives in has actually been expanded.
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`comment-${appliedFocus.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [appliedFocus]);

  function versionOf(id: string) {
    return versions.find((version) => version.id === id);
  }

  async function toggleHistory(commentId: string) {
    if (expandedId === commentId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(commentId);

    if (history[commentId]) return;

    setHistoryLoading(commentId);

    const response = await fetch(
      `/api/songs/${songId}/comments/${commentId}/history`,
    );

    if (response.ok) {
      const data: HistoryEvent[] = await response.json();
      setHistory((prev) => ({ ...prev, [commentId]: data }));
    }

    setHistoryLoading(null);
  }

  async function updateComment(
    commentId: string,
    updates: {
      status?: TicketStatus;
      assignee_id?: string | null;
      song_version_id?: string | null;
    },
  ) {
    const response = await fetch(
      `/api/songs/${songId}/comments/${commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      },
    );

    if (response.ok) {
      onCommentsChanged();
      setHistory((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  }

  function renderComment(comment: Comment) {
    const canManage =
      comment.assignee?.id === currentUserId || role === "band_leader";

    const isEarlier =
      comment.song_version_id !== null &&
      comment.song_version_id !== currentVersionId;

    return (
              <li
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`rounded-md border bg-neutral-950/40 p-3 text-sm transition ${
                  comment.id === focusComment?.id
                    ? "border-yellow-200 ring-1 ring-yellow-200/40"
                    : "border-neutral-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {comment.author?.image_url ? (
                    <img
                      src={comment.author.image_url}
                      alt={comment.author.username}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-yellow-100">
                      {(comment.author?.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-yellow-100">
                    {comment.author?.username ?? "Unknown"}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleDateString("no-NO")
                      : ""}
                  </span>

                  {/* This was neutral-500 on neutral-700 and effectively
                      invisible, which is a poor showing for the one label that
                      says which arrangement the comment is about. */}
                  {comment.song_version_id && (
                    <span
                      title={versionOf(comment.song_version_id)?.label}
                      className="rounded-full border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-200"
                    >
                      v{versionOf(comment.song_version_id)?.version_number ?? "?"}
                    </span>
                  )}

                  {comment.timestamp_seconds !== null ? (
                    <button
                      onClick={() => onSeekAndShow(comment.timestamp_seconds!)}
                      className="ml-auto rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
                    >
                      {formatSongTime(comment.timestamp_seconds)}
                    </button>
                  ) : (
                    <span className="ml-auto text-xs text-neutral-600">
                      no timestamp
                    </span>
                  )}
                </div>

                <p className="mt-2 text-neutral-300">{comment.body}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    Status
                    <select
                      value={comment.status}
                      disabled={!canManage}
                      title={
                        canManage
                          ? undefined
                          : "Only the assignee or band leader can change status"
                      }
                      onChange={(e) =>
                        updateComment(comment.id, {
                          status: e.target.value as TicketStatus,
                        })
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none transition focus:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {TICKET_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TICKET_STATUS_STYLES[status].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    Assignee
                    <select
                      value={comment.assignee?.id ?? ""}
                      disabled={!canManage}
                      title={
                        canManage
                          ? undefined
                          : "Only the current assignee or band leader can reassign"
                      }
                      onChange={(e) =>
                        updateComment(comment.id, {
                          assignee_id: e.target.value || null,
                        })
                      }
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-yellow-100 outline-none transition focus:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <option value="">Unassigned</option>
                      {bandMembers.map((member) => (
                        <option key={member.user_id} value={member.user.id}>
                          {member.user.username}
                        </option>
                      ))}
                    </select>
                  </label>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${TICKET_STATUS_STYLES[comment.status].badge}`}
                  >
                    {TICKET_STATUS_STYLES[comment.status].label}
                  </span>

                  {comment.resolved_at && (
                    <span className="text-xs text-neutral-500">
                      Resolved{" "}
                      {new Date(comment.resolved_at).toLocaleDateString("no-NO")}
                    </span>
                  )}

                  {/*
                    Without this, every new version buries the outstanding work
                    one row deeper. Deliberately a decision somebody makes: a
                    comment about a take that has since been replaced usually
                    *is* resolved, and dragging everything forward would make
                    the current list meaningless.
                  */}
                  {isEarlier && currentVersion && comment.status !== "done" && (
                    <button
                      onClick={() =>
                        updateComment(comment.id, {
                          song_version_id: currentVersion.id,
                        })
                      }
                      title="This still applies — move it onto the current version"
                      className="text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
                    >
                      Still an issue → v{currentVersion.version_number}
                    </button>
                  )}

                  <button
                    onClick={() => toggleHistory(comment.id)}
                    className="ml-auto text-xs font-semibold text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100"
                  >
                    {expandedId === comment.id ? "Hide history" : "History"}
                  </button>
                </div>

                {expandedId === comment.id && (
                  <div className="mt-3 border-t border-neutral-800 pt-3">
                    {historyLoading === comment.id ? (
                      <p className="text-xs text-neutral-500">Loading…</p>
                    ) : history[comment.id]?.length ? (
                      <ul className="space-y-1">
                        {history[comment.id].map((event) => (
                          <li key={event.id} className="text-xs text-neutral-400">
                            {formatHistoryLine(event, bandMembers)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-500">No changes yet</p>
                    )}
                  </div>
                )}
              </li>
    );
  }

  const groupHeading =
    "mb-2 text-xs font-bold uppercase tracking-wide text-yellow-100";

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:cursor-pointer ${
              filter === f.value
                ? "border-yellow-100 bg-yellow-100 text-black"
                : "border-neutral-700 text-neutral-300 hover:border-yellow-200 hover:text-yellow-100"
            }`}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => setNoteOpen(true)}
          title="A note about the song, with no timestamp and no version"
          className="ml-auto rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
        >
          + Note about the song
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">No tickets in this view</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className={groupHeading}>About the song</h3>
            {aboutSong.length === 0 ? (
              <p className="text-sm text-neutral-600">
                Nothing yet — a note here holds whatever version is current.
              </p>
            ) : (
              <ul className="space-y-4">{aboutSong.map(renderComment)}</ul>
            )}
          </div>

          <div>
            <h3 className={groupHeading}>
              {currentVersion
                ? `On v${currentVersion.version_number} · ${currentVersion.label}`
                : "On the current version"}
            </h3>
            {onCurrent.length === 0 ? (
              <p className="text-sm text-neutral-600">
                Nothing on this version yet.
              </p>
            ) : (
              <ul className="space-y-4">{onCurrent.map(renderComment)}</ul>
            )}
          </div>

          {earlier.length > 0 && (
            <div>
              {/* Collapsed rather than deleted, the way GitHub treats comments
                  on an outdated diff. They were true when they were written. */}
              <button
                onClick={() => setShowEarlier((wasOpen) => !wasOpen)}
                className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
              >
                {showEarlier ? "▾" : "▸"} {earlier.length} comment
                {earlier.length === 1 ? "" : "s"} on earlier versions
              </button>

              {showEarlier && (
                <ul className="space-y-4">{earlier.map(renderComment)}</ul>
              )}
            </div>
          )}
        </div>
      )}

      <AddCommentModal
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        songId={songId}
        timestampSeconds={null}
        versionId={null}
        bandMembers={bandMembers}
        onCreated={() => {
          setNoteOpen(false);
          onCommentsChanged();
        }}
      />
    </section>
  );
}
