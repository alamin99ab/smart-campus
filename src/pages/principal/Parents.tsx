import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

interface ParentRow {
  _id: string;
  name?: string;
  email?: string;
  linkedStudents?: number;
  students?: unknown[];
}

interface StudentRow {
  _id: string;
  name?: string;
  roll?: string;
  rollNumber?: string;
  classId?: string;
}

export default function ParentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const qc = useQueryClient();

  const {
    data: parents = [],
    isLoading: loadingParents,
    isError: parentsError,
    error: parentsQueryError,
    isFetching: parentsFetching,
    refetch: refetchParents,
  } = useQuery<ParentRow[]>({
    queryKey: ["parents"],
    queryFn: async () => {
      const res = await api.get("/principal/parents");
      return extractApiArray<ParentRow>(res.data, ["parents"]);
    },
  });

  const {
    data: students = [],
    isError: studentsError,
    error: studentsQueryError,
    isFetching: studentsFetching,
    refetch: refetchStudents,
  } = useQuery<StudentRow[]>({
    queryKey: ["students-for-parent-link"],
    queryFn: async () => {
      const res = await api.get("/principal/students");
      return extractApiArray<StudentRow>(res.data, ["students"]);
    },
  });

  const createParent = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        studentIds: selectedStudents,
      };
      const res = await api.post("/principal/parents", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Parent created");
      qc.invalidateQueries({ queryKey: ["parents"] });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", phone: "", address: "" });
      setSelectedStudents([]);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to create parent"));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, and password are required.");
      return;
    }
    if (!strongPasswordRegex.test(form.password)) {
      toast.error("Password must include uppercase, lowercase, number, and symbol.");
      return;
    }
    createParent.mutate();
  };

  if (loadingParents) return <LoadingSpinner text="Loading parents..." />;
  if (parentsError || studentsError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Parents" description="Create and link parent accounts" />
        <EmptyState
          title="Failed to load parent module"
          description={getErrorMessage(parentsQueryError || studentsQueryError, "Please try again.")}
          icon={UserCheck}
          variant="error"
          action={{
            label: parentsFetching || studentsFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchParents();
              void refetchStudents();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Parents"
        description="Create and link parent accounts"
        actionLabel="Add Parent"
        onAction={() => setShowCreate(true)}
      />
      {parents.length === 0 ? (
        <EmptyState
          title="No parents linked"
          description="Parents are linked when students are created or manually added."
          icon={UserCheck}
          actionLabel="Add Parent"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Linked Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((parent) => (
                <TableRow key={parent._id}>
                  <TableCell className="font-medium">{parent.name}</TableCell>
                  <TableCell>{parent.email}</TableCell>
                  <TableCell>{parent.linkedStudents || parent.students?.length || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Parent
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Password *
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Use strong password"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Link Students (optional)</Label>
                <span className="text-xs text-muted-foreground">Keeps notices/results scoped to their children</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students available to link yet.</p>
                ) : (
                  students.map((student) => {
                    const id = student._id;
                    const checked = selectedStudents.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-3 rounded border p-2 hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) => {
                            setSelectedStudents((prev) =>
                              state ? [...prev, id] : prev.filter((pid) => pid !== id)
                            );
                          }}
                        />
                        <div className="text-sm">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {student.roll || student.rollNumber || ""} {student.classId ? ` - ${student.classId}` : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createParent.isPending}>
                {createParent.isPending ? "Creating..." : "Create Parent"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
