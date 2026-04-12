import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";

interface ClassRow {
  _id: string;
  className?: string;
  section?: string;
  classLevel?: number | string;
  capacity?: number;
  currentStudents?: number;
}

export default function ClassesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ className: "", section: "", classLevel: "", capacity: "" });
  const qc = useQueryClient();

  const { data: classes = [], isLoading, isError, error, refetch, isFetching } = useQuery<ClassRow[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return extractApiArray<ClassRow>(res.data);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post("/principal/classes", {
        ...form,
        classLevel: Number(form.classLevel),
        capacity: Number(form.capacity),
      });
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Class created");
      qc.invalidateQueries({ queryKey: ["classes"] });
      setShowCreate(false);
      setForm({ className: "", section: "", classLevel: "", capacity: "" });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to create class")),
  });

  if (isLoading) return <LoadingSpinner text="Loading classes..." />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Classes & Sections" description="Manage your school's academic classes" />
        <EmptyState
          title="Failed to load classes"
          description={getErrorMessage(error, "Please try again.")}
          variant="error"
          actionLabel={isFetching ? "Retrying..." : "Retry"}
          onAction={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Classes & Sections"
        description="Manage your school's academic classes"
        actionLabel="Add Class"
        onAction={() => setShowCreate(true)}
      />

      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create classes to organize your school"
          icon={Layers}
          actionLabel="Add Class"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Class Name</TableHead>
                  <TableHead className="whitespace-nowrap">Section</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Level</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Capacity</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((row) => (
                  <TableRow key={row._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{row.className}</TableCell>
                    <TableCell className="text-muted-foreground">{row.section || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.classLevel ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.capacity ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.currentStudents ?? "-"}</TableCell>
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
              Create Class
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class Name *</Label>
                <Input
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  placeholder="e.g. Class 10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Section *</Label>
                <Input
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. A"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class Level *</Label>
                <Input
                  type="number"
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  placeholder="e.g. 10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="e.g. 30"
                  required
                />
              </div>
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
                {create.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
