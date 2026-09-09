import { useMyClasses } from "@/api/classes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

export function MyClassesPage() {
  const { data, isLoading } = useMyClasses();
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Мои классы</h1>
      {!data?.length && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Вас пока не добавили ни в один класс. Логин и пароль выдает учитель.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Учитель: {c.teacher_name}
              <br />
              Добавлены: {formatDate(c.joined_at)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
