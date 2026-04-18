import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";

interface SubjectAssignment {
  subjectId: string;
  subjectName: string;
  classes: Array<{ classId: string; className: string; section?: string }>;
}

interface ClassTestRow {
  _id: string;
  name?: string;
  examType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalMarks?: number;
  duration?: number;
  class?: { className?: string; section?: string } | null;
  subject?: { subjectName?: string } | null;
}

const DEFAULT_FORM = {
  title: "",
  subjectId: "",
  classId: "",
  startDate: "",
  duration: "60",
  maxMarks: "20",
  instructions: "",
};

export default function TeacherClassTestsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const {
    data: subjectAssignments = [],
    isLoading: loadingAssignments,
    isError: assignmentsError,
    error: assignmentsQueryError,
    refetch: refetchAssignments,
    isFetching: assignmentsFetching,
  } = useQuery<SubjectAssignment[]>({
    queryKey: ["teacher", "subjects-for-class-tests"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-subjects");
      return extractApiArray<SubjectAssignment>(res.data, ["subjects"]);
    },
  });

  const allowedClassOptions = useMemo(() => {
    const options = new Map<string, { classId: string; className: string; section?: string }>();
    subjectAssignments.forEach((assignment) => {
      assignment.classes?.forEach((cls) => {
        options.set(cls.classId, cls);
      });
    });
    return Array.from(options.values());
  }, [subjectAssignments]);

  useEffect(() => {
    if (!form.subjectId && subjectAssignments.length > 0) {
      setForm((prev) => ({ ...prev, subjectId: subjectAssignments[0].subjectId }));
    }
  }, [subjectAssignments, form.subjectId]);

  useEffect(() => {
    if (!form.classId && allowedClassOptions.length > 0) {
      setForm((prev) => ({ ...prev, classId: allowedClassOptions[0].classId }));
    }
  }, [allowedClassOptions, form.classId]);

  const {
    data: classTests = [],
    isLoading: loadingClassTests,
    isError: classTestsError,
    error: classTestsQueryError,
    refetch: refetchClassTests,
    isFetching: classTestsFetching,
  } = useQuery<ClassTestRow[]>({
    queryKey: ["teacher", "class-tests"],
    queryFn: async () => {
      const res = await api.get("/teacher/class-tests");
      return extractApiArray<ClassTestRow>(res.data);
    },
  });

  const createClassTestMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(form.startDate);
      if (Number.isNaN(start.getTime())) {
        throw new Error("Valid class test date/time is required");
      }

      const payload = {
        title: form.title.trim(),
        type: "class_test",
        category: "class_test",
        classId: form.classId,
        subjectId: form.subjectId,
        startDate: start.toISOString(),
        endDate: start.toISOString(),
        maxMarks: Number(form.maxMarks),
        duration: Number(form.duration),
        instructions: form.instructions.trim() || undefined,
      };

      const res = await api.post("/teacher/class-tests", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Class test created successfully");
      qc.invalidateQueries({ queryKey: ["teacher", "class-tests"] });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to create class test"));
    },
  });

  const onCreate = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Class test title is required");
      return;
    }
    if (!form.subjectId || !form.classId) {
      toast.error("Subject and class are required");
      return;
    }
    if (!form.startDate) {
      toast.error("Test date/time is required");
      return;
    }
    if (Number(form.duration) < 15) {
      toast.error("Duration must be at least 15 minutes");
      return;
    }
    if (Number(form.maxMarks) <= 0) {
      toast.error("Maximum marks must be greater than 0");
      return;
    }

    createClassTestMutation.mutate();
  };

  if (loadingAssignments || loadingClassTests) {
    return <LoadingSpinner text="Loading class tests..." />;
  }

  if (assignmentsError || classTestsError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Class Tests" description="Create and review class tests for your assigned classes." />
        <EmptyState
          title="Failed to load class test resources"
          description={getErrorMessage(assignmentsQueryError || classTestsQueryError, "Please try again.")}
          icon={ClipboardCheck}
          variant="error"
          action={{
            label: assignmentsFetching || classTestsFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchAssignments();
              void refetchClassTests();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Class Tests"
        description="Create and review class tests for your assigned classes."
        actionLabel="Create Class Test"
        onAction={() => setShowCreate(true)}
      />

      {classTests.length === 0 ? (
        <EmptyState
          title="No class tests yet"
          description="Create your first class test to start the assessment workflow."
          icon={ClipboardCheck}
          actionLabel="Create Class Test"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classTests.map((test) => (
                <TableRow key={test._id}>
                  <TableCell className="font-medium">{test.name || "Class Test"}</TableCell>
                  <TableCell>
                    {test.class?.className || "-"}
                    {test.class?.section ? ` - ${test.class.section}` : ""}
                  </TableCell>
                  <TableCell>{test.subject?.subjectName || "-"}</TableCell>
                  <TableCell>{test.startDate ? new Date(test.startDate).toLocaleString() : "-"}</TableCell>
                  <TableCell>{test.duration || "-"} min</TableCell>
                  <TableCell>{test.totalMarks ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{test.status || "draft"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Class Test
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Weekly Mathematics Test"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, subjectId: value }))}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectAssignments.map((row) => (
                      <SelectItem key={row.subjectId} value={row.subjectId}>
                        {row.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="classId">Class *</Label>
                <Select
                  value={form.classId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, classId: value }))}
                >
                  <SelectTrigger id="classId">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedClassOptions.map((row) => (
                      <SelectItem key={row.classId} value={row.classId}>
                        {row.className}
                        {row.section ? ` - ${row.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="startDate">Date & Time *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  value={form.duration}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxMarks">Maximum Marks *</Label>
                <Input
                  id="maxMarks"
                  type="number"
                  min={1}
                  value={form.maxMarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Note (optional)</Label>
              <Textarea
                id="instructions"
                value={form.instructions}
                onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder="Optional instructions for students"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClassTestMutation.isPending}>
                {createClassTestMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
