import { CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useMyAssignmentsCount } from "@/api/assignments";
import { useClasses } from "@/api/classes";
import { useTests } from "@/api/tests";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const HIDE_KEY = "edutest_onboarding_hidden";
const DONE_KEY = "edutest_onboarding_done";

const STEPS = [
  { key: "class", label: "Создать класс", to: "/teacher/classes" },
  { key: "students", label: "Добавить учеников в класс", to: "/teacher/classes" },
  { key: "test", label: "Создать тест и опубликовать его", to: "/teacher/tests" },
  { key: "assign", label: "Назначить тест классу", to: "/teacher/classes" },
] as const;

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function readDone(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function OnboardingChecklist() {
  const classes = useClasses();
  const tests = useTests();
  const assignments = useMyAssignmentsCount();
  const [hidden, setHidden] = useState(readHidden);
  // шаги, отмеченные ранее, остаются отмеченными даже если данные изменились
  // (напр. учитель назначил тест, потом удалил назначение)
  const [sticky, setSticky] = useState(readDone);

  const ready = !classes.isLoading && !tests.isLoading && !assignments.isLoading;

  const live: Record<string, boolean> = {
    class: (classes.data?.length ?? 0) > 0,
    students: classes.data?.some((c) => c.members_count > 0) ?? false,
    test: tests.data?.some((t) => t.status === "published") ?? false,
    assign: (assignments.data ?? 0) > 0,
  };

  const isDone = (key: string) => sticky.has(key) || (ready && live[key]);
  const doneKeys = STEPS.filter((s) => isDone(s.key)).map((s) => s.key);
  const doneCount = doneKeys.length;

  const doneKey = doneKeys.join(",");
  useEffect(() => {
    if (!ready) return;
    // doneKeys: это уже объединение sticky и текущих данных, растет монотонно
    if (doneKeys.length !== readDone().size) {
      try {
        localStorage.setItem(DONE_KEY, JSON.stringify(doneKeys));
      } catch {
        /* приватный режим, не критично */
      }
      setSticky(new Set(doneKeys));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, doneKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* приватный режим, просто скрываем на эту сессию */
    }
    setHidden(true);
  };

  if (hidden) return null;
  if (!ready && sticky.size === 0) return null;
  if (doneCount === STEPS.length) return null;

  return (
    <Card className="border-primary/30 bg-primary-light">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">С чего начать</h2>
            <p className="text-sm text-muted-foreground">
              Выполнено {doneCount} из {STEPS.length}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="-mr-1 -mt-1 flex items-center gap-1 rounded-md p-1 text-xs text-muted-foreground hover:text-foreground"
            title="Больше не показывать"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">не показывать</span>
          </button>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
          />
        </div>

        <ol className="space-y-1">
          {STEPS.map((s, i) => {
            const done = isDone(s.key);
            return (
              <li key={s.key}>
                <Link
                  to={s.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary/5",
                    done && "text-muted-foreground",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn(done && "line-through")}>
                    {i + 1}. {s.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
