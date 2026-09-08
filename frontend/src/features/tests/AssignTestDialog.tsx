import { useState } from "react";

import { useCreateAssignment } from "@/api/assignments";
import { useClasses } from "@/api/classes";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { pluralRu } from "@/lib/utils";

export function AssignTestDialog({
  testId,
  published,
  open,
  onClose,
}: {
  testId: string;
  published: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const classes = useClasses();
  const create = useCreateAssignment();
  const toast = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unlimited, setUnlimited] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const active = (classes.data ?? []).filter((c) => !c.archived);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const payload = {
      max_attempts: unlimited ? null : maxAttempts,
      opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    };
    const results = await Promise.allSettled(
      ids.map((class_id) => create.mutateAsync({ test_id: testId, class_id, ...payload })),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (ok) toast(`Тест назначен: ${ok} ${pluralRu(ok, ["класс", "класса", "классов"])}`, "success");
    if (failed) {
      const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      toast(first ? apiError(first.reason) : `Не удалось назначить: ${failed}`, "error");
    }
    if (ok) {
      setSelected(new Set());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Назначить тест классам">
      {!published ? (
        <p className="text-sm text-muted-foreground">
          Опубликуйте тест, чтобы назначить его классам. Кнопка «Опубликовать» рядом.
        </p>
      ) : classes.isLoading ? (
        <PageLoader />
      ) : !active.length ? (
        <p className="text-sm text-muted-foreground">
          У вас пока нет классов. Создайте класс во вкладке «Классы».
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Классы</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
              {active.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="font-medium">{c.display_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.members_count} {pluralRu(c.members_count, ["ученик", "ученика", "учеников"])}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
            />
            Неограниченное число попыток
          </label>
          {!unlimited && (
            <div className="space-y-1.5">
              <Label htmlFor="ma">Число попыток</Label>
              <Input
                id="ma"
                type="number"
                min={1}
                max={50}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-24"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oa">Открыть с</Label>
              <Input id="oa" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca">Закрыть в</Label>
              <Input id="ca" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={submit} disabled={create.isPending || !selected.size}>
            {create.isPending && <Spinner />}
            {selected.size ? `Назначить (${selected.size})` : "Выберите классы"}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
