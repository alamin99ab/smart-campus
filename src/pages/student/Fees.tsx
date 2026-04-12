import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeeDetail {
  feeId: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  dueAmount: number;
  status: "Paid" | "Partial" | "Unpaid";
  title: string;
}

interface StudentFeesPayload {
  feeDetails?: FeeDetail[];
  summary?: {
    totalFees?: number;
    totalPaid?: number;
    totalDue?: number;
  };
}

export default function StudentFeesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<StudentFeesPayload>({
    queryKey: ["student-fees"],
    queryFn: async () => {
      const res = await api.get("/student/fees");
      const payload = extractApiObject<StudentFeesPayload & { fees?: FeeDetail[] }>(res.data);
      const feeDetails = Array.isArray(payload.feeDetails)
        ? payload.feeDetails
        : Array.isArray(payload.fees)
          ? payload.fees
          : [];

      return {
        feeDetails,
        summary: payload.summary || {},
      };
    },
  });

  const feeDetails = data?.feeDetails || [];
  const summary = data?.summary || {};

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Fees" description="Your fee records" />
        <EmptyState
          title="Fees unavailable"
          description={getErrorMessage(error, "Please try again.")}
          icon={DollarSign}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Fees" description="Your fee records" />
      {feeDetails.length === 0 ? (
        <EmptyState title="No fee records" description="Your fee information will appear here" icon={DollarSign} />
      ) : (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <p className="text-sm">Total: <span className="font-semibold">{formatCurrency(summary.totalFees)}</span></p>
            <p className="text-sm">Paid: <span className="font-semibold">{formatCurrency(summary.totalPaid)}</span></p>
            <p className="text-sm">Due: <span className="font-semibold">{formatCurrency(summary.totalDue)}</span></p>
          </div>
          {feeDetails.map((fee) => (
            <div key={fee.feeId} className="bg-card rounded-xl border p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{fee.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Due {formatCurrency(fee.amountDue)} | Paid {formatCurrency(fee.amountPaid)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-bold">{formatCurrency(fee.dueAmount)}</p>
                <Badge variant={fee.status === "Paid" ? "default" : fee.status === "Unpaid" ? "destructive" : "secondary"}>
                  {fee.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
