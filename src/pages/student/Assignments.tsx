import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FileText } from "lucide-react";

interface StudentAssignment {
  _id?: string;
  title?: string;
  description?: string;
  dueDate?: string;
}

export default function StudentAssignmentsPage() {
  const { data: assignments = [], isLoading, isError, error, refetch, isFetching } = useQuery<StudentAssignment[]>({
    queryKey: ["student-assignments"],
    queryFn: async () => {
      const res = await api.get("/student/assignments");
      return extractApiArray<StudentAssignment>(res.data, ["assignments"]);
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Assignments" description="Your class assignments" />
        <EmptyState
          title="Assignments unavailable"
          description={getErrorMessage(error, "Please try again.")}
          icon={FileText}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Assignments" description="Your class assignments" />
      {assignments.length === 0 ? (
        <EmptyState title="No assignments" description="Assignments from teachers will appear here" icon={FileText} />
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment, index: number) => (
            <div key={assignment._id || `${assignment.title || "assignment"}-${index}`} className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold">{assignment.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
              <p className="text-xs text-muted-foreground mt-2">Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "-"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
