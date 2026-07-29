import type { ReactNode } from "react";

type MockGlassFrameProps = {
  children: ReactNode;
  className?: string;
};

// Reusable "VU-meter window" wrapper: dark bezel, inset glass, corner
// screws and a subtle diagonal reflection. Deliberately has no tilt of
// its own — it's meant to sit inside an already-tilted 3D parent (the
// PreviewMixer desk) so the screen and the desk it's recessed into
// share exactly one perspective instead of two independent ones.
export function MockGlassFrame({ children, className }: MockGlassFrameProps) {
  return (
    <div
      className={`relative rounded-xl border border-neutral-700 bg-[radial-gradient(circle_at_center,rgba(255,229,150,0.08),transparent_35%),linear-gradient(145deg,#101010,#050505)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.65)] sm:rounded-[2rem] sm:p-6 md:p-10 ${className ?? ""}`}
    >
      {/* corner screws — kept inside the padding band so the glass
          panel below (offset by an extra margin) never overlaps them.
          Shrink with the frame on mobile so they stay proportional
          instead of dominating a now much thinner border. */}
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute left-2 top-2 h-4 w-4 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:left-3 sm:top-3 sm:h-5 sm:w-5 md:h-7 md:w-7"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute right-2 top-2 h-4 w-4 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:right-3 sm:top-3 sm:h-5 sm:w-5 md:h-7 md:w-7"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute bottom-2 left-2 h-4 w-4 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:bottom-3 sm:left-3 sm:h-5 sm:w-5 md:h-7 md:w-7"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute bottom-2 right-2 h-4 w-4 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:bottom-3 sm:right-3 sm:h-5 sm:w-5 md:h-7 md:w-7"
      />

      {/* glass screen — width-driven aspect ratio below md so the
          window stays landscape at any phone width instead of a fixed
          rem height fighting a squeezed-down width for a portrait look */}
      <div className="relative m-1.5 aspect-[4/3] h-auto overflow-hidden rounded-2xl border border-neutral-800 bg-black/70 shadow-inner sm:m-2 md:m-3 md:aspect-auto md:h-[34rem]">
        <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_35%,transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]" />
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
