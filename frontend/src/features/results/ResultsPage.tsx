import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAssignmentResults } from "@/api/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { tokenStore } from "@/lib/tokens";
import { formatDate } from "@/lib/utils";
import { AttemptReviewDialog } from "./AttemptReviewDialog";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Сдан",
  expired: "Время вышло",
  in_progress: "В процессе",
};

export function ResultsPage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useAssignmentResults(id);
  const [reviewId, setReviewId] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;
  if (!data) return <p>Не найдено</p>;

  const download = async () => {
    const res = await fetch(`/api/v1/assignments/${id}/results/export.xlsx`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${data.test_title}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Link to="/teacher/classes" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        <span>К классам</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.test_title}</h1>
          <p className="text-sm text-muted-foreground">{data.class_name}</p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download className="h-4 w-4" />
          <span>Экспорт в Excel</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Учеников" value={data.total_students} />
        <Stat label="Сдали" value={`${data.submitted_count} / ${data.total_students}`} />
        <Stat label="Средний %" value={data.average_percent != null ? `${data.average_percent}%` : "-"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Результаты</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Ученик</th>
                <th className="pb-2 pr-4 font-medium">Попыток</th>
                <th className="pb-2 pr-4 font-medium">Балл</th>
                <th className="pb-2 pr-4 font-medium">%</th>
                <th className="pb-2 pr-4 font-medium">Оценка</th>
                <th className="pb-2 pr-4 font-medium">Статус</th>
                <th className="pb-2 font-medium">Активность</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.student_id}
                  className={r.best_attempt_id ? "cursor-pointer border-b hover:bg-accent/50" : "border-b"}
                  onClick={() => r.best_attempt_id && setReviewId(r.best_attempt_id)}
                >
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.student_name}</div>
                    <div className="text-xs text-muted-foreground">{r.student_login}</div>
                  </td>
                  <td className="py-2 pr-4">{r.attempts_used}</td>
                  <td className="py-2 pr-4">
                    {r.best_score != null ? `${r.best_score} / ${r.max_score}` : "-"}
                  </td>
                  <td className="py-2 pr-4">{r.best_percent != null ? `${r.best_percent}%` : "-"}</td>
                  <td className="py-2 pr-4">
                    {r.grade ? (
                      <Badge variant={Number(r.grade) >= 4 ? "success" : Number(r.grade) >= 3 ? "warning" : "destructive"}>
                        {r.grade}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {r.status ? STATUS_LABEL[r.status] ?? r.status : <span className="text-muted-foreground">не приступал(а)</span>}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{formatDate(r.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AttemptReviewDialog attemptId={reviewId} onClose={() => setReviewId(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
