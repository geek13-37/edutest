import { KeyRound, Plus, Power } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useAdminSchools,
  useAdminTeachers,
  useCreateTeacher,
  useResetTeacherPassword,
  useSetTeacherActive,
} from "@/api/admin";
import type { TeacherCredentials } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { TeacherCredsDialog } from "./TeacherCredsDialog";

export function TeachersPage() {
  const [params, setParams] = useSearchParams();
  const schoolFilter = params.get("school") ?? "";
  const teachers = useAdminTeachers(schoolFilter || undefined);
  const schools = useAdminSchools();
  const createTeacher = useCreateTeacher();
  const setActive = useSetTeacherActive();
  const resetPw = useResetTeacherPassword();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", school_id: "" });
  const [creds, setCreds] = useState<TeacherCredentials | null>(null);

  if (teachers.isLoading || schools.isLoading) return <PageLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const c = await createTeacher.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        school_id: form.school_id,
      });
      setOpen(false);
      setForm({ full_name: "", email: "", school_id: "" });
      setCreds(c);
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Учителя</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select
            value={schoolFilter}
            onChange={(e) => {
              const v = e.target.value;
              setParams(v ? { school: v } : {});
            }}
            className="sm:w-56"
          >
            <option value="">Все школы</option>
            {schools.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => setOpen(true)} disabled={!schools.data?.length}>
            <Plus className="h-4 w-4" />
            <span>Добавить</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{teachers.data?.length ?? 0} учителей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!teachers.data?.length && (
            <p className="text-sm text-muted-foreground">Нет учителей</p>
          )}
          {teachers.data?.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {t.full_name}
                  {!t.is_active && <Badge variant="destructive">отключен</Badge>}
                </div>
                <div className="break-words text-xs text-muted-foreground">
                  {t.email} · {t.school_name ?? "без школы"} · {formatDate(t.created_at)}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Сбросить пароль"
                  onClick={async () => {
                    if (!confirm(`Сбросить пароль ${t.full_name}?`)) return;
                    try {
                      setCreds(await resetPw.mutateAsync(t.id));
                    } catch (e) {
                      toast(apiError(e), "error");
                    }
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={t.is_active ? "Отключить" : "Включить"}
                  onClick={() =>
                    setActive.mutate(
                      { id: t.id, is_active: !t.is_active },
                      { onError: (e) => toast(apiError(e), "error") },
                    )
                  }
                >
                  <Power className={t.is_active ? "h-4 w-4 text-destructive" : "h-4 w-4 text-success"} />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Новый учитель">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Школа</Label>
            <Select
              required
              value={form.school_id}
              onChange={(e) => setForm({ ...form, school_id: e.target.value })}
            >
              <option value="">Выберите школу</option>
              {schools.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}, {s.city}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ФИО</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={createTeacher.isPending || !form.school_id}>
            {createTeacher.isPending && <Spinner />}
            <span>Создать и показать пароль</span>
          </Button>
        </form>
      </Dialog>

      <TeacherCredsDialog creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
