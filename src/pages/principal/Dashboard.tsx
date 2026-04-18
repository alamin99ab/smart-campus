import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { exportStudents, exportTeachers, exportAttendance, exportResults, exportFees, exportNotices, exportFullSchoolSummary } from "@/lib/exportUtils";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { Users, GraduationCap, BookOpen, Layers, Calendar, Bell, DollarSign, ClipboardList, AlertCircle, TrendingUp, Download } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PrincipalDashboardData {
  months?: string[];
  monthsClasses?: number[];
  monthsStudents?: number[];
  presentToday?: number;
  absentToday?: number;
  lateToday?: number;
  totalClasses?: number;
  totalTeachers?: number;
  totalStudents?: number;
  totalSubjects?: number;
  attendanceToday?: string | number;
  activeRoutines?: number;
  totalNotices?: number;
  feeCollected?: number;
}

const EMPTY_DASHBOARD: PrincipalDashboardData = {};

export default function PrincipalDashboard() {
  const { data, isLoading, isError, error } = useQuery<PrincipalDashboardData>({
    queryKey: ["principal-dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard/principal");
      return (res.data?.data || {}) as PrincipalDashboardData;
    },
  });

  const stats = data ?? EMPTY_DASHBOARD;

  const trendData = useMemo(() => {
    const labels = (stats.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]).slice(0, 12);
    const classesTrend = Array.isArray(stats.monthsClasses) ? stats.monthsClasses : [];
    const studentsTrend = Array.isArray(stats.monthsStudents) ? stats.monthsStudents : [];

    return labels.map((month, idx) => ({
      month,
      classes: classesTrend[idx] ?? 0,
      students: studentsTrend[idx] ?? 0,
    }));
  }, [stats.months, stats.monthsClasses, stats.monthsStudents]);

  const hasTrendData = trendData.some((row) => row.classes > 0 || row.students > 0);

  const attendanceData = [
    { name: "Present", value: stats.presentToday ?? 0, color: "#10b981" },
    { name: "Absent", value: stats.absentToday ?? 0, color: "#ef4444" },
    { name: "Late", value: stats.lateToday ?? 0, color: "#f59e0b" },
  ].filter((item) => item.value > 0);

  if (isLoading) return <SkeletonDashboard />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Principal Dashboard" description="School management overview" />
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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Principal Dashboard" description="Your school at a glance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Classes" value={stats.totalClasses ?? 0} icon={Layers} variant="primary" />
        <StatCard title="Total Teachers" value={stats.totalTeachers ?? 0} icon={Users} variant="success" />
        <StatCard title="Total Students" value={stats.totalStudents ?? 0} icon={GraduationCap} variant="info" />
        <StatCard title="Total Subjects" value={stats.totalSubjects ?? 0} icon={BookOpen} variant="warning" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance Today" value={stats.attendanceToday ?? "-"} icon={ClipboardList} />
        <StatCard title="Active Routines" value={stats.activeRoutines ?? 0} icon={Calendar} />
        <StatCard title="Notices" value={stats.totalNotices ?? 0} icon={Bell} />
        <StatCard title="Fee Collected" value={formatCurrency(stats.feeCollected)} icon={DollarSign} />
      </div>

      {/* Export Section */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Quick Exports
            </CardTitle>
            <p className="text-xs text-muted-foreground">Download school data in Excel or PDF format</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" onClick={() => exportStudents({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Students
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportTeachers({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Teachers
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAttendance({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportResults({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Results
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportFees({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Fees
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportNotices({ format: 'xlsx' })}>
              <Download className="h-4 w-4 mr-1" />
              Notices
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportFullSchoolSummary({ format: 'xlsx' })} className="md:col-span-2">
              <Download className="h-4 w-4 mr-1" />
              Full Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Class & Student Growth
              </CardTitle>
              <p className="text-xs text-muted-foreground">12-month view</p>
            </div>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <ChartContainer className="h-64" config={{ classes: { color: "#6366f1", label: "Classes" }, students: { color: "#10b981", label: "Students" } }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <ChartTooltip />
                    <ChartLegend />
                    <Line type="monotone" dataKey="classes" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="students" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <EmptyState title="Trend data is not yet available" description="This chart will appear once the system collects 1 month of activity." />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData.length > 0 ? (
              <ChartContainer className="h-64" config={{}}>
                <ResponsiveContainer>
                  <BarChart data={attendanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                    <XAxis type="number" stroke="var(--muted-foreground)" />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" width={60} />
                    <ChartTooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {attendanceData.map((entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No attendance data for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalStudents ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalTeachers ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Teachers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.totalClasses ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.totalSubjects ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Subjects</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
