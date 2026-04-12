import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Layers, AlertCircle } from "lucide-react";

interface PopulatedClass {
  _id: string;
  className?: string;
  section?: string;
}

interface PopulatedSubject {
  _id: string;
  subjectName?: string;
  subjectCode?: string;
}

interface TeacherAssignment {
  _id: string;
  subject?: PopulatedSubject | string;
  subjectName?: string;
  subjectCode?: string;
  classes?: PopulatedClass[];
  periodsPerWeek?: number;
  academicYear?: string;
  semester?: string | null;
  isActive?: boolean;
}

const normalizeAssignmentsPayload = (payload: unknown): TeacherAssignment[] => {
  if (Array.isArray(payload)) {
    return payload as TeacherAssignment[];
  }

  if (payload && typeof payload === "object") {
    const data = payload as { data?: unknown; assignments?: unknown; assignment?: unknown };
    if ("data" in data) {
      return normalizeAssignmentsPayload(data.data);
    }
    if (Array.isArray(data.assignments)) {
      return data.assignments as TeacherAssignment[];
    }
    if (data.assignment && typeof data.assignment === "object") {
      return [data.assignment as TeacherAssignment];
    }
  }

  throw new Error("Unexpected response format");
};

const formatClassList = (classes: unknown): string => {
  if (!Array.isArray(classes) || classes.length === 0) {
    return "-";
  }

  const labels = new Set<string>();
  classes.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const classInfo = item as PopulatedClass;
    const label = `${classInfo.className || "Class"}${classInfo.section ? ` - ${classInfo.section}` : ""}`;
    labels.add(label);
  });

  return labels.size > 0 ? Array.from(labels).join(", ") : "-";
};

export default function TeacherAssignmentsPage() {
  const {
    data: assignments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TeacherAssignment[]>({
    queryKey: ["teacher-assignment-links"],
    queryFn: async () => {
      const res = await api.get("/teacher/me/assignments");
      return normalizeAssignmentsPayload(res.data);
    },
  });

  if (isLoading) return <LoadingSpinner text="Loading your teaching assignments..." />;

  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="My Teaching Assignments" description="Class and subject allocations from principal/admin" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load assignments"
          description={getErrorMessage(error, "Unable to load assignment data right now.")}
          actionLabel="Retry"
          onAction={() => refetch()}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Teaching Assignments"
        description="Class and subject allocations from principal/admin"
      />

      {assignments.length === 0 ? (
        <EmptyState
          title="No teaching assignments yet"
          description="Ask your principal/admin to assign class and subject mappings."
          icon={Layers}
          actionLabel="Refresh"
          onAction={() => refetch()}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Periods / Week</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment, index) => {
                const subject = assignment.subject;
                const populatedSubject = subject && typeof subject === "object" ? (subject as PopulatedSubject) : null;
                const subjectName =
                  populatedSubject?.subjectName ||
                  assignment.subjectName ||
                  (typeof subject === "string" ? subject : "Unknown Subject");
                const subjectCode = populatedSubject?.subjectCode || assignment.subjectCode;

                return (
                  <TableRow key={assignment._id || `assignment-${index}`}>
                    <TableCell className="font-medium">
                      {subjectName} {subjectCode ? `(${subjectCode})` : ""}
                    </TableCell>
                    <TableCell>{formatClassList(assignment.classes)}</TableCell>
                    <TableCell>{assignment.periodsPerWeek ?? 0}</TableCell>
                    <TableCell>{assignment.academicYear || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.isActive === false ? "secondary" : "default"}>
                        {assignment.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
