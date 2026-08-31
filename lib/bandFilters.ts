/**
 * The vocabulary the public band directory filters and sorts on.
 *
 * Shared client/server following the lib/bandRoles.ts pattern, and the sibling
 * of lib/connectFilters.ts — the two directories are the same idea pointed at
 * different tables, so they are built the same way on purpose.
 *
 * Genres live in lib/genres.ts, which /bands/new already writes from. Nothing
 * is redefined here.
 */
import { genreOptions } from "@/lib/genres";

export type Genre = (typeof genreOptions)[number];

export function isGenre(value: unknown): value is Genre {
  return (
    typeof value === "string" && (genreOptions as readonly string[]).includes(value)
  );
}

export const bandSorts = [
  {
    value: "newest",
    label: "Newest",
    description: "Most recently created first.",
    /**
     * Random is a real answer the API can give and a nonsensical thing to put
     * in a sort menu: it is offered through the "Show me something new" button
     * instead, one band at a time.
     *
     * The reason it must never become a grid sort is paging. `ORDER BY
     * random()` is re-rolled per query, so page two of a randomly ordered list
     * is not the continuation of page one — it is a fresh shuffle, and the
     * reader would see the same band twice and never see others at all.
     * Keeping it in this list keeps validation in one place; `hidden` keeps it
     * out of the menu.
     */
    hidden: false,
  },
  {
    value: "alphabetical",
    label: "A–Z",
    description: "By band name.",
    hidden: false,
  },
  {
    value: "random",
    label: "Random",
    description: "One at a time, never paged.",
    hidden: true,
  },
] as const;

export type BandSort = (typeof bandSorts)[number]["value"];

export const bandSortValues = bandSorts.map((sort) => sort.value) as BandSort[];

export const DEFAULT_BAND_SORT: BandSort = "newest";

/** The sorts the directory actually offers as a choice. */
export const visibleBandSorts = bandSorts.filter((sort) => !sort.hidden);

export function isBandSort(value: unknown): value is BandSort {
  return (
    typeof value === "string" && (bandSortValues as string[]).includes(value)
  );
}

/** One page of the directory grid: 12 divides evenly by 2, 3 and 4 columns. */
export const BAND_PAGE_SIZE = 12;
