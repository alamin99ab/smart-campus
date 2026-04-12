import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/apiResponse";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList, Calendar, BookMarked, Bell, AlertCircle, Award, Clock, GraduationCap, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NoticeRow {
  _id?: string;
  title?: string;
  description?: string;
  body?: string;
}

interface ResultRow {
  _id?: string;
  subjectId?: { subjectName?: string; name?: string };
  subject?: { name?: string };
  examType?: { name?: string } | string;
  totalMarks?: number;
  score?: number;
}

interface RoutinePeriod {
  periodNumber?: number;
  period?: number;
  subjectName?: string;
  subject?: string;
  subjectId?: { subjectName?: string; name?: string };
  teacherName?: string;
  teacher?: { name?: string } | string;
  teacherId?: { name?: string };
}

interface StudentIdentity {
  name?: string;
  rollNumber?: string;
  class?: {
    className?: string;
    classLevel?: string | number;
    section?: string;
  };
}

interface StudentDashboardPayload {
  attendance?: {
    attendancePercentage?: number;
    summary?: {
      percentage?: number;
    };
  };
  notices?: NoticeRow[];
  results?: ResultRow[];
  todayRoutine?: {
    periods?: RoutinePeriod[];
  };
  student?: StudentIdentity;
}

export default function StudentDashboard() {
  const { data, isLoading, isError, error } = useQuery<StudentDashboardPayload>({
    queryKey: ["student-dashboard"],
    queryFn: async () => {
      const res = await api.get("/student/dashboard");
      return (res.data?.data || {}) as StudentDashboardPayload;
    },
  });

  if (isLoading) return <SkeletonDashboard />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Student Dashboard" description="Your academic overview" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load dashboard data"
          description={getErrorMessage(error, "Please try again later")}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
          variant="error"
        />
      </div>
    );
  }

  const s = data || {};
  const attendancePct = s.attendance?.attendancePercentage ?? s.attendance?.summary?.percentage ?? "-";
  const notices = Array.isArray(s.notices) ? s.notices : [];
  const results = Array.isArray(s.results) ? s.results : [];
  const todayRoutine = s.todayRoutine;
  const student = s.student || {};

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Student Dashboard" description="Your academic overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Attendance" value={attendancePct + (typeof attendancePct === "number" ? "%" : "")} icon={ClipboardList} variant="primary" />
        <StatCard title="Results Published" value={results.length} icon={BookMarked} variant="success" />
        <StatCard title="Notices" value={notices.length} icon={Bell} />
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            {student.name || "Student"} {student.rollNumber ? `- Roll ${student.rollNumber}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Class: {student.class?.className || student.class?.classLevel || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Section: {student.class?.section || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Attendance: {attendancePct}{typeof attendancePct === "number" ? "%" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Unread notices: {notices.length}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Today's Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayRoutine?.periods?.length ? (
              <div className="space-y-3">
                {todayRoutine.periods.map((period, idx: number) => (
                  <div key={`${period.periodNumber || idx}-${period.subjectName || period.subject || "subject"}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <BookMarked className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Period {period.periodNumber || period.period || idx + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {period.subjectName || period.subject || period.subjectId?.subjectName || period.subjectId?.name || "Subject"} - {period.teacherName || period.teacherId?.name || (typeof period.teacher === "object" ? period.teacher?.name : period.teacher) || "Teacher"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Routine not published for today.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Latest Notices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length ? (
              <div className="space-y-3">
                {notices.map((notice, idx: number) => (
                  <div key={notice._id || idx} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Bell className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">{notice.title || "Notice"}</p>
                      <p className="text-xs text-muted-foreground truncate">{notice.description || notice.body || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Latest Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length ? (
            <div className="space-y-3">
              {results.map((result, idx: number) => (
                <div key={result._id || idx} className="p-3 bg-emerald-50 rounded-lg">
                  <p className="font-medium text-sm">{result.subjectId?.subjectName || result.subject?.name || "Subject"}</p>
                  <p className="text-xs text-muted-foreground">
                    Exam: {typeof result.examType === "string" ? result.examType : result.examType?.name || "-"} - Score: {result.totalMarks ?? result.score ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Results will appear here once published.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
