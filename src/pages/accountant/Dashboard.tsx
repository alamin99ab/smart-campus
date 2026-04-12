import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api, { type ApiResponse } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { DollarSign, FileText, AlertCircle, BarChart3, TrendingUp, Users, Calendar, PieChart } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountantDashboardData {
  months?: string[];
  monthlyCollectionSeries?: number[];
  monthlyCollection?: number[] | number;
  monthlyOutstandingSeries?: number[];
  monthlyOutstanding?: number[];
  studentFeeStats?: { paid?: number; partial?: number; unpaid?: number };
  monthlyPayments?: number;
  totalOutstanding?: number;
  totalStudents?: number;
  collectionRate?: number;
  pendingInvoices?: number;
}

const EMPTY_DASHBOARD: AccountantDashboardData = {};

export default function AccountantDashboard() {
  const { data, isLoading, isError, error } = useQuery<AccountantDashboardData>({
    queryKey: ["accountant-dashboard"],
    queryFn: async () => {
      const res = await api.get("/accountant/dashboard");
      return res.data.data;
    },
  });

  const stats = data ?? EMPTY_DASHBOARD;

  const financialTrend = useMemo(() => {
    const months = Array.isArray(stats.months) ? stats.months : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const incomeSeries = Array.isArray(stats.monthlyCollectionSeries)
      ? stats.monthlyCollectionSeries
      : (Array.isArray(stats.monthlyCollection) ? stats.monthlyCollection : []);
    const outstandingSeries = Array.isArray(stats.monthlyOutstandingSeries)
      ? stats.monthlyOutstandingSeries
      : (Array.isArray(stats.monthlyOutstanding) ? stats.monthlyOutstanding : []);

    return months.slice(0, 12).map((month: string, idx: number) => ({
      month,
      income: Number(incomeSeries[idx] ?? 0),
      outstanding: Number(outstandingSeries[idx] ?? 0),
    }));
  }, [stats.months, stats.monthlyCollectionSeries, stats.monthlyCollection, stats.monthlyOutstandingSeries, stats.monthlyOutstanding]);

  const hasTrendData = financialTrend.some((item) => item.income > 0 || item.outstanding > 0);

  const feeStatusData = [
    { name: "Paid", value: stats.studentFeeStats?.paid ?? 0, color: "#10b981" },
    { name: "Partial", value: stats.studentFeeStats?.partial ?? 0, color: "#f59e0b" },
    { name: "Unpaid", value: stats.studentFeeStats?.unpaid ?? 0, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  if (isLoading) return <SkeletonDashboard />;

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Accountant Dashboard" description="Fee management and financial overview" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load dashboard data"
          description={(error as AxiosError<ApiResponse>)?.response?.data?.message || "Please try again later"}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Accountant Dashboard" description="Fee management and financial overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Collection" value={`₹${stats.monthlyCollection ?? 0}`} icon={DollarSign} variant="primary" />
        <StatCard title="Monthly Payments" value={stats.monthlyPayments ?? 0} icon={FileText} variant="info" />
        <StatCard title="Total Outstanding" value={`₹${stats.totalOutstanding ?? 0}`} icon={AlertCircle} variant="warning" />
        <StatCard title="Paid Students" value={stats.studentFeeStats?.paid ?? 0} icon={BarChart3} variant="success" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Students" value={stats.totalStudents ?? 0} icon={Users} description="Enrolled students" />
        <StatCard title="Collection Rate" value={`${stats.collectionRate ?? 0}%`} icon={TrendingUp} description="This month" />
        <StatCard title="Pending Invoices" value={stats.pendingInvoices ?? 0} icon={Calendar} description="Need follow-up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Financial Traffic
              </CardTitle>
              <p className="text-xs text-muted-foreground">12-month trend</p>
            </div>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <ChartContainer className="h-64" config={{ income: { color: "#6366f1", label: "Collection" }, outstanding: { color: "#f59e0b", label: "Outstanding" } }}>
                <ResponsiveContainer>
                  <AreaChart data={financialTrend}>
                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <ChartTooltip />
                    <ChartLegend />
                    <Area type="monotone" dataKey="income" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="outstanding" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <EmptyState title="Not enough financial trend data" description="Financial statements will appear here once enough data is available." />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              Fee Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeStatusData.length > 0 ? (
              <ChartContainer className="h-64" config={{}}>
                <ResponsiveContainer>
                  <BarChart data={feeStatusData} layout="vertical">
                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.45} />
                    <XAxis type="number" stroke="var(--muted-foreground)" />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" width={60} />
                    <ChartTooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {feeStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No fee data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">₹{stats.monthlyCollection ?? 0}</p>
              <p className="text-sm text-muted-foreground">Monthly Collection</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.studentFeeStats?.paid ?? 0}</p>
              <p className="text-sm text-muted-foreground">Paid Students</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">₹{stats.totalOutstanding ?? 0}</p>
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.collectionRate ?? 0}%</p>
              <p className="text-sm text-muted-foreground">Collection Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
