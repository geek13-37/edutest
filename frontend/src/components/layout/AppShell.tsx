import { GraduationCap } from "lucide-react";

import { ShellLayout, type NavEntry } from "@/components/layout/ShellLayout";
import { useAuth } from "@/lib/auth";

function teacherNav(isLead: boolean): NavEntry[] {
  return [
    { to: "/teacher", label: "Обзор", end: true },
    { to: "/teacher/classes", label: "Классы" },
    { to: "/teacher/tests", label: "Тесты" },
    ...(isLead ? [{ to: "/teacher/school", label: "Школа" }] : []),
  ];
}

const studentNav: NavEntry[] = [
  { to: "/app", label: "Мои тесты", end: true },
  { to: "/app/classes", label: "Мои классы" },
];

export function AppShell() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  return (
    <ShellLayout
      nav={isTeacher ? teacherNav(user?.is_lead ?? false) : studentNav}
      brandTo={isTeacher ? "/teacher" : "/app"}
      brandIcon={<GraduationCap className="h-5 w-5 shrink-0 text-primary" />}
      accountSubtitle={
        isTeacher ? (user?.school?.name ?? undefined) : (user?.username ?? undefined)
      }
    />
  );
}
