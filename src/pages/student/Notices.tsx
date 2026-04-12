import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Bell } from "lucide-react";

interface StudentNotice {
  _id: string;
  title?: string;
  description?: string;
  content?: string;
  publishedAt?: string;
  createdAt?: string;
  priority?: string;
}

export default function StudentNoticesPage() {
  const { data: notices = [], isLoading, isError, error, refetch, isFetching } = useQuery<StudentNotice[]>({
    queryKey: ["student-notices"],
    queryFn: async () => {
      const res = await api.get("/student/notices");
      return extractApiArray<StudentNotice>(res.data, ["notices"]);
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Notices" description="School announcements" />
        <EmptyState
          title="Failed to load notices"
          description={getErrorMessage(error, "Please try again.")}
          icon={Bell}
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notices" description="School announcements" />
      {notices.length === 0 ? (
        <EmptyState title="No notices" description="School announcements will appear here" icon={Bell} />
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice._id} className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold">{notice.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{notice.description || notice.content || "No details available"}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{(notice.publishedAt || notice.createdAt) ? new Date(notice.publishedAt || notice.createdAt || "").toLocaleDateString() : ""}</p>
                {(notice.priority === "high" || notice.priority === "urgent") && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">Urgent</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
