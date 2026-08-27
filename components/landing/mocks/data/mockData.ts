import { RAW_PEAK_COUNT } from "@/lib/waveform";

// Fake, clearly-fictional data for the landing page mock screens.
// Shapes mirror the real user/band/song types so the mocks read as
// plausible product data instead of lorem ipsum.

export const mockUser = {
  username: "kaldr",
  displayName: "Kim André",
  tags: [
    { value: "singer", label: "Singer", icon: "🎤" },
    { value: "producer", label: "Producer", icon: "🎛️" },
  ],
  bands: [
    { name: "Kaldvard", role: "Lead vocals", initial: "N" },
    { name: "Kaldt Lys", role: "Songwriter", initial: "K" },
  ],
};

export const mockBand = {
  band_name: "Kaldvard",
  country: "Norway",
  bio: "Melodic black metal band from the fjords of Norway.",
  members: [
    { username: "kaldr", initial: "K" },
    { username: "sigridv", initial: "S" },
    { username: "eiriks", initial: "E" },
    { username: "majalind", initial: "M" },
    { username: "torbjornh", initial: "T" },
  ],
  upcomingEvent: {
    title: "Release show — Landmark",
    date: "12 Sep",
  },
};

export const mockSong: {
  title: string;
  status: "wip" | "finished";
  bpm: number;
  key: string;
  time_signature: string;
} = {
  title: "Skumring",
  status: "wip",
  bpm: 118,
  key: "A minor",
  time_signature: "4/4",
};

export const mockTasks = [
  {
    id: "t1",
    title: "Finish second verse lyrics",
    is_done: false,
    assignee: "sigridv",
  },
  {
    id: "t2",
    title: "Re-record guitar bridge",
    is_done: false,
    assignee: "eiriks",
  },
  { id: "t3", title: "Rough mix v1", is_done: true, assignee: "majalind" },
];

export const mockNotes = [
  {
    id: "n1",
    title: "Chorus idea",
    body: "Try stacking the harmony an octave up on the last chorus, more lift going into the outro.",
    publisher: "sigridv",
  },
];

// ---------------------------------------------------------------- studio

/**
 * Waveforms for the studio mock.
 *
 * The real lanes get their peaks from decoding audio, and there is none here,
 * so these come from a formula instead. Deterministic on purpose — a mock that
 * reshuffled on every render would flicker under the hero's crossfade — and
 * shaped per part, so eight lanes read as eight instruments rather than one
 * waveform copied down the screen.
 */
const pulse = (position: number, rate: number, sharpness: number) =>
  Math.abs(Math.sin(position * Math.PI * rate)) ** sharpness;

/**
 * One repeating strum: an immediate attack, then an exponential decay that
 * reaches the floor before the next one starts.
 *
 * The decay has to actually get there. A lane resamples its peaks by taking
 * the max of each bucket, so a swell that only sags between hits is drawn as
 * one solid block — the gaps are the whole reason the lane reads as playing
 * rather than as a filled bar.
 */
const strum = (position: number, rate: number) => {
  const phase = (position * rate) % 1;

  return phase < 0.1 ? phase / 0.1 : Math.exp(-(phase - 0.1) * 4.5);
};

function peaksFrom(shape: (position: number) => number): number[] {
  return Array.from({ length: RAW_PEAK_COUNT }, (_, index) => {
    const position = index / (RAW_PEAK_COUNT - 1);

    // The same 20-100 band peaksFromBuffer normalises real audio into, so a
    // near-silent passage still draws as a line instead of disappearing.
    return Math.min(100, Math.max(20, 20 + shape(position) * 80));
  });
}

/** Silent through the verse, hits through the chorus, solid through the outro. */
const kickPeaks = (rate: number) =>
  peaksFrom((p) =>
    p < 0.62
      ? 0.02
      : p < 0.84
        ? 0.95 * pulse(p, rate, 12)
        : 0.55 + 0.4 * pulse(p, rate * 2, 2),
  );

const rhythmPeaks = (offset: number) =>
  peaksFrom((p) => (p < 0.56 ? 0.06 + 0.9 * strum(p + offset, 16) : 0.02));

const leadPeaks = (from: number, to: number, rate: number) =>
  peaksFrom((p) => (p > from && p < to ? 0.06 + 0.85 * strum(p, rate) : 0.02));

/**
 * Held rather than struck: a rounded swell that never returns to the floor
 * inside a phrase. A voice and a bent solo note sustain, so the shape that
 * reads as a guitar being picked reads as wrong for both of them.
 */
const sustained = (
  windows: [number, number][],
  rate: number,
  roundness: number,
) =>
  peaksFrom((p) =>
    windows.some(([from, to]) => p > from && p < to)
      ? 0.12 + 0.78 * pulse(p, rate, roundness)
      : 0.02,
  );

export const mockStudioSong = {
  title: "Stem Test",
  album: "Dømt Til Bål Og Brann",
  status: "Work in progress",
  createdBy: "Kim-Andre",
  createdAt: "24.8.2026",
  updatedAt: "27.8.2026",
  contributors: "Kim-Andre, Fisherman",
  guests: "GuitarMan (Guest musician)",
};

export const mockStudioVersion = {
  number: 9,
  label: "Added Bass Ref",
  note: "Added bass on second ref",
  by: "Kim-Andre",
  when: "27. aug. 2026",
  duration: "3:54",
};

/**
 * The lanes. `color` is only set where the band actually picked one — the
 * rest fall through to their kind's default the way stemColor() resolves
 * them in the studio, so the mock cannot drift from the real palette.
 */
export const mockStems: {
  id: string;
  name: string;
  kind: string;
  color?: string;
  take: string;
  peaks: number[];
}[] = [
  {
    id: "s1",
    name: "Drums",
    kind: "drums",
    color: "#22c55e",
    take: "Kick drum",
    peaks: kickPeaks(42),
  },
  {
    id: "s2",
    name: "Clean guitar",
    kind: "clean_gtr",
    take: "Clean Rythm L",
    peaks: rhythmPeaks(0),
  },
  {
    id: "s3",
    name: "Clean guitar",
    kind: "clean_gtr",
    take: "Clean Rythm R",
    peaks: rhythmPeaks(0.018),
  },
  {
    id: "s4",
    name: "Clean guitar",
    kind: "clean_gtr",
    take: "Clean Lead R",
    peaks: leadPeaks(0.3, 0.63, 20),
  },
  {
    id: "s5",
    name: "Clean guitar",
    kind: "clean_gtr",
    color: "#f43f5e",
    take: "Clean 22",
    peaks: leadPeaks(0.33, 0.6, 17),
  },
  {
    id: "s6",
    name: "Clean guitar 2 L",
    kind: "clean_gtr",
    take: "Clean",
    peaks: leadPeaks(0.31, 0.61, 23),
  },
  { id: "s7", name: "Drums", kind: "drums", take: "Kick", peaks: kickPeaks(36) },
  {
    id: "s8",
    name: "Bass",
    kind: "bass",
    take: "Added bass",
    peaks: peaksFrom((p) =>
      p < 0.62 ? 0.06 : 0.45 + 0.45 * pulse(p, 70, 3),
    ),
  },
  {
    id: "s9",
    name: "Lead guitar",
    kind: "lead_gtr",
    take: "Solo take 3",
    peaks: sustained([[0.63, 0.87]], 9, 0.5),
  },
  {
    id: "s10",
    name: "Vocals",
    kind: "vocals",
    take: "Lead vox v2",
    peaks: sustained(
      [
        [0.18, 0.54],
        [0.66, 0.9],
      ],
      14,
      0.7,
    ),
  },
];
