import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useClassAssignments, useDeleteAssignment } from "@/api/assignments";
import { useClass, useDeleteClass, useUpdateClass } from "@/api/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AssignDialog } from "./AssignDialog";
import { StudentsCard } from "./StudentsCard";

export function ClassDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const klass = useClass(id);
  const assignments = useClassAssignments(id);
  const update = useUpdateClass(id);
  const del = useDeleteClass();
  const delAssignment = useDeleteAssignment(id);
  const [assignOpen, setAssignOpen] = useState(false);

  if (klass.isLoading) return <PageLoader />;
  if (!klass.data) return <p>Класс не найден</p>;

  return (
    <div className="space-y-6">
      <Link
        to="/teacher/classes"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>К классам</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Класс {klass.data.display_name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              update.mutate(
                { archived: !klass.data!.archived },
                {
                  onSuccess: () =>
                    toast(klass.data!.archived ? "Класс восстановлен" : "Класс в архиве"),
                },
              )
            }
          >
            {klass.data.archived ? "Восстановить" : "В архив"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm("Удалить класс со всеми назначениями и результатами?")) return;
              del.mutate(id, {
                onSuccess: () => navigate("/teacher/classes"),
                onError: (e) => toast(apiError(e), "error"),
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Удалить</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentsCard classId={id} />

        <Card>
          <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Назначенные тесты</CardTitle>
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Send className="h-4 w-4" />
              <span>Назначить тест</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!assignments.data?.length && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Классу еще не назначен ни один тест. Назначение открывает опубликованный
                тест ученикам класса; здесь же потом появятся их результаты. Нажмите
                «Назначить тест» выше.
              </div>
            )}
            {assignments.data?.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{a.test_title}</div>
                  <div className="text-xs text-muted-foreground">
                    Попыток: {a.max_attempts ?? "без ограничения"}
                    {a.closes_at && ` · до ${formatDate(a.closes_at)}`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link to={`/teacher/assignments/${a.id}/results`}>
                    <Button variant="outline" size="sm">
                      Результаты
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (confirm("Удалить назначение и все связанные попытки?"))
                        delAssignment.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Удалить</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AssignDialog classId={id} open={assignOpen} onClose={() => setAssignOpen(false)} />
    </div>
  );
}
