import { BookOpen, GraduationCap, KeyRound, Users } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useResetSchoolTeacherPassword, useSchoolStats, useSchoolTeachers } from "@/api/schoolLead";
import type { TeacherCredentials } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TeacherCredsDialog } from "../admin/TeacherCredsDialog";

const STAT_TILES: { key: "teachers" | "students" | "classes" | "tests"; label: string; icon: typeof Users }[] = [
  { key: "teachers", label: "Учителей", icon: Users },
  { key: "students", label: "Учеников", icon: GraduationCap },
  { key: "classes", label: "Классов", icon: Users },
  { key: "tests", label: "Тестов", icon: BookOpen },
];

export function SchoolLeadPage() {
  const { user } = useAuth();
  const teachers = useSchoolTeachers();
  const stats = useSchoolStats();
  const resetPw = useResetSchoolTeacherPassword();
  const toast = useToast();
  const [creds, setCreds] = useState<TeacherCredentials | null>(null);

  if (!user?.is_lead) return <Navigate to="/teacher" replace />;
  if (teachers.isLoading || stats.isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Школа</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_TILES.map((t) => (
          <Card key={t.key}>
            <CardContent className="space-y-1 py-5">
              <t.icon className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold tabular-nums">{stats.data?.[t.key] ?? 0}</div>
              <div className="text-sm text-muted-foreground">{t.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Учителя школы</h2>
        <div className="space-y-2">
          {!teachers.data?.length && (
            <p className="text-sm text-muted-foreground">Учителей пока нет.</p>
          )}
          {teachers.data?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {t.full_name}
                  {t.is_lead && <Badge variant="ai">завуч</Badge>}
                  {!t.is_active && <Badge variant="destructive">отключен</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{t.email}</div>
              </div>
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
            </div>
          ))}
        </div>
      </div>

      <TeacherCredsDialog creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
