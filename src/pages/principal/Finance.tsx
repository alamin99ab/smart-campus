import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign, AlertCircle, Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber?: string;
}

/** Backend Fee model (/api/fees) */
interface FeeRecord {
  _id: string;
  studentId?: { name?: string; roll?: string; rollNumber?: string };
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: "Paid" | "Partial" | "Unpaid";
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function feeStatusUi(status: string): "paid" | "overdue" | "pending" {
  if (status === "Paid") return "paid";
  if (status === "Unpaid") return "overdue";
  return "pending";
}

export default function FinancePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateStructure, setShowCreateStructure] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    dueDate: "",
  });
  const [structureForm, setStructureForm] = useState({
    className: "",
    feeType: "Tuition",
    amount: "",
    dueDate: "",
    description: ""
  });
  const qc = useQueryClient();

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsQueryError,
    isFetching: studentsFetching,
    refetch: refetchStudents,
  } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await api.get("/principal/students");
      return extractApiArray<Student>(res.data);
    },
  });

  const {
    data: feeStructures = [],
    isLoading: loadingStructures,
    isError: structuresError,
    error: structuresQueryError,
    isFetching: structuresFetching,
    refetch: refetchStructures,
  } = useQuery({
    queryKey: ["feeStructures"],
    queryFn: async () => {
      const res = await api.get("/principal/fee-structure");
      return extractApiArray<Record<string, unknown>>(res.data);
    },
  });

  const {
    data: fees = [],
    isLoading: loadingFees,
    isError: feesError,
    error: feesQueryError,
    isFetching: feesFetching,
    refetch: refetchFees,
  } = useQuery<FeeRecord[]>({
    queryKey: ["fees"],
    queryFn: async () => {
      const res = await api.get("/fees", { params: { limit: 500 } });
      const payload = extractApiObject(res.data);
      return extractApiArray<FeeRecord>(payload, ["fees"]);
    },
  });

  const totalFees = fees.length;
  const collectedFees = fees.filter((f) => Number(f.amountPaid || 0) > 0).length;
  const pendingFees = fees.filter(f => f.status !== "Paid").length;
  const totalAmount = fees.reduce((sum, f) => sum + (f.amountDue || 0), 0);
  const collectedAmount = fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
  const pendingAmount = fees
    .filter(f => f.status !== "Paid")
    .reduce((sum, f) => sum + Math.max(0, (f.amountDue || 0) - (f.amountPaid || 0)), 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.dueDate) throw new Error("Due date is required");
      if (!form.studentId) throw new Error("Student is required");
      const d = new Date(form.dueDate);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const res = await api.post("/fees/update", {
        studentId: form.studentId,
        month,
        year,
        amountDue: parseFloat(form.amount),
        feeType: "Monthly",
        dueDate: d.toISOString(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Fee record saved successfully");
      qc.invalidateQueries({ queryKey: ["fees"] });
      setShowCreate(false);
      setForm({
        studentId: "",
        amount: "",
        dueDate: "",
      });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to save fee"));
    },
  });

  const createStructureMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/principal/fee-structure", {
        ...structureForm,
        amount: parseFloat(structureForm.amount)
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Fee structure created successfully");
      qc.invalidateQueries({ queryKey: ["feeStructures"] });
      setShowCreateStructure(false);
      setStructureForm({
        className: "",
        feeType: "Tuition",
        amount: "",
        dueDate: "",
        description: ""
      });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to create fee structure"));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId) {
      toast.error("Student is required");
      return;
    }
    if (!form.amount || Number(form.amount) < 0) {
      toast.error("Valid amount is required");
      return;
    }
    if (!form.dueDate) {
      toast.error("Billing month is required");
      return;
    }
    createMutation.mutate();
  };

  const isAnyError = studentsError || feesError || structuresError;
  const isAnyFetching = studentsFetching || feesFetching || structuresFetching;

  if (loadingStudents || loadingFees || loadingStructures) return <LoadingSpinner text="Loading finance data..." />;
  if (isAnyError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Finance Management" description="Manage fee collection and financial records" />
        <EmptyState
          title="Finance data failed to load"
          description={
            getErrorMessage(
              feesQueryError || structuresQueryError || studentsQueryError,
              "Please try again."
            )
          }
          variant="error"
          actionLabel={isAnyFetching ? "Retrying..." : "Retry"}
          onAction={() => {
            void refetchStudents();
            void refetchStructures();
            void refetchFees();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Finance Management" 
        description="Manage fee collection and financial records" 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Fee Records" 
          value={totalFees} 
          icon={FileText} 
          variant="primary"
          description={`${collectedFees} fully paid`}
        />
        <StatCard 
          title="Collected (paid status)" 
          value={`$${collectedAmount.toFixed(2)}`} 
          icon={DollarSign} 
          variant="success"
          description={collectedFees > 0 ? `${((collectedAmount / (totalAmount || 1)) * 100).toFixed(1)}% of total due` : "No completed payments"}
        />
        <StatCard 
          title="Outstanding (unpaid / partial)" 
          value={`$${pendingAmount.toFixed(2)}`} 
          icon={AlertCircle} 
          variant="warning"
          description={`${pendingFees} records`}
        />
        <StatCard 
          title="Total assessed" 
          value={`$${totalAmount.toFixed(2)}`} 
          icon={DollarSign} 
          variant="info"
          description={`${totalFees} records`}
        />
      </div>

      <Tabs defaultValue="fees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fees">Fee Management</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Student fees (monthly records)</h3>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add fee record
            </Button>
          </div>

          {fees.length === 0 ? (
            <div className="bg-card rounded-xl border p-8 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">No fee records yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create a monthly fee entry for a student</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add first record
              </Button>
            </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => {
                    const ui = feeStatusUi(fee.status);
                    const stu = fee.studentId;
                    return (
                    <TableRow key={fee._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stu?.name || "-"}</p>
                          <p className="text-sm text-muted-foreground">{stu?.roll || stu?.rollNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{MONTHS[(fee.month || 1) - 1]} {fee.year}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">${(fee.amountDue ?? 0).toFixed(2)}</TableCell>
                      <TableCell>${(fee.amountPaid ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            ui === "paid" ? "default" : 
                            ui === "overdue" ? "destructive" : "secondary"
                          }
                        >
                          {ui === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {ui === "overdue" && <XCircle className="h-3 w-3 mr-1" />}
                          {fee.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Fee structures</h3>
            <Button onClick={() => setShowCreateStructure(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create structure
            </Button>
          </div>

          {feeStructures.length === 0 ? (
            <div className="bg-card rounded-xl border p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">No fee structures yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Define default fee templates per class</p>
              <Button onClick={() => setShowCreateStructure(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create first structure
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.map((structure: { _id: string; className?: string; feeType?: string; amount?: number; dueDate?: string; description?: string }) => (
                    <TableRow key={structure._id}>
                      <TableCell className="font-medium">{structure.className}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{structure.feeType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">${Number(structure.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {structure.dueDate ? new Date(structure.dueDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">{structure.description || "-"}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add fee record</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="studentId">Student *</Label>
              <Select value={form.studentId} onValueChange={(value) => setForm({ ...form, studentId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} {student.rollNumber && `(${student.rollNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount due ($) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="100.00"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Billing month (pick any day in month) *</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Month and year are taken from this date.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateStructure} onOpenChange={setShowCreateStructure}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create fee structure</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createStructureMutation.mutate(); }} className="space-y-4">
            <div>
              <Label htmlFor="className">Class *</Label>
              <Input
                id="className"
                value={structureForm.className}
                onChange={(e) => setStructureForm({ ...structureForm, className: e.target.value })}
                placeholder="e.g., Class 10"
                required
              />
            </div>

            <div>
              <Label htmlFor="feeType">Fee type *</Label>
              <Select value={structureForm.feeType} onValueChange={(value) => setStructureForm({ ...structureForm, feeType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tuition">Tuition Fee</SelectItem>
                  <SelectItem value="Lab">Lab Fee</SelectItem>
                  <SelectItem value="Library">Library Fee</SelectItem>
                  <SelectItem value="Sports">Sports Fee</SelectItem>
                  <SelectItem value="Transport">Transport Fee</SelectItem>
                  <SelectItem value="Examination">Examination Fee</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="samount">Amount ($) *</Label>
              <Input
                id="samount"
                type="number"
                step="0.01"
                value={structureForm.amount}
                onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
                placeholder="100.00"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="sdueDate">Due date</Label>
              <Input
                id="sdueDate"
                type="date"
                value={structureForm.dueDate}
                onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sdesc">Description</Label>
              <Textarea
                id="sdesc"
                value={structureForm.description}
                onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                placeholder="Optional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateStructure(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStructureMutation.isPending}>
                {createStructureMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


