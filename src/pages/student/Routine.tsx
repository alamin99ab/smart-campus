import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, MapPin, User } from "lucide-react";

interface RoutinePeriod {
  period?: number;
  periodNumber?: number;
  subject?: string;
  subjectName?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  teacher?: string;
  teacherName?: string;
}

interface RoutineDayRow {
  dayName?: string;
  day?: string;
  periods?: RoutinePeriod[];
}

export default function StudentRoutinePage() {
  const { data: routine = [], isLoading, isError, error, refetch, isFetching } = useQuery<RoutineDayRow[]>({
    queryKey: ["student-routine"],
    queryFn: async () => {
      const res = await api.get("/student/routine/week");
      return extractApiArray<RoutineDayRow>(res.data, ["routine", "weeklyRoutine"]);
    },
  });

  if (isLoading) return <LoadingSpinner text="Loading routine..." />;

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="My Routine" description="Your class timetable" />
        <EmptyState
          title="Failed to load routine"
          description={getErrorMessage(error, "Please try again later")}
          icon={Calendar}
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
          variant="error"
        />
      </div>
    );
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="My Routine" description="Your class timetable" />

      {routine.length === 0 ? (
        <EmptyState title="No routine available" description="Your class timetable will appear here" icon={Calendar} />
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const dayRoutine = routine.filter((r: RoutineDayRow) => {
              const rowDay = String(r?.dayName || r?.day || "").toLowerCase();
              return rowDay === day.toLowerCase();
            });
            if (dayRoutine.length === 0) return null;

            const periods: RoutinePeriod[] = Array.isArray(dayRoutine[0]?.periods) ? dayRoutine[0].periods : [];

            return (
              <div key={day} className="bg-card rounded-xl border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{day}</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Period</TableHead>
                        <TableHead className="whitespace-nowrap">Subject</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">Time</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">Room</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((p, i) => (
                        <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{p.periodNumber || p.period || i + 1}</TableCell>
                          <TableCell className="font-medium">{p.subjectName || p.subject || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{p.startTime || "-"} - {p.endTime || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{p.room || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{p.teacherName || p.teacher || "-"}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
