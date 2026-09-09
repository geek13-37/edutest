import type { QuestionDraft, QuestionType } from "@/api/types";

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Один вариант",
  multiple: "Несколько вариантов",
  boolean: "Верно / неверно",
  short: "Короткий ответ",
};

export function nextOptionId(existing: string[]): string {
  const letters = "abcdefghij";
  for (const l of letters) if (!existing.includes(l)) return l;
  return `o${existing.length + 1}`;
}

export function blankQuestion(type: QuestionType = "single"): QuestionDraft {
  if (type === "boolean") {
    return {
      type,
      text: "",
      options: [
        { id: "true", text: "Верно" },
        { id: "false", text: "Неверно" },
      ],
      correct: ["true"],
      points: 1,
    };
  }
  if (type === "short") {
    return { type, text: "", options: [], correct: [""], points: 1 };
  }
  return {
    type,
    text: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
    ],
    correct: [],
    points: 1,
  };
}

export function coerceType(q: QuestionDraft, type: QuestionType): QuestionDraft {
  if (type === "boolean") return { ...blankQuestion("boolean"), text: q.text, points: q.points };
  if (type === "short") return { type, text: q.text, options: [], correct: [""], points: q.points };
  const wasShort = q.type === "short";
  const opts = !wasShort && q.options.length >= 2 ? q.options : blankQuestion(type).options;
  let correct = q.correct.filter((c) => opts.some((o) => o.id === c));
  if (type === "single" && correct.length > 1) correct = [correct[0]];
  return { ...q, type, options: opts, correct };
}

export interface ValidationIssue {
  index: number;
  message: string;
}

export function validateQuestions(questions: QuestionDraft[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  questions.forEach((q, i) => {
    if (!q.text.trim()) issues.push({ index: i, message: "пустой текст вопроса" });
    if (q.type === "short") {
      if (!q.correct.some((c) => c.trim()))
        issues.push({ index: i, message: "добавьте хотя бы один вариант ответа" });
      return;
    }
    if (q.options.length < 2) issues.push({ index: i, message: "нужно минимум 2 варианта" });
    if (q.options.some((o) => !o.text.trim())) issues.push({ index: i, message: "есть пустой вариант" });
    if (q.correct.length === 0) issues.push({ index: i, message: "не отмечен правильный ответ" });
    if ((q.type === "single" || q.type === "boolean") && q.correct.length > 1)
      issues.push({ index: i, message: "должен быть один правильный ответ" });
    if (q.type === "multiple" && q.correct.length < 2)
      issues.push({ index: i, message: "отметьте минимум 2 правильных варианта" });
  });
  return issues;
}
