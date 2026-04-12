import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ClipboardList, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Child {
  _id: string;
  name: string;
}

interface AttendanceStats {
  total?: number;
  present?: number;
  absent?: number;
  leave?: number;
  percentage?: number;
}

interface AttendanceEntry {
  date?: string;
  status?: string;
}

interface ParentAttendancePayload {
  attendance: AttendanceEntry[];
  statistics: AttendanceStats | null;
}

export default function ParentAttendancePage() {
  const [selectedChild, setSelectedChild] = useState<string>("");

  // First, get the list of children
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

  // Get attendance for selected child
  const { data: attendancePayload = { attendance: [], statistics: null }, isLoading, isError, error, refetch } = useQuery<ParentAttendancePayload>({
    queryKey: ["parent-attendance", selectedChild],
    queryFn: async () => {
      if (!selectedChild) return { attendance: [], statistics: null };
      const res = await api.get(`/parent/attendance/${selectedChild}`);
      const payload = extractApiObject<{ attendance?: AttendanceEntry[]; statistics?: AttendanceStats }>(res.data);
      return {
        attendance: Array.isArray(payload.attendance) ? payload.attendance : [],
        statistics: payload.statistics || null,
      };
    },
    enabled: !!selectedChild,
  });
  const attendance = attendancePayload.attendance || [];
  const stats = attendancePayload.statistics;

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]._id);
    }
  }, [children, selectedChild]);

  if (loadingChildren) return <LoadingSpinner text="Loading children..." />;
  if (childrenError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Child Attendance" description="Your child's attendance records" />
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
        <PageHeader title="Child Attendance" description="Your child's attendance records" />
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
      <PageHeader title="Child Attendance" description="Your child's attendance records" />
      
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
        <LoadingSpinner text="Loading attendance..." />
      ) : isError ? (
        <EmptyState
          title="Attendance unavailable"
          description={getErrorMessage(error, "Please try again later")}
          icon={ClipboardList}
          action={{ label: "Retry", onClick: () => refetch() }}
          variant="error"
        />
      ) : attendance.length === 0 ? (
        <EmptyState title="No attendance records" description="Attendance data will appear here" icon={ClipboardList} />
      ) : (
        <div className="space-y-3">
          {stats ? (
            <div className="bg-card rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs sm:text-sm">
              <p>Total: <span className="font-semibold">{stats.total ?? 0}</span></p>
              <p>Present: <span className="font-semibold">{stats.present ?? 0}</span></p>
              <p>Absent: <span className="font-semibold">{stats.absent ?? 0}</span></p>
              <p>Leave: <span className="font-semibold">{stats.leave ?? 0}</span></p>
              <p>Rate: <span className="font-semibold">{stats.percentage ?? 0}%</span></p>
            </div>
          ) : null}
          {attendance.map((a: AttendanceEntry, i: number) => (
            <div key={i} className="bg-card rounded-lg border p-3 flex justify-between items-center">
              <span className="text-sm">{a.date ? new Date(a.date).toLocaleDateString() : `Day ${i + 1}`}</span>
              <span className={`text-sm font-medium ${a.status === "present" ? "text-green-600" : "text-red-600"}`}>
                {a.status || "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

