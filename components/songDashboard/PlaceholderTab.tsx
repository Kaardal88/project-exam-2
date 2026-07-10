type PlaceholderTabProps = {
  label: string;
  note: string;
};

export function PlaceholderTab({ label, note }: PlaceholderTabProps) {
  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-12 text-center shadow-2xl">
      <h2 className="text-lg font-bold text-yellow-100">{label}</h2>
      <p className="mt-2 text-sm text-neutral-400">{note}</p>
    </section>
  );
}
