import { useMutation } from "@tanstack/react-query";
import { Clock, FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useMyAssignments } from "@/api/assignments";
import { useStartAttempt } from "@/api/attempts";
import type { StudentAssignment } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { pluralRu } from "@/lib/utils";

export function StudentDashboard() {
  const { data, isLoading } = useMyAssignments();
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Мои тесты</h1>
      {!data?.length && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Пока нет назначенных тестов. Вступите в класс во вкладке «Мои классы».
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {data?.map((a) => <AssignmentCard key={a.id} a={a} />)}
      </div>
    </div>
  );
}

function AssignmentCard({ a }: { a: StudentAssignment }) {
  const navigate = useNavigate();
  const toast = useToast();
  const start = useStartAttempt();

  const noAttemptsLeft = a.attempts_left === 0 && !a.active_attempt_id;
  const canStart = a.is_open && !noAttemptsLeft;

  const go = useMutation({
    mutationFn: async () => {
      if (a.active_attempt_id) return a.active_attempt_id;
      const s = await start.mutateAsync(a.id);
      return s.id;
    },
    onSuccess: (attemptId) => navigate(`/app/attempt/${attemptId}`),
    onError: (e) => toast(apiError(e), "error"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{a.test_title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{a.class_name}</p>
          </div>
          {a.best_percent != null && (
            <Badge variant={a.best_percent >= 50 ? "success" : "warning"}>
              Лучший: {a.best_percent}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {a.test_description && <p className="text-sm text-muted-foreground">{a.test_description}</p>}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileQuestion className="h-4 w-4" />
            {a.questions_count} {pluralRu(a.questions_count, ["вопрос", "вопроса", "вопросов"])}
          </span>
          {a.time_limit_min && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {a.time_limit_min} мин
            </span>
          )}
          <span>
            Попыток:{" "}
            {a.max_attempts == null
              ? "не ограничено"
              : `${a.attempts_used} / ${a.max_attempts}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => go.mutate()} disabled={!canStart || go.isPending}>
            {go.isPending && <Spinner />}
            {a.active_attempt_id ? "Продолжить" : "Начать тест"}
          </Button>
          {!a.is_open && <span className="text-sm text-destructive">Тест закрыт</span>}
          {noAttemptsLeft && a.is_open && (
            <span className="text-sm text-destructive">Попытки закончились</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
