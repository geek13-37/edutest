import { Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAIGenerate, useAIRevise } from "@/api/tests";
import type { QuestionDraft } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";

export function AIPanel({
  testId,
  draft,
  onResult,
  initialPrompt,
  initialCount,
  autoGenerate,
}: {
  testId: string;
  draft: QuestionDraft[];
  onResult: (questions: QuestionDraft[], mode: "replace" | "append") => void;
  initialPrompt?: string;
  initialCount?: number;
  /** запустить генерацию сразу при открытии (после выбора шаблона), без нажатия кнопки */
  autoGenerate?: boolean;
}) {
  const hasQuestions = draft.length > 0;
  const toast = useToast();
  const generate = useAIGenerate(testId);
  const revise = useAIRevise(testId);

  const [genPrompt, setGenPrompt] = useState(initialPrompt ?? "");
  const [count, setCount] = useState(initialCount ?? 5);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [revisePrompt, setRevisePrompt] = useState("");

  const runGenerate = async (forceMode?: "replace" | "append") => {
    try {
      const qs = await generate.mutateAsync({ prompt: genPrompt, count, mode: "replace" });
      onResult(qs, forceMode ?? mode);
      toast(`ИИ подготовил ${qs.length} вопрос(ов)`, "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  const autoFired = useRef(false);
  useEffect(() => {
    if (autoGenerate && !autoFired.current && genPrompt.trim().length >= 3 && !hasQuestions) {
      autoFired.current = true;
      runGenerate("replace");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  const runRevise = async () => {
    try {
      const qs = await revise.mutateAsync({ prompt: revisePrompt, questions: draft });
      onResult(qs, "replace");
      toast("Правки применены к черновику", "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-ai" />
          <span>EduAI</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Сгенерировать вопросы</Label>
          <Textarea
            rows={3}
            placeholder="Тема и требования, напр.: «Фотосинтез, 6 класс. 2 вопроса с одним ответом, 1 на несколько, 1 верно/неверно»"
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "replace" | "append")}
              className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="replace">Заменить черновик</option>
              <option value="append" disabled={!hasQuestions}>
                Добавить к текущим
              </option>
            </select>
          </div>
          <Button
            variant="ai"
            className="w-full"
            onClick={() => runGenerate()}
            disabled={generate.isPending || genPrompt.trim().length < 3}
          >
            {generate.isPending ? <Spinner /> : <Wand2 className="h-4 w-4" />}
            <span>Сгенерировать</span>
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Переформулировать / доработать</Label>
          <Textarea
            rows={2}
            placeholder="Напр.: «сделай вопросы сложнее», «добавь 2 вопроса про корни»"
            value={revisePrompt}
            onChange={(e) => setRevisePrompt(e.target.value)}
            disabled={!hasQuestions}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={runRevise}
            disabled={revise.isPending || !hasQuestions || revisePrompt.trim().length < 3}
          >
            {revise.isPending && <Spinner />}
            <span>Применить правки</span>
          </Button>
        </div>
        <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <p>
            Результат ИИ попадает в черновик. Проверьте и при необходимости отредактируйте
            вручную перед сохранением.
          </p>
          <p className="flex items-start gap-1.5">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              EduAI может допускать ошибки: проверяйте формулировки вопросов и правильные
              ответы перед публикацией.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
