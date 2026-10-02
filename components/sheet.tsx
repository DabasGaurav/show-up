"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Bottom sheet: saving and freeing a spot happen here, never on a new page (brief A4.5). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-card outline-none sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl leading-8">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
