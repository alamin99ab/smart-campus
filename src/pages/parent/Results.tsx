import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BookMarked, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Child {
  _id: string;
  name: string;
}

interface ChildResultRow {
  examName?: string;
  exam?: string;
  subjectName?: string;
  subject?: string;
  marks?: number;
  grade?: string;
}

export default function ParentResultsPage() {
  const [selectedChild, setSelectedChild] = useState<string>("");

  const {
    data: children = [],
    isLoading: loadingChildren,
    isError: childrenError,
    error: childrenQueryError,
    isFetching: childrenFetching,
    refetch: refetchChildren,
  } = useQuery<Child[]>({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const res = await api.get("/parent/children");
      return extractApiArray<Child>(res.data, ["children"]);
    },
  });

  const { data: results = [], isLoading, isError, error, refetch, isFetching } = useQuery<ChildResultRow[]>({
    queryKey: ["parent-results", selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];
      const res = await api.get(`/parent/results/${selectedChild}`);
      return extractApiArray<ChildResultRow>(res.data, ["results"]);
    },
    enabled: !!selectedChild,
  });

  if (loadingChildren) return <LoadingSpinner text="Loading children..." />;
  if (childrenError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Child Results" description="Your child's academic results" />
        <EmptyState
          title="Failed to load children"
          description={getErrorMessage(childrenQueryError, "Please try again.")}
          icon={User}
          variant="error"
          action={{ label: childrenFetching ? "Retrying..." : "Retry", onClick: () => refetchChildren() }}
        />
      </div>
    );
  }
  if (children.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Child Results" description="Your child's academic results" />
        <EmptyState
          title="No children linked"
          description="Contact your school to link your children to your account"
          icon={User}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Child Results" description="Your child's academic results" />

      <div className="mb-4">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((child: Child) => (
              <SelectItem key={child._id} value={child._id}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading results..." />
      ) : isError ? (
        <EmptyState
          title="Results unavailable"
          description={getErrorMessage(error, "Please try again later.")}
          icon={BookMarked}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      ) : results.length === 0 ? (
        <EmptyState title="No results published" description="Results will appear here when published" icon={BookMarked} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, i: number) => (
                <TableRow key={`${result.examName || result.exam || "exam"}-${result.subjectName || result.subject || "subject"}-${i}`}>
                  <TableCell>{result.examName || result.exam || "-"}</TableCell>
                  <TableCell>{result.subjectName || result.subject || "-"}</TableCell>
                  <TableCell>{result.marks ?? "-"}</TableCell>
                  <TableCell>{result.grade || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
