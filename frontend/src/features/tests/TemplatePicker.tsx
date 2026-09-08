import { useMemo, useState } from "react";

import { useCurriculum, useExams } from "@/api/catalog";
import type { AiSeed } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface NewTestPayload {
  title: string;
  subject?: string | null;
  grade?: number | null;
  topic?: string | null;
  template_ref?: string | null;
  aiSeed?: AiSeed;
}

type Mode = "blank" | "curriculum" | "exam";

const MODES: [Mode, string][] = [
  ["blank", "С нуля"],
  ["curriculum", "По программе"],
  ["exam", "Экзамен"],
];

export function TemplatePicker({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate: (payload: NewTestPayload) => void;
}) {
  const [mode, setMode] = useState<Mode>("blank");
  const [title, setTitle] = useState("");

  // По программе
  const curriculum = useCurriculum();
  const [subjKey, setSubjKey] = useState("");
  const [grade, setGrade] = useState("");
  const [topicKey, setTopicKey] = useState("");

  // Экзамен
  const exams = useExams();
  const [examKey, setExamKey] = useState("");
  const [examSubjKey, setExamSubjKey] = useState("");
  const [taskKey, setTaskKey] = useState("");

  const subject = curriculum.data?.subjects.find((s) => s.key === subjKey);
  const gradeNode = subject?.grades.find((g) => String(g.grade) === grade);
  const topic = gradeNode?.topics.find((t) => t.key === topicKey);

  const exam = exams.data?.exams.find((e) => e.key === examKey);
  const examSubject = exam?.subjects.find((s) => s.key === examSubjKey);
  const task = examSubject?.tasks.find((t) => t.key === taskKey);

  const resolved: NewTestPayload | null = useMemo(() => {
    if (mode === "blank") {
      return title.trim().length >= 2 ? { title: title.trim() } : null;
    }
    if (mode === "curriculum" && subject && gradeNode && topic) {
      return {
        title: `${subject.name}, ${gradeNode.grade} класс: ${topic.name}`,
        subject: subject.name,
        grade: gradeNode.grade,
        topic: topic.name,
        template_ref: topic.key,
        aiSeed: {
          prompt: `Предмет: ${subject.name}, ${gradeNode.grade} класс. Тема: ${topic.name}. ${
            topic.hint ?? ""
          } Составь вопросы разных типов по этой теме школьной программы.`.trim(),
          count: 5,
          question_type: null,
        },
      };
    }
    if (mode === "exam" && exam && examSubject && task) {
      const grd = examSubject.grade ?? exam.grade ?? null;
      return {
        title: `${exam.name} ${examSubject.name}, задание ${task.no}: ${task.title}`,
        subject: examSubject.name,
        grade: grd,
        topic: `${exam.name}, задание ${task.no}`,
        template_ref: task.key,
        aiSeed: {
          prompt: `${exam.name} по предмету «${examSubject.name}», задание номер ${task.no}: ${
            task.title
          }. Проверяется: ${task.checks || task.title}. Составь ${
            task.count
          } тренировочных вопросов в формате этого задания (тип вопроса: ${
            task.question_type
          }). Уровень: ${task.difficulty ?? "базовый"}.${
            task.manual
              ? " Это задание с развёрнутым ответом: составь закрытую тренировку по той же теме."
              : ""
          }`.trim(),
          count: task.count,
          question_type: task.question_type,
        },
      };
    }
    return null;
  }, [mode, title, subject, gradeNode, topic, exam, examSubject, task]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border p-1">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              mode === value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "blank" && (
        <div className="space-y-1.5">
          <Label>Название</Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Контрольная по дробям"
          />
        </div>
      )}

      {mode === "curriculum" && (
        <div className="space-y-3">
          {curriculum.isLoading ? (
            <Spinner />
          ) : (
            <>
              <Field label="Предмет">
                <Select
                  value={subjKey}
                  onChange={(e) => {
                    setSubjKey(e.target.value);
                    setGrade("");
                    setTopicKey("");
                  }}
                >
                  <option value="">Выберите предмет</option>
                  {curriculum.data?.subjects.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Класс">
                <Select
                  value={grade}
                  disabled={!subject}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setTopicKey("");
                  }}
                >
                  <option value="">Выберите класс</option>
                  {subject?.grades.map((g) => (
                    <option key={g.grade} value={g.grade}>
                      {g.grade} класс
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Тема">
                <Select
                  value={topicKey}
                  disabled={!gradeNode}
                  onChange={(e) => setTopicKey(e.target.value)}
                >
                  <option value="">Выберите тему</option>
                  {gradeNode?.topics.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {topic?.hint && <p className="text-xs text-muted-foreground">{topic.hint}</p>}
            </>
          )}
        </div>
      )}

      {mode === "exam" && (
        <div className="space-y-3">
          {exams.isLoading ? (
            <Spinner />
          ) : (
            <>
              <Field label="Экзамен">
                <Select
                  value={examKey}
                  onChange={(e) => {
                    setExamKey(e.target.value);
                    setExamSubjKey("");
                    setTaskKey("");
                  }}
                >
                  <option value="">Выберите экзамен</option>
                  {exams.data?.exams.map((ex) => (
                    <option key={ex.key} value={ex.key}>
                      {ex.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Предмет">
                <Select
                  value={examSubjKey}
                  disabled={!exam}
                  onChange={(e) => {
                    setExamSubjKey(e.target.value);
                    setTaskKey("");
                  }}
                >
                  <option value="">Выберите предмет</option>
                  {exam?.subjects.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Задание">
                <Select
                  value={taskKey}
                  disabled={!examSubject}
                  onChange={(e) => setTaskKey(e.target.value)}
                >
                  <option value="">Выберите задание</option>
                  {examSubject?.tasks.map((t) => (
                    <option key={t.key} value={t.key}>
                      № {t.no}. {t.title}
                      {t.manual ? " (ручная проверка)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {task && (
                <p className="text-xs text-muted-foreground">
                  {task.checks || task.title}
                  {task.manual
                    ? ". Задание части 2: ИИ соберёт закрытую тренировку в духе задания, это не точная копия КИМ."
                    : ""}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={pending || !resolved}
        onClick={() => resolved && onCreate(resolved)}
      >
        {pending && <Spinner />} Создать и открыть редактор
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
