import { Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { TestStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";

/** Кнопка "Теги" с попапом: предмет и статус теста, чтобы не разводить их
 * бейджами прямо у заголовка (там они переносятся на отдельную строку). */
export function TagsButton({ subject, status }: { subject: string | null; status: TestStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Tag className="h-3.5 w-3.5" />
        <span>Теги</span>
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-50 mt-1 flex w-max flex-col items-start gap-1.5 rounded-md border bg-card p-2 shadow-lg"
        >
          {subject && <Badge variant="info">{subject}</Badge>}
          <Badge variant={status === "published" ? "success" : "muted"}>
            {status === "published" ? "опубликован" : "черновик"}
          </Badge>
        </div>
      )}
    </div>
  );
}
