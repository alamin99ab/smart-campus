import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";

/** Row from GET /api/attendance/today -> response.status[] */
interface TodayClassStatus {
  class: string;
  section: string;
  totalStudents: number;
  taken: boolean;
  attendanceId?: string;
  takenBy?: { name?: string };
  time?: string;
}

export default function AttendancePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["attendance-today-overview"],
    queryFn: async () => {
      const res = await api.get("/attendance/today");
      const payload = extractApiObject<{ date?: string }>(res.data);
      return {
        date: typeof payload.date === "string" ? payload.date : undefined,
        status: extractApiArray<TodayClassStatus>(payload, ["status"]),
      };
    },
  });

  const rows = data?.status ?? [];

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-4">
        <PageHeader title="Attendance overview" description="School-wide attendance status" />
        <EmptyState
          title="Failed to load attendance overview"
          description={getErrorMessage(error, "Please try again later.")}
          icon={ClipboardList}
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Attendance overview"
        description={
          data?.date
            ? `Classes for ${data.date} - whether attendance has been taken`
            : "School-wide attendance status"
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No classes to show"
          description="Enroll students so classes appear here, or teachers can take attendance from their dashboard."
          icon={ClipboardList}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.class}-${r.section}-${i}`}>
                  <TableCell className="font-medium">{r.class}</TableCell>
                  <TableCell>{r.section}</TableCell>
                  <TableCell>{r.totalStudents}</TableCell>
                  <TableCell>
                    {r.taken ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Taken
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Circle className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.takenBy?.name || "-"}
                    {r.time ? ` - ${new Date(r.time).toLocaleString()}` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

