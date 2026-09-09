import { ScrollText } from "lucide-react";
import { useState } from "react";

import { useAuditLog } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

const LIMIT = 50;

const ACTIONS: [string, string][] = [
  ["school.create", "Создана школа"],
  ["school.update", "Изменена школа"],
  ["school.regenerate_code", "Перевыпущен код школы"],
  ["school.archive", "Школа в архив"],
  ["school.restore", "Школа восстановлена"],
  ["school.delete", "Школа удалена навсегда"],
  ["school.export", "Выгружены данные школы"],
  ["teacher.create", "Создан учитель"],
  ["teacher.activate", "Учитель включен"],
  ["teacher.deactivate", "Учитель отключен"],
  ["teacher.reset_password", "Сброшен пароль учителя"],
  ["admin.create", "Создан администратор"],
];

const TARGETS: [string, string][] = [
  ["school", "Школы"],
  ["teacher", "Учителя"],
  ["admin", "Администраторы"],
];

const TARGET_BADGE: Record<string, "default" | "info" | "warning"> = {
  school: "default",
  teacher: "info",
  admin: "warning",
};

export function AuditPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useAuditLog({
    action: action || undefined,
    target_type: targetType || undefined,
    limit: LIMIT,
    offset,
  });

  if (isLoading) return <PageLoader />;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + items.length;

  const reset = (fn: () => void) => {
    fn();
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Журнал действий</h1>
        <p className="text-sm text-muted-foreground">
          Кто и когда менял школы, учителей и администраторов. Записи не редактируются.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Действие</Label>
          <Select
            className="w-56"
            value={action}
            onChange={(e) => reset(() => setAction(e.target.value))}
          >
            <option value="">Все</option>
            {ACTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Объект</Label>
          <Select
            className="w-44"
            value={targetType}
            onChange={(e) => reset(() => setTargetType(e.target.value))}
          >
            <option value="">Любой</option>
            {TARGETS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <span className="pb-2.5 text-sm text-muted-foreground">
          {total} {isFetching && <Spinner className="ml-1 inline h-3 w-3" />}
        </span>
      </div>

      {!items.length ? (
        <EmptyState icon={ScrollText} title="Событий нет" description="Под выбранные фильтры ничего не попало." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-4">
                <Badge variant={TARGET_BADGE[e.target_type] ?? "secondary"} className="shrink-0 self-start">
                  {e.action_label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.actor_label} · {formatDate(e.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {from}–{to} из {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || isFetching}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Позже
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={to >= total || isFetching}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Раньше
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
