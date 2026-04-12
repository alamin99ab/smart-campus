import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { extractApiArray } from "@/lib/apiResponse";
import { createTeacherSchema, type CreateTeacherForm } from "@/lib/schemas";
import { useAuthStore } from "@/stores/authStore";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Network, Clock3, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ClassDoc = { _id: string; className?: string; section?: string; classLevel?: number; academicYear?: string };
type SubjectDoc = { _id: string; subjectName?: string; subjectCode?: string; classLevels?: number[] };
type TeacherDoc = { _id: string; name?: string; email?: string; phone?: string };

type AssignmentTeacher = { _id: string; name?: string; email?: string };
type AssignmentSubject = { _id: string; subjectName?: string; subjectCode?: string };
type AssignmentClass = { _id: string; className?: string; section?: string };

type TeacherAssignment = {
  _id: string;
  teacher?: AssignmentTeacher | string;
  subject?: AssignmentSubject | string;
  subjectName?: string;
  subjectCode?: string;
  classes?: Array<AssignmentClass | string>;
  periodsPerWeek?: number;
  academicYear?: string;
};

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || fallback;
};

const normalizeAssignments = (payload: unknown): TeacherAssignment[] => {
  if (Array.isArray(payload)) return payload as TeacherAssignment[];
  if (payload && typeof payload === "object") {
    const value = payload as { data?: unknown; assignments?: unknown; assignment?: unknown };
    if ("data" in value) return normalizeAssignments(value.data);
    if (Array.isArray(value.assignments)) return value.assignments as TeacherAssignment[];
    if (value.assignment && typeof value.assignment === "object") return [value.assignment as TeacherAssignment];
  }
  throw new Error("Unexpected response format");
};

const teacherIdFrom = (row: TeacherAssignment) => {
  if (row.teacher && typeof row.teacher === "object") return row.teacher._id || "";
  return typeof row.teacher === "string" ? row.teacher : "";
};

const teacherLabelFrom = (row: TeacherAssignment) => {
  if (row.teacher && typeof row.teacher === "object") return row.teacher.name || row.teacher.email || "Unknown Teacher";
  return "Unknown Teacher";
};

const subjectIdFrom = (row: TeacherAssignment) => {
  if (row.subject && typeof row.subject === "object") return row.subject._id || "";
  return typeof row.subject === "string" ? row.subject : "";
};

const subjectLabelFrom = (row: TeacherAssignment) => {
  if (row.subject && typeof row.subject === "object") {
    return `${row.subject.subjectName || row.subjectName || "Unknown Subject"}${row.subject.subjectCode ? ` (${row.subject.subjectCode})` : ""}`;
  }
  return `${row.subjectName || "Unknown Subject"}${row.subjectCode ? ` (${row.subjectCode})` : ""}`;
};

const classIdsFrom = (row: TeacherAssignment) => {
  const ids = (row.classes || []).map((entry) => {
    if (entry && typeof entry === "object") return entry._id || "";
    return typeof entry === "string" ? entry : "";
  });
  return [...new Set(ids.filter(Boolean))];
};

const classLabelFrom = (row: TeacherAssignment, classesById: Map<string, ClassDoc>) => {
  const labels = new Set<string>();
  (row.classes || []).forEach((entry) => {
    if (entry && typeof entry === "object") {
      labels.add(`${entry.className || "Class"}${entry.section ? ` - ${entry.section}` : ""}`);
      return;
    }
    if (typeof entry === "string") {
      const cls = classesById.get(entry);
      if (cls) labels.add(`${cls.className || "Class"}${cls.section ? ` - ${cls.section}` : ""}`);
    }
  });
  return labels.size > 0 ? Array.from(labels).join(", ") : "-";
};

