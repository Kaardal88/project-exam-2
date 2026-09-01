"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Inbox,
  LogOut,
  Mail,
  MessageSquare,
  Music,
  Settings,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";

const ROW_CLASS =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-yellow-100 transition hover:bg-neutral-800";

/** The number beside a row, or nothing when there is nothing waiting. */
function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-neutral-950">
      {value}
    </span>
  );
}

type AccountPanelProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  username: string;
  imageUrl?: string | null;
  isAdmin?: boolean;
  inviteCount?: number;
  replyCount?: number;
  inboxCount?: number;
  /**
   * Artists and Connect. Rendered only below md, where the navbar has no room
   * for them and shows just the picture.
   */
  showNavLinks?: boolean;
};

/**
 * The account menu, as a panel that slides in from the right.
 *
 * It was a dropdown, which is fine at six items and cramped at nine -- and the
 * mobile and desktop versions had drifted into two different lists. One panel,
 * one order, one place to add the tenth thing.
 *
 * Every row carries an icon, because a column of unadorned words is read
 * slowly and the numbers on the right were doing all the work.
 */
export function AccountPanel({
  open,
  onClose,
  onLogout,
  username,
  imageUrl,
  isAdmin = false,
  inviteCount = 0,
  replyCount = 0,
  inboxCount = 0,
  showNavLinks = false,
}: AccountPanelProps) {
  // Escape closes it, which is what a panel covering the screen has to answer
  // to. The backdrop handles the pointer; this handles the keyboard.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // The page behind a full-height panel must not scroll under it.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Rendered even when closed so the panel can animate both ways rather
          than appearing and vanishing. */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="menu"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col border-l border-neutral-700 bg-neutral-950 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-neutral-600 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 font-bold text-yellow-100">
              {username.charAt(0).toUpperCase()}
            </div>
          )}

          <span className="min-w-0 flex-1 truncate font-semibold text-yellow-100">
            {username}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-2 text-neutral-400 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {/* Profile first: it is the thing the picture you just clicked
              belongs to, and the most common reason for opening this. */}
          <Link href="/user" role="menuitem" onClick={onClose} className={ROW_CLASS}>
            <UserIcon className="h-4 w-4 shrink-0" />
            Profile
          </Link>

          {/* md:hidden rather than a second panel: the navbar carries these
              two itself once there is room for them, and repeating them here
              on desktop would be the same link twice on one screen. */}
          {showNavLinks && (
            <div className="md:hidden">
              <Link href="/bands" role="menuitem" onClick={onClose} className={ROW_CLASS}>
                <Music className="h-4 w-4 shrink-0" />
                Artists
              </Link>

              <Link href="/users" role="menuitem" onClick={onClose} className={ROW_CLASS}>
                <Users className="h-4 w-4 shrink-0" />
                Connect
              </Link>
            </div>
          )}

          <Link
            href="/invitations"
            role="menuitem"
            onClick={onClose}
            className={ROW_CLASS}
          >
            <Mail className="h-4 w-4 shrink-0" />
            Invitations
            <Count value={inviteCount} />
          </Link>

          <Link href="/feedback" role="menuitem" onClick={onClose} className={ROW_CLASS}>
            <MessageSquare className="h-4 w-4 shrink-0" />
            Feedback
            <Count value={replyCount} />
          </Link>

          {isAdmin && (
            // Drawn from your own /auth/me record. Hiding it is courtesy, not
            // security -- the API answers 404 to anyone else who finds the URL.
            <Link
              href="/admin/feedback"
              role="menuitem"
              onClick={onClose}
              className={ROW_CLASS}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              Feedback inbox
              <Count value={inboxCount} />
            </Link>
          )}

          <Link href="/settings" role="menuitem" onClick={onClose} className={ROW_CLASS}>
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>

          {/* Logout is the one entry you cannot undo by pressing back, so it
              sits apart from the things you can. */}
          <div className="my-2 border-t border-neutral-800" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className={`${ROW_CLASS} w-full text-left hover:cursor-pointer`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </nav>
      </aside>
    </>
  );
}
