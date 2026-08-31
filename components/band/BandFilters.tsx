"use client";

import { Search, Shuffle, X } from "lucide-react";
import { genreOptions } from "@/lib/genres";
import { visibleBandSorts, type BandSort } from "@/lib/bandFilters";

export type BandFilterState = {
  q: string;
  genres: string[];
  country: string;
  sort: BandSort;
};

type BandFiltersProps = {
  value: BandFilterState;
  onChange: (next: BandFilterState) => void;
  countryOptions: { value: string; label: string }[];
  hasFilters: boolean;
  onSurprise: () => void;
  surprising: boolean;
};

const chipBase =
  "rounded-full border px-3 py-1 text-xs transition hover:cursor-pointer";

const chipOn = "border-yellow-100 bg-yellow-100 text-black hover:bg-yellow-200";

const chipOff =
  "border-neutral-600 bg-neutral-950/60 text-yellow-100 hover:border-yellow-200/60 hover:bg-neutral-800";

/**
 * Search, genre chips, country and sort for the Artists directory.
 *
 * The sibling of ConnectFilters, and shaped the same way for the same reasons:
 * chips for the small closed vocabulary, a select for the two hundred
 * countries, and no state of its own — the page owns the filter object because
 * it is also what every fetch is built from.
 *
 * Search is band name only, which is what the query does too. Bios are long
 * and full of incidental words; a search that quietly returns more than it
 * should is harder to trust than one that returns less.
 */
export function BandFilters({
  value,
  onChange,
  countryOptions,
  hasFilters,
  onSurprise,
  surprising,
}: BandFiltersProps) {
  function toggleGenre(genre: string) {
    onChange({
      ...value,
      genres: value.genres.includes(genre)
        ? value.genres.filter((item) => item !== genre)
        : [...value.genres, genre],
    });
  }

  function clearAll() {
    onChange({ q: "", genres: [], country: "", sort: value.sort });
  }

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 shrink-0 rotate-90 text-yellow-100" />

        <input
          type="text"
          placeholder="Search by band name"
          value={value.q}
          onChange={(event) => onChange({ ...value, q: event.target.value })}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-500 focus:border-yellow-200"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Genre
        </p>

        <div className="flex flex-wrap gap-2">
          {genreOptions.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              aria-pressed={value.genres.includes(genre)}
              className={`${chipBase} ${
                value.genres.includes(genre) ? chipOn : chipOff
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Country
            </span>

            <select
              value={value.country}
              onChange={(event) =>
                onChange({ ...value, country: event.target.value })
              }
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none focus:border-yellow-200 sm:w-56"
            >
              <option value="">Anywhere</option>

              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Sort by
            </span>

            <select
              value={value.sort}
              onChange={(event) =>
                onChange({ ...value, sort: event.target.value as BandSort })
              }
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none focus:border-yellow-200 sm:w-56"
            >
              {/* Random is missing on purpose -- a randomly ordered list
                  cannot be paged, so it is the button below instead. */}
              {visibleBandSorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Draws from whatever the filters currently describe, so it reads as
              "surprise me with one of these" rather than ignoring the work the
              reader just did narrowing the list. */}
          <button
            type="button"
            onClick={onSurprise}
            disabled={surprising}
            className="flex items-center gap-1.5 rounded-full border border-yellow-100 px-4 py-1.5 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-100 hover:text-black disabled:opacity-50"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {surprising ? "Finding…" : "Show me something new"}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-neutral-600 px-3 py-1.5 text-xs text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
