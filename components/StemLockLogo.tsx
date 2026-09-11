import { appName } from "./Stemlock";

const SIZES = {
  nav: {
    paper: "px-8 sm:px-10 py-3",
    text: "text-3xl md:text-4xl",
  },
  sidebar: {
    paper: "px-4 py-1.5",
    text: "text-xl",
  },
  // The folded sidebar is one icon wide, and the name does not fit in that.
  mark: {
    paper: "px-2.5 py-1",
    text: "text-xl",
  },
} as const;

/**
 * The wordmark on its torn strip of paper.
 *
 * Lifted out of the navbar when the song dashboard -- which has no navbar --
 * needed it at the top of its sidebar. One definition keeps the tear, the tilt
 * and the colour from drifting between the two; the name itself still comes
 * from Stemlock.tsx. Not a link: each caller decides where it goes.
 */
export function StemLockLogo({
  size = "nav",
}: {
  size?: keyof typeof SIZES;
}) {
  const { paper, text } = SIZES[size];

  return (
    <div
      className={`flex w-max justify-center bg-[#f3e7b6] text-neutral-950 ${paper} font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]`}
    >
      <span
        className={`${text} font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]`}
      >
        {size === "mark" ? (
          <>
            <span aria-hidden>{appName.charAt(0)}</span>
            <span className="sr-only">{appName}</span>
          </>
        ) : (
          appName
        )}
      </span>
    </div>
  );
}
