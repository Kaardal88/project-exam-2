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
      className={`relative rounded-[2rem] border border-neutral-700 bg-[radial-gradient(circle_at_center,rgba(255,229,150,0.08),transparent_35%),linear-gradient(145deg,#101010,#050505)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.65)] md:p-10 ${className ?? ""}`}
    >
      {/* corner screws — kept inside the padding band so the glass
          panel below (offset by an extra m-3) never overlaps them */}
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute left-3 top-3 h-7 w-7 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute right-3 top-3 h-7 w-7 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute bottom-3 left-3 h-7 w-7 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      />
      <img
        src="/svg/hardware/panel-screw.png"
        alt=""
        aria-hidden
        className="absolute bottom-3 right-3 h-7 w-7 object-contain opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      />

      {/* glass screen */}
      <div className="relative m-3 h-[24rem] overflow-hidden rounded-2xl border border-neutral-800 bg-black/70 shadow-inner md:h-[34rem]">
        <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_35%,transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]" />
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
