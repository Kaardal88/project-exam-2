export const userTags = [
  { value: "drummer", label: "Drummer", icon: "🥁" },
  { value: "singer", label: "Singer", icon: "🎤" },
  { value: "guitarist", label: "Guitarist", icon: "🎸" },
  { value: "producer", label: "Producer", icon: "🎛️" },
  { value: "mixing-engineer", label: "Mixing Engineer", icon: "🎚️" },
  { value: "mastering-engineer", label: "Mastering Engineer", icon: "💿" },
  { value: "manager", label: "Manager", icon: "📋" },
] as const;

export type UserTag = (typeof userTags)[number];

export type UserTagValue = UserTag["value"];

export const userTagValues = userTags.map((tag) => tag.value) as UserTagValue[];

export const userTagMap: Record<string, UserTag | undefined> = Object.fromEntries(
  userTags.map((tag) => [tag.value, tag]),
);
