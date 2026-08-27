/**
 * What a stem is — the instrument or role a slot in a song holds.
 *
 * Shared client/server following the lib/bandRoles.ts pattern: the API
 * validates against these values and the studio lanes render from them.
 *
 * Deliberately its own vocabulary rather than a reuse of an existing one.
 * lib/bandRoles.ts is only band_leader and member, and lib/collaboratorRoles.ts
 * is what someone is *doing on a project* — a producer is not an instrument,
 * and a drummer can hand in a keys stem. Neither answers "what is this audio".
 *
 * The default colors are studio convention rather than decoration: drums cyan,
 * vocals pink, lead guitar red. A band that never opens the color picker still
 * gets lanes it can tell apart at a glance, which is the whole point of
 * coloring them.
 */
export const stemKinds = [
  { value: "drums", label: "Drums", defaultColor: "#22d3ee" },
  { value: "bass", label: "Bass", defaultColor: "#facc15" },
  { value: "rhythm_gtr", label: "Rhythm guitar", defaultColor: "#15803d" },
  { value: "lead_gtr", label: "Lead guitar", defaultColor: "#ef4444" },
  { value: "clean_gtr", label: "Clean guitar", defaultColor: "#f97316" },
  { value: "vocals", label: "Vocals", defaultColor: "#f472b6" },
  { value: "keys", label: "Keys", defaultColor: "#a78bfa" },
  { value: "synth", label: "Synth", defaultColor: "#60a5fa" },
  { value: "percussion", label: "Percussion", defaultColor: "#2dd4bf" },
  { value: "fx", label: "FX", defaultColor: "#94a3b8" },
  /**
   * The whole song as one file. This is what makes "I just have a finished
   * mp3" work without a second mode anywhere in the product: that song is a
   * song with one stem, and everything else — versions, history, comments —
   * behaves identically.
   */
  { value: "mix", label: "Full mix", defaultColor: "#fef9c3" },
  { value: "other", label: "Other", defaultColor: "#a3a3a3" },
] as const;

export type StemKindOption = (typeof stemKinds)[number];

export type StemKind = StemKindOption["value"];

export const stemKindValues = stemKinds.map(
  (kind) => kind.value,
) as StemKind[];

/** The slot a song gets when someone uploads one finished file. */
export const MIX_KIND: StemKind = "mix";

/** What that slot is called before anyone renames it. */
export const MIX_STEM_NAME = "Full mix";

/**
 * How many stems one version may hold.
 *
 * This is a memory limit, not a storage one. Playback decodes every stem to an
 * AudioBuffer, and decoded PCM is duration x sample rate x channels x 4 bytes
 * — the mp3 compression is gone the moment decodeAudioData returns. A
 * four-minute stereo stem occupies roughly 40MB in the browser whether the
 * file was 3MB or 9MB, so twelve of them is roughly half a gigabyte.
 *
 * Which means: do not raise this because the uploaded files turned out small.
 * Raise it when the decoding strategy changes.
 */
export const MAX_STEMS_PER_VERSION = 12;

export function isStemKind(value: unknown): value is StemKind {
  return (
    typeof value === "string" && (stemKindValues as string[]).includes(value)
  );
}

export function stemKindLabel(value: string): string {
  return stemKinds.find((kind) => kind.value === value)?.label ?? value;
}

/**
 * The color a lane is drawn in.
 *
 * A stem's own color wins; otherwise the kind's default. Null in the database
 * means "nobody has chosen", not "no color", so a lane is never colorless and
 * the picker never has to be opened for the app to be usable.
 */
export function stemColor(stem: {
  kind: string;
  color?: string | null;
}): string {
  if (stem.color) return stem.color;

  return (
    stemKinds.find((kind) => kind.value === stem.kind)?.defaultColor ??
    "#a3a3a3"
  );
}

/** Colors offered as presets before anyone reaches for the custom picker. */
export const stemColorPresets = stemKinds.map((kind) => ({
  label: kind.label,
  color: kind.defaultColor,
}));

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;

  if (max === min) return [0, 0, light * 100];

  const span = max - min;
  const saturation = span / (light > 0.5 ? 2 - max - min : max + min);

  let hue: number;
  if (max === r) hue = (g - b) / span + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / span + 2;
  else hue = (r - g) / span + 4;

  return [hue * 60, saturation * 100, light * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const light = l / 100;

  const chroma = (1 - Math.abs(2 * light - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const base = light - chroma / 2;

  const [r, g, b] =
    h < 60
      ? [chroma, second, 0]
      : h < 120
        ? [second, chroma, 0]
        : h < 180
          ? [0, chroma, second]
          : h < 240
            ? [0, second, chroma]
            : h < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];

  const channel = (value: number) =>
    Math.round((value + base) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * A distinguishable shade for the second, third, fourth stem of one kind.
 *
 * A song with four clean guitars had four lanes in exactly the same orange,
 * which defeats the point of colouring them at all. The turn in hue is small
 * on purpose -- a second clean guitar should still read as a clean guitar, not
 * as something green -- so most of the separating work is done by lightness.
 *
 * Only a starting point. It is written into the row like any other colour, so
 * the band can change it, and the picker offers the default back.
 */
export function variantColor(base: string, index: number): string {
  if (index <= 0) return base;

  const [hue, saturation, light] = hexToHsl(base);

  const step = Math.ceil(index / 2);
  const direction = index % 2 === 1 ? 1 : -1;

  return hslToHex(
    (hue + direction * step * 14 + 360) % 360,
    saturation,
    Math.min(76, Math.max(30, light + direction * step * 9)),
  );
}

/**
 * Band-chosen colors are stored as #rrggbb and nothing else.
 *
 * They reach the database from a request body and leave it into an inline
 * style attribute, so the shape is checked rather than trusted.
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
