import { Shield } from "lucide-react";

import { ShellLayout, type NavEntry } from "@/components/layout/ShellLayout";

const nav: NavEntry[] = [
  { to: "/admin", label: "Обзор", end: true },
  { to: "/admin/schools", label: "Школы" },
  { to: "/admin/teachers", label: "Учителя" },
  { to: "/admin/admins", label: "Админы" },
  { to: "/admin/audit", label: "Журнал" },
];

export function AdminShell() {
  return (
    <ShellLayout
      nav={nav}
      brandTo="/admin"
      brandIcon={<Shield className="h-5 w-5 shrink-0 text-primary" />}
      brandSuffix="Админ"
      accountSubtitle="Администратор"
    />
  );
}
