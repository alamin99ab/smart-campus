import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface FeeReportRow {
  _id: string;
  studentId?: { name?: string; roll?: string; rollNumber?: string };
  month?: number;
  year?: number;
  amountDue?: number;
  amountPaid?: number;
  status?: string;
}

export default function AccountantInvoicesPage() {
  const qc = useQueryClient();

  const { data: fees = [], isLoading, isError, error, refetch, isFetching } = useQuery<FeeReportRow[]>({
    queryKey: ["accountant-fee-report"],
    queryFn: async () => {
      const res = await api.get("/fees/report", { params: { limit: 200 } });
      return extractApiArray<FeeReportRow>(res.data, ["fees"]);
    },
  });

  const generateInvoices = useMutation({
    mutationFn: async () => {
      const res = await api.post("/accountant/generate-invoices");
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Invoices generated");
      qc.invalidateQueries({ queryKey: ["accountant-fee-report"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to generate invoices")),
  });

  if (isLoading) return <LoadingSpinner text="Loading invoices..." />;
  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Invoices" description="Student fee records (from fee report)" />
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
        description="Student fee records (from fee report)"
        actionLabel="Generate Invoices"
        onAction={() => generateInvoices.mutate()}
      />
      {fees.length === 0 ? (
        <EmptyState
          title="No fee records"
          description="Fee lines appear once fee records exist"
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
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className="font-medium">
                    {inv.studentId?.name || "-"}
                    {inv.studentId?.roll || inv.studentId?.rollNumber ? (
                      <span className="text-muted-foreground text-sm block">{inv.studentId?.roll || inv.studentId?.rollNumber}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{inv.month}/{inv.year}</TableCell>
                  <TableCell>₹{(inv.amountDue ?? 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(inv.amountPaid ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        inv.status === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {inv.status || "-"}
                    </span>
                  </TableCell>
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
