export function formatEventDate(startDate: string, endDate?: string | null) {
  const start = new Date(startDate).toLocaleDateString("no-NO");

  if (!endDate) return start;

  const end = new Date(endDate).toLocaleDateString("no-NO");

  return end === start ? start : `${start} – ${end}`;
}
