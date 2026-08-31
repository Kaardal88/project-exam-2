"use client";

import { Search, X } from "lucide-react";
import { userTags } from "@/lib/userTags";
import {
  connectRoles,
  connectSorts,
  type ConnectSort,
} from "@/lib/connectFilters";

export type ConnectFilterState = {
  q: string;
  tags: string[];
  roles: string[];
  country: string;
  sort: ConnectSort;
};

type ConnectFiltersProps = {
  value: ConnectFilterState;
  onChange: (next: ConnectFilterState) => void;
  countryOptions: { value: string; label: string }[];
  /** True when anything is narrowing the list -- gates "Most relevant". */
  hasFilters: boolean;
};

const chipBase =
  "rounded-full border px-3 py-1 text-xs transition hover:cursor-pointer";

const chipOn =
  "border-yellow-100 bg-yellow-100 text-black hover:bg-yellow-200";

const chipOff =
  "border-neutral-600 bg-neutral-950/60 text-yellow-100 hover:border-yellow-200/60 hover:bg-neutral-800";

/**
 * Search, chips and sort for the Connect directory.
 *
 * Chips rather than dropdowns for tags and roles: finding a drummer should be
 * one click, not open-scroll-select-close. Country stays a select because two
 * hundred chips is not a filter, it is a wall.
 *
 * The component holds no state of its own. The page owns the filter object
 * because it is also the thing the query string and every fetch are built from,
 * and two copies of it would be one copy too many.
 */
export function ConnectFilters({
  value,
  onChange,
  countryOptions,
  hasFilters,
}: ConnectFiltersProps) {
  function toggle(key: "tags" | "roles", entry: string) {
    const current = value[key];

    onChange({
      ...value,
      [key]: current.includes(entry)
        ? current.filter((item) => item !== entry)
        : [...current, entry],
    });
  }

  function clearAll() {
    onChange({ q: "", tags: [], roles: [], country: "", sort: value.sort });
  }

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 shrink-0 rotate-90 text-yellow-100" />

        <input
          type="text"
          placeholder="Search by name or handle"
          value={value.q}
          onChange={(event) => onChange({ ...value, q: event.target.value })}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-500 focus:border-yellow-200"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          What they do
        </p>

        <div className="flex flex-wrap gap-2">
          {userTags.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => toggle("tags", tag.value)}
              aria-pressed={value.tags.includes(tag.value)}
              className={`${chipBase} ${
                value.tags.includes(tag.value) ? chipOn : chipOff
              }`}
            >
              <span className="mr-1">{tag.icon}</span>
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          What they already are
        </p>

        <div className="flex flex-wrap gap-2">
          {connectRoles.map((role) => (
            <button
              key={`${role.source}-${role.value}`}
              type="button"
              onClick={() => toggle("roles", role.value)}
              aria-pressed={value.roles.includes(role.value)}
              className={`${chipBase} ${
                value.roles.includes(role.value) ? chipOn : chipOff
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Where they are
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
                onChange({ ...value, sort: event.target.value as ConnectSort })
              }
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none focus:border-yellow-200 sm:w-56"
            >
              {connectSorts.map((sort) => (
                <option
                  key={sort.value}
                  value={sort.value}
                  // Relevance against nothing is relevance to nothing, so the
                  // option is only real once something is being matched.
                  disabled={sort.requiresFilter && !hasFilters}
                >
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 self-start rounded-full border border-neutral-600 px-3 py-1.5 text-xs text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200 hover:bg-neutral-800 sm:self-auto"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
