import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiObject, getErrorMessage } from "@/lib/apiResponse";
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
  roomNumber?: string;
  teacher?: string;
  teacherName?: string;
}

interface RoutineDay {
  day?: string;
  dayName?: string;
  periods?: RoutinePeriod[];
  routine?: RoutinePeriod[];
}

interface TeacherRoutineResponse {
  weeklySchedule?: RoutineDay[] | Record<string, RoutinePeriod[]>;
  schedule?: RoutineDay[] | Record<string, RoutinePeriod[]>;
}

const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const normalizeWeeklySchedule = (source: TeacherRoutineResponse): RoutineDay[] => {
  const candidate = source.weeklySchedule ?? source.schedule ?? [];

  if (Array.isArray(candidate)) {
    return candidate.map((row) => ({
      day: row.day || row.dayName,
      dayName: row.dayName || row.day,
      periods: Array.isArray(row.periods) ? row.periods : Array.isArray(row.routine) ? row.routine : [],
    }));
  }

  if (candidate && typeof candidate === "object") {
    return Object.entries(candidate).map(([day, periods]) => ({
      day,
      dayName: day,
      periods: Array.isArray(periods) ? periods : [],
    }));
  }

  return [];
};

export default function TeacherRoutinePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<TeacherRoutineResponse>({
    queryKey: ["teacher", "my-routine"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-routine");
      return extractApiObject<TeacherRoutineResponse>(res.data);
    },
  });

  const weeklyRows = useMemo(() => normalizeWeeklySchedule(data || {}), [data]);

  const days = useMemo(() => {
    const map = new Map<string, RoutinePeriod[]>();

    weeklyRows.forEach((row) => {
      const dayRaw = String(row.dayName || row.day || "").trim();
      if (!dayRaw) return;
      const normalizedDay = `${dayRaw.charAt(0).toUpperCase()}${dayRaw.slice(1).toLowerCase()}`;
      map.set(normalizedDay, Array.isArray(row.periods) ? row.periods : []);
    });

    return dayOrder
      .filter((day) => map.has(day))
      .map((day) => ({ day, periods: map.get(day) || [] }));
  }, [weeklyRows]);

  if (isLoading) {
    return <LoadingSpinner text="Loading your routine..." />;
  }

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="My Routine" description="Your weekly class schedule" />
        <EmptyState
          title="Failed to load routine"
          description={getErrorMessage(error, "Please try again later.")}
          icon={Calendar}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="My Routine" description="View your weekly routine in day-wise format." />

      {days.length === 0 ? (
        <EmptyState
          title="No routine assigned yet"
          description="Your principal has not published teacher routine data for your assignments."
          icon={Calendar}
        />
      ) : (
        <div className="space-y-4">
          {days.map(({ day, periods }) => (
            <div key={day} className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{day}</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="hidden sm:table-cell">Time</TableHead>
                      <TableHead className="hidden md:table-cell">Room</TableHead>
                      <TableHead className="hidden lg:table-cell">Teacher</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No classes scheduled for this day.
                        </TableCell>
                      </TableRow>
                    ) : (
                      periods.map((period, idx) => (
                        <TableRow key={`${day}-${idx}`}>
                          <TableCell className="font-medium">{period.periodNumber || period.period || idx + 1}</TableCell>
                          <TableCell className="font-medium">{period.subjectName || period.subject || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>
                                {period.startTime || "-"} - {period.endTime || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{period.roomNumber || period.room || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{period.teacherName || period.teacher || "-"}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
