import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  subjectId: string;
  subjectName: string;
}

interface ClassInfo {
  classId: string;
  className: string;
  section: string;
  subjects: Subject[];
  assignments: string[];
}

interface Student {
  _id: string;
  name: string;
  rollNumber?: string;
}

export default function TeacherAttendancePage() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("1");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<{ studentId: string; status: string }[]>([]);
  const qc = useQueryClient();

  // Get teacher's class assignments with their subjects
  const {
    data: classes = [],
    isLoading: loadingClasses,
    isError: classesError,
    error: classesQueryError,
    refetch: refetchClasses,
    isFetching: classesFetching,
  } = useQuery<ClassInfo[]>({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-classes");
      return extractApiArray<ClassInfo>(res.data, ["classes"]);
    },
  });

  // Initialize selected class and subject
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      const firstClass = classes[0];
      setSelectedClass(firstClass.classId);
      setSelectedSectionId(firstClass.section || "");
      // Set first subject for the class
      if (firstClass.subjects?.length > 0) {
        setSelectedSubjectId(firstClass.subjects[0].subjectId);
      }
    }
  }, [classes, selectedClass]);

  // Get the selected class object
  const selectedClassObj = classes.find((c) => c.classId === selectedClass);

  // Get subjects for the selected class
  const subjectsForClass = selectedClassObj?.subjects || [];

  // Reset subject when class changes
  const handleClassChange = (val: string) => {
    setSelectedClass(val);
    const newClass = classes.find((c) => c.classId === val);
    if (newClass) {
      setSelectedSectionId(newClass.section || "");
      // Automatically set first subject
      if (newClass.subjects?.length > 0) {
        setSelectedSubjectId(newClass.subjects[0].subjectId);
      } else {
        setSelectedSubjectId("");
      }
    }
  };

  // Get students for selected class
  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsQueryError,
    refetch: refetchStudents,
    isFetching: studentsFetching,
  } = useQuery<Student[]>({
    queryKey: ["teacher-students", selectedClass, selectedSectionId, selectedSubjectId, selectedDate, selectedPeriod],
    queryFn: async () => {
      if (!selectedClass) return [];
      const query = new URLSearchParams();
      query.set("classId", selectedClass);
      if (selectedSectionId) query.set("sectionId", selectedSectionId);
      if (selectedSubjectId) query.set("subjectId", selectedSubjectId);
      if (selectedDate) query.set("date", selectedDate);
      if (selectedPeriod) query.set("periodNumber", selectedPeriod);
      const res = await api.get(`/teacher/my-students?${query.toString()}`);
      return extractApiArray<Student>(res.data, ["students"]);
    },
    enabled: !!selectedClass,
  });

  const markAttendance = useMutation({
    mutationFn: async () => {
      if (!selectedClass || !selectedSubjectId) {
        throw new Error("Class and subject are required");
      }
      if (selectedStudents.length === 0) {
        throw new Error("Please mark attendance for at least one student");
      }
      const payload: Record<string, unknown> = {
        classId: selectedClass,
        subjectId: selectedSubjectId,
        periodNumber: Number(selectedPeriod) || 1,
        date: selectedDate,
        attendanceData: selectedStudents,
      };
      if (selectedSectionId) {
        payload.sectionId = selectedSectionId;
      }
      const res = await api.post("/teacher/attendance/mark", payload);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Attendance marked successfully");
      setShowMarkDialog(false);
      setSelectedStudents([]);
      qc.invalidateQueries({ queryKey: ["teacher-students", selectedClass, selectedSectionId] });
    },
    onError: (e: unknown) => {
      const errorMsg = getErrorMessage(e, "Failed to mark attendance");
      toast.error(errorMsg);
    },
  });

  const handleStudentStatus = (studentId: string, status: string) => {
    const existing = selectedStudents.find((s) => s.studentId === studentId);
    if (existing) {
      setSelectedStudents(selectedStudents.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
    } else {
      setSelectedStudents([...selectedStudents, { studentId, status }]);
    }
  };

  const handleMarkAll = (status: string) => {
    const allStudents = students.map((s: Student) => ({ studentId: s._id, status }));
    setSelectedStudents(allStudents);
  };

  if (loadingClasses) return <LoadingSpinner text="Loading classes..." />;
  if (classesError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Take Attendance" description="Select a class and mark attendance" />
        <EmptyState
          title="Failed to load assigned classes"
          description={getErrorMessage(classesQueryError, "Please try again.")}
          icon={ClipboardList}
          variant="error"
          action={{ label: classesFetching ? "Retrying..." : "Retry", onClick: () => refetchClasses() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Take Attendance" description="Select a class and mark attendance" />

      {classes.length === 0 ? (
        <EmptyState
          title="No assigned classes"
          description="Ask the principal to assign you to a class and subject before taking attendance."
          icon={ClipboardList}
        />
      ) : (
        <div className="bg-card rounded-xl border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Select Class</Label>
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: ClassInfo) => (
                    <SelectItem key={c.classId} value={c.classId}>
                      {c.className} - {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsForClass.length > 0 ? (
                    subjectsForClass.map((s: Subject) => (
                      <SelectItem key={s.subjectId} value={s.subjectId}>
                        {s.subjectName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No subjects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Period #</Label>
              <Input type="number" min={1} value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} />
            </div>

            <div>
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>

          {selectedClass && !loadingStudents && students.length > 0 && (
            <Button
              onClick={() => {
                if (!selectedSubjectId) {
                  toast.error("Select a subject before marking attendance");
                  return;
                }
                setShowMarkDialog(true);
                setSelectedStudents(students.map((s: Student) => ({ studentId: s._id, status: "present" })));
              }}
              disabled={!selectedSubjectId || loadingStudents}
            >
              Mark Attendance ({students.length} students)
            </Button>
          )}

          {selectedClass && loadingStudents && (
            <LoadingSpinner text="Loading students..." />
          )}

          {selectedClass && !loadingStudents && studentsError && (
            <EmptyState
              title="Failed to load students"
              description={getErrorMessage(studentsQueryError, "Please try again.")}
              icon={ClipboardList}
              variant="error"
              action={{
                label: studentsFetching ? "Retrying..." : "Retry",
                onClick: () => refetchStudents(),
              }}
            />
          )}

          {selectedClass && !loadingStudents && !studentsError && students.length === 0 && (
            <EmptyState title="No students" description="No students found in this class/section" icon={ClipboardList} />
          )}
        </div>
      )}

      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mark Attendance - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("present")}>
                <Check className="h-4 w-4 mr-1" /> All Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("absent")}>
                <X className="h-4 w-4 mr-1" /> All Absent
              </Button>
            </div>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s: Student) => (
                    <TableRow key={s._id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.rollNumber || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={selectedStudents.find((st) => st.studentId === s._id)?.status || "present"}
                          onValueChange={(val) => handleStudentStatus(s._id, val)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMarkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => markAttendance.mutate()} disabled={markAttendance.isPending}>
                {markAttendance.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
