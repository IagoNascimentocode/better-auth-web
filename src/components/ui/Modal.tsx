import React from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, className = "", children }: ModalProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // foco inicial
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
