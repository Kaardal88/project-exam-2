import type { BandEvent } from "./BandCalendar";

type EventCardProps = {
  event: BandEvent;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function EventCard({
  event,
  canManage = false,
  onEdit,
  onDelete,
}: EventCardProps) {
  if (!event) return null;
  return (
    <div className="rounded border  border-neutral-700 bg-neutral-950 p-4 ">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-yellow-100">{event.title}</h3>

        {canManage && (
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs text-neutral-400 hover:cursor-pointer hover:text-yellow-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-neutral-400 hover:cursor-pointer hover:text-red-300"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {event.description && (
        <p className="mt-2 text-sm text-neutral-300">{event.description}</p>
      )}

      <p className="mt-2 text-sm text-neutral-400">
        {new Date(event.start_date).toLocaleDateString("no-NO")}
      </p>
    </div>
  );
}
