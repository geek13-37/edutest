import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Wand2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import type { SchoolPublic } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassphraseDialog } from "@/components/ui/passphrase-dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeFor } from "@/lib/nav";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", school_code: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  const code = form.school_code.trim().toLowerCase();
  const school = useQuery({
    queryKey: ["school-by-code", code],
    enabled: code.length >= 4,
    retry: false,
    queryFn: async () => (await api.get<SchoolPublic>(`/auth/school-by-code/${code}`)).data,
  });

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, school_code: code });
      navigate("/teacher");
    } catch (err) {
      setError(apiError(err, "Не удалось зарегистрироваться"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <GraduationCap className="h-8 w-8 text-primary" />
          <CardTitle>Регистрация учителя</CardTitle>
          <CardDescription>
            Нужен код школы от администратора. Аккаунты учеников создает учитель.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Код школы</Label>
              <Input
                id="code"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={form.school_code}
                onChange={(e) => setForm({ ...form, school_code: e.target.value.toLowerCase() })}
                className="font-mono tracking-wide"
              />
              {code.length >= 4 && school.isFetching && (
                <p className="text-xs text-muted-foreground">Проверка кода…</p>
              )}
              {school.data && (
                <p className="text-xs text-success">
                  {school.data.name}, {school.data.city}
                </p>
              )}
              {code.length >= 4 && school.isError && (
                <p className="text-xs text-destructive">Школа с таким кодом не найдена</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">ФИО</Label>
              <Input
                id="name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Иванова Анна Петровна"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
                <button
                  type="button"
                  onClick={() => setGenOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Сгенерировать
                </button>
              </div>
              <PasswordInput
                id="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="минимум 8 символов, или сгенерируйте"
                visible={pwVisible}
                onVisibleChange={setPwVisible}
              />
              <p className="text-xs text-muted-foreground">
                Свой пароль сможете сбросить только через администратора школы. Запишите его.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !school.data}>
              {busy && <Spinner />} Создать аккаунт
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>

      <PassphraseDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onUse={(passphrase) => {
          setForm((f) => ({ ...f, password: passphrase }));
          setPwVisible(true);
          setGenOpen(false);
          navigator.clipboard?.writeText(passphrase);
          toast("Пароль вставлен и скопирован. Сохраните его в надежном месте.", "success");
        }}
      />
    </div>
  );
}
