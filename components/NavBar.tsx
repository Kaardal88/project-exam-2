"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Users } from "lucide-react";
import { logout } from "@/lib/session";
import { AccountPanel } from "./AccountPanel";
import { StemLockLogo } from "./StemLockLogo";

type User = {
  id: string;
  username: string;
  image_url?: string | null;
  is_admin?: boolean;
};

/**
 * The picture in the corner, and the count of anything waiting behind it.
 *
 * Shared by both breakpoints: the menu it opens is the same panel now, so the
 * trigger may as well be the same button.
 */
function AccountTrigger({
  user,
  waiting,
  onOpen,
  open,
  className = "",
}: {
  user: User;
  waiting: number;
  onOpen: () => void;
  open: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex items-center hover:cursor-pointer ${className}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Open profile menu"
    >
      {user.image_url ? (
        <img
          src={user.image_url}
          alt={user.username}
          className="h-11 w-11 rounded-full border border-neutral-400 object-cover shadow-md transition duration-300 group-hover:scale-105 group-hover:border-yellow-200 md:h-12 md:w-12"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500 bg-neutral-700 text-lg font-bold transition group-hover:bg-neutral-600 md:h-12 md:w-12">
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}

      {/* The menu is closed by default, so anything waiting has to be
          visible from the outside or it goes unnoticed. The dot is the sum
          of everything wanting attention; the panel says which is which. */}
      {waiting > 0 && (
        <span
          aria-label={`${waiting} thing${waiting === 1 ? "" : "s"} waiting for you`}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-900 bg-yellow-100 text-[10px] font-bold text-neutral-950"
        >
          {waiting}
        </span>
      )}
    </button>
  );
}

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const router = useRouter();

  const waiting = inviteCount + replyCount + inboxCount;

  useEffect(() => {
    async function loadUser() {
      // No token to check for any more -- a signed-out visitor simply gets a
      // 401 from all of these, and the nav renders in its logged-out shape.
      const [meResponse, invitesResponse, unreadResponse] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users/me/invitations"),
        fetch("/api/feedback/unread"),
      ]);

      if (meResponse.ok) {
        const data = await meResponse.json();
        setUser(data.user);
      }

      // a failure here should never keep the nav from rendering
      if (invitesResponse.ok) {
        const invites = await invitesResponse.json();
        setInviteCount(invites.invitations?.length ?? 0);
      }

      if (unreadResponse.ok) {
        const unread = await unreadResponse.json();
        setReplyCount(unread.replies ?? 0);
        setInboxCount(unread.inbox ?? 0);
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    // Only the server can clear an httpOnly cookie, so logging out is a
    // request now rather than a line of local cleanup.
    await logout();
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="relative w-full shadow-mist-400 bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
      <img
        src="/bg-components.jpg"
        alt="Navbar background"
        className="absolute inset-0 h-full w-full object-fit"
      />

      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

      <div className="relative z-10 flex h-24 md:h-26 items-center justify-between px-4 sm:px-6 lg:px-10 text-white">
        {/* Logo */}
        <Link href={user ? "/user" : "/"}>
          <StemLockLogo />
        </Link>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/bands"
            className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:border-yellow-200/60 hover:bg-neutral-800"
          >
            <Music className="h-4 w-4" />
            Artists
          </Link>

          {user && (
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:border-yellow-200/60 hover:bg-neutral-800"
            >
              <Users className="h-4 w-4" />
              People
            </Link>
          )}

          {user && (
            <AccountTrigger
              user={user}
              waiting={waiting}
              open={panelOpen}
              onOpen={() => setPanelOpen(true)}
            />
          )}
        </div>

        {/* Mobile. Signed out there is exactly one place to go, so it is a
            link rather than a menu holding a single item. */}
        <div className="md:hidden">
          {user ? (
            <AccountTrigger
              user={user}
              waiting={waiting}
              open={panelOpen}
              onOpen={() => setPanelOpen(true)}
            />
          ) : (
            <Link
              href="/bands"
              aria-label="Artists"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500 bg-neutral-950/60 text-yellow-200 transition hover:border-yellow-200/60"
            >
              <Music className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {user && (
        <AccountPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onLogout={handleLogout}
          username={user.username}
          imageUrl={user.image_url}
          isAdmin={user.is_admin}
          inviteCount={inviteCount}
          replyCount={replyCount}
          inboxCount={inboxCount}
          showNavLinks
        />
      )}
    </nav>
  );
}
