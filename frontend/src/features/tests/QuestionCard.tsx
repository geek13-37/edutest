import { Plus, Trash2, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import type { QuestionDraft, QuestionType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormatToolbar } from "@/components/ui/format-toolbar";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/rich-text";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { coerceType, nextOptionId, TYPE_LABELS } from "./question-utils";

interface Props {
  index: number;
  question: QuestionDraft;
  onChange: (q: QuestionDraft) => void;
  onRemove: () => void;
  /** ручка для перетаскивания, приходит из сортируемой обёртки */
  dragHandle?: ReactNode;
}

export function QuestionCard({ index, question, onChange, onRemove, dragHandle }: Props) {
  const q = question;
  const textRef = useRef<HTMLTextAreaElement>(null);

  const toggleCorrect = (id: string) => {
    if (q.type === "multiple") {
      onChange({
        ...q,
        correct: q.correct.includes(id) ? q.correct.filter((c) => c !== id) : [...q.correct, id],
      });
    } else {
      onChange({ ...q, correct: [id] });
    }
  };

  const setOptionText = (id: string, text: string) =>
    onChange({ ...q, options: q.options.map((o) => (o.id === id ? { ...o, text } : o)) });

  const addOption = () => {
    const id = nextOptionId(q.options.map((o) => o.id));
    onChange({ ...q, options: [...q.options, { id, text: "" }] });
  };

  const removeOption = (id: string) =>
    onChange({
      ...q,
      options: q.options.filter((o) => o.id !== id),
      correct: q.correct.filter((c) => c !== id),
    });

  const setAnswer = (idx: number, value: string) =>
    onChange({ ...q, correct: q.correct.map((a, i) => (i === idx ? value : a)) });
  const addAnswer = () => onChange({ ...q, correct: [...q.correct, ""] });
  const removeAnswer = (idx: number) =>
    onChange({ ...q, correct: q.correct.filter((_, i) => i !== idx) });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {dragHandle}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
            {index + 1}
          </span>
          <Select
            className="h-9 w-40 min-w-0 flex-1 sm:w-56 sm:flex-none"
            value={q.type}
            onChange={(e) => onChange(coerceType(q, e.target.value as QuestionType))}
          >
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={100}
              value={q.points}
              onChange={(e) => onChange({ ...q, points: Math.max(1, Number(e.target.value)) })}
              className="h-9 w-16"
              title="Баллов за вопрос"
            />
            <Button variant="ghost" size="icon" onClick={onRemove} title="Удалить вопрос">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Текст вопроса</span>
            <FormatToolbar
              targetRef={textRef}
              value={q.text}
              onChange={(text) => onChange({ ...q, text })}
            />
          </div>
          <Textarea
            ref={textRef}
            placeholder="Текст вопроса"
            value={q.text}
            onChange={(e) => onChange({ ...q, text: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Форматирование видит ученик. Выделите текст и нажмите кнопку, либо впишите вручную:
            `код`, *курсив* для формул, **жирный**, теги {"<sup>"} и {"<sub>"}.
          </p>
          {q.text.trim() && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">Просмотр: </span>
              <RichText>{q.text}</RichText>
            </div>
          )}
        </div>

        {q.type === "short" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Ответ ученика засчитывается при совпадении с одним из вариантов. Регистр и лишние
              пробелы не важны, запятая и точка в дробях равнозначны.
            </p>
            {q.correct.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={a}
                  onChange={(e) => setAnswer(idx, e.target.value)}
                  placeholder={idx === 0 ? "Правильный ответ" : "Ещё принимаемый вариант"}
                />
                {q.correct.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeAnswer(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {q.correct.length < 5 && (
              <Button variant="ghost" size="sm" onClick={addAnswer}>
                <Plus className="h-4 w-4" />
                <span>Вариант ответа</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {q.options.map((o) => {
              const checked = q.correct.includes(o.id);
              return (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type={q.type === "multiple" ? "checkbox" : "radio"}
                    checked={checked}
                    onChange={() => toggleCorrect(o.id)}
                    title="Правильный ответ"
                    className="h-4 w-4"
                  />
                  <Input
                    value={o.text}
                    onChange={(e) => setOptionText(o.id, e.target.value)}
                    placeholder={`Вариант ${o.id.toUpperCase()}`}
                    disabled={q.type === "boolean"}
                  />
                  {q.type !== "boolean" && q.options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(o.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {q.type !== "boolean" && q.options.length < 10 && (
              <Button variant="ghost" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4" />
                <span>Вариант</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
