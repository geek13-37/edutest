import { Check, KeyRound, Trash2, TriangleAlert, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import {
  useAddExistingMembers,
  useClassMembers,
  useCreateStudent,
  useCreateStudentsBulk,
  useRemoveMember,
  useResetPassword,
  useSearchStudents,
} from "@/api/students";
import type { StudentCredentials } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CredentialsDialog } from "./CredentialsDialog";

export function StudentsCard({ classId }: { classId: string }) {
  const toast = useToast();
  const members = useClassMembers(classId);
  const resetPw = useResetPassword(classId);
  const removeMember = useRemoveMember(classId);

  const [addOpen, setAddOpen] = useState(false);
  const [creds, setCreds] = useState<StudentCredentials[] | null>(null);

  const doReset = async (studentId: string, name: string) => {
    if (!confirm(`Сбросить пароль ученику ${name}? Старый перестанет работать.`)) return;
    try {
      const c = await resetPw.mutateAsync(studentId);
      setCreds([c]);
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          <span>Ученики ({members.data?.length ?? 0})</span>
        </CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          <span>Добавить учеников</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!members.data?.length && (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            В классе пока нет учеников. Для каждого создается аккаунт с логином и паролем,
            которые нужно раздать ученикам, либо можно добавить ученика, уже заведенного
            другим учителем школы. Нажмите «Добавить учеников» выше.
          </div>
        )}
        {members.data?.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{m.full_name}</div>
              <div className="font-mono text-xs text-muted-foreground">{m.username}</div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Сбросить пароль"
                onClick={() => doReset(m.student_id, m.full_name)}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Убрать из класса"
                onClick={() => {
                  if (confirm(`Убрать ${m.full_name} из класса? Аккаунт ученика останется.`))
                    removeMember.mutate(m.student_id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <AddStudentsDialog
        classId={classId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(c) => {
          setAddOpen(false);
          setCreds(c);
        }}
      />

      <CredentialsDialog classId={classId} items={creds} onClose={() => setCreds(null)} />
    </Card>
  );
}

type Tab = "one" | "bulk" | "existing";

const TABS: [Tab, string][] = [
  ["one", "По одному"],
  ["bulk", "Списком"],
  ["existing", "Из школы"],
];

const HINTS: Record<Tab, string> = {
  one: "Создать нового ученика: логин и пароль сгенерируются автоматически.",
  bulk: "Создать сразу несколько новых учеников, по одному ФИО в строке.",
  existing:
    "Добавить ученика, которого уже завел другой учитель вашей школы. У него есть аккаунт, новый пароль не создается.",
};

function AddStudentsDialog({
  classId,
  open,
  onClose,
  onCreated,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (creds: StudentCredentials[]) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("one");
  const [oneName, setOneName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const createOne = useCreateStudent(classId);
  const createBulk = useCreateStudentsBulk(classId);

  useEffect(() => {
    if (open) {
      setTab("one");
      setOneName("");
      setBulkText("");
    }
  }, [open]);

  const submitOne = async () => {
    try {
      onCreated([await createOne.mutateAsync(oneName.trim())]);
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  const submitBulk = async () => {
    const names = bulkText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    try {
      onCreated(await createBulk.mutateAsync(names));
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Добавить учеников">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md border p-2 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{HINTS[tab]}</p>

        {tab !== "existing" && (
          <div className="flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-xs">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              Пароли новых учеников показываются <strong>только один раз</strong> после
              создания. Сразу скачайте или распечатайте список.
            </span>
          </div>
        )}

        {tab === "one" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ФИО</Label>
              <Input
                autoFocus
                value={oneName}
                onChange={(e) => setOneName(e.target.value)}
                placeholder="Иванов Иван"
              />
            </div>
            <Button
              className="w-full"
              disabled={oneName.trim().length < 2 || createOne.isPending}
              onClick={submitOne}
            >
              {createOne.isPending && <Spinner />}
              <span>Создать аккаунт</span>
            </Button>
          </div>
        )}

        {tab === "bulk" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>По одному ФИО в строке (до 60)</Label>
              <Textarea
                rows={7}
                autoFocus
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Иванов Иван\nПетрова Мария\nСидоров Петр"}
              />
            </div>
            <Button
              className="w-full"
              disabled={createBulk.isPending || !bulkText.trim()}
              onClick={submitBulk}
            >
              {createBulk.isPending && <Spinner />}
              <span>Создать аккаунты</span>
            </Button>
          </div>
        )}

        {tab === "existing" && <ExistingPicker classId={classId} />}
      </div>
    </Dialog>
  );
}

function ExistingPicker({ classId }: { classId: string }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data } = useSearchStudents(q, true);
  const members = useClassMembers(classId);
  const add = useAddExistingMembers(classId);

  const memberIds = new Set(members.data?.map((m) => m.student_id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toAdd = [...selected].filter((id) => !memberIds.has(id));

  const submit = async () => {
    if (!toAdd.length) return;
    try {
      await add.mutateAsync(toAdd);
      toast(
        toAdd.length === 1 ? "Ученик добавлен" : `Добавлено учеников: ${toAdd.length}`,
        "success",
      );
      setSelected(new Set());
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <div className="space-y-3">
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по ФИО или логину"
      />
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {data?.map((s) => {
          const inClass = memberIds.has(s.id);
          return (
            <label
              key={s.id}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md border p-2 text-sm",
                inClass ? "opacity-60" : "hover:bg-accent",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={inClass || selected.has(s.id)}
                disabled={inClass}
                onChange={() => toggle(s.id)}
              />
              <span className="flex-1 truncate">{s.full_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{s.username}</span>
              {inClass && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  <span>в классе</span>
                </span>
              )}
            </label>
          );
        })}
        {data && !data.length && (
          <p className="p-2 text-sm text-muted-foreground">Ничего не найдено</p>
        )}
      </div>
      <Button className="w-full" disabled={!toAdd.length || add.isPending} onClick={submit}>
        {add.isPending && <Spinner />}
        {toAdd.length ? `Добавить в класс (${toAdd.length})` : "Выберите учеников"}
      </Button>
    </div>
  );
}
