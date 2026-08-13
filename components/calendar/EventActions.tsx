type EventActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
};

const actionButton =
  "min-h-11 flex-1 rounded border bg-neutral-900 px-4 py-2 text-sm font-semibold transition hover:cursor-pointer hover:bg-neutral-800 sm:flex-none";

export function EventActions({
  onEdit,
  onDelete,
  className = "",
}: EventActionsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        type="button"
        onClick={onEdit}
        className={`${actionButton} border-neutral-700 text-yellow-100 hover:border-yellow-100`}
      >
        Edit
      </button>

      <button
        type="button"
        onClick={onDelete}
        className={`${actionButton} border-neutral-700 text-red-300 hover:border-red-300`}
      >
        Delete
      </button>
    </div>
  );
}
