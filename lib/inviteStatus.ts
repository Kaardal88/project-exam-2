/**
 * Where a band membership sits between being offered and being real.
 *
 * Shared client/server following the lib/bandVisibility.ts pattern.
 *
 * Before this existed, POST /bands/:id/members added you to a band outright --
 * you were a member whether you wanted to be or not, with no say and no
 * notice.
 */
export const inviteStatuses = [
  {
    value: "pending",
    label: "Pending",
    description: "Invited, waiting for an answer.",
  },
  {
    value: "accepted",
    label: "Member",
    description: "Accepted the invitation.",
  },
  {
    value: "declined",
    label: "Declined",
    description: "Turned the invitation down.",
  },
] as const;

export type InviteStatusOption = (typeof inviteStatuses)[number];

export type InviteStatus = InviteStatusOption["value"];

export const inviteStatusValues = inviteStatuses.map(
  (status) => status.value,
) as InviteStatus[];

/** The only status that grants access to a band. */
export const ACCEPTED: InviteStatus = "accepted";
export const PENDING: InviteStatus = "pending";
export const DECLINED: InviteStatus = "declined";

export function isInviteStatus(value: unknown): value is InviteStatus {
  return (
    typeof value === "string" &&
    (inviteStatusValues as string[]).includes(value)
  );
}
