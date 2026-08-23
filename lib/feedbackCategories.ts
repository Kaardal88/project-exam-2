/**
 * What a piece of tester feedback is about.
 *
 * Shared client/server following the lib/bandRoles.ts pattern: the API
 * validates against these values and the form renders from them.
 *
 * Three categories rather than one free-text box, because the three answer
 * different questions and get acted on differently. "Broken" is a queue to
 * work through; "missing" is a roadmap argument; "worked" is the one people
 * never volunteer unless asked, and it is the only thing that tells you which
 * parts not to change.
 */
export const feedbackCategories = [
  {
    value: "bug",
    label: "Something is broken",
    description: "It did not work, or it did the wrong thing.",
    placeholder: "What did you do, and what happened instead?",
  },
  {
    value: "missing",
    label: "Something is missing",
    description: "You went looking for something that is not there yet.",
    placeholder: "What were you trying to do?",
  },
  {
    value: "worked",
    label: "Something worked well",
    description: "A part that felt right, so it does not get changed by accident.",
    placeholder: "What worked, and what made it work?",
  },
] as const;

export type FeedbackCategoryOption = (typeof feedbackCategories)[number];

export type FeedbackCategory = FeedbackCategoryOption["value"];

export const feedbackCategoryValues = feedbackCategories.map(
  (category) => category.value,
) as FeedbackCategory[];

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === "string" &&
    (feedbackCategoryValues as string[]).includes(value)
  );
}

export function feedbackCategoryLabel(value: string): string {
  return (
    feedbackCategories.find((category) => category.value === value)?.label ??
    value
  );
}

/**
 * Where a submission has got to.
 *
 * "seen" exists so triage and answering are different acts: with forty items
 * in an inbox, being able to say "read, no reply needed yet" is the difference
 * between a queue and a wall. A reply can be attached at any status; what the
 * tester sees is the status and the reply, if there is one.
 */
export const feedbackStatuses = ["new", "seen", "resolved"] as const;

export type FeedbackStatus = (typeof feedbackStatuses)[number];

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    typeof value === "string" &&
    (feedbackStatuses as readonly string[]).includes(value)
  );
}
