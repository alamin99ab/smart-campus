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
  examId?: string;
  examName?: string;
  studentClass?: string;
  classId?: string;
  section?: string;
  sectionId?: string;
  isPublished?: boolean;
  totalMarks?: number;
  gpa?: number;
  studentId?: { name?: string; roll?: number };
  subjects?: Array<{ subjectName?: string; marks?: number }>;
}

interface ExamGroup {
  examId: string;
  examName: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  results: ResultRow[];
  isPublished: boolean;
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
    mutationFn: async (params: { examId: string; classId: string; sectionId?: string }) => {
      const res = await api.post("/results/publish", params);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Results published successfully");
      qc.invalidateQueries({ queryKey: ["results"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to publish results");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (params: { examId: string; classId: string; sectionId?: string }) => {
      const res = await api.post("/results/unpublish", params);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Results unpublished successfully");
      qc.invalidateQueries({ queryKey: ["results"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to unpublish results");
    },
  });

  // Group results by exam/class/section for exam-wise publish workflow
  const groupedResults = results.reduce((acc: ExamGroup[], result) => {
    const key = `${result.examId || 'unknown'}-${result.classId || 'unknown'}-${result.sectionId || 'no-section'}`;
    let group = acc.find(g => g.examId === result.examId && g.classId === result.classId && g.sectionId === result.sectionId);
    
    if (!group) {
      group = {
        examId: result.examId || '',
        examName: result.examName || 'Unknown Exam',
        classId: result.classId || '',
        className: result.studentClass || 'Unknown Class',
        sectionId: result.sectionId,
        sectionName: result.section,
        results: [],
        isPublished: result.isPublished || false
      };
      acc.push(group);
    }
    
    group.results.push(result);
    // Update publish status if any result in the group is published
    if (result.isPublished) {
      group.isPublished = true;
    }
    
    return acc;
  }, []);

  const handlePublish = (group: ExamGroup) => {
    publishMutation.mutate({
      examId: group.examId,
      classId: group.classId,
      ...(group.sectionId && { sectionId: group.sectionId })
    });
  };

  const handleUnpublish = (group: ExamGroup) => {
    unpublishMutation.mutate({
      examId: group.examId,
      classId: group.classId,
      ...(group.sectionId && { sectionId: group.sectionId })
    });
  };

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
      {groupedResults.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Results appear after teachers enter marks for exams."
          icon={BookMarked}
        />
      ) : (
        <div className="space-y-6">
          {groupedResults.map((group, i) => (
            <div key={`${group.examId}-${group.classId}-${group.sectionId}`} className="bg-card rounded-xl border">
              <div className="p-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{group.examName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.className}{group.sectionName ? ` - ${group.sectionName}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.results.length} student{group.results.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={group.isPublished ? "default" : "secondary"}>
                      {group.isPublished ? "Published" : "Draft"}
                    </Badge>
                    {!group.isPublished ? (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(group)}
                        disabled={publishMutation.isPending || unpublishMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {publishMutation.isPending ? "Publishing..." : "Publish All"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnpublish(group)}
                        disabled={publishMutation.isPending || unpublishMutation.isPending}
                      >
                        {unpublishMutation.isPending ? "Unpublishing..." : "Unpublish All"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {group.results.slice(0, 5).map((result, idx) => {
                    const studentLabel = result.studentId?.name
                      ? `${result.studentId.name} (Roll ${result.studentId.roll ?? "-"})`
                      : "Student";
                    const summary =
                      result.subjects?.length != null
                        ? `${result.subjects.length} subject(s) - Total ${result.totalMarks ?? "-"} - GPA ${result.gpa ?? "-"}`
                        : "";
                    return (
                      <div key={result._id || idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="text-sm font-medium">{studentLabel}</p>
                          {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
                        </div>
                        <Badge variant={result.isPublished ? "default" : "secondary"} className="text-xs">
                          {result.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    );
                  })}
                  {group.results.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... and {group.results.length - 5} more students
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

