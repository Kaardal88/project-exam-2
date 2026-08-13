"use client";

import { Modal } from "@/components/Modal";
import type { BandEvent } from "./BandCalendar";
import { EventActions } from "./EventActions";
import { EventOriginLabel, type EventOrigin } from "./EventOriginLabel";
import { formatEventDate } from "./eventDate";

type EventDetailsModalProps = {
  event: BandEvent;
  origin?: EventOrigin;
  canManage?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function EventDetailsModal({
  event,
  origin,
  canManage = false,
  onClose,
  onEdit,
  onDelete,
}: EventDetailsModalProps) {
  return (
    <Modal isOpen onClose={onClose}>
      <div className="w-[90vw] max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {origin && (
              <div className="mb-2">
                <EventOriginLabel origin={origin} />
              </div>
            )}

            <h2 className="text-xl font-bold break-words text-yellow-100">
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-400">
          {formatEventDate(event.start_date, event.end_date)}
        </p>

        {event.description ? (
          <p className="mt-4 max-h-[50vh] overflow-y-auto text-sm break-words whitespace-pre-wrap text-neutral-300">
            {event.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">No description</p>
        )}

        {canManage && (
          <EventActions
            onEdit={onEdit}
            onDelete={onDelete}
            className="mt-6 border-t border-neutral-800 pt-4 sm:justify-end"
          />
        )}
      </div>
    </Modal>
  );
}
