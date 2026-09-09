import { Building2, GraduationCap, MoonStar, School, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useAnalytics, useStats } from "@/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

import { SchoolPercentBars, TrendArea, type TrendKey } from "./charts";

export function AdminDashboard() {
  const { data: stats, isLoading } = useStats();
  const { data: a, isLoading: aLoading } = useAnalytics();

  if (isLoading) return <PageLoader />;

  const counts = [
    { icon: School, label: "Школы", value: stats?.schools ?? 0, to: "/admin/schools" },
    { icon: Users, label: "Учителя", value: stats?.teachers ?? 0, to: "/admin/teachers" },
    { icon: GraduationCap, label: "Ученики", value: stats?.students ?? 0 },
    { icon: Building2, label: "Классы", value: stats?.classes ?? 0 },
  ];

  const totals = [
    { label: "Прохождений всего", value: a?.totals.attempts_total ?? 0 },
    { label: "Проведено тестов", value: a?.totals.tests_conducted ?? 0 },
    {
      label: "Средний результат",
      value: a?.totals.avg_percent != null ? `${a.totals.avg_percent}%` : "нет",
    },
  ];

  const trends: { key: TrendKey; label: string; tone: "primary" | "ai" | "success" }[] = [
    { key: "new_schools", label: "Новые школы", tone: "primary" },
    { key: "new_teachers", label: "Новые учителя", tone: "ai" },
    { key: "attempts", label: "Прохождения", tone: "success" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((t) => {
          const inner = (
            <Card className={t.to ? "h-full transition-colors hover:border-primary" : "h-full"}>
              <CardContent className="py-5">
                <t.icon className="mb-2 h-6 w-6 text-primary" />
                <div className="text-3xl font-bold tabular-nums">{t.value}</div>
                <div className="text-sm text-muted-foreground">{t.label}</div>
              </CardContent>
            </Card>
          );
          return t.to ? (
            <Link key={t.label} to={t.to}>
              {inner}
            </Link>
          ) : (
            <div key={t.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {totals.map((t) => (
          <Card key={t.label}>
            <CardContent className="py-4">
              <div className="text-2xl font-bold tabular-nums">{t.value}</div>
              <div className="text-sm text-muted-foreground">{t.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Динамика за 12 недель</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {trends.map((tr) => (
            <div key={tr.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{tr.label}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {a?.weekly.reduce((s, w) => s + w[tr.key], 0) ?? 0}
                </span>
              </div>
              {aLoading || !a ? (
                <div className="h-28 animate-pulse rounded-md bg-muted" />
              ) : (
                <TrendArea data={a.weekly} dataKey={tr.key} tone={tr.tone} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Активные школы за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading || !a ? (
              <div className="h-40 animate-pulse rounded-md bg-muted" />
            ) : (
              <SchoolPercentBars
                data={a.top_schools.map((s) => ({
                  name: s.name.replace(/^(МАОУ|МБОУ|МОУ|ГБОУ)\s*/i, "").slice(0, 24),
                  avg_percent: s.avg_percent,
                  attempts: s.attempts,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Спящие школы</CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading || !a ? (
              <div className="h-40 animate-pulse rounded-md bg-muted" />
            ) : !a.dormant_schools.length ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <MoonStar className="h-4 w-4" />
                <span>Все школы что-то проводили за последний месяц.</span>
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {a.dormant_schools.map((s) => (
                  <div key={s.school_id} className="rounded-md border p-2 text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.city} ·{" "}
                      {s.last_activity
                        ? `последняя работа ${formatDate(s.last_activity)}`
                        : "ни одной работы"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
