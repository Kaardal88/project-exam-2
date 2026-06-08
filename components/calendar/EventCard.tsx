import type { BandEvent } from "./BandCalendar";

type EventCardProps = {
  event: BandEvent;
};

export function EventCard({ event }: EventCardProps) {
  if (!event) return null;
  return (
    <div className="rounded border border-neutral-700 bg-neutral-950 p-4">
      <h3 className="font-bold text-yellow-100">{event.title}</h3>

      {event.description && (
        <p className="mt-2 text-sm text-neutral-300">{event.description}</p>
      )}

      <p className="mt-2 text-sm text-neutral-400">
        {new Date(event.start_date).toLocaleDateString("no-NO")}
      </p>
    </div>
  );
}
