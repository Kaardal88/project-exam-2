"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { BandCalendar } from "@/components/calendar/BandCalendar";
import { EventForm } from "@/components/calendar/EventForm";
import { EventCard } from "@/components/calendar/EventCard";
import { ProfileSection } from "./ProfileSection";
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
};

export function HomeNav({
  events,
  bandId,
  role,
  eventsError,
}: HomeNavProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);

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
            events.map((event) => <EventCard key={event.id} event={event} />)
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

          {role === "band_leader" && (
            <button
              onClick={() => setShowEventForm(true)}
              className="mt-2 flex w-full justify-center rounded bg-yellow-200 px-4 py-2 text-black hover:cursor-pointer hover:bg-yellow-300"
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
              Add event
            </h2>

            <EventForm
              bandId={bandId}
              canCreateEvent={role === "band_leader"}
              onCreated={() => {
                setShowEventForm(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
