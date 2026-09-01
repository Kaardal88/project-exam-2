"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { DeleteAccountModal } from "@/components/settings/DeleteAccountModal";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { EditProfileForm } from "@/components/settings/EditProfileForm";
import { Trash2 } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";

type User = {
  id: string;
  username: string;
  email: string;
  country: string | null;
  tags: string[] | null;
};

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/auth/me");

      // The page can no longer see whether a session exists, so the server
      // saying 401 is what "not logged in" looks like now.
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load your account");
        setLoading(false);
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto max-w-3xl px-4 pb-24">
        <h1 className="mb-12 mt-24 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Settings
        </h1>

        {error && <p className="form-error mb-6">{error}</p>}

        {user && (
          <>
            <section className="mb-8 rounded-md border border-neutral-700 bg-neutral-900/80 p-6">
              <h2 className="mb-4 text-lg font-bold text-yellow-100">
                Account
              </h2>

              {/* Just the email: it is the one thing here that cannot be
                  changed, and the username moved into the editable Profile
                  section below rather than being shown twice. */}
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Email</dt>
                  <dd className="text-yellow-100">{user.email}</dd>
                </div>
              </dl>
            </section>

            <EditProfileForm
              userId={user.id}
              initialUsername={user.username}
              initialCountry={user.country ?? ""}
              initialTags={user.tags ?? []}
            />

            <ChangePasswordForm />

            <section className="rounded-md border border-red-900/60 bg-red-950/20 p-6">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-red-300">
                Danger zone
              </h2>

              <p className="mb-4 text-sm text-neutral-400">
                Deleting your account removes your profile and private calendar
                for good, and drops you out of every band you are in. Bands you
                share with others carry on without you.
              </p>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 rounded-md border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:cursor-pointer hover:bg-red-900/40"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </section>

            <DeleteAccountModal
              isOpen={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              userId={user.id}
              username={user.username}
            />
          </>
        )}
      </div>
    </main>
  );
}
