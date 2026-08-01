import { DayPicker } from "@daypicker/react";

import "@daypicker/react/style.css";

export type EventSource = "band" | "private";

export type BandEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  source?: EventSource;
};

export function BandCalendar({
  events = [],
  selectedDate,
  onSelect,
  showLegend = false,
}: {
  events?: BandEvent[];
  selectedDate?: Date;
  onSelect?: (date?: Date) => void;
  showLegend?: boolean;
}) {
  function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function getDatesInRange(startDate: Date, endDate: Date) {
    const dates: Date[] = [];
    const current = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function datesForSource(source: EventSource) {
    return events
      .filter((event) => (event.source ?? "band") === source)
      .flatMap((event) => {
        const start = new Date(event.start_date);
        const end = new Date(event.end_date ?? event.start_date);
        return getDatesInRange(start, end);
      });
  }

  const bandDates = datesForSource("band");
  const privateDates = datesForSource("private");

  const bandKeys = new Set(bandDates.map((date) => date.toDateString()));
  const privateKeys = new Set(privateDates.map((date) => date.toDateString()));

  const bothDates = bandDates.filter((date) =>
    privateKeys.has(date.toDateString()),
  );
  const bandOnlyDates = bandDates.filter(
    (date) => !privateKeys.has(date.toDateString()),
  );
  const privateOnlyDates = privateDates.filter(
    (date) => !bandKeys.has(date.toDateString()),
  );

  return (
    <section className="vardo-calendar mx-auto flex w-full max-w-full flex-col items-center overflow-hidden sm:max-w-7xl">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        modifiers={{
          hasBandEvent: bandOnlyDates,
          hasPrivateEvent: privateOnlyDates,
          hasBothEvents: bothDates,
        }}
        modifiersClassNames={{
          hasBandEvent:
            "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rounded-full after:bg-yellow-300 after:shadow-[0_0_4px_rgba(253,224,71,0.8)]",
          hasPrivateEvent:
            "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rounded-full after:bg-blue-400 after:shadow-[0_0_4px_rgba(96,165,250,0.8)]",
          hasBothEvents:
            "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-2 after:w-2 after:-translate-x-[6px] after:rounded-full after:bg-yellow-300 after:shadow-[0_0_4px_rgba(253,224,71,0.8)] before:absolute before:bottom-1.5 before:left-1/2 before:h-2 before:w-2 before:translate-x-[2px] before:rounded-full before:bg-blue-400 before:shadow-[0_0_4px_rgba(96,165,250,0.8)]",
        }}
        className="relative mx-auto w-full  rounded-xl  "
        classNames={{
          month_caption:
            "mb-12 flex justify-center  text-xl font-bold text-yellow-100 lg:text-2xl",

          nav: "absolute left-1/2 top-12 flex -translate-x-1/2 gap-16 sm:gap-24",

          button_previous:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",
          button_next:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",

          month_grid:
            "mx-auto border-separate border-spacing-1 sm:border-spacing-3 lg:border-spacing-4",

          weekday:
            "h-7 w-8 text-xs text-neutral-400 sm:h-8 sm:w-10 sm:text-sm lg:h-10 lg:w-14 lg:text-base",

          day: "relative h-8 w-8 text-center sm:h-10 sm:w-10 lg:h-14 lg:w-14",

          day_button:
            "relative h-8 w-8 rounded-full text-sm text-yellow-100 hover:bg-neutral-700 sm:h-10 sm:w-10 sm:text-base lg:h-14 lg:w-14 lg:text-lg",

          selected:
            "rounded-full bg-yellow-200 !text-black [&>button]:!text-black",
          today: "rounded-full border border-yellow-200",
        }}
      />

      {showLegend && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.8)]" />
            Band events
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.8)]" />
            Private events
          </span>
        </div>
      )}
    </section>
  );
}