export default function TeachersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showCreate, setShowCreate] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherAssignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ classId: "", subjectId: "", teacherId: "", periodsPerWeek: "5" });
  const [editForm, setEditForm] = useState({ id: "", teacherId: "", classId: "", subjectId: "", periodsPerWeek: "5", academicYear: "" });
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeacherForm>({
    resolver: zodResolver(createTeacherSchema),
  });

  const { data: teachersData, isLoading: loadingTeachers, isError: teachersError, error: teachersQueryError, refetch: refetchTeachers } = useQuery<TeacherDoc[]>({
    queryKey: ["teachers"],
    queryFn: async () => {
      const res = await api.get("/principal/teachers");
      return extractApiArray<TeacherDoc>(res.data, ["teachers"]);
    },
  });

  const { data: classesData, isLoading: loadingClasses, isError: classesError, error: classesQueryError, refetch: refetchClasses } = useQuery<ClassDoc[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return extractApiArray<ClassDoc>(res.data, ["classes"]);
    },
  });

  const { data: subjectsData, isLoading: loadingSubjects, isError: subjectsError, error: subjectsQueryError, refetch: refetchSubjects } = useQuery<SubjectDoc[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get("/principal/subjects");
      return extractApiArray<SubjectDoc>(res.data, ["subjects"]);
    },
  });

  const { data: assignmentsData, isLoading: loadingAssignments, isError: assignmentsError, error: assignmentsQueryError, refetch: refetchAssignments } = useQuery<TeacherAssignment[]>({
    queryKey: ["teacher-assignments-admin"],
    queryFn: async () => {
      const res = await api.get("/teacher-assignments");
      return normalizeAssignments(res.data);
    },
    enabled: role === "principal",
  });

  const teachers = toArray<TeacherDoc>(teachersData);
  const classes = toArray<ClassDoc>(classesData);
  const subjects = toArray<SubjectDoc>(subjectsData);
  const assignments = toArray<TeacherAssignment>(assignmentsData);
  const classesById = useMemo(() => new Map(classes.map((c) => [c._id, c])), [classes]);

  const invalidateAssignmentQueries = () => {
    void qc.invalidateQueries({ queryKey: ["teacher-assignments-admin"] });
    void qc.invalidateQueries({ queryKey: ["teacher-assignment-links"] });
    void qc.invalidateQueries({ queryKey: ["teacher-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["teacher-classes"] });
    void qc.invalidateQueries({ queryKey: ["classes"] });
  };

  const create = useMutation({
    mutationFn: async (data: CreateTeacherForm) => {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        subjects: data.subjects.split(",").map((s) => s.trim()).filter(Boolean),
        classes: data.classes ? data.classes.split(",").map((c) => c.trim()).filter(Boolean) : [],
      };
      const res = await api.post("/principal/teachers", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Teacher created");
      void qc.invalidateQueries({ queryKey: ["teachers"] });
      setShowCreate(false);
      reset();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create teacher")),
  });

  const assignTeacher = useMutation({
    mutationFn: async () => {
      if (!assignmentForm.classId || !assignmentForm.subjectId || !assignmentForm.teacherId) {
        throw new Error("Class, subject, and teacher are required");
      }
      const selectedClass = classes.find((c) => c._id === assignmentForm.classId);
      const res = await api.post("/teacher-assignments", {
        classId: assignmentForm.classId,
        subjectId: assignmentForm.subjectId,
        teacherId: assignmentForm.teacherId,
        academicYear: selectedClass?.academicYear,
        periodsPerWeek: Number(assignmentForm.periodsPerWeek) || 5,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Teacher assigned");
      invalidateAssignmentQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to assign teacher")),
  });

  const updateAssignment = useMutation({
    mutationFn: async () => {
      if (!editForm.classId || !editForm.subjectId) throw new Error("Subject and class are required");
      const periods = Number(editForm.periodsPerWeek) || 0;

      const res = await api.put(`/teacher-assignments/${editForm.id}`, {
        classId: editForm.classId,
        subjectId: editForm.subjectId,
        periodsPerWeek: periods,
        academicYear: editForm.academicYear || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Assignment updated");
      setEditOpen(false);
      setEditForm({ id: "", teacherId: "", classId: "", subjectId: "", periodsPerWeek: "5", academicYear: "" });
      invalidateAssignmentQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update assignment")),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/teacher-assignments/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Assignment deleted");
      setDeleteTarget(null);
      invalidateAssignmentQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete assignment")),
  });

  const onSubmit = (data: CreateTeacherForm) => {
    create.mutate(data);
  };

  const selectedClass = classes.find((c) => c._id === assignmentForm.classId);
  const filteredSubjects = subjects
    .filter((s) =>
      !selectedClass?.classLevel ? true : Array.isArray(s.classLevels) && s.classLevels.includes(selectedClass.classLevel)
    )
    .filter((s) => Boolean(s._id));

  const selectedEditClass = classes.find((c) => c._id === editForm.classId);
  const editSubjects = subjects
    .filter((s) =>
      !selectedEditClass?.classLevel ? true : Array.isArray(s.classLevels) && s.classLevels.includes(selectedEditClass.classLevel)
    )
    .filter((s) => Boolean(s._id));

  if (role && role !== "principal") {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Teachers" description="Manage your teaching staff and assignments" />
        <EmptyState title="Access denied" description="Only principal can access this module." variant="error" />
      </div>
    );
  }

  if (loadingTeachers || loadingClasses || loadingSubjects) return <LoadingSpinner text="Loading teacher module..." />;

  if (teachersError || classesError || subjectsError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Teachers" description="Manage your teaching staff and assignments" />
        <EmptyState
          title="Failed to load data"
          description={getErrorMessage(teachersQueryError || classesQueryError || subjectsQueryError, "Please try again")}
          actionLabel="Retry"
          onAction={() => {
            void refetchTeachers();
            void refetchClasses();
            void refetchSubjects();
          }}
          variant="error"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Teachers" description="Manage your teaching staff and assignments" actionLabel="Add Teacher" onAction={() => setShowCreate(true)} />

      {teachers.length === 0 ? (
        <EmptyState title="No teachers yet" description="Add teachers to your school" icon={Users} actionLabel="Add Teacher" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{teacher.name || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.email || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{teacher.phone || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Assign teacher to class & subject</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Class</Label>
            <Select value={assignmentForm.classId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, classId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.length === 0 ? (
                  <SelectItem value="__no_classes__" disabled>No classes available</SelectItem>
                ) : (
                  classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.className || "Class"} {cls.section ? `- ${cls.section}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={assignmentForm.subjectId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, subjectId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {filteredSubjects.length === 0 ? (
                  <SelectItem value="__no_subjects__" disabled>No subjects available for this class</SelectItem>
                ) : (
                  filteredSubjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.subjectName || "Subject"} {s.subjectCode ? `(${s.subjectCode})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teacher</Label>
            <Select value={assignmentForm.teacherId} onValueChange={(v) => setAssignmentForm((p) => ({ ...p, teacherId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.length === 0 ? (
                  <SelectItem value="__no_teachers__" disabled>No teachers available</SelectItem>
                ) : (
                  teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.name || "Teacher"}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1"><Clock3 className="h-4 w-4" />Periods/Week</Label>
            <Input type="number" min={1} max={14} value={assignmentForm.periodsPerWeek} onChange={(e) => setAssignmentForm((p) => ({ ...p, periodsPerWeek: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => assignTeacher.mutate()} disabled={assignTeacher.isPending || !assignmentForm.classId || !assignmentForm.subjectId || !assignmentForm.teacherId}>
            {assignTeacher.isPending ? "Assigning..." : "Assign Teacher"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-4">
        <h3 className="font-semibold">Teacher Assignment Management</h3>
        {loadingAssignments ? (
          <LoadingSpinner text="Loading assignments..." />
        ) : assignmentsError ? (
          <EmptyState title="Failed to load assignments" description={getErrorMessage(assignmentsQueryError, "Please try again")} actionLabel="Retry" onAction={() => refetchAssignments()} variant="error" />
        ) : assignments.length === 0 ? (
          <EmptyState title="No assignments" description="Assign teachers above to populate this list." actionLabel="Refresh" onAction={() => refetchAssignments()} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class + Section</TableHead>
                  <TableHead>Periods per week</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>{teacherLabelFrom(row)}</TableCell>
                    <TableCell>{subjectLabelFrom(row)}</TableCell>
                    <TableCell>{classLabelFrom(row, classesById)}</TableCell>
                    <TableCell>{row.periodsPerWeek ?? 0}</TableCell>
                    <TableCell>{row.academicYear || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateAssignment.isPending || deleteAssignment.isPending}
                          onClick={() => {
                            const firstClassId = classIdsFrom(row)[0] || "";
                            setEditForm({
                              id: row._id,
                              teacherId: teacherIdFrom(row),
                              classId: firstClassId,
                              subjectId: subjectIdFrom(row),
                              periodsPerWeek: String(row.periodsPerWeek ?? 0),
                              academicYear: row.academicYear || "",
                            });
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" disabled={updateAssignment.isPending || deleteAssignment.isPending} onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => !updateAssignment.isPending && setEditOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={editForm.subjectId} onValueChange={(v) => setEditForm((p) => ({ ...p, subjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {editSubjects.length === 0 ? (
                    <SelectItem value="__no_edit_subjects__" disabled>No subjects available for this class</SelectItem>
                  ) : (
                    editSubjects.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.subjectName || "Subject"} {s.subjectCode ? `(${s.subjectCode})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={editForm.classId} onValueChange={(v) => setEditForm((p) => ({ ...p, classId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <SelectItem value="__no_edit_classes__" disabled>No classes available</SelectItem>
                  ) : (
                    classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.className || "Class"} {c.section ? `- ${c.section}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Periods per week</Label>
              <Input type="number" min={0} max={20} value={editForm.periodsPerWeek} onChange={(e) => setEditForm((p) => ({ ...p, periodsPerWeek: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateAssignment.isPending}>Cancel</Button>
              <Button onClick={() => updateAssignment.mutate()} disabled={updateAssignment.isPending || !editForm.id || !editForm.classId || !editForm.subjectId}>
                {updateAssignment.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !deleteAssignment.isPending && !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this assignment? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssignment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAssignment.isPending || !deleteTarget?._id}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget?._id) return;
                deleteAssignment.mutate(deleteTarget._id);
              }}
            >
              {deleteAssignment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add Teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Full name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="Phone number" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="teacher@school.edu" {...register("email")} className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" placeholder="********" {...register("password")} className={errors.password ? "border-destructive" : ""} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjects">Subject(s) *</Label>
              <Input id="subjects" placeholder="Math, Science, English (comma-separated)" {...register("subjects")} className={errors.subjects ? "border-destructive" : ""} />
              {errors.subjects && <p className="text-xs text-destructive">{errors.subjects.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="classes">Classes</Label>
              <Input id="classes" placeholder="Class 9, Class 10 (comma-separated)" {...register("classes")} />
              {errors.classes && <p className="text-xs text-destructive">{errors.classes.message}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">{create.isPending ? "Creating..." : "Create Teacher"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
