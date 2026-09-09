import { Check } from "lucide-react";

import type { Option, QuestionType } from "@/api/types";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/utils";

export interface RenderableQuestion {
  type: QuestionType;
  text: string;
  image_url: string | null;
  options: Option[];
}

/**
 * Общий вид вопроса «глазами ученика»: текст с форматированием, картинка,
 * варианты или поле короткого ответа. Используется и при прохождении, и в
 * предпросмотре теста из редактора.
 */
export function QuestionBody({
  question,
  value,
  onChange,
  onCommit,
}: {
  question: RenderableQuestion;
  value: string[];
  onChange: (next: string[]) => void;
  /** «зафиксировать» ответ: клик по варианту, потеря фокуса в коротком ответе */
  onCommit?: (next: string[]) => void;
}) {
  const q = question;
  const commit = onCommit ?? (() => {});

  const choose = (id: string) => {
    const next =
      q.type === "multiple"
        ? value.includes(id)
          ? value.filter((x) => x !== id)
          : [...value, id]
        : [id];
    onChange(next);
    commit(next);
  };

  return (
    <div className="space-y-4">
      <RichText as="p" className="text-lg font-medium leading-snug">
        {q.text}
      </RichText>

      {q.image_url && (
        <img
          src={q.image_url}
          alt="Иллюстрация к вопросу"
          className="max-h-80 w-auto rounded-md border object-contain"
        />
      )}

      {q.type === "multiple" && (
        <p className="text-xs text-muted-foreground">Можно выбрать несколько вариантов</p>
      )}

      {q.type === "short" ? (
        <div className="space-y-1.5">
          <Input
            inputMode="text"
            value={value[0] ?? ""}
            onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
            onBlur={(e) => commit(e.target.value ? [e.target.value] : [])}
            placeholder="Ваш ответ"
            maxLength={200}
            className="h-11 max-w-md text-base"
          />
          <p className="text-xs text-muted-foreground">
            Впишите краткий ответ: число, слово или короткую фразу.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {q.options.map((o) => {
            const active = value.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => choose(o.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center border",
                    q.type === "multiple" ? "rounded" : "rounded-full",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <RichText>{o.text}</RichText>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
