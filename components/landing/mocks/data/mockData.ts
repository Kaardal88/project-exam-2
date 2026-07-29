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
