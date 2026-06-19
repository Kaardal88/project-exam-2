export default function AmpLoader() {
  const numbers = Array.from({ length: 11 }, (_, i) => i + 1);

  return (
    <div className="relative flex items-center justify-center h-48 w-48">
      {/* Numbers + ticks */}
      <div className="absolute inset-0">
        {numbers.map((num, i) => {
          const angle = (i / 11) * 300 - 150; // semicircle-ish spread

          return (
            <div
              key={num}
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `rotate(${angle}deg) translateY(-88px)`,
                transformOrigin: "center",
              }}
            >
              {/* Tick mark */}
              <div className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 rounded-full bg-yellow-200/70" />

              {/* Number */}
              <span
                className="absolute left-1/2 top-2 -translate-x-1/2 text-sm font-bold text-yellow-100"
                style={{
                  transform: `rotate(${-angle}deg)`,
                }}
              >
                {num}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rotating knob */}
      <div className="animate-spin [animation-duration:2.5s]">
        <div
          className="relative h-28 w-28 rounded-full border border-yellow-900/80
          bg-[radial-gradient(circle_at_35%_35%,#f9dc8a,#8a5f24_45%,#1a1208_75%)]
          shadow-[0_12px_30px_rgba(0,0,0,0.7),inset_0_0_18px_rgba(255,255,255,0.25)]"
        >
          {/* indicator */}
          <span className="absolute left-1/2 top-4 h-8 w-1 -translate-x-1/2 rounded-full bg-yellow-100/80" />

          {/* center screw */}
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-900 bg-yellow-950/80" />
        </div>
      </div>

      {/* fun loading text */}
      <p className="absolute -bottom-8 text-sm tracking-widest text-yellow-100/70">
        CRANKING TO 11...?
      </p>
    </div>
  );
}
