import { ArrowLeft, Check, Plus, Save, Send, Settings2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { usePublishTest, useReplaceQuestions, useTest } from "@/api/tests";
import type { QuestionDraft, QuestionType } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { AIPanel } from "./AIPanel";
import { AssignTestDialog } from "./AssignTestDialog";
import { QuestionCard } from "./QuestionCard";
import { TestSettingsDialog } from "./TestSettingsDialog";
import { blankQuestion, validateQuestions } from "./question-utils";

function toDraft(q: {
  type: QuestionType;
  text: string;
  options: { id: string; text: string }[];
  correct: string[];
  points: number;
}): QuestionDraft {
  return { type: q.type, text: q.text, options: q.options, correct: q.correct, points: q.points };
}

export function TestEditorPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const aiSeed = (location.state as { aiSeed?: { prompt: string; count: number } } | null)?.aiSeed;
  const { data: test, isLoading } = useTest(id);
  const replace = useReplaceQuestions(id);
  const publish = usePublishTest(id);
  const toast = useToast();

  const [draft, setDraft] = useState<QuestionDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (test && !loaded) {
      setDraft(test.questions.map(toDraft));
      setLoaded(true);
    }
  }, [test, loaded]);

  const issues = useMemo(() => validateQuestions(draft), [draft]);

  if (isLoading || !test) return <PageLoader />;

  const publishBlockReason =
    draft.length === 0
      ? "Добавьте хотя бы один вопрос, чтобы опубликовать тест"
      : dirty
        ? "Сохраните черновик, чтобы опубликовать тест"
        : issues.length > 0
          ? `Исправьте вопрос ${issues[0].index + 1}: ${issues[0].message}`
          : null;

  const mutate = (updater: (d: QuestionDraft[]) => QuestionDraft[]) => {
    setDraft((d) => updater(d));
    setDirty(true);
  };

  const addQuestion = () => mutate((d) => [...d, blankQuestion()]);

  const save = async () => {
    if (issues.length) {
      toast(`Вопрос ${issues[0].index + 1}: ${issues[0].message}`, "error");
      return;
    }
    try {
      await replace.mutateAsync(draft);
      setDirty(false);
      toast("Черновик сохранен", "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  const doPublish = async (value: boolean) => {
    if (value && dirty) {
      toast("Сначала сохраните изменения", "error");
      return;
    }
    try {
      await publish.mutateAsync(value);
      toast(value ? "Тест опубликован" : "Снят с публикации", "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container space-y-2 py-2.5 lg:flex lg:h-14 lg:items-center lg:gap-3 lg:space-y-0 lg:py-0">
          <div className="flex min-w-0 items-center gap-3 lg:flex-1">
            <Link to="/teacher/tests" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-2">
              <span className="truncate font-semibold" title={test.title}>
                {test.title}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0">
                {test.subject && <Badge variant="info">{test.subject}</Badge>}
                <Badge variant={test.status === "published" ? "success" : "muted"}>
                  {test.status === "published" ? "опубликован" : "черновик"}
                </Badge>
                {dirty && <Badge variant="warning">не сохранено</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />
              <span>Настройки</span>
            </Button>
            <Button size="sm" onClick={save} disabled={replace.isPending}>
              {replace.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
              <span>Сохранить</span>
            </Button>
            {test.status === "published" ? (
              <Button size="sm" variant="outline" onClick={() => doPublish(false)}>
                Снять с публикации
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => doPublish(true)}
                disabled={publish.isPending || publishBlockReason !== null}
                title={publishBlockReason ?? undefined}
              >
                <Check className="h-4 w-4" />
                <span>Опубликовать</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignOpen(true)}
              disabled={test.status !== "published"}
              title={test.status !== "published" ? "Сначала опубликуйте тест" : undefined}
            >
              <Send className="h-4 w-4" />
              <span>Назначить</span>
            </Button>
          </div>
        </div>
        {test.status !== "published" && (
          <div className="border-t bg-muted/40">
            <div className="container py-2 text-xs">
              {publishBlockReason ? (
                <span className="flex items-center gap-1.5 text-warning">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  {publishBlockReason}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Черновик готов. Опубликуйте тест, затем назначьте его классам кнопкой
                  «Назначить». Ученики видят только назначенные опубликованные тесты.
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {draft.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Вопросов пока нет. Добавьте вручную или сгенерируйте через ИИ справа.
            </div>
          )}
          {draft.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              total={draft.length}
              question={q}
              onChange={(nq) => mutate((d) => d.map((x, j) => (j === i ? nq : x)))}
              onRemove={() => mutate((d) => d.filter((_, j) => j !== i))}
              onMove={(dir) =>
                mutate((d) => {
                  const j = i + dir;
                  if (j < 0 || j >= d.length) return d;
                  const copy = [...d];
                  [copy[i], copy[j]] = [copy[j], copy[i]];
                  return copy;
                })
              }
            />
          ))}
          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4" />
            <span>Добавить вопрос</span>
          </Button>
        </div>

        <div>
          <AIPanel
            testId={id}
            draft={draft}
            initialPrompt={aiSeed?.prompt}
            initialCount={aiSeed?.count}
            autoGenerate={!!aiSeed && loaded && test.questions.length === 0}
            onResult={(qs, mode) => {
              setDraft((d) => (mode === "append" ? [...d, ...qs] : qs));
              setDirty(true);
            }}
          />
        </div>
      </div>

      <TestSettingsDialog test={test} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AssignTestDialog
        testId={id}
        published={test.status === "published"}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}
