import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList, BookMarked, DollarSign, Bell, AlertCircle, TrendingUp, Calendar, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface PerformancePoint {
  month?: string;
  attendance?: number;
  marks?: number;
}

interface DashboardItem {
  id?: string;
  title?: string;
  subtitle?: string;
  date?: string;
  value?: string | number;
}

interface ParentDashboardPayload {
  attendance?: number | string;
  results?: number;
  feeDue?: number;
  notices?: number;
  performanceTrend?: PerformancePoint[];
  upcomingEvents?: DashboardItem[];
  achievements?: DashboardItem[];
}

export default function ParentDashboard() {
  const { data, isLoading, isError, error } = useQuery<ParentDashboardPayload>({
    queryKey: ["parent-dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard/parent");
      return (res.data?.data || {}) as ParentDashboardPayload;
    },
  });

  if (isLoading) return <SkeletonDashboard />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Parent Dashboard" description="Your child's academic overview" />
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
  const performanceTrend = Array.isArray(s.performanceTrend) ? s.performanceTrend : [];
  const upcomingEvents = Array.isArray(s.upcomingEvents) ? s.upcomingEvents : [];
  const achievements = Array.isArray(s.achievements) ? s.achievements : [];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Parent Dashboard" description="Monitor your child's academic progress" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Child Attendance" value={s.attendance ?? "-"} icon={ClipboardList} variant="primary" />
        <StatCard title="Results Published" value={s.results ?? 0} icon={BookMarked} variant="success" />
        <StatCard title="Fee Due" value={formatCurrency(s.feeDue)} icon={DollarSign} variant="warning" />
        <StatCard title="Notices" value={s.notices ?? 0} icon={Bell} variant="info" />
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Academic Performance Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">6-month view</p>
          </div>
        </CardHeader>
        <CardContent>
          {performanceTrend.length > 0 ? (
            <ChartContainer className="h-64" config={{ attendance: { color: "#10b981", label: "Attendance %" }, marks: { color: "#6366f1", label: "Marks %" } }}>
              <ResponsiveContainer>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <ChartTooltip />
                  <ChartLegend />
                  <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="marks" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No performance trend data"
              description="Performance charts will appear once your child has attendance or published results data."
              variant="default"
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div key={event.id || index} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">{event.title || "Event"}</p>
                      <p className="text-xs text-muted-foreground">{event.subtitle || event.date || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events are available right now.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <div className="space-y-3">
                {achievements.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Award className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">{item.title || "Achievement"}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle || item.value || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No achievements are available right now.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
