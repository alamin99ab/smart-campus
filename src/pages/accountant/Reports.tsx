import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, DollarSign, AlertCircle, TrendingUp } from "lucide-react";

interface OutstandingFee {
  _id: string;
  studentName?: string;
  studentId?: string;
  totalDue: number;
  overdueAmount?: number;
}

interface CollectionSummary {
  totalCollected?: number;
  totalPayments?: number;
  totalDue?: number;
}

export default function AccountantReportsPage() {
  const {
    data: outstandingFees = [],
    isLoading: loadingOutstanding,
    isError: outstandingError,
    error: outstandingQueryError,
    isFetching: outstandingFetching,
    refetch: refetchOutstanding,
  } = useQuery<OutstandingFee[]>({
    queryKey: ["outstanding-fees"],
    queryFn: async () => {
      const res = await api.get("/accountant/outstanding-fees");
      return extractApiArray<OutstandingFee>(res.data, ["outstandingFees"]);
    },
  });

  const {
    data: collectionSummary,
    isLoading: loadingReport,
    isError: reportError,
    error: reportQueryError,
    isFetching: reportFetching,
    refetch: refetchReport,
  } = useQuery<CollectionSummary>({
    queryKey: ["collection-report-summary"],
    queryFn: async () => {
      const res = await api.get("/accountant/collection-report");
      const payload = extractApiObject<{ summary?: CollectionSummary }>(res.data);
      return payload.summary || {};
    },
  });

  const isLoading = loadingOutstanding || loadingReport;
  const stats = collectionSummary || {};

  const totalOutstanding = outstandingFees.reduce((sum: number, fee: OutstandingFee) => sum + (fee.totalDue || 0), 0);
  const overdueCount = outstandingFees.filter((fee: OutstandingFee) => (fee.overdueAmount || 0) > 0).length;

  if (isLoading) return <LoadingSpinner text="Loading reports..." />;
  if (outstandingError || reportError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Reports" description="Fee collection reports and analytics" />
        <EmptyState
          title="Failed to load reports"
          description={getErrorMessage(outstandingQueryError || reportQueryError, "Please try again.")}
          icon={BarChart3}
          variant="error"
          action={{
            label: outstandingFetching || reportFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchOutstanding();
              void refetchReport();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" description="Fee collection reports and analytics" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Collected" value={formatCurrency(stats.totalCollected)} icon={DollarSign} variant="success" />
        <StatCard title="Total Outstanding" value={formatCurrency(totalOutstanding)} icon={AlertCircle} variant="warning" />
        <StatCard title="Outstanding Students" value={outstandingFees.length} icon={TrendingUp} variant="info" />
        <StatCard title="Overdue" value={overdueCount} icon={AlertCircle} variant="warning" />
      </div>

      <h3 className="text-lg font-semibold mb-4">Outstanding Fees</h3>
      {outstandingFees.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">All fees are paid up!</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Overdue Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstandingFees.map((fee: OutstandingFee) => (
                <TableRow key={fee._id}>
                  <TableCell className="font-mono text-sm">{fee.studentId || "-"}</TableCell>
                  <TableCell className="font-medium">{fee.studentName || "-"}</TableCell>
                  <TableCell>{formatCurrency(fee.totalDue)}</TableCell>
                  <TableCell>
                    <span className={(fee.overdueAmount || 0) > 0 ? "text-red-600 font-medium" : ""}>
                      {formatCurrency(fee.overdueAmount)}
                    </span>
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
