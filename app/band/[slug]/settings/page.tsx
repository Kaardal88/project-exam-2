"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import countries from "world-countries";
import { ArrowLeft, Trash2 } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { SuccessMessage } from "@/components/SuccessMessage";
import { DeleteBandModal } from "@/components/bandProfile/DeleteBandModal";
import {
  bandVisibilityOptions,
  type BandVisibility,
  DEFAULT_BAND_VISIBILITY,
} from "@/lib/bandVisibility";
import { genreOptions } from "@/lib/genres";

const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

/**
 * The band's own settings page, and the counterpart to /settings.
 *
 * What lives here is what the band *is* rather than what its page looks like:
 * the name, the address, who can see it, and the two fields the Artists
 * directory filters on. Bio, links and pictures are edited on the profile
 * itself, where you can see what you are changing -- see
 * docs/decisions/profile-editing.md.
 *
 * Leader-only, and it says so rather than redirecting: a member who follows
 * this link should learn why it is not for them.
 */
export default function BandSettingsPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [bandId, setBandId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [bandName, setBandName] = useState("");
  const [bandSlug, setBandSlug] = useState("");
  const [visibility, setVisibility] = useState<BandVisibility>(
    DEFAULT_BAND_VISIBILITY,
  );
  const [country, setCountry] = useState("");
  const [genre, setGenre] = useState("");
  const [projectCount, setProjectCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    async function loadBand() {
      const response = await fetch(`/api/bands/${slug}`);

      if (!response.ok) {
        setError("Failed to load band");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.authenticated) {
        router.push("/login");
        return;
      }

      setBandId(data.band?.id ?? null);
      setRole(data.role);
      setBandName(data.band?.band_name ?? "");
      setBandSlug(data.band?.slug ?? "");
      setVisibility(data.band?.visibility ?? DEFAULT_BAND_VISIBILITY);
      setCountry(data.band?.country ?? "");
      setGenre(data.band?.genre ?? "");
      setLoading(false);
    }

    loadBand();
  }, [router, slug]);

  // Only for the delete confirmation, which tells you how much goes with the
  // band. Kept out of the load above so a failure here cannot block the page.
  useEffect(() => {
    if (!bandId) return;

    async function loadProjectCount() {
      const response = await fetch(`/api/bands/${bandId}/projects`);

      if (!response.ok) return;

      const data = await response.json();
      setProjectCount(data.projects?.length ?? 0);
    }

    loadProjectCount();
  }, [bandId]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setError(null);
      setSaving(true);
      setSuccess(false);

      // Only the fields this page owns. The update route leaves a column
      // alone when its key is absent, so bio, links and pictures survive a
      // save here untouched -- which is what lets them be edited elsewhere.
      const response = await fetch(`/api/bands/${bandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          band_name: bandName,
          slug: bandSlug,
          visibility,
          country,
          genre,
        }),
      });

      setSaving(false);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Failed to save settings");
        return;
      }

      const data = await response.json();
      const savedSlug = data.band?.slug ?? bandSlug;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);

      // A renamed band lives at a new address, and this page is at the old
      // one. The old slug still redirects, but leaving the bar stale would
      // mean a reload silently bounces through it.
      if (savedSlug !== slug) {
        router.replace(`/band/${savedSlug}/settings`);
      }
    },
    [bandId, bandName, bandSlug, visibility, country, genre, router, slug],
  );

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  }

  const isLeader = role === "band_leader";

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto max-w-3xl px-4 pb-24">
        <div className="mb-4 mt-24">
          <Link
            href={`/band/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-yellow-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {bandName || "the band"}
          </Link>
        </div>

        <h1 className="mb-12 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Band settings
        </h1>

        {!isLeader ? (
          <p className="rounded-md border border-neutral-700 bg-neutral-900/80 p-6 text-sm text-neutral-300">
            Only a band leader can change these settings. Ask one of yours if
            something here needs to change.
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <section className="mb-8 rounded-md border border-neutral-700 bg-neutral-900/80 p-6">
                <h2 className="mb-1 text-lg font-bold text-yellow-100">
                  Identity
                </h2>

                <p className="mb-6 text-sm text-neutral-400">
                  The bio, links and pictures are edited on the band page
                  itself.
                </p>

                {error && (
                  <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-yellow-100">
                      Band name
                    </label>

                    <input
                      type="text"
                      value={bandName}
                      onChange={(e) => setBandName(e.target.value)}
                      className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-yellow-100">
                      Profile URL
                    </label>

                    <div className="flex items-center border border-neutral-700 bg-neutral-950 focus-within:border-yellow-200">
                      <span className="pl-4 text-sm text-neutral-500">
                        /band/
                      </span>
                      <input
                        type="text"
                        value={bandSlug}
                        onChange={(e) => setBandSlug(e.target.value)}
                        className="w-full bg-transparent px-1 py-3 text-sm text-yellow-100 outline-none"
                      />
                    </div>

                    <p className="mt-2 text-xs text-neutral-400">
                      Changing this keeps the old address working — it will
                      redirect here. Letters, numbers and hyphens only.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-yellow-100">
                      Visibility
                    </label>

                    <select
                      value={visibility}
                      onChange={(e) =>
                        setVisibility(e.target.value as BandVisibility)
                      }
                      className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                    >
                      {bandVisibilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs text-neutral-400">
                      {
                        bandVisibilityOptions.find(
                          (option) => option.value === visibility,
                        )?.description
                      }
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8 rounded-md border border-neutral-700 bg-neutral-900/80 p-6">
                <h2 className="mb-1 text-lg font-bold text-yellow-100">
                  Discovery
                </h2>

                <p className="mb-6 text-sm text-neutral-400">
                  What the Artists page filters on. Leaving either unset is
                  fine — the band simply will not appear under that filter.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-yellow-100">
                      Country
                    </label>

                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                    >
                      <option value="">Not set</option>

                      {countryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-yellow-100">
                      Genre
                    </label>

                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                    >
                      <option value="">Not set</option>

                      {genreOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="mb-12 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="border border-yellow-200 bg-yellow-100 px-6 py-2 text-sm font-bold text-neutral-950 transition hover:cursor-pointer hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {success ? (
                    <SuccessMessage message="Settings saved" tone="dark" />
                  ) : saving ? (
                    "Saving..."
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>

            <section className="rounded-md border border-red-900/60 bg-red-950/20 p-6">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-red-300">
                Danger zone
              </h2>

              <p className="mb-4 text-sm text-neutral-400">
                Deleting the band removes every project, song, comment and file
                with it. This cannot be undone.
              </p>

              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 rounded-md border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:cursor-pointer hover:bg-red-900/40"
              >
                <Trash2 className="h-4 w-4" />
                Delete this band
              </button>
            </section>

            {bandId && (
              <DeleteBandModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                bandId={bandId}
                bandName={bandName}
                projectCount={projectCount}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
