import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAttempt, useSaveAnswer, useSubmitAttempt } from "@/api/attempts";
import type { AttemptResult } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/rich-text";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn, pluralRu } from "@/lib/utils";

function useCountdown(deadline: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

export function AttemptPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: attempt, isLoading, isError } = useAttempt(id);
  const saveAnswer = useSaveAnswer(id);
  const submit = useSubmitAttempt(id);

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (attempt && !synced) {
      setAnswers(attempt.answers ?? {});
      setSynced(true);
      if (attempt.status !== "in_progress") {
        setResult({ id: attempt.id, status: attempt.status, percent: 0, submitted_at: null });
      }
    }
  }, [attempt, synced]);

  const left = useCountdown(attempt?.deadline_at ?? null);

  const doSubmit = useCallback(
    async (auto = false) => {
      try {
        const r = await submit.mutateAsync();
        setResult(r);
        qc.invalidateQueries({ queryKey: ["me", "assignments"] });
        if (auto) toast("Время вышло, тест отправлен", "info");
      } catch (e) {
        toast(apiError(e), "error");
      }
    },
    [submit, qc, toast],
  );

  const shortTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (left === 0 && !result && !autoSubmitted.current) {
      autoSubmitted.current = true;
      doSubmit(true);
    }
  }, [left, result, doSubmit]);

  const questions = attempt?.questions ?? [];
  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length,
    [questions, answers],
  );

  if (isLoading) return <PageLoader />;
  if (isError || !attempt) return <Centered>Попытка не найдена</Centered>;

  if (result) {
    return (
      <Centered>
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 py-10">
            <p className="text-sm text-muted-foreground">
              {result.status === "expired" ? "Время вышло. Тест отправлен." : "Тест завершен"}
            </p>
            <div className="text-5xl font-bold text-primary">{Math.round(result.percent)}%</div>
            <p className="text-sm text-muted-foreground">выполнено правильно</p>
            <Button onClick={() => navigate("/app")} className="w-full">
              К списку тестов
            </Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  const q = questions[current];
  const selected = answers[q.id] ?? [];

  const setShortAnswer = (value: string) => {
    setAnswers((a) => ({ ...a, [q.id]: value ? [value] : [] }));
    if (shortTimer.current) clearTimeout(shortTimer.current);
    const qid = q.id;
    shortTimer.current = setTimeout(() => {
      saveAnswer.mutate(
        { question_id: qid, selected: value ? [value] : [] },
        { onError: (e) => toast(apiError(e), "error") },
      );
    }, 600);
  };

  const flushShortAnswer = (value: string) => {
    if (shortTimer.current) clearTimeout(shortTimer.current);
    saveAnswer.mutate(
      { question_id: q.id, selected: value ? [value] : [] },
      { onError: (e) => toast(apiError(e), "error") },
    );
  };

  const choose = (optionId: string) => {
    let next: string[];
    if (q.type === "multiple") {
      next = selected.includes(optionId)
        ? selected.filter((x) => x !== optionId)
        : [...selected, optionId];
    } else {
      next = [optionId];
    }
    setAnswers((a) => ({ ...a, [q.id]: next }));
    saveAnswer.mutate(
      { question_id: q.id, selected: next },
      { onError: (e) => toast(apiError(e), "error") },
    );
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-3">
          <span className="truncate font-semibold">{attempt.test_title}</span>
          <div className="flex items-center gap-2">
            {left != null && (
              <span
                className={cn(
                  "rounded-md px-3 py-1 font-mono text-sm",
                  left < 60 ? "bg-destructive/10 text-destructive" : "bg-secondary",
                )}
              >
                {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Вопрос {current + 1} из {questions.length}
          </div>
          <Card>
            <CardContent className="space-y-4 py-6">
              <RichText as="p" className="text-lg font-medium leading-snug">
                {q.text}
              </RichText>
              {q.type === "multiple" && (
                <p className="text-xs text-muted-foreground">Можно выбрать несколько вариантов</p>
              )}
              {q.type === "short" ? (
                <div className="space-y-1.5">
                  <Input
                    type="text"
                    inputMode="text"
                    value={selected[0] ?? ""}
                    onChange={(e) => setShortAnswer(e.target.value)}
                    onBlur={(e) => flushShortAnswer(e.target.value)}
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
                  const active = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
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
                          active ? "border-primary bg-primary text-primary-foreground" : "border-input",
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
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Назад</span>
            </Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                <span>Далее</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (
                    answeredCount < questions.length &&
                    !confirm(
                      `Отвечено ${answeredCount} из ${questions.length}. Завершить тест?`,
                    )
                  )
                    return;
                  doSubmit();
                }}
                disabled={submit.isPending}
              >
                {submit.isPending && <Spinner />}
                <span>Завершить тест</span>
              </Button>
            )}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {answeredCount} из {questions.length}{" "}
              {pluralRu(questions.length, ["вопроса", "вопросов", "вопросов"])} отвечено
            </p>
            <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded text-xs font-medium",
                    i === current && "ring-2 ring-primary",
                    (answers[qq.id]?.length ?? 0) > 0
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-4">{children}</div>;
}
