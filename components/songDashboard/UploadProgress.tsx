import { Check, Loader2 } from "lucide-react";

type UploadProgressProps = {
  progress: number | null;
  success: boolean;
  compact?: boolean;
};

export function UploadProgress({
  progress,
  success,
  compact = false,
}: UploadProgressProps) {
  if (success) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-300">
        <Check className={compact ? "h-3.5 w-3.5" : "h-3 w-3"} />
        {!compact && "Uploaded"}
      </span>
    );
  }

  if (progress === null) return null;

  if (compact) {
    return (
      <Loader2
        className="h-3.5 w-3.5 animate-spin text-yellow-100"
        aria-label={`Uploading, ${progress}%`}
      />
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-neutral-800">
        <span
          className="block h-full rounded-full bg-yellow-100 transition-all"
          style={{ width: `${progress}%` }}
        />
      </span>
      <span className="text-xs text-neutral-400">{progress}%</span>
    </span>
  );
}
