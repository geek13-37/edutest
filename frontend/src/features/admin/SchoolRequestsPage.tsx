import { Check, Copy, Eye, Mail, X } from "lucide-react";
import { useState } from "react";

import { useApproveSchoolRequest, useRejectSchoolRequest, useSchoolRequests } from "@/api/admin";
import type { SchoolRequestAdmin, SchoolRequestStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const TABS: [SchoolRequestStatus | "all", string][] = [
  ["pending", "На рассмотрении"],
  ["approved", "Одобренные"],
  ["rejected", "Отклоненные"],
  ["all", "Все"],
];

const STATUS_LABEL: Record<SchoolRequestStatus, string> = {
  pending: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const STATUS_BADGE: Record<SchoolRequestStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  approved: "success",
  rejected: "destructive",
};

function mailtoHref(r: SchoolRequestAdmin) {
  const subject = encodeURIComponent(`Заявка на подключение школы «${r.school_name}»`);
  const bodyLines = r.signup_code
    ? [
        "Здравствуйте!",
        "",
        `Школа «${r.school_name}» подключена к Edutest. Чтобы зарегистрироваться, учителя ` +
          "переходят на страницу регистрации и указывают код школы.",
        "",
        `Ваш код: ${r.signup_code.toLowerCase()}`,
        "",
        "Вам нужно зарегистрироваться под контактными данными " +
          `(${r.contact_name}, ${r.contact_email}) для получения роли завуча школы.`,
      ]
    : [
        "Здравствуйте!",
        "",
        `Спасибо за заявку на подключение школы «${r.school_name}» к Edutest. Мы её рассматриваем ` +
          "и скоро свяжемся с вами.",
      ];
  const body = encodeURIComponent(bodyLines.join("\n"));
  return `mailto:${r.contact_email}?subject=${subject}&body=${body}`;
}

function requestAsText(r: SchoolRequestAdmin) {
  return [
    `Школа: ${r.school_name}`,
    `Город: ${r.city}${r.region ? `, ${r.region}` : ""}`,
    `Контакт: ${r.contact_name}`,
    r.contact_email && `Email: ${r.contact_email}`,
    r.contact_phone && `Телефон: ${r.contact_phone}`,
    r.comment && `Комментарий: ${r.comment}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function ApproveRejectButtons({
  className,
  size,
  approving,
  onApprove,
  onReject,
}: {
  className?: string;
  size?: "sm";
  approving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className={className}>
      <Button size={size} className={size ? undefined : "flex-1"} onClick={onApprove} disabled={approving}>
        <Check className="h-4 w-4" />
        <span>Создать школу</span>
      </Button>
      <Button variant="outline" size={size} className={size ? undefined : "flex-1"} onClick={onReject}>
        <X className="h-4 w-4" />
        <span>Отклонить</span>
      </Button>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="flex items-start justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words">{value}</dd>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        title="Копировать"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          toast("Скопировано", "success");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function SchoolRequestsPage() {
  const [tab, setTab] = useState<SchoolRequestStatus | "all">("pending");
  const { data, isLoading } = useSchoolRequests(tab === "all" ? undefined : tab);
  const approve = useApproveSchoolRequest();
  const reject = useRejectSchoolRequest();
  const toast = useToast();

  const [reveal, setReveal] = useState<SchoolRequestAdmin | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState<SchoolRequestAdmin | null>(null);

  const doApprove = (id: string, schoolName: string) => {
    if (!confirm(`Создать школу «${schoolName}» по этой заявке?`)) return;
    approve.mutate(id, {
      onSuccess: (res) => setReveal(res.request),
      onError: (e) => toast(apiError(e), "error"),
    });
  };

  const submitReject = () => {
    if (!rejectId) return;
    reject.mutate(
      { id: rejectId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setRejectId(null);
          setReason("");
          toast("Заявка отклонена", "success");
        },
        onError: (e) => toast(apiError(e), "error"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Заявки на подключение</h1>

      <div className="flex w-fit flex-wrap gap-1 rounded-lg border p-1">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === value
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
            {tab === "pending" ? "Новых заявок нет." : "Здесь пока пусто."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>{r.school_name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.city}
                    {r.region ? `, ${r.region}` : ""} · заявка от {formatDate(r.created_at)}
                  </p>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                  {r.status === "rejected" && r.reject_reason && (
                    <p className="mt-2 text-xs text-destructive">Причина: {r.reject_reason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => setDetail(r)}>
                    <Eye className="h-4 w-4" />
                    <span>Открыть</span>
                  </Button>
                  {r.status === "pending" && (
                    <ApproveRejectButtons
                      size="sm"
                      className="flex gap-1"
                      approving={approve.isPending}
                      onApprove={() => doApprove(r.id, r.school_name)}
                      onReject={() => setRejectId(r.id)}
                    />
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={reveal !== null}
        dismissible={false}
        onClose={() => setReveal(null)}
        title="Школа создана"
        description="Код регистрации показывается только сейчас. Скопируйте его и передайте школе - позже его можно только перевыпустить заново."
      >
        {reveal && (
          <div className="space-y-4">
            <p className="text-sm">{reveal.school_name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-sm text-muted-foreground">Код регистрации учителей:</span>
              <span className="rounded-md bg-secondary px-3 py-1.5 font-mono tracking-wide">
                {reveal.signup_code?.toLowerCase()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                title="Копировать"
                onClick={() => {
                  navigator.clipboard?.writeText(reveal.signup_code?.toLowerCase() ?? "");
                  toast("Скопировано", "success");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {reveal.contact_email && (
              <a href={mailtoHref(reveal)} className="block">
                <Button className="w-full">
                  <Mail className="h-4 w-4" />
                  <span>Написать письмо с кодом</span>
                </Button>
              </a>
            )}
            <Button variant="outline" className="w-full" onClick={() => setReveal(null)}>
              Я передал(а) код
            </Button>
          </div>
        )}
      </Dialog>

      <Dialog
        open={rejectId !== null}
        onClose={() => {
          setRejectId(null);
          setReason("");
        }}
        title="Отклонить заявку"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Причина (необязательно)</Label>
            <Textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: недостаточно данных, дубликат заявки"
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={submitReject}
            disabled={reject.isPending}
          >
            {reject.isPending && <Spinner />}
            <span>Отклонить заявку</span>
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.school_name}
        className="max-w-lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
              <span className="text-xs text-muted-foreground">
                заявка от {formatDate(detail.created_at)}
              </span>
            </div>

            <dl className="text-sm">
              <CopyField label="Школа" value={detail.school_name} />
              <CopyField
                label="Город"
                value={`${detail.city}${detail.region ? `, ${detail.region}` : ""}`}
              />
              <CopyField label="Контактное лицо" value={detail.contact_name} />
              {detail.contact_email && <CopyField label="Email" value={detail.contact_email} />}
              {detail.contact_phone && <CopyField label="Телефон" value={detail.contact_phone} />}
              {detail.comment && <CopyField label="Комментарий" value={detail.comment} />}
              {detail.signup_code && (
                <CopyField label="Код регистрации" value={detail.signup_code.toLowerCase()} />
              )}
              {detail.status === "rejected" && detail.reject_reason && (
                <CopyField label="Причина отказа" value={detail.reject_reason} />
              )}
              {detail.decided_at && (
                <CopyField label="Решение принято" value={formatDate(detail.decided_at)} />
              )}
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(requestAsText(detail));
                  toast("Скопировано", "success");
                }}
              >
                <Copy className="h-4 w-4" />
                <span>Скопировать всё</span>
              </Button>
              {detail.contact_email && (
                <a href={mailtoHref(detail)}>
                  <Button size="sm">
                    <Mail className="h-4 w-4" />
                    <span>{detail.signup_code ? "Написать письмо с кодом" : "Написать письмо"}</span>
                  </Button>
                </a>
              )}
            </div>

            {detail.status === "pending" && (
              <ApproveRejectButtons
                className="flex gap-2 border-t pt-4"
                approving={approve.isPending}
                onApprove={() => {
                  setDetail(null);
                  doApprove(detail.id, detail.school_name);
                }}
                onReject={() => {
                  setDetail(null);
                  setRejectId(detail.id);
                }}
              />
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
