"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import countries from "world-countries";
import { X } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { BackButton } from "@/components/BackButton";
import AmpLoader from "@/components/AmpLoader";
import {
  BandDirectoryCard,
  type DirectoryBand,
} from "@/components/band/BandDirectoryCard";
import {
  BandFilters,
  type BandFilterState,
} from "@/components/band/BandFilters";
import { BAND_PAGE_SIZE, DEFAULT_BAND_SORT } from "@/lib/bandFilters";

const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

const countryLabels = new Map(
  countryOptions.map((country) => [country.value, country.label]),
);

const EMPTY_FILTERS: BandFilterState = {
  q: "",
  genres: [],
  country: "",
  sort: DEFAULT_BAND_SORT,
};

/**
 * The Artists directory.
 *
 * Open to everyone, signed in or not — `GET /bands/public` takes no session,
 * and the query excludes anything but public bands rather than trusting the
 * page to.
 *
 * Unlike Connect, this shows the grid straight away rather than waiting to be
 * asked. Listing every *person* by default is a wall and a privacy question;
 * listing every public band is the entire point of the page — a band profile
 * is published so it can be found.
 */
export default function BandsPage() {
  const [filters, setFilters] = useState<BandFilterState>(EMPTY_FILTERS);
  // The search box types faster than the database answers, so the query the
  // fetch runs on lags the one the input shows.
  const [debouncedQ, setDebouncedQ] = useState("");

  const [bands, setBands] = useState<DirectoryBand[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [spotlight, setSpotlight] = useState<DirectoryBand | null>(null);
  const [surprising, setSurprising] = useState(false);

  const hasFilters =
    debouncedQ.trim().length > 0 ||
    filters.genres.length > 0 ||
    filters.country.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const buildQuery = useCallback(
    (offset: number, overrides?: { sort?: string; limit?: number }) => {
      const params = new URLSearchParams();

      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (filters.genres.length) params.set("genres", filters.genres.join(","));
      if (filters.country) params.set("country", filters.country);

      params.set("sort", overrides?.sort ?? filters.sort);
      params.set("limit", String(overrides?.limit ?? BAND_PAGE_SIZE));
      params.set("offset", String(offset));

      return params.toString();
    },
    [debouncedQ, filters.genres, filters.country, filters.sort],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/bands/public?${buildQuery(0)}`);
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || "Could not load bands");
          setBands([]);
          setLoading(false);
          return;
        }

        setBands(data.bands ?? []);
        setTotal(data.total ?? 0);
        setHasMore(Boolean(data.hasMore));
      } catch {
        if (!cancelled) setError("Could not load bands");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // A slow first request must not overwrite a faster second one -- the
    // search box can fire several of these in a second.
    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  async function loadMore() {
    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/bands/public?${buildQuery(bands.length)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load more bands");
        return;
      }

      setBands((current) => [...current, ...(data.bands ?? [])]);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setError("Could not load more bands");
    } finally {
      setLoadingMore(false);
    }
  }

  /**
   * One random band from whatever the filters currently describe.
   *
   * Shown here rather than navigated to, so pressing it again is one click and
   * the list you were reading is still underneath. `ORDER BY random()` picks it
   * server-side; drawing from the loaded page would only ever surprise you with
   * one of the twelve already on screen.
   */
  async function surpriseMe() {
    setSurprising(true);

    try {
      const response = await fetch(
        `/api/bands/public?${buildQuery(0, { sort: "random", limit: 1 })}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not find a band");
        return;
      }

      setSpotlight(data.bands?.[0] ?? null);
    } catch {
      setError("Could not find a band");
    } finally {
      setSurprising(false);
    }
  }

  const filterSummary = useMemo(() => {
    const parts: string[] = [];

    if (debouncedQ.trim()) parts.push(`“${debouncedQ.trim()}”`);
    parts.push(...filters.genres);

    return { parts, country: countryLabels.get(filters.country) };
  }, [debouncedQ, filters.genres, filters.country]);

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <BackButton className="ml-4 mt-4" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
        <h1 className="mb-8 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Artists
        </h1>

        <BandFilters
          value={filters}
          onChange={setFilters}
          countryOptions={countryOptions}
          hasFilters={hasFilters}
          onSurprise={surpriseMe}
          surprising={surprising}
        />

        {spotlight && (
          <section className="mt-6 rounded-md border border-yellow-200/40 bg-yellow-100/5 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-yellow-100">
                Have you heard of{" "}
                <span className="font-semibold">{spotlight.band_name}</span>?
              </p>

              <button
                type="button"
                onClick={() => setSpotlight(null)}
                className="flex items-center gap-1 rounded-full border border-neutral-600 px-3 py-1 text-xs text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
              >
                <X className="h-3 w-3" />
                Dismiss
              </button>
            </div>

            <div className="max-w-56">
              <BandDirectoryCard
                band={spotlight}
                countryLabel={
                  spotlight.country
                    ? countryLabels.get(spotlight.country)
                    : undefined
                }
              />
            </div>
          </section>
        )}

        {error && (
          <p className="mt-6 rounded-md border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <AmpLoader />
          </div>
        ) : (
          <section className="mt-8">
            <p className="mb-4 text-sm text-neutral-400">
              {total} {total === 1 ? "band" : "bands"}
            </p>

            {bands.length === 0 ? (
              <EmptyResult summary={filterSummary} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6 rounded-md border border-neutral-700 bg-neutral-900/80 p-6 sm:grid-cols-3 lg:grid-cols-4">
                  {bands.map((band) => (
                    <BandDirectoryCard
                      key={band.id}
                      band={band}
                      countryLabel={
                        band.country
                          ? countryLabels.get(band.country)
                          : undefined
                      }
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full border border-neutral-600 px-6 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/** An empty result that says what was asked for, not only that it failed. */
function EmptyResult({
  summary,
}: {
  summary: { parts: string[]; country: string | undefined };
}) {
  const what = summary.parts.join(" · ");

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/60 p-8 text-center">
      <p className="text-sm text-neutral-300">
        No bands matching{" "}
        <span className="text-yellow-100">{what || "those filters"}</span>
        {summary.country && (
          <>
            {" "}
            in <span className="text-yellow-100">{summary.country}</span>
          </>
        )}
        .
      </p>

      <p className="mt-2 text-xs text-neutral-500">
        Try fewer genres, or anywhere instead of one country. Not every band has
        filled in a genre yet.
      </p>
    </div>
  );
}
