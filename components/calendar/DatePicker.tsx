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
  return (
    <section className="vardo-calendar mx-auto flex w-full max-w-full flex-col items-center overflow-hidden">
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={onSelect}
        className="relative mx-auto w-full rounded-xl"
        classNames={{
          /*
           * The arrows used to be centred with a fixed gap between them --
           * `left-1/2 -translate-x-1/2 gap-16` -- which put them on top of the
           * caption as soon as the month name was long enough to reach them.
           * "September 2026" did it every time.
           *
           * Pinning them to the two ends and giving the caption padding to
           * clear them makes the arrangement independent of how long the
           * month is called.
           */
          month_caption:
            "mb-4 flex h-10 items-center justify-center px-12 text-lg font-bold text-yellow-100",
          nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between px-1",
          button_previous:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",
          button_next:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",
          month_grid:
            "mx-auto border-separate border-spacing-1 sm:border-spacing-2",
          weekday: "h-8 w-9 text-xs text-neutral-400 sm:text-sm",
          day: "relative h-9 w-9 text-center sm:h-10 sm:w-10",
          day_button:
            "relative h-9 w-9 rounded-full text-sm text-yellow-100 hover:bg-neutral-700 sm:h-10 sm:w-10",
          today: "rounded-full border border-yellow-200",
          range_start:
            "!rounded-full !bg-yellow-200 [&>button]:!bg-yellow-200 [&>button]:!text-black",
          range_end:
            "!rounded-full !bg-yellow-200 [&>button]:!bg-yellow-200 [&>button]:!text-black",
          range_middle: "bg-yellow-200/25 text-yellow-50",
        }}
      />
    </section>
  );
}
