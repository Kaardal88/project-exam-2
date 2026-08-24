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

/**
 * Band-chosen colors are stored as #rrggbb and nothing else.
 *
 * They reach the database from a request body and leave it into an inline
 * style attribute, so the shape is checked rather than trusted.
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
