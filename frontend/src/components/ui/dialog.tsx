import { X } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** false: нельзя закрыть по фону, Esc и крестику (только явной кнопкой внутри) */
  dismissible?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  dismissible = true,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 py-6 sm:p-4 sm:py-10"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className={cn(
          "relative w-full max-w-lg rounded-lg border bg-card p-4 shadow-lg sm:p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {dismissible && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground sm:right-5 sm:top-5"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {title && <h2 className="pr-8 text-lg font-semibold tracking-tight">{title}</h2>}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className={cn(title && "mt-4")}>{children}</div>
      </div>
    </div>
  );
}
