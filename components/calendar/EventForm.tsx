"use client";

import { useState } from "react";
import type { DateRange } from "@daypicker/react";
import { DateRangePicker } from "./DatePicker";

import "@daypicker/react/style.css";

type EventFormProps = {
  bandId: string | number;
  canCreateEvent: boolean;
  onCreated?: () => void;
};

export function EventForm({
  bandId,
  canCreateEvent,
  onCreated,
}: EventFormProps) {
  const [title, setTitle] = useState("");

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Unauthorized");
      return;
    }

    if (!title || !selectedRange?.from) {
      console.error("Missing required fields");
      return;
    }

    const startDate = selectedRange.from;
    const endDate = selectedRange.to ?? selectedRange.from;

    const response = await fetch(`/api/bands/${bandId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Failed to create event", await response.text());
      return;
    }

    setTitle("");
    setDescription("");
    setSelectedRange(undefined);
    onCreated?.();
  }

  if (!canCreateEvent) return null;

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
        Save event
      </button>
    </form>
  );
}
