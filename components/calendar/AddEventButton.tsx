import type { ReactNode } from "react";
import { Plus } from "lucide-react";

type AddEventButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

export function AddEventButton({
  onClick,
  disabled = false,
  children,
}: AddEventButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-yellow-200 px-4 py-2 text-black hover:cursor-pointer hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="h-5 w-5" aria-hidden />
      {children}
    </button>
  );
}
