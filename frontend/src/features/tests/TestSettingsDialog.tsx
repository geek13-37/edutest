import { useState } from "react";

import { useUpdateTest } from "@/api/tests";
import type { TestDetail } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";

export function TestSettingsDialog({
  test,
  open,
  onClose,
}: {
  test: TestDetail;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateTest(test.id);
  const toast = useToast();

  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description);
  const [timed, setTimed] = useState(test.time_limit_min != null);
  const [timeLimit, setTimeLimit] = useState(test.time_limit_min ?? 20);
  const [shuffleQ, setShuffleQ] = useState(test.shuffle_questions);
  const [shuffleO, setShuffleO] = useState(test.shuffle_options);
  const [th, setTh] = useState(test.grade_thresholds);

  const setThreshold = (k: string, v: number) => setTh({ ...th, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        title,
        description,
        time_limit_min: timed ? timeLimit : null,
        shuffle_questions: shuffleQ,
        shuffle_options: shuffleO,
        grade_thresholds: th,
      });
      toast("Настройки сохранены", "success");
      onClose();
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Настройки теста">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Название</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} required />
        </div>
        <div className="space-y-1.5">
          <Label>Описание (видят ученики)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          Ограничение по времени
        </label>
        {timed && (
          <div className="space-y-1.5">
            <Label>Минут на прохождение</Label>
            <Input
              type="number"
              min={1}
              max={600}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shuffleQ} onChange={(e) => setShuffleQ(e.target.checked)} />
          Перемешивать вопросы
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shuffleO} onChange={(e) => setShuffleO(e.target.checked)} />
          Перемешивать варианты ответов
        </label>

        <div className="space-y-2">
          <Label>Пороги оценок (% правильных), видит только учитель</Label>
          <div className="grid grid-cols-4 gap-2">
            {(["5", "4", "3", "2"] as const).map((k) => (
              <div key={k}>
                <span className="text-xs text-muted-foreground">на «{k}»</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={th[k]}
                  onChange={(e) => setThreshold(k, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={update.isPending}>
          {update.isPending && <Spinner />} Сохранить
        </Button>
      </form>
    </Dialog>
  );
}
