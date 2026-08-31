/**
 * The vocabulary the Connect directory filters and sorts on.
 *
 * Shared client/server following the lib/bandRoles.ts pattern: the API
 * validates against these values and the filter chips render from them, so the
 * two cannot drift.
 *
 * The role filter is deliberately *derived*, not stored. There is no column
 * saying "this person is a band leader" -- that is a fact about a row in
 * band_members or project_collaborators, and it is true of a person only
 * because some band made it true. So this list is the union of lib/bandRoles.ts
 * and lib/collaboratorRoles.ts, and the query resolves it into an EXISTS over
 * those two tables. Adding a role to either of those files and forgetting this
 * one costs a filter option, never correctness.
 */
import { bandRoles } from "@/lib/bandRoles";
import { collaboratorRoles } from "@/lib/collaboratorRoles";

export type ConnectRoleSource = "band" | "project";

export type ConnectRoleOption = {
  value: string;
  label: string;
  /** which table the role lives in, which is how the query knows where to look */
  source: ConnectRoleSource;
};

export const connectRoles: ConnectRoleOption[] = [
  ...bandRoles.map((role) => ({
    value: role.value as string,
    label: role.label,
    source: "band" as const,
  })),
  ...collaboratorRoles.map((role) => ({
    // "Producer" as a band role and "Producer" as a guest are different facts
    // about a person, and the invitation that created each one is different
    // too. Labelling the guest ones keeps the chips honest.
    value: role.value as string,
    label: `Guest · ${role.label}`,
    source: "project" as const,
  })),
];

export const connectRoleValues = connectRoles.map((role) => role.value);

export function isConnectRole(value: unknown): value is string {
  return typeof value === "string" && connectRoleValues.includes(value);
}

export function connectRoleLabel(value: string, source: ConnectRoleSource) {
  return (
    connectRoles.find((role) => role.value === value && role.source === source)
      ?.label ?? value
  );
}

/**
 * "Most relevant" is only meaningful once something is being matched against,
 * so it is offered only while a filter is active -- see requiresFilter.
 * Sorting an unfiltered directory by relevance would be sorting by zero.
 */
export const connectSorts = [
  {
    value: "newest",
    label: "Newest",
    description: "Most recently joined first.",
    requiresFilter: false,
  },
  {
    value: "alphabetical",
    label: "A–Z",
    description: "By username.",
    requiresFilter: false,
  },
  {
    value: "relevant",
    label: "Most relevant",
    description: "Most matching tags first.",
    requiresFilter: true,
  },
] as const;

export type ConnectSort = (typeof connectSorts)[number]["value"];

export const connectSortValues = connectSorts.map(
  (sort) => sort.value,
) as ConnectSort[];

export const DEFAULT_CONNECT_SORT: ConnectSort = "newest";

export function isConnectSort(value: unknown): value is ConnectSort {
  return (
    typeof value === "string" && (connectSortValues as string[]).includes(value)
  );
}

/** One page of the directory grid: 4 columns x 3 rows on desktop. */
export const CONNECT_PAGE_SIZE = 12;

/** The taster row shown before anyone has searched or filtered. */
export const CONNECT_PREVIEW_SIZE = 5;

// TODO: "Recently active" would be the sort people actually want, and it is
// not here because nothing tracks last_active today. It needs a column written
// on each authenticated request, which is a write per request on a serverless
// database -- so it is its own decision, not a line in this file.
