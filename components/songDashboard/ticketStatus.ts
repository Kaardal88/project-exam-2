export const TICKET_STATUSES = ["open", "wip", "done"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_STYLES: Record<
  TicketStatus,
  { label: string; dot: string; badge: string }
> = {
  open: {
    label: "Open",
    dot: "bg-yellow-100",
    badge: "border-yellow-100 text-yellow-100",
  },
  wip: {
    label: "WIP",
    dot: "bg-neutral-300",
    badge: "border-neutral-300 text-neutral-300",
  },
  done: {
    label: "Done",
    dot: "bg-green-400",
    badge: "border-green-400 text-green-300",
  },
};
