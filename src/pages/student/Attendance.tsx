import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ClipboardList } from "lucide-react";

interface AttendanceMonthlyRow {
  month?: number;
  year?: number;
  presentDays?: number;
  totalDays?: number;
}

interface AttendanceOverallStats {
  totalDays?: number;
  presentDays?: number;
  absentDays?: number;
  leaveDays?: number;
  percentage?: number;
}

interface StudentAttendancePayload {
  monthlyReport: AttendanceMonthlyRow[];
  overallStats: AttendanceOverallStats | null;
}

export default function StudentAttendancePage() {
  const { data: payload = { monthlyReport: [], overallStats: null }, isLoading, isError, error, refetch } = useQuery<StudentAttendancePayload>({
    queryKey: ["student-attendance"],
    queryFn: async () => {
      const res = await api.get("/student/attendance");
      const data = extractApiObject<{ monthlyReport?: AttendanceMonthlyRow[]; overallStats?: AttendanceOverallStats }>(res.data);
      return {
        monthlyReport: Array.isArray(data.monthlyReport) ? data.monthlyReport : [],
        overallStats: data.overallStats || null,
      };
    },
  });

  const monthlyReport = payload.monthlyReport || [];
  const overallStats = payload.overallStats;

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="My Attendance" description="Your attendance records" />
        <EmptyState
          title="Failed to load attendance"
          description={getErrorMessage(error, "Please try again later")}
          icon={ClipboardList}
          action={{ label: "Retry", onClick: () => refetch() }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Attendance" description="Your attendance records" />
      {monthlyReport.length === 0 ? (
        <EmptyState title="No attendance records" description="Your attendance will appear here" icon={ClipboardList} />
      ) : (
        <div className="space-y-2">
          {overallStats ? (
            <div className="bg-card rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs sm:text-sm">
              <p>Total: <span className="font-semibold">{overallStats.totalDays ?? 0}</span></p>
              <p>Present: <span className="font-semibold">{overallStats.presentDays ?? 0}</span></p>
              <p>Absent: <span className="font-semibold">{overallStats.absentDays ?? 0}</span></p>
              <p>Leave: <span className="font-semibold">{overallStats.leaveDays ?? 0}</span></p>
              <p>Rate: <span className="font-semibold">{overallStats.percentage ?? 0}%</span></p>
            </div>
          ) : null}

          {monthlyReport.map((row, i: number) => (
            <div key={`${row.month}-${row.year}-${i}`} className="bg-card rounded-lg border p-3 flex justify-between items-center">
              <span className="text-sm">{row.month && row.year ? `${row.month}/${row.year}` : `Month ${i + 1}`}</span>
              <span className="text-sm font-medium">{row.presentDays ?? 0}/{row.totalDays ?? 0} present</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
