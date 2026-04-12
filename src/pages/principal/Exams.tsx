import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
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
import { FileText, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClassInfo {
  _id: string;
  className: string;
  section?: string;
}

interface SubjectInfo {
  _id: string;
  subjectName: string;
  subjectCode?: string;
}

interface ExamRecord {
  _id: string;
  name: string;
  description?: string;
  examType: string;
  classId?: string;
  class?: { _id?: string; className?: string; section?: string } | null;
  subjectId?: string;
  subject?: { _id?: string; subjectName?: string; subjectCode?: string } | null;
  date: string;
  duration: number;
  totalMarks: number;
  isActive: boolean;
  createdAt?: string;
}

const DEFAULT_FORM = {
  name: "",
  description: "",
  examType: "Final",
  classId: "",
  subjectId: "",
  date: "",
  duration: "120",
  totalMarks: "100",
};

export default function ExamsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const {
    data: classes = [],
    isPending: loadingClasses,
    isError: classesError,
    refetch: refetchClasses,
  } = useQuery<ClassInfo[]>({
    queryKey: ["principal", "classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const {
    data: subjects = [],
    isPending: loadingSubjects,
    isError: subjectsError,
    refetch: refetchSubjects,
  } = useQuery<SubjectInfo[]>({
    queryKey: ["principal", "subjects"],
    queryFn: async () => {
      const res = await api.get("/principal/subjects");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const {
    data: exams = [],
    isPending: loadingExams,
    isError: examsError,
    refetch: refetchExams,
  } = useQuery<ExamRecord[]>({
    queryKey: ["principal", "exams"],
    queryFn: async () => {
      const res = await api.get("/principal/exams");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        examType: form.examType,
        classId: form.classId,
        subjectId: form.subjectId,
        date: form.date,
        duration: Number(form.duration),
        totalMarks: Number(form.totalMarks),
      };

      const res = await api.post("/principal/exams", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Exam created successfully");
      qc.invalidateQueries({ queryKey: ["principal", "exams"] });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to create exam");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.classId || !form.subjectId) {
      toast.error("Class and subject are required");
      return;
    }

    createMutation.mutate();
  };

  if (loadingClasses || loadingSubjects || loadingExams) {
    return <LoadingSpinner text="Loading exams..." />;
  }

  const hasLoadError = classesError || subjectsError || examsError;

  if (hasLoadError) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Examinations"
          description="Manage examination schedules and assessments"
          actionLabel="Schedule Exam"
          onAction={() => setShowCreate(true)}
        />
        <EmptyState
          variant="error"
          title="Unable to load exam data"
          description="Some exam resources failed to load. Please retry."
          actionLabel="Retry"
          onAction={() => {
            refetchClasses();
            refetchSubjects();
            refetchExams();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Examinations"
        description="Manage examination schedules and assessments"
        actionLabel="Schedule Exam"
        onAction={() => setShowCreate(true)}
      />

      {exams.length === 0 ? (
        <EmptyState
          title="No exams scheduled"
          description="Create examination schedules for your students"
          icon={FileText}
          actionLabel="Schedule Exam"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam._id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{exam.examType}</Badge>
                  </TableCell>
                  <TableCell>
                    {exam.class?.className || "-"}
                    {exam.class?.section ? ` - ${exam.class.section}` : ""}
                  </TableCell>
                  <TableCell>{exam.subject?.subjectName || "-"}</TableCell>
                  <TableCell>{exam.date ? new Date(exam.date).toLocaleString() : "-"}</TableCell>
                  <TableCell>{exam.duration} min</TableCell>
                  <TableCell>{exam.totalMarks}</TableCell>
                  <TableCell>
                    <Badge variant={exam.isActive ? "default" : "secondary"}>
                      {exam.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Examination</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Mathematics Final Exam"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Exam details and instructions..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="examType">Exam Type *</Label>
              <Select value={form.examType} onValueChange={(value) => setForm({ ...form, examType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quiz">Quiz</SelectItem>
                  <SelectItem value="Midterm">Midterm</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                  <SelectItem value="Assignment">Assignment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="classId">Class *</Label>
              <Select value={form.classId} onValueChange={(value) => setForm({ ...form, classId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.className} {cls.section ? `- ${cls.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subjectId">Subject *</Label>
              <Select value={form.subjectId} onValueChange={(value) => setForm({ ...form, subjectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Exam Date *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="120"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="totalMarks">Total Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
                  placeholder="100"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Scheduling..." : "Schedule Exam"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
