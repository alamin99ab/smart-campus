import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Search } from "lucide-react";
import { toast } from "sonner";

interface OutstandingFeeRow {
  _id: string;
  studentId?: string;
  studentName?: string;
  class?: string;
  section?: string;
  roll?: string;
  totalDue?: number;
  overdueAmount?: number;
}

interface CollectionRow {
  _id?: { date?: string; class?: string; section?: string; feeType?: string };
  totalAmount?: number;
  paymentCount?: number;
}

const PAYMENT_METHOD_OPTIONS = ["Cash", "Bank", "Mobile Banking", "Cheque", "Online"] as const;

const now = new Date();

const DEFAULT_FORM = {
  studentId: "",
  amount: "",
  paymentMethod: "Cash",
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  transactionId: "",
  remarks: "",
};

export default function AccountantPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const {
    data: outstandingRows = [],
    isLoading: loadingOutstanding,
    isError: outstandingError,
    error: outstandingQueryError,
    refetch: refetchOutstanding,
    isFetching: outstandingFetching,
  } = useQuery<OutstandingFeeRow[]>({
    queryKey: ["accountant", "outstanding-fees"],
    queryFn: async () => {
      const res = await api.get("/accountant/outstanding-fees");
      return extractApiArray<OutstandingFeeRow>(res.data);
    },
  });

  const {
    data: collectionRows = [],
    isLoading: loadingCollections,
    isError: collectionsError,
    error: collectionsQueryError,
    refetch: refetchCollections,
    isFetching: collectionsFetching,
  } = useQuery<CollectionRow[]>({
    queryKey: ["accountant", "collection-report"],
    queryFn: async () => {
      const res = await api.get("/accountant/collection-report");
      return extractApiArray<CollectionRow>(res.data);
    },
  });

  const filteredStudents = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return outstandingRows;
    return outstandingRows.filter((row) => {
      const haystack = [
        row.studentName,
        row.studentId,
        row.class,
        row.section,
        row.roll,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [outstandingRows, searchTerm]);

  const selectedStudent = useMemo(
    () => outstandingRows.find((row) => (row.studentId || row._id) === form.studentId),
    [outstandingRows, form.studentId]
  );

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      const month = Number(form.month);
      const year = Number(form.year);

      const payload: Record<string, unknown> = {
        studentId: form.studentId,
        amount,
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      };

      if (Number.isFinite(month) && Number.isFinite(year) && month >= 1 && month <= 12 && year >= 2000) {
        payload.month = month;
        payload.year = year;
      }

      const res = await api.post("/accountant/record-payment", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Payment recorded successfully");
      qc.invalidateQueries({ queryKey: ["accountant", "outstanding-fees"] });
      qc.invalidateQueries({ queryKey: ["accountant", "collection-report"] });
      setForm((prev) => ({
        ...DEFAULT_FORM,
        studentId: prev.studentId,
      }));
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to record payment"));
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.studentId) {
      toast.error("Please select a student");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    recordPaymentMutation.mutate();
  };

  if (loadingOutstanding || loadingCollections) {
    return <LoadingSpinner text="Loading payment data..." />;
  }

  if (outstandingError || collectionsError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Payment Collection" description="Record payments and review collection summaries." />
        <EmptyState
          title="Payment data unavailable"
          description={getErrorMessage(outstandingQueryError || collectionsQueryError, "Please try again.")}
          icon={DollarSign}
          variant="error"
          action={{
            label: outstandingFetching || collectionsFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchOutstanding();
              void refetchCollections();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Payment Collection" description="Record student fee payments and monitor collection activity." />

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Record Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="searchStudent">Search Student</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="searchStudent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    placeholder="Name, ID, class, roll"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="studentId">Student *</Label>
                <Select
                  value={form.studentId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, studentId: value }))}
                >
                  <SelectTrigger id="studentId">
                    <SelectValue placeholder="Select student with dues" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((row) => {
                      const value = row.studentId || row._id;
                      return (
                        <SelectItem key={value} value={value}>
                          {(row.studentName || "Student") +
                            ` (${[row.class, row.section].filter(Boolean).join("-") || "N/A"})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedStudent ? (
              <div className="text-sm rounded-lg border bg-muted/30 p-3">
                Outstanding due for selected student:{" "}
                <span className="font-semibold">{formatCurrency(selectedStudent.totalDue || 0)}</span>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Method *</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="month">Month (optional)</Label>
                <Input
                  id="month"
                  type="number"
                  min={1}
                  max={12}
                  value={form.month}
                  onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="year">Year (optional)</Label>
                <Input
                  id="year"
                  type="number"
                  min={2000}
                  value={form.year}
                  onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="transactionId">Transaction ID (optional)</Label>
                <Input
                  id="transactionId"
                  value={form.transactionId}
                  onChange={(e) => setForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="Bank/mobile transaction reference"
                />
              </div>
              <div>
                <Label htmlFor="remarks">Note (optional)</Label>
                <Input
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Additional payment note"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {collectionRows.length === 0 ? (
        <EmptyState
          title="No collection entries yet"
          description="Collection summary appears after at least one payment is recorded."
          icon={DollarSign}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionRows.map((row, idx) => (
                <TableRow key={`${row._id?.date || "day"}-${idx}`}>
                  <TableCell className="font-medium">{row._id?.date || "-"}</TableCell>
                  <TableCell>{[row._id?.class, row._id?.section].filter(Boolean).join("-") || "-"}</TableCell>
                  <TableCell>{row._id?.feeType || "General"}</TableCell>
                  <TableCell>{formatCurrency(row.totalAmount || 0)}</TableCell>
                  <TableCell>{row.paymentCount || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
