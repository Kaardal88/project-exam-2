import Link from "next/link";
import { Bebas_Neue } from "next/font/google";

/**
 * "Bands on the stage" as a letterpress gig poster pinned to the dark wall.
 *
 * Deliberately the one light surface on the landing page, so it catches the
 * eye -- but printed, not rocked: wood-type headings, grey ink, a torn-off
 * ticket. Nothing here should read as a genre, because the acts on it can be
 * anything from a jazz trio to a folk singer.
 *
 * Presentational only. The page does the fetching and decides the order; the
 * first act is the headliner and the rest are support, so whoever the server's
 * random draw puts first gets top billing.
 *
 * Colours are the palette's own: the wordmark's #f3e7b6 is the paper and
 * neutral-950 is the ink.
 */

// Scoped to this component on purpose -- a poster face, not a house font.
// Bebas Neue over Oswald or Alfa Slab One: it is the closest thing on Google
// Fonts to condensed wood type, and it has no slab serifs or weight to make it
// read as a western or a metal flyer.
const posterFont = Bebas_Neue({ weight: "400", subsets: ["latin"] });

export type PosterActData = {
  id: string;
  slug?: string | null;
  band_name: string;
  image_url?: string | null;
  genre?: string | null;
  country?: string | null;
};

type StagePosterProps = {
  presenter: string;
  acts: PosterActData[];
  /** Acts not on the poster. Null while unknown, so it never reads "0 more". */
  moreCount: number | null;
  /** False until the draw has come back; the empty line waits for it. */
  loaded: boolean;
};

// Paper grain, drawn by the browser: fractal noise, desaturated, as a
// background. No image file to ship and nothing to request.
const PAPER_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Ink printed a hair off register. #4b432d is the landing page's border
// brown, which on this paper reads as a second, fainter pass of ink.
const MISPRINT = { textShadow: "2px 2px 0 rgba(75, 67, 45, 0.35)" };

const INK_FOCUS =
  "rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950";

// Country is stored as a cca2 code. Intl names it in a line, where the
// world-countries table the profile pages use would add its whole payload to
// the landing page for four labels.
const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code?: string | null) {
  if (!code) return null;

  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function actMeta(act: PosterActData) {
  return [act.genre, countryName(act.country)].filter(Boolean).join(" · ");
}

function PosterAct({
  act,
  headliner = false,
}: {
  act: PosterActData;
  headliner?: boolean;
}) {
  const meta = actMeta(act);
  const imageSize = headliner
    ? "h-40 w-40 sm:h-52 sm:w-52"
    : "h-16 w-16 sm:h-20 sm:w-20";

  return (
    <Link
      href={`/band/${act.slug ?? act.id}`}
      className={`group flex flex-col items-center gap-2 text-center ${INK_FOCUS}`}
    >
      {act.image_url ? (
        // The name beside it is the link's accessible name; alt text would
        // only say it twice.
        <img
          src={act.image_url}
          alt=""
          className={`${imageSize} border-2 border-neutral-950 object-cover contrast-125 grayscale mix-blend-multiply transition group-hover:grayscale-0 motion-reduce:transition-none`}
        />
      ) : (
        // A rubber stamp rather than a filled disc: ink on paper, nothing
        // behind it.
        <span
          aria-hidden="true"
          className={`${imageSize} ${posterFont.className} flex items-center justify-center rounded-full border-4 border-double border-neutral-950 bg-transparent text-neutral-950 ${headliner ? "text-7xl sm:text-8xl" : "text-3xl sm:text-4xl"}`}
        >
          {act.band_name?.charAt(0).toUpperCase()}
        </span>
      )}

      <span
        className={`${posterFont.className} break-words leading-none text-neutral-950 underline-offset-4 group-hover:underline ${headliner ? "text-5xl sm:text-7xl" : "text-2xl sm:text-3xl"}`}
        style={headliner ? MISPRINT : undefined}
      >
        {act.band_name}
      </span>

      {meta && (
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-700">
          {meta}
        </span>
      )}
    </Link>
  );
}

function TicketStub({ moreCount }: { moreCount: number | null }) {
  const more =
    moreCount && moreCount > 0
      ? `${moreCount} more ${moreCount === 1 ? "act" : "acts"}`
      : "Every act";

  return (
    <div className="relative">
      {/* The perforation, with a notch punched out at each end. */}
      <div
        aria-hidden="true"
        className="border-t-2 border-dashed border-neutral-950/60"
      />
      <span
        aria-hidden="true"
        className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-neutral-900"
      />
      <span
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-neutral-900"
      />

      <Link
        href="/bands"
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-5 text-sm font-bold uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-neutral-950 hover:text-[#f3e7b6] focus-visible:bg-neutral-950 focus-visible:text-[#f3e7b6] motion-reduce:transition-none ${INK_FOCUS}`}
      >
        <span>Admit one</span>
        <span aria-hidden="true">·</span>
        <span>Free entry</span>
        <span aria-hidden="true">·</span>
        <span>
          {more} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </div>
  );
}

export function StagePoster({
  presenter,
  acts,
  moreCount,
  loaded,
}: StagePosterProps) {
  const [headliner, ...support] = acts;

  return (
    <div className="relative mx-auto w-full max-w-2xl -rotate-1 transition-transform duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0">
      {/* Two strips of tape holding it to the wall. */}
      <span
        aria-hidden="true"
        className="absolute -top-3 left-6 z-10 h-7 w-24 -rotate-6 bg-[#f5f0d8]/40 shadow-sm backdrop-blur-[1px]"
      />
      <span
        aria-hidden="true"
        className="absolute -top-3 right-6 z-10 h-7 w-24 rotate-6 bg-[#f5f0d8]/40 shadow-sm backdrop-blur-[1px]"
      />

      <div className="relative overflow-hidden bg-[#f3e7b6] text-neutral-950 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply"
          style={{ backgroundImage: PAPER_NOISE }}
        />

        <div className="relative flex flex-col items-center gap-8 px-5 pt-10 pb-8 sm:px-10 sm:pt-12">
          <header className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-700">
              {presenter} presents
            </p>
            <h2
              className={`${posterFont.className} text-6xl leading-[0.85] sm:text-8xl`}
              style={MISPRINT}
            >
              On stage tonight
            </h2>
            <div
              aria-hidden="true"
              className="mt-3 h-1 w-24 border-y border-neutral-950"
            />
          </header>

          {headliner ? (
            <PosterAct act={headliner} headliner />
          ) : (
            // Keeps the sheet its size while the draw is in flight, so the
            // footer does not jump when the acts arrive.
            <p className="flex min-h-72 items-center text-sm font-semibold uppercase tracking-[0.2em] text-neutral-700">
              {loaded ? "Line-up to be announced" : ""}
            </p>
          )}

          {support.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-700">
                With special guests
              </p>
              <ul className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-4">
                {support.map((act, index) => (
                  <li
                    key={act.id}
                    className="flex min-w-0 items-start gap-4 sm:max-w-[33%]"
                  >
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className={`${posterFont.className} hidden pt-6 text-3xl sm:block`}
                      >
                        ·
                      </span>
                    )}
                    <PosterAct act={act} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <TicketStub moreCount={moreCount} />
      </div>
    </div>
  );
}
