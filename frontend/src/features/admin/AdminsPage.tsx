import { Plus, Wand2 } from "lucide-react";
import { useState } from "react";

import { useAdmins, useCreateAdmin } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassphraseDialog } from "@/components/ui/passphrase-dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export function AdminsPage() {
  const { data, isLoading } = useAdmins();
  const create = useCreateAdmin();
  const toast = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  if (isLoading) return <PageLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ ...form, full_name: form.full_name.trim(), email: form.email.trim() });
      setOpen(false);
      setForm({ full_name: "", email: "", password: "" });
      setPwVisible(false);
      toast("Администратор создан", "success");
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Администраторы</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Новый админ</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{data?.length ?? 0} администраторов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.map((a) => (
            <div key={a.id} className="rounded-md border p-2 text-sm">
              <div className="font-medium">
                {a.full_name}
                {a.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(вы)</span>}
              </div>
              <div className="break-words text-xs text-muted-foreground">
                {a.email} · {formatDate(a.created_at)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Новый администратор">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>ФИО</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Пароль</Label>
              <button
                type="button"
                onClick={() => setGenOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Сгенерировать</span>
              </button>
            </div>
            <PasswordInput
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="минимум 8 символов, или сгенерируйте"
              visible={pwVisible}
              onVisibleChange={setPwVisible}
            />
            <p className="text-xs text-muted-foreground">
              Передайте пароль новому администратору. Сбросить его может другой администратор.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            <span>Создать</span>
          </Button>
        </form>
      </Dialog>

      <PassphraseDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onUse={(passphrase) => {
          setForm((f) => ({ ...f, password: passphrase }));
          setPwVisible(true);
          setGenOpen(false);
          navigator.clipboard?.writeText(passphrase);
          toast("Пароль вставлен и скопирован. Передайте его администратору.", "success");
        }}
      />
    </div>
  );
}
