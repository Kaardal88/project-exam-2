import { DayPicker } from "@daypicker/react";

import "@daypicker/react/style.css";

export type BandEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
};

export function BandCalendar({
  events = [],
  selectedDate,
  onSelect,
}: {
  events?: BandEvent[];
  selectedDate?: Date;
  onSelect?: (date?: Date) => void;
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

  const eventDates = events.flatMap((event) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date ?? event.start_date);

    return getDatesInRange(start, end);
  });

  return (
    <section className="vardo-calendar mx-auto flex w-full max-w-7xl flex-col items-center">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        modifiers={{
          hasEvent: eventDates,
        }}
        modifiersClassNames={{
          hasEvent:
            "relative after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-yellow-300",
        }}
        className="relative mx-auto w-full  rounded-xl  "
        classNames={{
          month_caption:
            "mb-12 flex justify-center  text-xl font-bold text-yellow-100 lg:text-2xl",

          nav: "absolute left-1/2 top-12  flex -translate-x-1/2 gap-24",

          button_previous:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",
          button_next:
            "rounded-full p-2 text-yellow-100 hover:bg-neutral-700 [&_svg]:stroke-yellow-100",

          month_grid: "mx-auto  border-separate border-spacing-3",
          weekday: "h-8 w-10 text-sm text-neutral-400",
          day: "relative h-10 w-10 text-center",
          day_button:
            "relative h-10 w-10 rounded-full text-yellow-100 hover:bg-neutral-700 lg:text-lg",

          selected:
            "rounded-full bg-yellow-200 !text-black [&>button]:!text-black",
          today: "rounded-full border border-yellow-200",
        }}
      />
    </section>
  );
}
