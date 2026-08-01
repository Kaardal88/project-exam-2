"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { BandCalendar } from "@/components/calendar/BandCalendar";
import { EventForm, EventFormEvent } from "@/components/calendar/EventForm";
import { EventCard } from "@/components/calendar/EventCard";
import { BandEvent } from "@/components/calendar/BandCalendar";
type HomeEvent = BandEvent & {
  band_id?: {
    id: string;
    band_name: string;
    image_url: string | null;
    canCreateEvent?: boolean;
  };
};

type HomeNavProps = {
  events: HomeEvent[];
  bandId: string | number;

  role: string | null;
  eventsError?: string | null;
  onEventsChanged?: () => void | Promise<void>;
};

export function HomeNav({
  events,
  bandId,
  role,
  eventsError,
  onEventsChanged,
}: HomeNavProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventFormEvent | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManageEvents = role === "band_leader";

  function openCreateForm() {
    setEditingEvent(null);
    setShowEventForm(true);
  }

  function openEditForm(event: HomeEvent) {
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
    });
    setShowEventForm(true);
  }

  async function handleDelete(eventId: string) {
    if (!canManageEvents) return;
    if (!window.confirm("Delete this event?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setDeletingId(eventId);

    try {
      const response = await fetch(`/api/bands/${bandId}/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to delete event", await response.text());
        return;
      }

      await onEventsChanged?.();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1  gap-6 lg:grid-cols-2">
      <div className=" flex flex-col gap-4 p-4 rounded-md border border-neutral-700 bg-neutral-900 ">
        <h2 className="text-sm md:text-lg  font-bold text-yellow-100">
          Upcoming events
        </h2>
        <div className="max-h-[50vh] space-y-3  overflow-y-auto ">
          {eventsError ? (
            <p className="form-error">{eventsError}</p>
          ) : events.length > 0 ? (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                canManage={canManageEvents}
                onEdit={() => openEditForm(event)}
                onDelete={() => handleDelete(event.id)}
              />
            ))
          ) : (
            <p className="text-sm text-neutral-400">No upcoming events</p>
          )}
        </div>
      </div>

      <div className=" flex flex-col gap-4 p-4 rounded-md border border-neutral-700 bg-neutral-900 ">
        <h2 className="text-sm md:text-lg  font-bold text-yellow-100">
          Calendar
        </h2>
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <BandCalendar
              events={events}
              selectedDate={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(date);
              }}
            />
          </div>

          {canManageEvents && (
            <button
              onClick={openCreateForm}
              disabled={deletingId !== null}
              className="mt-2 flex w-full justify-center rounded bg-yellow-200 px-4 py-2 text-black hover:cursor-pointer hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mr-2 text-2xl">+</span>
              Add Event
            </button>
          )}
        </div>
      </div>

      {showEventForm && (
        <Modal isOpen={showEventForm} onClose={() => setShowEventForm(false)}>
          <div className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold text-yellow-100">
              {editingEvent ? "Edit event" : "Add event"}
            </h2>

            <EventForm
              bandId={bandId}
              canSubmit={canManageEvents}
              initialEvent={editingEvent}
              onSaved={async () => {
                setShowEventForm(false);
                setEditingEvent(null);
                await onEventsChanged?.();
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
