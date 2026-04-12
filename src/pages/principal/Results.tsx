import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Eye, Send } from "lucide-react";
import { toast } from "sonner";

interface ResultRow {
  _id: string;
  examName?: string;
  studentClass?: string;
  section?: string;
  isPublished?: boolean;
  totalMarks?: number;
  gpa?: number;
  studentId?: { name?: string; roll?: number };
  subjects?: Array<{ subjectName?: string; marks?: number }>;
}

export default function ResultsPage() {
  const qc = useQueryClient();

  const { data: results = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["results"],
    queryFn: async () => {
      const res = await api.get("/results", { params: { limit: 100 } });
      return extractApiArray<ResultRow>(res.data, ["results"]);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const res = await api.put(`/results/${resultId}/publish`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Result published successfully");
      qc.invalidateQueries({ queryKey: ["results"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to publish result");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const res = await api.put(`/results/${resultId}/unpublish`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Result unpublished successfully");
      qc.invalidateQueries({ queryKey: ["results"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to unpublish result");
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Results" description="Review and publish student results" />
        <EmptyState
          title="Failed to load results"
          description={getErrorMessage(error, "Please try again.")}
          icon={BookMarked}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Results" description="Review and publish student results" />
      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Results appear after teachers enter marks for exams."
          icon={BookMarked}
        />
      ) : (
        <div className="space-y-3">
          {results.map((r: ResultRow, i: number) => {
            const studentLabel = r.studentId?.name
              ? `${r.studentId.name} (Roll ${r.studentId.roll ?? "-"})`
              : "Student";
            const classLabel =
              r.studentClass || r.section
                ? [r.studentClass, r.section].filter(Boolean).join(" - ")
                : "-";
            const summary =
              r.subjects?.length != null
                ? `${r.subjects.length} subject(s) - Total ${r.totalMarks ?? "-"} - GPA ${r.gpa ?? "-"}`
                : "";
            return (
              <div
                key={r._id || i}
                className="bg-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold">{r.examName || `Result ${i + 1}`}</h3>
                  <p className="text-sm text-muted-foreground">
                    {studentLabel} - {classLabel}
                  </p>
                  {summary ? <p className="text-xs text-muted-foreground mt-1">{summary}</p> : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={r.isPublished ? "default" : "secondary"}>
                    {r.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {!r.isPublished ? (
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate(r._id)}
                      disabled={publishMutation.isPending || unpublishMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {publishMutation.isPending ? "Publishing..." : "Publish"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unpublishMutation.mutate(r._id)}
                      disabled={publishMutation.isPending || unpublishMutation.isPending}
                    >
                      {unpublishMutation.isPending ? "Unpublishing..." : "Unpublish"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" type="button" disabled title="Detail view not wired">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

