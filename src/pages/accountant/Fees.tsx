import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";

interface FeeStructure {
  _id: string;
  className?: string;
  classLevel?: string;
  feeType?: string;
  amount: number;
  academicYear?: string;
  section?: string;
}

export default function AccountantFeesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ classLevel: "", feeType: "Monthly", amount: "", section: "" });
  const qc = useQueryClient();

  const { data: feeStructures = [], isLoading, isError, error, refetch, isFetching } = useQuery<FeeStructure[]>({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const res = await api.get("/accountant/fee-structures");
      return extractApiArray<FeeStructure>(res.data, ["feeStructures"]);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post("/accountant/fee-structures", {
        classLevel: form.classLevel,
        feeType: form.feeType,
        amount: parseFloat(form.amount),
        section: form.section || undefined,
      });
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Fee structure created");
      qc.invalidateQueries({ queryKey: ["fee-structures"] });
      setShowCreate(false);
      setForm({ classLevel: "", feeType: "Monthly", amount: "", section: "" });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed")),
  });

  if (isLoading) return <LoadingSpinner text="Loading fee structures..." />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Fee Structure" description="Manage class-wise fee templates" />
        <EmptyState
          title="Failed to load fee structures"
          description={getErrorMessage(error, "Please try again.")}
          icon={DollarSign}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Fee Structure"
        description="Manage class-wise fee templates"
        actionLabel="Add Fee Structure"
        onAction={() => setShowCreate(true)}
      />
      {feeStructures.length === 0 ? (
        <EmptyState
          title="No fee structure defined"
          description="Set up class-wise fee categories"
          icon={DollarSign}
          actionLabel="Add Fee Structure"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Class</TableHead>
                  <TableHead className="whitespace-nowrap">Section</TableHead>
                  <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                  <TableHead className="whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Academic Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructures.map((fee) => (
                  <TableRow key={fee._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{fee.className || fee.classLevel || "-"}</TableCell>
                    <TableCell>{fee.section || "-"}</TableCell>
                    <TableCell>{fee.feeType || "-"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(fee.amount)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{fee.academicYear || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Fee Structure
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Input
                value={form.classLevel}
                onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                placeholder="e.g. Class 8"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Section (optional)</Label>
              <Input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="e.g. A"
              />
            </div>

            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select value={form.feeType} onValueChange={(value) => setForm({ ...form, feeType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Tuition">Tuition</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Library">Library</SelectItem>
                  <SelectItem value="Lab">Lab</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending}
                className="w-full sm:w-auto"
              >
                {create.isPending ? "Creating..." : "Create Fee Structure"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
