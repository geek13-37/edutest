import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeFor, safeNext } from "@/lib/nav";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const next = safeNext(search.get("next"), "");
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next || homeFor(user.role)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(loginValue.trim(), password);
      navigate(next || "/");
    } catch (err) {
      setError(apiError(err, "Не удалось войти"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <GraduationCap className="h-8 w-8 text-primary" />
          <CardTitle>Вход в Edutest</CardTitle>
          <CardDescription>Платформа образовательных тестирований</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">Email или логин</Label>
              <Input
                id="login"
                required
                autoCapitalize="none"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Spinner />}
              <span>Войти</span>
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Учитель?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
