export function Modal({
  isOpen,
  onClose,
  children,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? "block" : "hidden"
      }`}
    >
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative z-50 rounded-md border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}
