import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
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
import { Calendar, ClipboardList, FileText, Plus, Save, Trash2 } from "lucide-react";
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

interface SectionInfo {
  _id: string;
  classId?: string;
  sectionName?: string;
  name?: string;
}

interface AcademicSessionInfo {
  _id: string;
  name?: string;
  academicYear?: string;
  isCurrent?: boolean;
}

interface ExamRecord {
  _id: string;
  name: string;
  examType: string;
  category?: string;
  status?: string;
  classId?: string;
  class?: { _id?: string; className?: string; section?: string } | null;
  subjectId?: string;
  subject?: { _id?: string; subjectName?: string; subjectCode?: string } | null;
  startDate?: string;
  date?: string;
  duration?: number;
  totalMarks?: number;
  isActive?: boolean;
}

interface ScheduleSlot {
  _id?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  classId?: string | { _id?: string; className?: string; section?: string };
  sectionId?: string | { _id?: string; sectionName?: string; name?: string };
  subjectId?: string | { _id?: string; subjectName?: string };
  totalMarks?: number;
  passMarks?: number;
  status?: string;
}

interface ExamSchedule {
  _id?: string;
  examId?: string;
  examName?: string;
  academicYear?: string;
  academicSessionId?: string;
  slots?: ScheduleSlot[];
}

type ScheduleEditorRow = {
  date: string;
  startTime: string;
  endTime: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  totalMarks: string;
  passMarks: string;
  status: "scheduled" | "rescheduled" | "completed" | "cancelled";
};

const DEFAULT_EXAM_FORM = {
  title: "",
  type: "final",
  classId: "",
  subjectId: "",
  date: "",
  duration: "120",
  maxMarks: "100",
  instructions: "",
};

const DEFAULT_CLASS_TEST_FORM = {
  title: "",
  classId: "",
  subjectId: "",
  date: "",
  duration: "45",
  maxMarks: "20",
  instructions: "",
};

const createDefaultScheduleRow = (exam?: ExamRecord): ScheduleEditorRow => ({
  date: exam?.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : "",
  startTime: "09:00",
  endTime: "10:00",
  classId: exam?.class?._id || exam?.classId || "",
  sectionId: "",
  subjectId: exam?.subject?._id || exam?.subjectId || "",
  totalMarks: String(exam?.totalMarks || 100),
  passMarks: "33",
  status: "scheduled",
});

const toId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: string })._id || "");
  }
  return "";
};

const toDateInput = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeScheduleRows = (schedule: ExamSchedule | null | undefined, exam?: ExamRecord): ScheduleEditorRow[] => {
  const slots = Array.isArray(schedule?.slots) ? schedule?.slots : [];
  if (!slots.length) return [createDefaultScheduleRow(exam)];

  return slots.map((slot) => ({
    date: toDateInput(slot.date),
    startTime: slot.startTime || "",
    endTime: slot.endTime || "",
    classId: toId(slot.classId),
    sectionId: toId(slot.sectionId),
    subjectId: toId(slot.subjectId),
    totalMarks: String(slot.totalMarks ?? 100),
    passMarks: String(slot.passMarks ?? 33),
    status: (slot.status as ScheduleEditorRow["status"]) || "scheduled",
  }));
};

