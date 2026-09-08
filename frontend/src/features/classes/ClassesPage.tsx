import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useClasses, useCreateClass } from "@/api/classes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn, pluralRu } from "@/lib/utils";

export function ClassesPage() {
  const { data, isLoading } = useClasses();
  const create = useCreateClass();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"parallel" | "custom">("parallel");
  const [grade, setGrade] = useState(5);
  const [letter, setLetter] = useState("А");
  const [name, setName] = useState("");

  if (isLoading) return <PageLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const klass = await create.mutateAsync(
        mode === "parallel" ? { grade, letter: letter.trim() } : { name: name.trim() },
      );
      setOpen(false);
      setName("");
      toast("Класс создан, теперь добавьте учеников", "success");
      navigate(`/teacher/classes/${klass.id}`);
    } catch (err) {
      toast(apiError(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Классы</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Новый класс
        </Button>
      </div>

      {!data?.length && (
        <EmptyState
          icon={Users}
          title="У вас пока нет классов"
          description="Класс: список учеников школы. Учителя одной школы ведут ее классы совместно. Заведите класс, добавьте в него учеников, затем назначайте классу тесты."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Создать первый класс
            </Button>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/teacher/classes/${c.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{c.display_name}</CardTitle>
                  {c.archived && <Badge variant="secondary">архив</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {c.members_count} {pluralRu(c.members_count, ["ученик", "ученика", "учеников"])}
                </div>
                {!c.is_mine && <div className="text-xs">автор: {c.created_by_name}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Новый класс">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["parallel", "Параллель"],
                ["custom", "Свое название"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md border p-2 text-sm font-medium transition-colors",
                  mode === m ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "parallel" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Класс сейчас</Label>
                  <Select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Буква</Label>
                  <Input
                    value={letter}
                    maxLength={4}
                    onChange={(e) => setLetter(e.target.value.toUpperCase())}
                    placeholder="А"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Номер класса будет автоматически расти каждый год 1 сентября.
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="cname">Название</Label>
              <Input
                id="cname"
                autoFocus
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Подготовка к ОГЭ"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={create.isPending || (mode === "parallel" && !letter.trim())}
            className="w-full"
          >
            {create.isPending && <Spinner />} Создать
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
