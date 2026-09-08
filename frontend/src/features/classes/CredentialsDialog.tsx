import { Copy, FileText, Printer, Table } from "lucide-react";

import { downloadCsv, downloadHandoutsPdf } from "@/api/students";
import type { StudentCredentials } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";

export function CredentialsDialog({
  classId,
  items,
  onClose,
}: {
  classId: string;
  items: StudentCredentials[] | null;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!items) return null;

  const copyAll = () => {
    const text = items.map((i) => `${i.full_name}\t${i.username}\t${i.password}`).join("\n");
    navigator.clipboard?.writeText(text);
    toast("Скопировано", "success");
  };

  return (
    <Dialog
      open
      dismissible={false}
      onClose={onClose}
      className="max-w-xl"
      title="Логины и пароли"
      description="Пароли показываются только сейчас. Позже пароль можно лишь сбросить. Скачайте или распечатайте список перед закрытием."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() =>
              downloadHandoutsPdf(classId, items).catch((e) => toast(apiError(e), "error"))
            }
          >
            <Printer className="h-4 w-4" /> PDF для печати
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(items)}>
            <Table className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={copyAll}>
            <Copy className="h-4 w-4" /> Скопировать
          </Button>
        </div>

        <div className="max-h-72 overflow-auto rounded-md border">
          <table className="w-full min-w-[20rem] text-sm">
            <thead className="bg-secondary text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">ФИО</th>
                <th className="px-3 py-2 font-medium">Логин</th>
                <th className="px-3 py-2 font-medium">Пароль</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-3 py-2">{i.full_name}</td>
                  <td className="px-3 py-2 font-mono">{i.username}</td>
                  <td className="px-3 py-2 font-mono">{i.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          В PDF на каждой карточке QR-код для входа, логин и пароль. Карточки
          отделены пунктиром, чтобы разрезать и раздать.
        </p>

        <Button variant="outline" className="w-full" onClick={onClose}>
          Я сохранил(а) логины
        </Button>
      </div>
    </Dialog>
  );
}
