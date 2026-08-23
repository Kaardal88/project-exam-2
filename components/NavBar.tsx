"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Music, Users } from "lucide-react";
import { logout } from "@/lib/session";

type User = {
  id: string;
  username: string;
  image_url?: string | null;
  is_admin?: boolean;
};

function AccountMenuItems({
  onClose,
  onLogout,
  inviteCount = 0,
  isAdmin = false,
  replyCount = 0,
  inboxCount = 0,
}: {
  onClose: () => void;
  onLogout: () => void;
  inviteCount?: number;
  isAdmin?: boolean;
  replyCount?: number;
  inboxCount?: number;
}) {
  return (
    <>
      <Link
        href="/invitations"
        role="menuitem"
        onClick={onClose}
        className="flex items-center justify-between px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
      >
        Invitations
        {inviteCount > 0 && (
          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-neutral-950">
            {inviteCount}
          </span>
        )}
      </Link>
      <Link
        href="/feedback"
        role="menuitem"
        onClick={onClose}
        className="flex items-center justify-between px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
      >
        Feedback
        {replyCount > 0 && (
          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-neutral-950">
            {replyCount}
          </span>
        )}
      </Link>
      {isAdmin && (
        // Drawn from your own /auth/me record. Hiding it is courtesy, not
        // security -- the API answers 404 to anyone else who finds the URL.
        <Link
          href="/admin/feedback"
          role="menuitem"
          onClick={onClose}
          className="flex items-center justify-between px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
        >
          Feedback inbox
          {inboxCount > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-neutral-950">
              {inboxCount}
            </span>
          )}
        </Link>
      )}
      <Link
        href="/user"
        role="menuitem"
        onClick={onClose}
        className="block px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
      >
        Profile
      </Link>
      <Link
        href="/settings"
        role="menuitem"
        onClick={onClose}
        className="block px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
      >
        Settings
      </Link>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-yellow-100 hover:bg-neutral-800 hover:cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </>
  );
}

function ProfileMenu({
  user,
  onLogout,
  inviteCount,
  replyCount,
  inboxCount,
}: {
  user: User;
  onLogout: () => void;
  inviteCount: number;
  replyCount: number;
  inboxCount: number;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const waiting = inviteCount + replyCount + inboxCount;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex items-center hover:cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        {user.image_url ? (
          <img
            src={user.image_url}
            alt={user.username}
            className="h-12 w-12 rounded-full object-cover border border-neutral-400 shadow-md transition duration-300 group-hover:scale-105 group-hover:border-yellow-200"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-500 bg-neutral-700 text-lg font-bold transition group-hover:bg-neutral-600">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}

        {/* The menu is closed by default, so anything waiting has to be
            visible from the outside or it goes unnoticed. The dot is the sum
            of everything wanting attention; the menu says which is which. */}
        {waiting > 0 && (
          <span
            aria-label={`${waiting} thing${waiting === 1 ? "" : "s"} waiting for you`}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-900 bg-yellow-100 text-[10px] font-bold text-neutral-950"
          >
            {waiting}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-44 rounded-md border border-neutral-700 bg-neutral-950/95 shadow-xl backdrop-blur-sm"
        >
          <AccountMenuItems
            onClose={() => setOpen(false)}
            onLogout={onLogout}
            inviteCount={inviteCount}
            isAdmin={user.is_admin}
            replyCount={replyCount}
            inboxCount={inboxCount}
          />
        </div>
      )}
    </div>
  );
}

function MobileMenu({
  user,
  onLogout,
  inviteCount,
  replyCount,
  inboxCount,
}: {
  user: User | null;
  onLogout: () => void;
  inviteCount: number;
  replyCount: number;
  inboxCount: number;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative md:hidden" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center hover:cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open menu"
      >
        {user?.image_url ? (
          <img
            src={user.image_url}
            alt={user.username}
            className="h-11 w-11 rounded-full object-cover border border-neutral-400 shadow-md"
          />
        ) : user ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500 bg-neutral-700 text-lg font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500 bg-neutral-950/60 text-yellow-200">
            <Menu className="h-5 w-5" />
          </div>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-neutral-700 bg-neutral-950/95 shadow-xl backdrop-blur-sm"
        >
          <Link
            href="/bands"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
          >
            <Music className="h-4 w-4" />
            Artister
          </Link>

          {user && (
            <>
              <Link
                href="/users"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-100 hover:bg-neutral-800"
              >
                <Users className="h-4 w-4" />
                Connect
              </Link>

              <div className="my-1 border-t border-neutral-800" />

              <AccountMenuItems
                onClose={() => setOpen(false)}
                onLogout={onLogout}
                inviteCount={inviteCount}
                isAdmin={user.is_admin}
                replyCount={replyCount}
                inboxCount={inboxCount}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const router = useRouter();

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
        <div className="flex w-max justify-center bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
          <Link href={user ? "/user" : "/"}>
            <span className="text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              Vardo
            </span>
          </Link>
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/bands"
            className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:border-yellow-200/60 hover:bg-neutral-800"
          >
            <Music className="h-4 w-4" />
            Artister
          </Link>

          {user && (
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:border-yellow-200/60 hover:bg-neutral-800"
            >
              <Users className="h-4 w-4" />
              Connect
            </Link>
          )}

          {user && (
            <ProfileMenu
              user={user}
              onLogout={handleLogout}
              inviteCount={inviteCount}
              replyCount={replyCount}
              inboxCount={inboxCount}
            />
          )}
        </div>

        {/* Mobile */}
        <MobileMenu
          user={user}
          onLogout={handleLogout}
          inviteCount={inviteCount}
          replyCount={replyCount}
          inboxCount={inboxCount}
        />
      </div>
    </nav>
  );
}
