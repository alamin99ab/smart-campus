import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/apiResponse";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { Layers, ClipboardList, FileText, BookMarked, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeacherAssignment {
  _id?: string;
  className?: string;
  classes?: string[];
  section?: string;
  subjectName?: string;
  subject?: string;
  periodsPerWeek?: number;
  academicYear?: string;
}

interface TeacherDashboardData {
  assignments?: TeacherAssignment[];
  assignedClasses?: number;
  attendanceMarked?: number;
  pendingMarks?: number;
}

export default function TeacherDashboard() {
  const { data, isLoading, isError, error } = useQuery<TeacherDashboardData>({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard/teacher");
      return (res.data?.data || {}) as TeacherDashboardData;
    },
  });

  if (isLoading) return <SkeletonDashboard />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Teacher Dashboard" description="Class management and assignments" />
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

  const stats = data || {};
  const assignments = Array.isArray(stats.assignments) ? stats.assignments : [];
  const assignedClasses = stats.assignedClasses ?? assignments.length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Teacher Dashboard" description="Your classes and academic overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assigned Classes" value={assignedClasses} icon={Layers} variant="primary" />
        <StatCard title="Attendance Marked" value={stats.attendanceMarked ?? 0} icon={ClipboardList} variant="success" />
        <StatCard title="Assignments" value={assignments.length} icon={FileText} variant="info" />
        <StatCard title="Pending Marks" value={stats.pendingMarks ?? 0} icon={BookMarked} variant="warning" />
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Your Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              title="No assignments found"
              description="Ask your principal to assign you to a class and subject."
              icon={Layers}
            />
          ) : (
            <div className="divide-y">
              {assignments.map((assignment, idx: number) => (
                <div key={assignment._id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {assignment.className || assignment.classes?.[0] || "Class"} {assignment.section ? `- ${assignment.section}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Subject: {assignment.subjectName || assignment.subject || "-"} - Periods/week: {assignment.periodsPerWeek ?? "-"}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    AY: {assignment.academicYear || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{assignedClasses}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{assignments.length}</p>
              <p className="text-sm text-muted-foreground">Assignments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.attendanceMarked ?? 0}</p>
              <p className="text-sm text-muted-foreground">Attendance marked today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.pendingMarks ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending marks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
