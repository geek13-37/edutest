import { Archive, ArchiveRestore, Copy, Download, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  downloadSchoolExport,
  useAdminSchools,
  useArchiveSchool,
  useCreateSchool,
  useDeleteSchool,
  useRegenerateSchoolCode,
  useRestoreSchool,
} from "@/api/admin";
import type { SchoolScope } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const TABS: [SchoolScope, string][] = [
  ["active", "Активные"],
  ["archived", "Архив"],
];

export function SchoolsPage() {
  const [scope, setScope] = useState<SchoolScope>("active");
  const { data, isLoading } = useAdminSchools(scope);
  const create = useCreateSchool();
  const regen = useRegenerateSchoolCode();
  const archive = useArchiveSchool();
  const restore = useRestoreSchool();
  const del = useDeleteSchool();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast("Скопировано", "success");
  };

  const exportSchool = (id: string, name: string) =>
    downloadSchoolExport(id, name).catch((e) => toast(apiError(e), "error"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ name: form.name.trim(), city: form.city.trim() });
      setOpen(false);
      setForm({ name: "", city: "" });
      toast("Школа создана", "success");
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Школы</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Новая школа</span>
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              scope === value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {scope === "archived"
              ? "В архиве пусто."
              : "Школ пока нет. Создайте школу, чтобы выдать код регистрации учителям."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.map((s) => (
            <Card key={s.id} className={s.archived_at ? "opacity-90" : undefined}>
              <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>{s.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.city}
                    {s.region ? `, ${s.region}` : ""} · префикс логинов{" "}
                    <span className="font-mono">{s.login_prefix}</span>
                  </p>
                  {s.archived_at && (
                    <p className="mt-1 text-xs text-destructive">
                      в архиве с {formatDate(s.archived_at)} · вход заблокирован
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {!s.archived_at && (
                    <Link to={`/admin/teachers?school=${s.id}`}>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4" /> {s.teachers_count} уч. / {s.students_count} шк.
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    title="Выгрузить все данные школы в Excel"
                    onClick={() => exportSchool(s.id, s.name)}
                  >
                    <Download className="h-4 w-4" />
                    <span>Экспорт</span>
                  </Button>
                  {s.archived_at ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          restore.mutate(s.id, {
                            onSuccess: () => toast("Школа восстановлена", "success"),
                            onError: (e) => toast(apiError(e), "error"),
                          })
                        }
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        <span>Восстановить</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить навсегда"
                        onClick={() => {
                          if (
                            confirm(
                              `Удалить школу «${s.name}» НАВСЕГДА? Пропадут все классы, ученики, тесты и результаты. Отменить нельзя.`,
                            )
                          )
                            del.mutate(s.id, {
                              onSuccess: () => toast("Школа удалена", "success"),
                              onError: (e) => toast(apiError(e), "error"),
                            });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Отправить в архив"
                      onClick={() => {
                        if (
                          confirm(
                            `Отправить школу «${s.name}» в архив? Учителя и ученики не смогут войти. Данные сохранятся, школу можно восстановить.`,
                          )
                        )
                          archive.mutate(s.id, {
                            onSuccess: () => toast("Школа в архиве", "success"),
                            onError: (e) => toast(apiError(e), "error"),
                          });
                      }}
                    >
                      <Archive className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {!s.archived_at && (
                <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm text-muted-foreground">Код регистрации учителей:</span>
                  <span className="rounded-md bg-secondary px-3 py-1.5 font-mono tracking-wide">
                    {s.signup_code.toLowerCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copy(s.signup_code.toLowerCase())}
                    title="Копировать"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Новый код (старый перестанет работать)"
                    onClick={() => {
                      if (confirm("Сгенерировать новый код? Старый перестанет работать."))
                        regen.mutate(s.id, { onSuccess: () => toast("Код обновлен", "success") });
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Новая школа">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Полное название</Label>
            <Input
              autoFocus
              required
              minLength={3}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="МАОУ «СОШ № 3»"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Город</Label>
            <Input
              required
              minLength={2}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Северодвинск"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Префикс логинов учеников школа получит автоматически.
          </p>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            <span>Создать</span>
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
