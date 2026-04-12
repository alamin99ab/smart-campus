import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { normalizeSuperAdminMetrics } from "@/lib/superAdminMetrics";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BarChart3, School, DollarSign, Users, Activity, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { getErrorMessage } from "@/lib/apiResponse";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getRecentMonthLabels = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return MONTH_LABELS[date.getMonth()];
  });
};

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-analytics"],
    queryFn: async () => {
      const res = await api.get("/super-admin/statistics");
      return normalizeSuperAdminMetrics(res.data);
    },
  });

  const stats = data || {};

  const chartData = useMemo(() => {
    const monthlyRevenue = Array.isArray(stats.monthlyRevenue) ? stats.monthlyRevenue : [];
    const monthlyStudents = Array.isArray(stats.monthlyStudents) ? stats.monthlyStudents : [];
    const monthlyNewSchools = Array.isArray(stats.monthlyNewSchools) ? stats.monthlyNewSchools : [];
    const seriesLength = Math.max(monthlyRevenue.length, monthlyStudents.length, monthlyNewSchools.length, 6);
    const monthLabels = getRecentMonthLabels(seriesLength);

    return Array.from({ length: seriesLength }, (_, idx) => ({
      month: monthLabels[idx],
      revenue: monthlyRevenue[idx] ?? 0,
      students: monthlyStudents[idx] ?? 0,
      schools: monthlyNewSchools[idx] ?? 0,
    }));
  }, [stats.monthlyRevenue, stats.monthlyStudents, stats.monthlyNewSchools]);

  const hasCharts = chartData.some((item) => item.revenue > 0 || item.students > 0 || item.schools > 0);

  if (isLoading) return <LoadingSpinner text="Loading analytics..." />;

  if (isError) {
    const description = getErrorMessage(error, "Please try again later or refresh the page.");

    return (
      <div className="animate-fade-in">
        <PageHeader title="Platform Analytics" description="Revenue, growth, and usage insights" />
        <EmptyState title="Unable to load analytics" description={description} variant="error" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Platform Analytics" description="Revenue, growth, and usage insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Schools" value={stats.totalSchools || 0} icon={School} variant="primary" description={`${stats.activeSchools || 0} active`} />
        <StatCard title="Active Users" value={stats.activeUsers || 0} icon={Users} variant="success" description="Across platform" />
        <StatCard title="Total Students" value={stats.totalStudents || 0} icon={Activity} variant="info" description={`${stats.totalTeachers || 0} teachers`} />
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue || 0}`} icon={DollarSign} variant="warning" description="Lifetime revenue" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <StatCard title="Total Principals" value={stats.totalPrincipals || 0} icon={Users} />
        <StatCard title="Total Teachers" value={stats.totalTeachers || 0} icon={Users} />
        <StatCard title="Active Students" value={stats.activeStudents || 0} icon={Activity} />
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">Revenue & Students Trend</h3>
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </div>
          {hasCharts ? (
            <ChartContainer className="h-64" config={{ revenue: { color: "#60A5FA", label: "Revenue" }, students: { color: "#34D399", label: "Students" } }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <ChartTooltip />
                  <ChartLegend />
                  <Area type="monotone" dataKey="revenue" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="students" stroke="#34D399" fill="#34D399" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <EmptyState title="No chart data available" description="Create more activity and refresh to populate trend charts." />
          )}
        </div>

        <div className="bg-card rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">New Schools per Month</h3>
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </div>
          {hasCharts ? (
            <ChartContainer className="h-64" config={{ schools: { color: "#F59E0B", label: "New Schools" } }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <ChartTooltip />
                  <ChartLegend />
                  <Line type="monotone" dataKey="schools" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <EmptyState title="No school creation trend ready" description="Once schools are added, this chart will display monthly growth." />
          )}
        </div>
      </div>
    </div>
  );
}
