import { mockBand } from "./data/mockData";

// Compact stand-in for app/pages/bandProfile/page.tsx's "Home" section —
// header strip, overlapping avatar, textured screwed members panel and
// an upcoming-event row, all reusing the real page's class patterns.
export function BandProfileMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-neutral-900">
      <div className="h-16 w-full shrink-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-slate-900 md:h-24" />

      <div className="relative flex-1 px-4 pb-4 pt-8 md:px-6 md:pt-10">
        <div className="absolute -top-8 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-neutral-900 bg-slate-700 md:-top-10 md:left-6 md:h-20 md:w-20">
          <span className="text-xl font-bold text-yellow-100 md:text-2xl">
            {mockBand.band_name.charAt(0)}
          </span>
        </div>

        <h1 className="text-lg font-bold text-yellow-100 md:text-2xl">
          {mockBand.band_name}
        </h1>
        <p className="mt-1 text-xs text-neutral-400 md:text-sm">
          {mockBand.country}
        </p>
        <p className="mt-2 line-clamp-2 text-xs text-neutral-300 md:text-sm">
          {mockBand.bio}
        </p>

        <div
          style={{ backgroundImage: "url('/bg-components.jpg')" }}
          className="relative mt-4 flex flex-wrap items-center gap-3 rounded-md border border-neutral-600/70 bg-cover bg-center p-3"
        >
          <div className="absolute inset-0 rounded-md bg-black/40" />
          <img
            src="/svg/hardware/panel-screw.png"
            alt=""
            aria-hidden
            className="absolute left-1.5 top-1.5 z-10 h-3.5 w-3.5 object-contain opacity-90"
          />
          <img
            src="/svg/hardware/panel-screw.png"
            alt=""
            aria-hidden
            className="absolute right-1.5 top-1.5 z-10 h-3.5 w-3.5 object-contain opacity-90"
          />
          <img
            src="/svg/hardware/panel-screw.png"
            alt=""
            aria-hidden
            className="absolute bottom-1.5 left-1.5 z-10 h-3.5 w-3.5 object-contain opacity-90"
          />
          <img
            src="/svg/hardware/panel-screw.png"
            alt=""
            aria-hidden
            className="absolute bottom-1.5 right-1.5 z-10 h-3.5 w-3.5 object-contain opacity-90"
          />

          <div className="relative z-10 flex gap-3">
            {mockBand.members.map((member) => (
              <div
                key={member.username}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-600 bg-neutral-950 text-xs font-bold text-yellow-100 md:h-11 md:w-11 md:text-sm"
              >
                {member.initial}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 md:text-sm">
          Upcoming
        </p>
        <div className="mt-2 rounded-md border border-neutral-700 bg-neutral-950 p-3">
          <p className="text-sm font-semibold text-yellow-100">
            {mockBand.upcomingEvent.title}
          </p>
          <p className="text-xs text-neutral-400">
            {mockBand.upcomingEvent.date}
          </p>
        </div>
      </div>
    </div>
  );
}
