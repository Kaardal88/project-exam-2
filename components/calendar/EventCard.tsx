import type { BandEvent } from "./BandCalendar";
import { EventActions } from "./EventActions";
import { EventOriginLabel, type EventOrigin } from "./EventOriginLabel";
import { formatEventDate } from "./eventDate";

type EventCardProps = {
  event: BandEvent;
  origin?: EventOrigin;
  canManage?: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function EventCard({
  event,
  origin,
  canManage = false,
  onOpen,
  onEdit,
  onDelete,
}: EventCardProps) {
  if (!event) return null;

  return (
    <div
      className={`relative rounded border border-neutral-700 bg-neutral-950 p-4 ${
        onOpen ? "transition-colors hover:border-yellow-100/40" : ""
      }`}
    >
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 rounded hover:cursor-pointer focus-visible:ring-2 focus-visible:ring-yellow-100 focus-visible:outline-none"
        >
          <span className="sr-only">Open {event.title}</span>
        </button>
      )}

      {origin && (
        <div className="relative z-10 mb-2 w-fit">
          <EventOriginLabel origin={origin} />
        </div>
      )}

      <h3 className="min-w-0 font-bold break-words text-yellow-100">
        {event.title}
      </h3>

      {event.description && (
        <p className="mt-2 line-clamp-3 text-sm break-words text-neutral-300">
          {event.description}
        </p>
      )}

      <p className="mt-2 text-sm text-neutral-400">
        {formatEventDate(event.start_date)}
      </p>

      {canManage && (
        <EventActions
          onEdit={onEdit}
          onDelete={onDelete}
          className="relative z-10 mt-3 border-t border-neutral-800 pt-3"
        />
      )}
    </div>
  );
}
