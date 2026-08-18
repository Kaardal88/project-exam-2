/**
 * Who can see a band profile.
 *
 * Shared client/server following the lib/userTags.ts pattern: the API
 * validates against these values and the edit modal renders from them, so
 * both sides have to agree on one list.
 */
export const bandVisibilityOptions = [
  {
    value: "public",
    label: "Public",
    description: "Listed on the bands page and visible to anyone.",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description:
      "Hidden from the bands page, but anyone with the link can view it.",
  },
  {
    value: "private",
    label: "Private",
    description: "Only members can find or view this band.",
  },
] as const;

export type BandVisibilityOption = (typeof bandVisibilityOptions)[number];

export type BandVisibility = BandVisibilityOption["value"];

export const bandVisibilityValues = bandVisibilityOptions.map(
  (option) => option.value,
) as BandVisibility[];

export const DEFAULT_BAND_VISIBILITY: BandVisibility = "public";

export function isBandVisibility(value: unknown): value is BandVisibility {
  return (
    typeof value === "string" &&
    (bandVisibilityValues as string[]).includes(value)
  );
}
