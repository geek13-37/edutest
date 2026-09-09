import { useState } from "react";

import { useCreateAssignment } from "@/api/assignments";
import { useTests } from "@/api/tests";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";

export function AssignDialog({
  classId,
  open,
  onClose,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
}) {
  const tests = useTests();
  const create = useCreateAssignment();
  const toast = useToast();
  const published = tests.data?.filter((t) => t.status === "published") ?? [];

  const [testId, setTestId] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;
    try {
      await create.mutateAsync({
        test_id: testId,
        class_id: classId,
        max_attempts: unlimited ? null : maxAttempts,
        opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      });
      toast("Тест назначен классу", "success");
      onClose();
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Назначить тест классу">
      {!published.length ? (
        <p className="text-sm text-muted-foreground">
          Нет опубликованных тестов. Создайте и опубликуйте тест во вкладке «Тесты».
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Тест</Label>
            <Select value={testId} onChange={(e) => setTestId(e.target.value)} required>
              <option value="">Выберите тест</option>
              {published.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.questions_count} вопр.)
                </option>
              ))}
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
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

          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            <span>Назначить</span>
          </Button>
        </form>
      )}
    </Dialog>
  );
}
