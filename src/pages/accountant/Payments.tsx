import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CreditCard } from "lucide-react";

interface CollectionRow {
  _id?: { date?: string; class?: string; section?: string; feeType?: string };
  totalAmount?: number;
  paymentCount?: number;
}

export default function AccountantPaymentsPage() {
  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery<CollectionRow[]>({
    queryKey: ["accountant-collection-report"],
    queryFn: async () => {
      const res = await api.get("/accountant/collection-report");
      return extractApiArray<CollectionRow>(res.data, ["rows", "collections"]);
    },
  });

  if (isLoading) return <LoadingSpinner text="Loading payments..." />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Payments" description="Collection summary by date" />
        <EmptyState
          title="Payments unavailable"
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
      <PageHeader title="Payments" description="Collection summary by date" />
      {rows.length === 0 ? (
        <EmptyState
          title="No collection data yet"
          description="Payment aggregates appear after fees are recorded in the system"
          icon={DollarSign}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Fee type</TableHead>
                <TableHead>Total amount</TableHead>
                <TableHead>Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row._id?.date || "-"}</TableCell>
                  <TableCell>{[row._id?.class, row._id?.section].filter(Boolean).join("-") || "-"}</TableCell>
                  <TableCell>{String(row._id?.feeType ?? "General")}</TableCell>
                  <TableCell>{formatCurrency(row.totalAmount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {row.paymentCount ?? 0}
                    </div>
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
