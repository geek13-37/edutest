import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateTest, useDeleteTest, useTests } from "@/api/tests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { pluralRu } from "@/lib/utils";

import { TemplatePicker, type NewTestPayload } from "./TemplatePicker";

export function TestsPage() {
  const { data, isLoading } = useTests();
  const create = useCreateTest();
  const del = useDeleteTest();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");

  const subjects = useMemo(
    () => [...new Set((data ?? []).map((t) => t.subject).filter(Boolean) as string[])].sort(),
    [data],
  );

  const shown = useMemo(
    () => (subjectFilter ? (data ?? []).filter((t) => t.subject === subjectFilter) : data ?? []),
    [data, subjectFilter],
  );

  if (isLoading) return <PageLoader />;

  const submit = async (payload: NewTestPayload) => {
    try {
      const t = await create.mutateAsync({
        title: payload.title,
        subject: payload.subject ?? null,
        grade: payload.grade ?? null,
        topic: payload.topic ?? null,
        template_ref: payload.template_ref ?? null,
      });
      navigate(`/teacher/tests/${t.id}/edit`, { state: { aiSeed: payload.aiSeed } });
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Тесты</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Новый тест</span>
        </Button>
      </div>

      {subjects.length > 0 && (
        <Select
          className="w-56"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="">Все предметы</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      )}

      {!data?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="У вас пока нет тестов"
          description="Соберите тест из вопросов вручную или с помощью ИИ, опубликуйте его, а затем назначьте классу на странице класса. Черновик назначить нельзя."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              <span>Создать первый тест</span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {shown.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="leading-snug">{t.title}</CardTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {t.subject && <Badge variant="info">{t.subject}</Badge>}
                    <Badge variant={t.status === "published" ? "success" : "muted"}>
                      {t.status === "published" ? "опубликован" : "черновик"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t.questions_count}{" "}
                    {pluralRu(t.questions_count, ["вопрос", "вопроса", "вопросов"])}
                    {t.time_limit_min ? ` · ${t.time_limit_min} мин` : ""}
                    {t.topic ? ` · ${t.topic}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/teacher/tests/${t.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Редактировать</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Удалить тест «${t.title}»?`)) del.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Новый тест">
        <TemplatePicker pending={create.isPending} onCreate={submit} />
      </Dialog>
    </div>
  );
}
