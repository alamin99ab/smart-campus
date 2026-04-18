import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface OutstandingInvoiceRow {
  _id: string;
  studentName?: string;
  studentId?: string;
  roll?: string;
  class?: string;
  section?: string;
  totalDue?: number;
  overdueAmount?: number;
}

export default function AccountantInvoicesPage() {
  const qc = useQueryClient();

  const { data: invoices = [], isLoading, isError, error, refetch, isFetching } = useQuery<OutstandingInvoiceRow[]>({
    queryKey: ["accountant-outstanding-invoices"],
    queryFn: async () => {
      const res = await api.get("/accountant/outstanding-fees");
      return extractApiArray<OutstandingInvoiceRow>(res.data, ["outstandingFees"]);
    },
  });

  const generateInvoices = useMutation({
    mutationFn: async () => {
      const res = await api.post("/accountant/generate-invoices");
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Invoices generated");
      qc.invalidateQueries({ queryKey: ["accountant-outstanding-invoices"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to generate invoices")),
  });

  if (isLoading) return <LoadingSpinner text="Loading invoices..." />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Invoices" description="Outstanding student invoices" />
        <EmptyState
          title="Failed to load invoices"
          description={getErrorMessage(error, "Please try again.")}
          icon={FileText}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices"
        description="Outstanding student invoices"
        actionLabel="Generate Invoices"
        onAction={() => generateInvoices.mutate()}
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="No outstanding invoices"
          description="Outstanding lines appear when students have unpaid amounts"
          icon={FileText}
          actionLabel="Generate Invoices"
          onAction={() => generateInvoices.mutate()}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className="font-medium">
                    {inv.studentName || "-"}
                    {inv.roll ? (
                      <span className="text-muted-foreground text-sm block">{inv.roll}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{[inv.class, inv.section].filter(Boolean).join("-") || "-"}</TableCell>
                  <TableCell>{formatCurrency(inv.totalDue)}</TableCell>
                  <TableCell>{formatCurrency(inv.overdueAmount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" type="button" disabled title="Export not wired">
                      <Download className="h-4 w-4" />
                    </Button>
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
