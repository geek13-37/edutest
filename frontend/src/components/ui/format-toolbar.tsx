import { Bold, Code, Italic, Plus, Subscript, Superscript, X } from "lucide-react";
import { useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

type Action = {
  title: string;
  before: string;
  after: string;
  sample: string;
  icon: typeof Bold;
};

const ACTIONS: Action[] = [
  { title: "Жирный", before: "**", after: "**", sample: "текст", icon: Bold },
  { title: "Курсив (формулы)", before: "*", after: "*", sample: "v", icon: Italic },
  { title: "Код", before: "`", after: "`", sample: "код", icon: Code },
  { title: "Степень", before: "<sup>", after: "</sup>", sample: "2", icon: Superscript },
  { title: "Индекс", before: "<sub>", after: "</sub>", sample: "n", icon: Subscript },
];

/**
 * Мини-панель форматирования для текстового поля: оборачивает выделенный
 * фрагмент markdown-разметкой, которую понимает <RichText>. Без выделения
 * вставляет пример и выделяет его.
 */
export function FormatToolbar({
  targetRef,
  value,
  onChange,
  className,
}: {
  targetRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const apply = ({ before, after, sample }: Action) => {
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const sel = value.slice(start, end) || sample;
    onChange(value.slice(0, start) + before + sel + after + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const btn =
    "flex h-7 items-center justify-center rounded-md border border-input px-1.5 text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(btn, "gap-1 px-2 text-xs", open && "text-foreground")}
        title="Форматирование текста"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        Формат
      </button>
      {open &&
        ACTIONS.map((a) => (
          <button
            key={a.title}
            type="button"
            title={a.title}
            onClick={() => apply(a)}
            className={cn(btn, "w-7")}
          >
            <a.icon className="h-3.5 w-3.5" />
          </button>
        ))}
    </div>
  );
}
