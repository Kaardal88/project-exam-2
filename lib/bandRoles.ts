/**
 * Roles a person can hold inside a band.
 *
 * Shared client/server following the lib/bandVisibility.ts pattern: the API
 * validates against these values and the member list renders from them.
 *
 * Note that every permission check in the server is written as
 * `role !== "band_leader"`, so anything that is not the leader is treated
 * alike. That is deliberate for now -- guests are meant to have member-level
 * rights until there is a reason to narrow them -- but it does mean a new role
 * added here grants member-level access by default rather than none.
 */
export const bandRoles = [
  {
    value: "band_leader",
    label: "Band leader",
    description: "Full control: edit the profile, manage members and projects.",
  },
  {
    value: "member",
    label: "Member",
    description: "Part of the band. Can work on every project.",
  },
] as const;

export type BandRoleOption = (typeof bandRoles)[number];

export type BandRole = BandRoleOption["value"];

export const bandRoleValues = bandRoles.map(
  (role) => role.value,
) as BandRole[];

export const BAND_LEADER: BandRole = "band_leader";

export function isBandRole(value: unknown): value is BandRole {
  return (
    typeof value === "string" && (bandRoleValues as string[]).includes(value)
  );
}

export function bandRoleLabel(value: string): string {
  return bandRoles.find((role) => role.value === value)?.label ?? value;
}
