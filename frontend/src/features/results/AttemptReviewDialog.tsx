import { Check, X } from "lucide-react";

import { useAttemptReview } from "@/api/assignments";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RichText } from "@/components/ui/rich-text";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function AttemptReviewDialog({
  attemptId,
  onClose,
}: {
  attemptId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useAttemptReview(attemptId ?? "", !!attemptId);

  return (
    <Dialog open={!!attemptId} onClose={onClose} className="max-w-2xl" title="Разбор попытки">
      {isLoading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{data.student_name}</span>
            <Badge variant="secondary">попытка #{data.attempt_no}</Badge>
            <span>
              Балл: {data.score} / {data.max_score} ({data.percent}%)
            </span>
            <Badge variant={Number(data.grade) >= 4 ? "success" : Number(data.grade) >= 3 ? "warning" : "destructive"}>
              Оценка {data.grade}
            </Badge>
          </div>

          <div className="space-y-3">
            {data.answers.map((a, i) => (
              <div key={a.question.id} className="rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      a.is_correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {a.is_correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <p className="text-sm font-medium">
                    {i + 1}. <RichText>{a.question.text}</RichText>
                  </p>
                </div>
                {a.question.image_url && (
                  <div className="mt-2 pl-7">
                    <img
                      src={a.question.image_url}
                      alt="Картинка к вопросу"
                      className="max-h-56 rounded-md border object-contain"
                    />
                  </div>
                )}
                {a.question.type === "short" ? (
                  <div className="mt-2 space-y-0.5 pl-7 text-sm">
                    <p>
                      <span className="text-xs text-muted-foreground">Ответ ученика: </span>
                      <span className={cn(a.is_correct ? "text-success" : "text-destructive")}>
                        {a.selected[0] || "—"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Верные варианты: {a.question.correct.join(", ")}
                    </p>
                  </div>
                ) : (
                <ul className="mt-2 space-y-1 pl-7 text-sm">
                  {a.question.options.map((o) => {
                    const chosen = a.selected.includes(o.id);
                    const right = a.question.correct.includes(o.id);
                    return (
                      <li
                        key={o.id}
                        className={cn(
                          "flex items-center gap-2",
                          right && "font-medium text-success",
                          chosen && !right && "text-destructive line-through",
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {chosen ? "выбрал(а)" : "•"}
                        </span>
                        <RichText>{o.text}</RichText>
                        {right && <span className="text-xs">(верно)</span>}
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
