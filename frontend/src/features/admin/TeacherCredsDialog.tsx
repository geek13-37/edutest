import { Copy } from "lucide-react";

import type { TeacherCredentials } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function TeacherCredsDialog({
  creds,
  onClose,
}: {
  creds: TeacherCredentials | null;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!creds) return null;

  const copy = () => {
    navigator.clipboard?.writeText(`${creds.email}\n${creds.password}`);
    toast("Скопировано", "success");
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Пароль учителя"
      description="Передайте учителю. Позже пароль можно только сбросить."
    >
      <div className="space-y-3">
        <div className="rounded-md border p-3 text-sm">
          <div className="text-muted-foreground">{creds.full_name}</div>
          <div className="mt-1">
            Логин: <span className="font-mono">{creds.email}</span>
          </div>
          <div>
            Пароль: <span className="font-mono">{creds.password}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="h-4 w-4" />
          <span>Скопировать</span>
        </Button>
      </div>
    </Dialog>
  );
}
