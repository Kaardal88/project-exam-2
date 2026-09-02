/**
 * The message to show for a failed request, and never an object.
 *
 * Most routes answer a failure with `{ error: "some sentence" }`, which is why
 * `data.error || fallback` reads as safe. The five routes behind zValidator do
 * not: a validation failure answers with `{ error: <ZodError> }`, and putting
 * that object into state means React throws when it tries to render it. A
 * rejected save then looks like a page that broke rather than a form that said
 * no -- which is worse than the original error in every way.
 *
 * Also logs, because the sentence on screen is deliberately vague and the
 * cause is not. Without this the only record of a failed save is a shrug.
 */
export function errorMessage(
  payload: unknown,
  fallback: string,
  context?: { what: string; status?: number },
): string {
  if (context) {
    console.error(
      `${context.what}${context.status ? ` (${context.status})` : ""}:`,
      payload,
    );
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}
