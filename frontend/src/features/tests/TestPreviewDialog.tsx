import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { QuestionDraft } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { QuestionBody } from "@/features/take/QuestionBody";

function normShort(s: string) {
  return s.trim().toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ");
}

function isCorrect(q: QuestionDraft, selected: string[]): boolean {
  if (q.type === "short") {
    if (!selected[0]?.trim()) return false;
    return q.correct.some((c) => normShort(c) === normShort(selected[0]));
  }
  const got = new Set(selected);
  const want = new Set(q.correct);
  return got.size > 0 && got.size === want.size && [...got].every((x) => want.has(x));
}

/** Предпросмотр теста «глазами ученика». Ответы нигде не сохраняются. */
export function TestPreviewDialog({
  open,
  onClose,
  questions,
  title,
}: {
  open: boolean;
  onClose: () => void;
  questions: QuestionDraft[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setIdx(0);
      setAnswers({});
      setDone(false);
    }
  }, [open]);

  const result = useMemo(() => {
    let score = 0;
    let max = 0;
    questions.forEach((q, i) => {
      max += q.points;
      if (isCorrect(q, answers[i] ?? [])) score += q.points;
    });
    return { score, max, percent: max ? Math.round((score / max) * 100) : 0 };
  }, [questions, answers]);

  const empty = questions.length === 0;
  const q = questions[idx];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-2xl"
      title="Предпросмотр теста"
      description={empty ? undefined : `${title}. Так его видит ученик, ответы не сохраняются.`}
    >
      {empty ? (
        <p className="text-sm text-muted-foreground">
          Добавьте хотя бы один вопрос, чтобы посмотреть тест.
        </p>
      ) : done ? (
        <div className="space-y-3 py-6 text-center">
          <div className="text-4xl font-bold tracking-tight text-primary">{result.percent}%</div>
          <p className="text-sm text-muted-foreground">
            {result.score} из {result.max} баллов. Ученик видит только процент, без разбора.
          </p>
          <Button variant="outline" onClick={() => setDone(false)}>
            Пройти заново
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Вопрос {idx + 1} из {questions.length}
            </span>
            <Badge variant="muted">
              {q.points} {q.points === 1 ? "балл" : "балла"}
            </Badge>
          </div>
          <Card>
            <CardContent className="py-5">
              <QuestionBody
                question={q}
                value={answers[idx] ?? []}
                onChange={(next) => setAnswers((a) => ({ ...a, [idx]: next }))}
              />
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <ChevronLeft className="h-4 w-4" />
              <span>Назад</span>
            </Button>
            {idx < questions.length - 1 ? (
              <Button onClick={() => setIdx(idx + 1)}>
                <span>Далее</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setDone(true)}>Завершить</Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