export default function ExamsPage() {
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<"exams" | "schedules" | "class-tests">("exams");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showCreateClassTest, setShowCreateClassTest] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [examForm, setExamForm] = useState(DEFAULT_EXAM_FORM);
  const [classTestForm, setClassTestForm] = useState(DEFAULT_CLASS_TEST_FORM);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedScheduleSessionId, setSelectedScheduleSessionId] = useState("");
  const [scheduleRows, setScheduleRows] = useState<ScheduleEditorRow[]>([]);

  const {
    data: classes = [],
    isPending: loadingClasses,
    isError: classesError,
    refetch: refetchClasses,
  } = useQuery<ClassInfo[]>({
    queryKey: ["principal", "classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return extractApiArray<ClassInfo>(res.data);
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
      return extractApiArray<SubjectInfo>(res.data);
    },
  });

  const {
    data: sections = [],
    isPending: loadingSections,
    isError: sectionsError,
    refetch: refetchSections,
  } = useQuery<SectionInfo[]>({
    queryKey: ["principal", "sections"],
    queryFn: async () => {
      const res = await api.get("/principal/sections");
      return extractApiArray<SectionInfo>(res.data);
    },
  });

  const {
    data: sessions = [],
    isPending: loadingSessions,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useQuery<AcademicSessionInfo[]>({
    queryKey: ["principal", "academic-sessions"],
    queryFn: async () => {
      const res = await api.get("/academic-sessions");
      return extractApiArray<AcademicSessionInfo>(res.data);
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
      return extractApiArray<ExamRecord>(res.data);
    },
  });

  const {
    data: classTests = [],
    isPending: loadingClassTests,
    isError: classTestsError,
    refetch: refetchClassTests,
  } = useQuery<ExamRecord[]>({
    queryKey: ["principal", "class-tests"],
    queryFn: async () => {
      const res = await api.get("/principal/class-tests");
      return extractApiArray<ExamRecord>(res.data);
    },
  });

  const displayExams = useMemo(
    () => exams.filter((exam) => exam.category !== "class_test"),
    [exams]
  );

  const selectedExam = useMemo(
    () => exams.find((exam) => exam._id === selectedExamId),
    [exams, selectedExamId]
  );

  const filteredSectionsByClass = useMemo(() => {
    if (!selectedExam) return sections;
    const classId = selectedExam.class?._id || selectedExam.classId;
    if (!classId) return sections;
    return sections.filter((section) => {
      if (!section.classId) return true;
      return String(section.classId) === String(classId);
    });
  }, [sections, selectedExam]);

  const {
    data: examSchedule,
    isPending: loadingSchedule,
    refetch: refetchSchedule,
  } = useQuery<ExamSchedule | null>({
    queryKey: ["principal", "exam-schedule", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const res = await api.get(`/principal/exams/${selectedExamId}/schedules`);
      return (res.data?.data ?? null) as ExamSchedule | null;
    },
    enabled: Boolean(selectedExamId),
  });

  useEffect(() => {
    if (displayExams.length === 0) {
      if (selectedExamId) setSelectedExamId("");
      return;
    }
    if (!displayExams.some((exam) => exam._id === selectedExamId)) {
      setSelectedExamId(displayExams[0]._id);
    }
  }, [displayExams, selectedExamId]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedScheduleSessionId) {
      const current = sessions.find((session) => session.isCurrent);
      setSelectedScheduleSessionId(current?._id || sessions[0]._id);
    }
  }, [sessions, selectedScheduleSessionId]);

  const groupedScheduleSlots = useMemo(() => {
    const slots = Array.isArray(examSchedule?.slots) ? examSchedule.slots : [];
    const groups = new Map<
      string,
      {
        classLabel: string;
        sectionLabel: string;
        subjectLabel: string;
        entries: ScheduleSlot[];
      }
    >();

    slots.forEach((slot) => {
      const classObj = typeof slot.classId === "object" && slot.classId !== null ? slot.classId : null;
      const sectionObj = typeof slot.sectionId === "object" && slot.sectionId !== null ? slot.sectionId : null;
      const subjectObj = typeof slot.subjectId === "object" && slot.subjectId !== null ? slot.subjectId : null;

      const classLabel = classObj?.className || "Class";
      const sectionLabel = sectionObj?.sectionName || sectionObj?.name || classObj?.section || "-";
      const subjectLabel = subjectObj?.subjectName || "Subject";
      const key = `${classLabel}::${sectionLabel}::${subjectLabel}`;

      if (!groups.has(key)) {
        groups.set(key, { classLabel, sectionLabel, subjectLabel, entries: [] });
      }
      groups.get(key)?.entries.push(slot);
    });

    return Array.from(groups.values());
  }, [examSchedule]);

  const openScheduleEditor = () => {
    if (!selectedExam) {
      toast.error("Select an exam first");
      return;
    }
    setScheduleRows(normalizeScheduleRows(examSchedule, selectedExam));
    setShowScheduleEditor(true);
  };

  const createExamMutation = useMutation({
    mutationFn: async () => {
      const date = new Date(examForm.date);
      if (Number.isNaN(date.getTime())) {
        throw new Error("Valid exam date is required");
      }

      const payload = {
        title: examForm.title.trim(),
        type: examForm.type,
        category: "school_exam",
        classId: examForm.classId,
        subjectId: examForm.subjectId,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
        maxMarks: Number(examForm.maxMarks),
        duration: Number(examForm.duration),
        instructions: examForm.instructions.trim() || undefined,
      };

      const res = await api.post("/principal/exams", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Exam created successfully");
      qc.invalidateQueries({ queryKey: ["principal", "exams"] });
      setShowCreateExam(false);
      setExamForm(DEFAULT_EXAM_FORM);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to create exam");
    },
  });

  const createClassTestMutation = useMutation({
    mutationFn: async () => {
      const date = new Date(classTestForm.date);
      if (Number.isNaN(date.getTime())) {
        throw new Error("Valid class test date is required");
      }

      const payload = {
        title: classTestForm.title.trim(),
        type: "class_test",
        category: "class_test",
        classId: classTestForm.classId,
        subjectId: classTestForm.subjectId,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
        maxMarks: Number(classTestForm.maxMarks),
        duration: Number(classTestForm.duration),
        instructions: classTestForm.instructions.trim() || undefined,
      };

      const res = await api.post("/principal/class-tests", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Class test created successfully");
      qc.invalidateQueries({ queryKey: ["principal", "class-tests"] });
      setShowCreateClassTest(false);
      setClassTestForm(DEFAULT_CLASS_TEST_FORM);
      setActiveView("class-tests");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to create class test"));
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) throw new Error("Select an exam");
      if (!scheduleRows.length) throw new Error("Add at least one schedule entry");

      const slots = scheduleRows.map((row) => {
        if (!row.date || !row.startTime || !row.endTime || !row.classId || !row.subjectId) {
          throw new Error("Each schedule row requires date, start/end time, class, and subject");
        }
        return {
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          classId: row.classId,
          sectionId: row.sectionId || undefined,
          subjectId: row.subjectId,
          totalMarks: Number(row.totalMarks) || 100,
          passMarks: Number(row.passMarks) || 33,
          status: row.status,
        };
      });

      const payload = {
        academicSessionId: selectedScheduleSessionId || undefined,
        slots,
      };
      const res = await api.post(`/principal/exams/${selectedExamId}/schedules`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Exam schedule saved");
      setShowScheduleEditor(false);
      qc.invalidateQueries({ queryKey: ["principal", "exam-schedule", selectedExamId] });
      void refetchSchedule();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to save exam schedule"));
    },
  });

  const isLoading =
    loadingClasses ||
    loadingSubjects ||
    loadingSections ||
    loadingSessions ||
    loadingExams ||
    loadingClassTests;

  const hasLoadError = classesError || subjectsError || sectionsError || sessionsError || examsError || classTestsError;

  const handleScheduleRowChange = (index: number, field: keyof ScheduleEditorRow, value: string) => {
    setScheduleRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "classId" ? { sectionId: "" } : {}),
            }
          : row
      )
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading examination data..." />;
  }

  if (hasLoadError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Examinations" description="Manage exams, class tests, and schedules." />
        <EmptyState
          variant="error"
          title="Unable to load examination data"
          description="Some exam resources failed to load. Please retry."
          actionLabel="Retry"
          onAction={() => {
            void refetchClasses();
            void refetchSubjects();
            void refetchSections();
            void refetchSessions();
            void refetchExams();
            void refetchClassTests();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Examinations"
        description="Manage school exams, exam schedules, and class tests."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateClassTest(true)}>
              <ClipboardList className="h-4 w-4 mr-1" />
              New Class Test
            </Button>
            <Button onClick={() => setShowCreateExam(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Exam
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === "exams" ? "default" : "outline"} onClick={() => setActiveView("exams")}>
          <FileText className="h-4 w-4 mr-1" />
          Exams
        </Button>
        <Button
          variant={activeView === "schedules" ? "default" : "outline"}
          onClick={() => setActiveView("schedules")}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Exam Schedules
        </Button>
        <Button
          variant={activeView === "class-tests" ? "default" : "outline"}
          onClick={() => setActiveView("class-tests")}
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Class Tests
        </Button>
      </div>

      {activeView === "exams" ? (
        displayExams.length === 0 ? (
          <EmptyState
            title="No exams scheduled"
            description="Create school exams and then configure detailed exam schedules."
            icon={FileText}
            actionLabel="Create Exam"
            onAction={() => setShowCreateExam(true)}
          />
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayExams.map((exam) => (
                  <TableRow key={exam._id}>
                    <TableCell className="font-medium">
                      {exam.name}
                      <p className="text-xs text-muted-foreground">{exam.examType}</p>
                    </TableCell>
                    <TableCell>
                      {exam.class?.className || "-"}
                      {exam.class?.section ? ` - ${exam.class.section}` : ""}
                    </TableCell>
                    <TableCell>{exam.subject?.subjectName || "-"}</TableCell>
                    <TableCell>{exam.startDate || exam.date ? new Date(exam.startDate || exam.date || "").toLocaleString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.status || (exam.isActive ? "active" : "draft")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExamId(exam._id);
                          setActiveView("schedules");
                        }}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : null}

      {activeView === "schedules" ? (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <div>
              <Label>Select Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {displayExams.map((exam) => (
                    <SelectItem key={exam._id} value={exam._id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={selectedScheduleSessionId} onValueChange={setSelectedScheduleSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session._id} value={session._id}>
                      {session.name || session.academicYear || session._id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={openScheduleEditor} disabled={!selectedExamId || loadingSchedule}>
                {loadingSchedule ? "Loading..." : "Create / Edit Schedule"}
              </Button>
            </div>
          </div>

          {!selectedExamId ? (
            <EmptyState title="Select an exam" description="Choose an exam to view or edit schedule entries." icon={Calendar} />
          ) : loadingSchedule ? (
            <LoadingSpinner text="Loading exam schedule..." />
          ) : groupedScheduleSlots.length === 0 ? (
            <EmptyState
              title="No schedule entries found"
              description="Create schedule slots for the selected exam."
              icon={Calendar}
              actionLabel="Create Schedule"
              onAction={openScheduleEditor}
            />
          ) : (
            <div className="space-y-4">
              {groupedScheduleSlots.map((group, idx) => (
                <div key={`${group.classLabel}-${group.subjectLabel}-${idx}`} className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold">
                    {group.classLabel} - {group.sectionLabel} - {group.subjectLabel}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {group.entries.map((slot, slotIdx) => (
                      <div key={`${slotIdx}-${slot.date || ""}`} className="text-sm border rounded-md p-2 bg-muted/20">
                        <div>
                          {slot.date ? new Date(slot.date).toLocaleDateString() : "-"} | {slot.startTime || "--:--"} -{" "}
                          {slot.endTime || "--:--"}
                        </div>
                        <div className="text-muted-foreground">
                          Marks: {slot.totalMarks ?? "-"} | Pass: {slot.passMarks ?? "-"} | Status:{" "}
                          {slot.status || "scheduled"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeView === "class-tests" ? (
        classTests.length === 0 ? (
          <EmptyState
            title="No class tests yet"
            description="Create class tests for regular classroom assessments."
            icon={ClipboardList}
            actionLabel="New Class Test"
            onAction={() => setShowCreateClassTest(true)}
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
                    <TableCell>{test.startDate || test.date ? new Date(test.startDate || test.date || "").toLocaleString() : "-"}</TableCell>
                    <TableCell>{test.duration ?? "-"} min</TableCell>
                    <TableCell>{test.totalMarks ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.status || "draft"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : null}

      <Dialog open={showCreateExam} onOpenChange={setShowCreateExam}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Exam</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createExamMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Title *</Label>
              <Input
                value={examForm.title}
                onChange={(e) => setExamForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Exam Type *</Label>
                <Select value={examForm.type} onValueChange={(value) => setExamForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid_term">Mid Term</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="half_yearly">Half Yearly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="test_exam">Test Exam</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="datetime-local"
                  value={examForm.date}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class *</Label>
                <Select value={examForm.classId} onValueChange={(value) => setExamForm((prev) => ({ ...prev, classId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.className}
                        {cls.section ? ` - ${cls.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Select value={examForm.subjectId} onValueChange={(value) => setExamForm((prev) => ({ ...prev, subjectId: value }))}>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  min={15}
                  value={examForm.duration}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, duration: e.target.value }))}
                />
              </div>
              <div>
                <Label>Maximum Marks *</Label>
                <Input
                  type="number"
                  min={1}
                  value={examForm.maxMarks}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Instructions</Label>
              <Textarea
                rows={3}
                value={examForm.instructions}
                onChange={(e) => setExamForm((prev) => ({ ...prev, instructions: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateExam(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createExamMutation.isPending}>
                {createExamMutation.isPending ? "Creating..." : "Create Exam"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateClassTest} onOpenChange={setShowCreateClassTest}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Class Test</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createClassTestMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Title *</Label>
              <Input
                value={classTestForm.title}
                onChange={(e) => setClassTestForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class *</Label>
                <Select
                  value={classTestForm.classId}
                  onValueChange={(value) => setClassTestForm((prev) => ({ ...prev, classId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.className}
                        {cls.section ? ` - ${cls.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Select
                  value={classTestForm.subjectId}
                  onValueChange={(value) => setClassTestForm((prev) => ({ ...prev, subjectId: value }))}
                >
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={classTestForm.date}
                  onChange={(e) => setClassTestForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  min={15}
                  value={classTestForm.duration}
                  onChange={(e) => setClassTestForm((prev) => ({ ...prev, duration: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Maximum Marks *</Label>
                <Input
                  type="number"
                  min={1}
                  value={classTestForm.maxMarks}
                  onChange={(e) => setClassTestForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Input
                  value={classTestForm.instructions}
                  onChange={(e) => setClassTestForm((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateClassTest(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClassTestMutation.isPending}>
                {createClassTestMutation.isPending ? "Creating..." : "Create Class Test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleEditor} onOpenChange={setShowScheduleEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedExam?.name || "Exam"} - Schedule Editor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Add and edit schedule rows for class/section/subject slots.
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleRows((rows) => [...rows, createDefaultScheduleRow(selectedExam)])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {scheduleRows.map((row, index) => {
                const rowSections = row.classId
                  ? sections.filter((section) => !section.classId || String(section.classId) === String(row.classId))
                  : filteredSectionsByClass;

                return (
                  <div key={`schedule-row-${index}`} className="border rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div>
                        <Label>Date *</Label>
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleScheduleRowChange(index, "date", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Start *</Label>
                        <Input
                          type="time"
                          value={row.startTime}
                          onChange={(e) => handleScheduleRowChange(index, "startTime", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>End *</Label>
                        <Input
                          type="time"
                          value={row.endTime}
                          onChange={(e) => handleScheduleRowChange(index, "endTime", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Class *</Label>
                        <Select value={row.classId} onValueChange={(value) => handleScheduleRowChange(index, "classId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls._id} value={cls._id}>
                                {cls.className}
                                {cls.section ? ` - ${cls.section}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Section</Label>
                        <Select value={row.sectionId || "none"} onValueChange={(value) => handleScheduleRowChange(index, "sectionId", value === "none" ? "" : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No section</SelectItem>
                            {rowSections.map((section) => (
                              <SelectItem key={section._id} value={section._id}>
                                {section.sectionName || section.name || "Section"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Subject *</Label>
                        <Select value={row.subjectId} onValueChange={(value) => handleScheduleRowChange(index, "subjectId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Subject" />
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label>Total Marks</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.totalMarks}
                          onChange={(e) => handleScheduleRowChange(index, "totalMarks", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Pass Marks</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.passMarks}
                          onChange={(e) => handleScheduleRowChange(index, "passMarks", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={row.status} onValueChange={(value) => handleScheduleRowChange(index, "status", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="rescheduled">Rescheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setScheduleRows((rows) => rows.filter((_, i) => i !== index))}
                          disabled={scheduleRows.length === 1}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowScheduleEditor(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => saveScheduleMutation.mutate()} disabled={saveScheduleMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {saveScheduleMutation.isPending ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
