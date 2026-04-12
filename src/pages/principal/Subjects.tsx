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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

interface SubjectRow {
  _id: string;
  subjectName?: string;
  subjectCode?: string;
  classLevels?: number[];
  category?: string;
}

export default function SubjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subjectName: "",
    subjectCode: "",
    category: "Core",
    classLevels: "",
    description: "",
    credits: "1",
    periodsPerWeek: "5",
    passingMarks: "33",
    totalMarks: "100"
  });
  const qc = useQueryClient();

  const { data: subjects = [], isLoading, isError, error, refetch, isFetching } = useQuery<SubjectRow[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get("/principal/subjects");
      return extractApiArray<SubjectRow>(res.data);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        subjectName: form.subjectName,
        subjectCode: form.subjectCode,
        category: form.category,
        classLevels: form.classLevels
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .map(Number),
        description: form.description,
        credits: Number(form.credits),
        periodsPerWeek: Number(form.periodsPerWeek),
        passingMarks: Number(form.passingMarks),
        totalMarks: Number(form.totalMarks)
      };
      const res = await api.post("/principal/subjects", payload);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Subject created");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setShowCreate(false);
      setForm({
        subjectName: "",
        subjectCode: "",
        category: "Core",
        classLevels: "",
        description: "",
        credits: "1",
        periodsPerWeek: "5",
        passingMarks: "33",
        totalMarks: "100"
      });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to create subject")),
  });

  if (isLoading) return <LoadingSpinner text="Loading subjects..." />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Subjects" description="Manage academic subjects" actionLabel="Add Subject" onAction={() => setShowCreate(true)} />
        <EmptyState
          title="Failed to load subjects"
          description={getErrorMessage(error, "Please try again.")}
          icon={BookOpen}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage academic subjects"
        actionLabel="Add Subject"
        onAction={() => setShowCreate(true)}
      />

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Add subjects for your curriculum"
          icon={BookOpen}
          actionLabel="Add Subject"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Subject</TableHead>
                  <TableHead className="whitespace-nowrap">Code</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Class Levels</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{subject.subjectName}</TableCell>
                    <TableCell className="text-muted-foreground">{subject.subjectCode || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm">
                        {Array.isArray(subject.classLevels) ? subject.classLevels.join(", ") : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${subject.category === "Core" ? "bg-blue-100 text-blue-800" : subject.category === "Elective" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}>
                        {subject.category || "-"}
                      </span>
                    </TableCell>
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
              Add Subject
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input
                  value={form.subjectName}
                  onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                  required
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Code *</Label>
                <Input
                  value={form.subjectCode}
                  onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                  required
                  placeholder="e.g., MATH"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Elective">Elective</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                    <SelectItem value="Extra-curricular">Extra-curricular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class Levels</Label>
                <Input
                  placeholder="e.g. 9, 10"
                  value={form.classLevels}
                  onChange={(e) => setForm({ ...form, classLevels: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Credits</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Periods/Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.periodsPerWeek}
                  onChange={(e) => setForm({ ...form, periodsPerWeek: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Passing Marks</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passingMarks}
                  onChange={(e) => setForm({ ...form, passingMarks: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Total Marks</Label>
                <Input
                  type="number"
                  min={50}
                  max={200}
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
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
                {create.isPending ? "Creating..." : "Create Subject"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
