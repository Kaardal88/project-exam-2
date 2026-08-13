import Link from "next/link";
import { ExternalLink } from "lucide-react";

export type EventOrigin =
  | { type: "band"; bandName: string; bandHref: string }
  | { type: "private" };

export function EventOriginLabel({ origin }: { origin: EventOrigin }) {
  if (origin.type === "private") {
    return (
      <p className="text-md font-semibold text-blue-300">Private event</p>
    );
  }

  return (
    <Link
      href={origin.bandHref}
      className="flex w-fit items-center gap-2 text-md font-semibold text-yellow-100 hover:underline"
    >
      <span className="break-words">{origin.bandName}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
    </Link>
  );
}
