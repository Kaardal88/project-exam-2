"use client";

import { DayPicker } from "@daypicker/react";
import { DateRange } from "@daypicker/react";
import "@daypicker/react/style.css";
import "../../app/globals.css";

export type DateRangePickerProps = {
  selected?: DateRange;
  onSelect: (range?: DateRange) => void;
};

export function DateRangePicker({ selected, onSelect }: DateRangePickerProps) {
  return <DayPicker mode="range" selected={selected} onSelect={onSelect} />;
}
