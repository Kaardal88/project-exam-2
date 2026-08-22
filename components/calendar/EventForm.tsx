"use client";

import { useState } from "react";
import type { DateRange } from "@daypicker/react";
import { DateRangePicker } from "./DatePicker";

import "@daypicker/react/style.css";

export type EventFormEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
};

type EventFormProps = {
  mode?: "band" | "private";
  bandId?: string | number;
  canSubmit: boolean;
  initialEvent?: EventFormEvent | null;
  onSaved?: () => void;
};

export function EventForm({
  mode = "band",
  bandId,
  canSubmit,
  initialEvent,
  onSaved,
}: EventFormProps) {
  const isEditing = Boolean(initialEvent);

  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [description, setDescription] = useState(
    initialEvent?.description ?? "",
  );
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    initialEvent
      ? {
          from: new Date(initialEvent.start_date),
          to: new Date(initialEvent.end_date ?? initialEvent.start_date),
        }
      : undefined,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !selectedRange?.from) {
      console.error("Missing required fields");
      return;
    }

    const startDate = selectedRange.from;
    const endDate = selectedRange.to ?? selectedRange.from;

    const endpoint =
      mode === "private"
        ? isEditing
          ? `/api/users/me/private-events/${initialEvent!.id}`
          : "/api/users/me/private-events"
        : isEditing
          ? `/api/bands/${bandId}/events/${initialEvent!.id}`
          : `/api/bands/${bandId}/events`;

    const response = await fetch(endpoint, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Failed to save event", await response.text());
      return;
    }

    if (!isEditing) {
      setTitle("");
      setDescription("");
      setSelectedRange(undefined);
    }
    onSaved?.();
  }

  if (!canSubmit) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label htmlFor="title">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='e.g "Studio this weekend"'
        className="w-full rounded bg-neutral-900 p-3 text-white"
      />

      <label htmlFor="description">Description</label>
      <input
        value={description}
        placeholder="e.g 'Bring your own gear!'"
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded bg-neutral-900 p-3 text-white"
      />

      <label htmlFor="date">Date</label>
      <p className="text-sm text-neutral-400">
        Click on the calendar to select a single date or from-to range.
      </p>

      <DateRangePicker selected={selectedRange} onSelect={setSelectedRange} />

      <button
        type="submit"
        className="rounded bg-yellow-200 px-4 py-2 mt-6 w-full text-black hover:cursor-pointer hover:bg-yellow-300"
      >
        {isEditing ? "Save changes" : "Save event"}
      </button>
    </form>
  );
}
