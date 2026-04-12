import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { normalizeSuperAdminMetrics } from "@/lib/superAdminMetrics";
import { StatCard } from "@/components/StatCard";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { 
  School, 
  Users, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Plus,
  ArrowRight,
  BarChart3,
  Shield,
  Clock,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getErrorMessage } from "@/lib/apiResponse";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getRecentMonthLabels = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return MONTH_LABELS[date.getMonth()];
  });
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/super-admin/dashboard");
      return normalizeSuperAdminMetrics(res.data);
    },
  });

  const stats = data || {};
  const currentYear = new Date().getFullYear();

  const schoolStatusData = [
    { name: 'Active', value: stats.activeSchools ?? 0, color: '#10b981' },
    { name: 'Inactive', value: stats.inactiveSchools ?? 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const monthlyData = useMemo(() => {
    const revenue = Array.isArray(stats.monthlyRevenue) ? stats.monthlyRevenue : [];
    const students = Array.isArray(stats.monthlyStudents) ? stats.monthlyStudents : [];
    const schools = Array.isArray(stats.monthlyNewSchools) ? stats.monthlyNewSchools : [];
    const seriesLength = Math.max(revenue.length, students.length, schools.length, 6);
    const monthLabels = getRecentMonthLabels(seriesLength);

    return Array.from({ length: seriesLength }, (_, index) => ({
      month: monthLabels[index],
      schools: schools[index] ?? 0,
      students: students[index] ?? 0,
      revenue: revenue[index] ?? 0,
    }));
  }, [stats.monthlyNewSchools, stats.monthlyRevenue, stats.monthlyStudents]);

  const hasMonthlyData = monthlyData.some((item) => item.schools > 0 || item.students > 0 || item.revenue > 0);

  if (isLoading) return <SkeletonDashboard />;
  
  if (isError) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load dashboard"
          description={getErrorMessage(error, "Please try again later")}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome Section - Hero Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzQgMC0xNC02LjI2Ni0xNC0xNHM2LjI2Ni0xNCAxNC0xNCAxNCA2LjI2NiAxNCAxNC02LjI2NiAxNC0xNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, Super Admin! 👋</h1>
            <p className="text-indigo-100 text-sm md:text-base max-w-xl">
              Here's what's happening with your Smart Campus platform today. 
              You have <span className="text-white font-semibold">{stats.totalSchools ?? 0} schools</span> and 
              {' '}<span className="text-white font-semibold">{stats.totalStudents ?? 0} students</span> across all institutions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate("/super-admin/schools")}
              className="bg-white text-indigo-700 hover:bg-indigo-50 border-0 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New School
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/super-admin/analytics")}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Schools" 
          value={stats.totalSchools ?? 0} 
          icon={School} 
          variant="primary" 
          description={`${stats.activeSchools ?? 0} active`}
        />
        <StatCard 
          title="Active Schools" 
          value={stats.activeSchools ?? 0} 
          icon={Activity} 
          variant="success" 
          description={`${stats.inactiveSchools ?? 0} inactive`}
        />
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents ?? 0} 
          icon={GraduationCap} 
          variant="info" 
          description={`+${stats.newStudentsThisMonth ?? 0} this month`}
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue ?? 0}`} 
          icon={DollarSign} 
          variant="warning" 
          description={`$${stats.monthlyIncome ?? 0} this month`}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Total Teachers" 
          value={stats.totalTeachers ?? 0} 
          icon={Users} 
          description="Across all schools"
        />
        <StatCard 
          title="Monthly Income" 
          value={`$${stats.monthlyIncome ?? 0}`} 
          icon={TrendingUp} 
          description={`${currentYear} revenue`}
        />
        <StatCard 
          title="Inactive Schools" 
          value={stats.inactiveSchools ?? 0} 
          icon={Shield} 
          description="Need attention"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Status Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-600" />
              School Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schoolStatusData.length > 0 ? (
              <ChartContainer className="h-64" config={{}}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={schoolStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {schoolStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <ChartLegend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No school data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Growth */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Monthly Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasMonthlyData ? (
              <ChartContainer className="h-64" config={{ schools: { color: "#6366f1", label: "Schools" }, students: { color: "#10b981", label: "Students" } }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <ChartTooltip />
                    <ChartLegend />
                    <Bar dataKey="schools" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No monthly trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 hover:bg-indigo-50 text-slate-700"
              onClick={() => navigate("/super-admin/schools")}
            >
              <School className="w-5 h-5 mr-3 text-blue-600" />
              <span className="flex-1 text-left">Manage Schools</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 hover:bg-indigo-50 text-slate-700"
              onClick={() => navigate("/super-admin/analytics")}
            >
              <BarChart3 className="w-5 h-5 mr-3 text-purple-600" />
              <span className="flex-1 text-left">View Analytics</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 hover:bg-indigo-50 text-slate-700"
            >
              <Users className="w-5 h-5 mr-3 text-orange-600" />
              <span className="flex-1 text-left">Manage Users</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 hover:bg-indigo-50 text-slate-700"
            >
              <Shield className="w-5 h-5 mr-3 text-red-600" />
              <span className="flex-1 text-left">System Settings</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <School className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">New school added</p>
                  <p className="text-sm text-slate-500">{stats.recentActivity?.newSchoolsThisMonth ?? 0} this month</p>
                </div>
                <span className="text-xs text-slate-400">Just now</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">New students enrolled</p>
                  <p className="text-sm text-slate-500">{stats.recentActivity?.newStudentsThisMonth ?? 0} this month</p>
                </div>
                <span className="text-xs text-slate-400">2 hours ago</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">New teachers joined</p>
                  <p className="text-sm text-slate-500">{stats.recentActivity?.newTeachersThisMonth ?? 0} this month</p>
                </div>
                <span className="text-xs text-slate-400">5 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">System Status</h3>
                <p className="text-sm text-slate-500">All services running normally</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-600">API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-600">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-600">Auth</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
