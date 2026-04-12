import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** GET /student/results -> data[] matches Result model (exam card per document) */
interface PublishedResult {
  _id: string;
  examName?: string;
  examDate?: string;
  totalMarks?: number;
  gpa?: number;
  subjects?: Array<{ subjectName?: string; marks?: number; grade?: string }>;
}

export default function StudentResultsPage() {
  const { data: results = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["student-results"],
    queryFn: async () => {
      const res = await api.get("/student/results");
      return extractApiArray<PublishedResult>(res.data, ["results"]);
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="My Results" description="Published exam results" />
        <EmptyState
          title="Results unavailable"
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
      <PageHeader title="My Results" description="Published exam results" />
      {results.length === 0 ? (
        <EmptyState
          title="No results published"
          description="If you expect marks here, your school must link your login to a student record (class & roll)."
          icon={BookMarked}
        />
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r._id} className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{r.examName || "Exam"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.examDate ? new Date(r.examDate).toLocaleDateString() : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.totalMarks != null && (
                    <Badge variant="secondary">Total {r.totalMarks}</Badge>
                  )}
                  {r.gpa != null && <Badge variant="outline">GPA {r.gpa}</Badge>}
                </div>
              </div>
              {r.subjects && r.subjects.length > 0 ? (
                <ul className="text-sm space-y-1 border-t pt-3">
                  {r.subjects.map((s, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{s.subjectName}</span>
                      <span className="text-muted-foreground">
                        {s.marks ?? "-"} - {s.grade ?? "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

