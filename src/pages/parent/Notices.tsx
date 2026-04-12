import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Bell } from "lucide-react";

interface ParentNotice {
  _id: string;
  title?: string;
  description?: string;
  content?: string;
}

export default function ParentNoticesPage() {
  const { data: notices = [], isLoading, isError, error, refetch, isFetching } = useQuery<ParentNotice[]>({
    queryKey: ["parent-notices"],
    queryFn: async () => {
      const res = await api.get("/parent/notices");
      return extractApiArray<ParentNotice>(res.data, ["notices"]);
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
        <EmptyState title="No notices" icon={Bell} />
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice._id} className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold">{notice.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{notice.description || notice.content || "No details available"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
