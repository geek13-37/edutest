import { BookOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useClasses } from "@/api/classes";
import { useTests } from "@/api/tests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { pluralRu } from "@/lib/utils";
import { OnboardingChecklist } from "./OnboardingChecklist";

export function TeacherDashboard() {
  const classes = useClasses();
  const tests = useTests();

  if (classes.isLoading || tests.isLoading) return <PageLoader />;

  const publishedCount = tests.data?.filter((t) => t.status === "published").length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>

      <OnboardingChecklist />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/teacher/classes">
          <Card className="transition-colors hover:border-primary">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Классы</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {classes.data?.length ?? 0}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {pluralRu(classes.data?.length ?? 0, ["класс", "класса", "классов"])}
              </span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/teacher/tests">
          <Card className="transition-colors hover:border-primary">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle>Тесты</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {tests.data?.length ?? 0}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                из них {publishedCount} опубликовано
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
