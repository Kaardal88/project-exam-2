import { Check } from "lucide-react";

type SuccessMessageProps = {
  message: string;
  tone?: "light" | "dark";
  className?: string;
};

export function SuccessMessage({
  message,
  tone = "light",
  className = "",
}: SuccessMessageProps) {
  const toneClass = tone === "dark" ? "text-green-700" : "text-green-300";

  return (
    <span
      className={`flex items-center justify-center gap-2 ${toneClass} ${className}`}
    >
      <Check className="h-4 w-4" />
      {message}
    </span>
  );
}
