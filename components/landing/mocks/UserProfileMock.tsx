import { mockUser } from "./data/mockData";

// Compact stand-in for app/user/page.tsx — same header
// strip / overlapping avatar / tag chip / band chip patterns, fake data.
export function UserProfileMock() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-neutral-900">
      <div className="h-16 w-full shrink-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-slate-900 md:h-24" />

      <div className="relative flex-1 px-4 pb-4 pt-8 md:px-6 md:pt-10">
        <div className="absolute -top-8 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-neutral-900 bg-slate-700 md:-top-10 md:left-6 md:h-20 md:w-20">
          <span className="text-xl font-bold text-yellow-100 md:text-2xl">
            {mockUser.displayName.charAt(0)}
          </span>
        </div>

        <h1 className="text-lg font-bold text-yellow-100 md:text-2xl">
          {mockUser.displayName}
        </h1>
        <p className="text-xs text-neutral-400 md:text-sm">
          @{mockUser.username}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {mockUser.tags.map((tag) => (
            <span
              key={tag.value}
              className="flex items-center gap-1.5 rounded-full border border-yellow-200/20 bg-black/40 px-3 py-1 text-xs text-yellow-100 md:text-sm"
            >
              <span>{tag.icon}</span>
              <span>{tag.label}</span>
            </span>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 md:text-sm">
          Artist pages
        </p>
        <div className="mt-2 flex gap-4">
          {mockUser.bands.map((band) => (
            <div
              key={band.name}
              className="flex w-16 flex-col items-center gap-1 text-center md:w-20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-yellow-100 md:h-14 md:w-14 md:text-base">
                {band.initial}
              </div>
              <span className="truncate text-[10px] text-yellow-100 md:text-xs">
                {band.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
