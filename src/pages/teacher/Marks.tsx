import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookMarked } from "lucide-react";
import { toast } from "sonner";

interface Student {
  _id: string;
  name: string;
  rollNumber?: string;
}

interface SubjectAssignment {
  assignmentId: string;
  subjectId: string;
  subjectName: string;
  classes: Array<{ classId: string; className: string; section: string }>;
}

interface MarksData {
  studentId: string;
  marks: number;
}

interface ExamOption {
  _id: string;
  name: string;
  className: string;
  section: string;
  subjectName: string;
  totalMarks?: number;
  date?: string;
}

interface ExamMarksRow {
  studentId: string;
  marks?: number;
}

interface ExamMarksPayload {
  results?: ExamMarksRow[];
}

export default function TeacherMarksPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [marksData, setMarksData] = useState<MarksData[]>([]);
  const qc = useQueryClient();

  const {
    data: subjects = [],
    isLoading: loadingSubjects,
    isError: subjectsError,
    error: subjectsQueryError,
    refetch: refetchSubjects,
    isFetching: subjectsFetching,
  } = useQuery<SubjectAssignment[]>({
    queryKey: ["teacher-subjects"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-subjects");
      return extractApiArray<SubjectAssignment>(res.data, ["subjects"]);
    }
  });

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.subjectId === selectedSubjectId) ?? subjects[0],
    [subjects, selectedSubjectId]
  );

  const availableClasses = useMemo(() => selectedSubject?.classes ?? [], [selectedSubject]);

  const selectedClass = useMemo(
    () => availableClasses.find((item) => item.classId === selectedClassId) ?? availableClasses[0],
    [availableClasses, selectedClassId]
  );

  useEffect(() => {
    if (subjects.length && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].subjectId);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (selectedSubject && !availableClasses.some((item) => item.classId === selectedClassId)) {
      setSelectedClassId(availableClasses[0]?.classId ?? "");
    }
  }, [selectedSubject, availableClasses, selectedClassId]);

  const {
    data: exams = [],
    isLoading: loadingExams,
    isError: examsError,
    error: examsQueryError,
    refetch: refetchExams,
    isFetching: examsFetching,
  } = useQuery<ExamOption[]>({
    queryKey: ["teacher-exams", selectedClassId, selectedSubjectId],
    queryFn: async () => {
      if (!selectedClassId || !selectedSubjectId) return [];
      const res = await api.get(`/teacher/exams?classId=${selectedClassId}&subjectId=${selectedSubjectId}`);
      return extractApiArray<ExamOption>(res.data, ["exams"]);
    },
    enabled: !!selectedClassId && !!selectedSubjectId
  });

  useEffect(() => {
    if (!exams.length) {
      setSelectedExamId("");
      return;
    }

    if (!selectedExamId || !exams.some((exam) => exam._id === selectedExamId)) {
      setSelectedExamId(exams[0]._id);
    }
  }, [exams, selectedExamId]);

  const {
    data: studentPayload,
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsQueryError,
    refetch: refetchStudents,
    isFetching: studentsFetching,
  } = useQuery<{ students: Student[] }>({
    queryKey: ["teacher-students", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return { students: [] };
      const classSectionParam = selectedClass?.section ? `&sectionId=${selectedClass.section}` : "";
      const res = await api.get(`/teacher/my-students?classId=${selectedClassId}${classSectionParam}`);
      const payload = extractApiObject<{ students?: Student[] }>(res.data);
      return {
        students: Array.isArray(payload.students) ? payload.students : [],
      };
    },
    enabled: !!selectedClassId
  });

  const students = studentPayload?.students ?? [];

  const { data: examMarks, isFetching: fetchingExamMarks } = useQuery<ExamMarksPayload | null>({
    queryKey: ["teacher-exam-marks", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const res = await api.get(`/teacher/marks/exam/${selectedExamId}`);
      return (res.data?.data || null) as ExamMarksPayload | null;
    },
    enabled: !!selectedExamId
  });

  useEffect(() => {
    if (examMarks?.results) {
      const newMarks = examMarks.results.map((item) => ({
        studentId: item.studentId,
        marks: Number(item.marks ?? 0)
      }));
      setMarksData(newMarks);
    }
  }, [examMarks]);

  const enterMarks = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !selectedSubjectId) {
        throw new Error("Please select exam and subject before saving marks.");
      }
      if (!marksData.length) {
        throw new Error("Enter marks for at least one student.");
      }

      const res = await api.post("/teacher/marks/enter", {
        examId: selectedExamId,
        subjectId: selectedSubjectId,
        marksData
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Marks entered successfully");
      qc.invalidateQueries({ queryKey: ["teacher-exam-marks", selectedExamId] });
      qc.invalidateQueries({ queryKey: ["teacher-students", selectedClassId] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to enter marks"));
    }
  });

  const selectedExam = exams.find((exam) => exam._id === selectedExamId);
  const maxMarks = selectedExam?.totalMarks ?? 100;

  const handleMarksChange = (studentId: string, value: string) => {
    const parsed = Number(value);
    const marks = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const clamped = Math.min(maxMarks, marks);

    setMarksData((current) => {
      const existing = current.find((entry) => entry.studentId === studentId);
      if (existing) {
        return current.map((entry) =>
          entry.studentId === studentId ? { ...entry, marks: clamped } : entry
        );
      }
      return [...current, { studentId, marks: clamped }];
    });
  };

  if (loadingSubjects) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Marks Entry" description="Assign exam marks for your assigned subject and class." />
        <div className="rounded-xl border bg-card p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (subjectsError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Marks Entry" description="Assign exam marks for your assigned subject and class." />
        <EmptyState
          title="Failed to load subjects"
          description={getErrorMessage(subjectsQueryError, "Please try again.")}
          icon={BookMarked}
          variant="error"
          action={{ label: subjectsFetching ? "Retrying..." : "Retry", onClick: () => refetchSubjects() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Marks Entry" description="Assign exam marks for your assigned subject and class." />

      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Subject</Label>
            <select
              className="mt-1 block w-full rounded-lg border p-3"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedClassId("");
                setSelectedExamId("");
                setMarksData([]);
              }}
            >
              {subjects.map((subject) => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Class</Label>
            <select
              className="mt-1 block w-full rounded-lg border p-3"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedExamId("");
                setMarksData([]);
              }}
            >
              {availableClasses.map((item) => (
                <option key={item.classId} value={item.classId}>
                  {item.className} - {item.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Exam</Label>
            <select
              className="mt-1 block w-full rounded-lg border p-3"
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setMarksData([]);
              }}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.name} {exam.totalMarks ? `(${exam.totalMarks} marks)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadingStudents || loadingExams || fetchingExamMarks ? (
        <div className="rounded-xl border bg-card p-6">
          <LoadingSpinner />
        </div>
      ) : examsError || studentsError ? (
        <div className="rounded-xl border bg-card p-6">
          <EmptyState
            title="Marks data unavailable"
            description={getErrorMessage(examsQueryError || studentsQueryError, "Please try again.")}
            icon={BookMarked}
            variant="error"
            action={{
              label: examsFetching || studentsFetching ? "Retrying..." : "Retry",
              onClick: () => {
                void refetchExams();
                void refetchStudents();
              },
            }}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          {!selectedClassId || !selectedExamId ? (
            <div className="p-6">
              <EmptyState
                title="Select subject, class, and exam"
                description="Choose the subject, class, and exam before entering marks."
                icon={BookMarked}
              />
            </div>
          ) : students.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No students found"
                description="There are no students assigned to this class and section."
                icon={BookMarked}
              />
            </div>
          ) : (
            <>
              <div className="p-6 border-b">
                <div className="text-sm text-muted-foreground">
                  {selectedExam ? `Exam: ${selectedExam.name} - Total marks: ${selectedExam.totalMarks ?? "N/A"}` : ""}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const entry = marksData.find((item) => item.studentId === student._id);
                    return (
                      <TableRow key={student._id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.rollNumber || "-"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={maxMarks}
                            className="w-24"
                            value={entry?.marks ?? ""}
                            onChange={(event) => handleMarksChange(student._id, event.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button
                  onClick={() => enterMarks.mutate()}
                  disabled={enterMarks.isPending || marksData.length === 0 || !selectedExamId || !selectedSubjectId}
                >
                  {enterMarks.isPending ? "Saving..." : "Save Marks"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
