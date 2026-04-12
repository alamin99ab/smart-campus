import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowRight, CheckCircle, GraduationCap, History, PlayCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PromotionClass {
  _id: string;
  className: string;
  section: string;
  classLevel: number;
  label: string;
  currentStudents: number;
}

interface FinalExamSession {
  key: string;
  examName: string;
  academicYear: string;
  examType: string;
  subjectCount: number;
  subjectNames: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface RequiredSubject {
  key: string;
  subjectId?: string | null;
  subjectName: string;
  passingMarks: number;
}

interface PromotionStudent {
  _id: string;
  name: string;
  email?: string | null;
  currentRoll: string;
  status: "eligible" | "failed" | "incomplete";
  totalMarks: number;
  gpa: number;
  requiredSubjectCount: number;
  passedSubjectCount: number;
  failedSubjectCount: number;
  missingSubjectCount: number;
  meritRank?: number;
  proposedRoll?: number;
  canOverride?: boolean;
  subjects: Array<{
    subjectName: string;
    passingMarks: number;
    marks: number | null;
    status: "pass" | "fail" | "missing";
  }>;
}

interface PromotionPreview {
  sourceClass: {
    _id: string;
    className: string;
    section: string;
    classLevel: number;
  };
  targetClass: {
    _id: string;
    className: string;
    section: string;
    classLevel: number;
  } | null;
  examSession: {
    examName: string;
    academicYear: string;
    finalExamCount: number;
  };
  requiredSubjects: RequiredSubject[];
  eligible: PromotionStudent[];
  failed: PromotionStudent[];
  incomplete: PromotionStudent[];
  summary: {
    totalStudents: number;
    studentsWithAnyResult: number;
    missingResultCount: number;
    eligibleCount: number;
    failedCount: number;
    incompleteCount: number;
    completionReady: boolean;
  };
}

interface PromotionHistory {
  _id: string;
  fromClass: string;
  toClass: string;
  promotedCount: number;
  failedCount: number;
  promotedAt: string;
  status: string;
  promotionType?: string;
  examName?: string | null;
  academicYear?: string | null;
}

const parseExamSessionValue = (value: string): { examName: string; academicYear: string } | null => {
  const [examName, academicYear] = value.split("::");
  if (!examName) return null;
  return {
    examName,
    academicYear: academicYear || "",
  };
};

const getMissingSubjectNames = (student: PromotionStudent): string[] =>
  student.subjects.filter((subject) => subject.status === "missing").map((subject) => subject.subjectName);

export default function PromotionPage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [selectedExamSession, setSelectedExamSession] = useState("");
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [allowIncompleteOverride, setAllowIncompleteOverride] = useState(false);
  const [overrideMap, setOverrideMap] = useState<Record<string, { category: "failed" | "incomplete"; reason: string }>>({});

  const qc = useQueryClient();

  const {
    data: classes = [],
    isLoading: classesLoading,
    isError: classesError,
    error: classesQueryError,
    isFetching: classesFetching,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ["promotion-classes"],
    queryFn: async () => {
      const res = await api.get("/promotion/classes");
      const payload = extractApiObject<{ classes?: PromotionClass[] }>(res.data);
      return Array.isArray(payload.classes) ? payload.classes : [];
    },
  });

  const {
    data: finalExamSessions = [],
    isLoading: examSessionsLoading,
    isError: examSessionsError,
    error: examSessionsQueryError,
    isFetching: examSessionsFetching,
    refetch: refetchExamSessions,
  } = useQuery({
    queryKey: ["promotion-final-exams", selectedClass],
    enabled: Boolean(selectedClass),
    queryFn: async () => {
      const res = await api.get(`/promotion/final-exams?classId=${encodeURIComponent(selectedClass)}`);
      return extractApiArray<FinalExamSession>(res.data, ["sessions"]);
    },
  });

  const selectedExam = useMemo(() => parseExamSessionValue(selectedExamSession), [selectedExamSession]);

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    error: previewQueryError,
    isFetching: previewFetching,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["promotion-preview", selectedClass, targetClass, selectedExamSession],
    enabled: Boolean(selectedClass && targetClass && selectedExam?.examName),
    queryFn: async () => {
      if (!selectedExam?.examName) {
        return null;
      }

      const params = new URLSearchParams({
        classId: selectedClass,
        targetClassId: targetClass,
        examName: selectedExam.examName,
      });

      if (selectedExam.academicYear) {
        params.set("academicYear", selectedExam.academicYear);
      }

      const res = await api.get(`/promotion/eligible?${params.toString()}`);
      return extractApiObject<PromotionPreview>(res.data);
    },
  });

  const {
    data: history = [],
    isLoading: historyLoading,
    isError: historyError,
    error: historyQueryError,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["promotion-history"],
    queryFn: async () => {
      const res = await api.get("/promotion/history");
      return extractApiArray<PromotionHistory>(res.data, ["history"]);
    },
  });

  useEffect(() => {
    const failedIds = new Set(preview?.failed?.map((student) => student._id) || []);
    const incompleteIds = new Set(preview?.incomplete?.map((student) => student._id) || []);

    setOverrideMap((current) => {
      const nextEntries = Object.entries(current).filter(([studentId, value]) => {
        if (value.category === "failed") return failedIds.has(studentId);
        if (!allowIncompleteOverride) return false;
        return incompleteIds.has(studentId);
      });

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [preview?.failed, preview?.incomplete, allowIncompleteOverride]);

  const failedOverrideCount = useMemo(
    () => Object.values(overrideMap).filter((item) => item.category === "failed").length,
    [overrideMap]
  );

  const incompleteOverrideCount = useMemo(
    () => Object.values(overrideMap).filter((item) => item.category === "incomplete").length,
    [overrideMap]
  );

  const manualOverrideCount = failedOverrideCount + incompleteOverrideCount;

  const runPromotionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam?.examName) {
        throw new Error("Final exam session is required");
      }

      const payload: Record<string, unknown> = {
        sourceClassId: selectedClass,
        targetClassId: targetClass,
        examName: selectedExam.examName,
        allowIncompleteOverride,
        overrideStudentIds: Object.keys(overrideMap),
        overrideApprovals: Object.entries(overrideMap).map(([studentId, value]) => ({
          studentId,
          reason: value.reason.trim() || undefined,
          category: value.category,
        })),
      };

      if (selectedExam.academicYear) {
        payload.academicYear = selectedExam.academicYear;
      }

      const res = await api.post("/promotion/run", payload);
      return res.data as { message?: string };
    },
    onSuccess: (data) => {
      toast.success(data.message || "Promotion finalized successfully");
      setShowRunDialog(false);
      setAllowIncompleteOverride(false);
      setOverrideMap({});
      qc.invalidateQueries({ queryKey: ["promotion-preview"] });
      qc.invalidateQueries({ queryKey: ["promotion-history"] });
      qc.invalidateQueries({ queryKey: ["promotion-classes"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to finalize promotion"));
    },
  });

  const onClassChange = (value: string) => {
    setSelectedClass(value);
    setTargetClass("");
    setSelectedExamSession("");
    setAllowIncompleteOverride(false);
    setOverrideMap({});
  };

  const onToggleOverride = (studentId: string, category: "failed" | "incomplete", checked: boolean) => {
    setOverrideMap((current) => {
      if (checked) {
        return {
          ...current,
          [studentId]: {
            category,
            reason: current[studentId]?.reason || "",
          },
        };
      }

      const next = { ...current };
      delete next[studentId];
      return next;
    });
  };

  const onOverrideReasonChange = (studentId: string, reason: string) => {
    setOverrideMap((current) => {
      const existing = current[studentId];
      if (!existing) return current;

      return {
        ...current,
        [studentId]: {
          ...existing,
          reason,
        },
      };
    });
  };

  const selectedClassMeta = classes.find((item) => item._id === selectedClass);
  const targetClassMeta = classes.find((item) => item._id === targetClass);

  const canFinalizePromotion = Boolean(
    preview &&
      selectedClass &&
      targetClass &&
      selectedExam?.examName &&
      (preview.summary.completionReady || allowIncompleteOverride) &&
      preview.eligible.length + manualOverrideCount > 0
  );

  if (classesLoading) {
    return <LoadingSpinner text="Loading promotion classes..." />;
  }

  if (classesError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Student Promotion" description="Finalize promotions from final exam results with merit roll generation" />
        <EmptyState
          title="Failed to load promotion classes"
          description={getErrorMessage(classesQueryError, "Please try again.")}
          variant="error"
          action={{ label: classesFetching ? "Retrying..." : "Retry", onClick: () => refetchClasses() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Student Promotion" description="Result-driven promotion with pass validation, preview, and merit roll generation" />

      <div className="bg-card rounded-xl border p-6 mb-6">
        <h3 className="font-semibold mb-4">Promotion Setup</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Current Class *</Label>
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select current class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((item) => (
                  <SelectItem key={item._id} value={item._id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Class *</Label>
            <Select value={targetClass} onValueChange={setTargetClass} disabled={!selectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select target class" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((item) => item._id !== selectedClass)
                  .map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Final Exam Session *</Label>
            <Select
              value={selectedExamSession}
              onValueChange={setSelectedExamSession}
              disabled={!selectedClass || examSessionsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={examSessionsLoading ? "Loading final exams..." : "Select final exam session"} />
              </SelectTrigger>
              <SelectContent>
                {finalExamSessions.map((session) => (
                  <SelectItem key={session.key} value={session.key}>
                    {session.examName}
                    {session.academicYear ? ` (${session.academicYear})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Source: {selectedClassMeta ? selectedClassMeta.label : "-"} | Target: {targetClassMeta ? targetClassMeta.label : "-"}
        </div>

        {examSessionsError && (
          <div className="mt-4">
            <EmptyState
              title="Failed to load final exam sessions"
              description={getErrorMessage(examSessionsQueryError, "Please retry.")}
              variant="error"
              action={{ label: examSessionsFetching ? "Retrying..." : "Retry", onClick: () => refetchExamSessions() }}
            />
          </div>
        )}
      </div>

      {selectedClass && targetClass && selectedExam?.examName && (
        <div className="bg-card rounded-xl border p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Promotion Preview
          </h3>

          {previewLoading ? (
            <LoadingSpinner text="Preparing result-based promotion preview..." />
          ) : previewError ? (
            <EmptyState
              title="Failed to generate promotion preview"
              description={getErrorMessage(previewQueryError, "Please verify exam results and try again.")}
              variant="error"
              action={{ label: previewFetching ? "Retrying..." : "Retry", onClick: () => refetchPreview() }}
            />
          ) : !preview ? (
            <EmptyState title="No preview data" description="Select class and final exam session to generate preview." />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{preview.summary.eligibleCount}</p>
                  <p className="text-xs text-muted-foreground">Eligible</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <XCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{preview.summary.failedCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{preview.summary.incompleteCount}</p>
                  <p className="text-xs text-muted-foreground">Incomplete</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <ArrowRight className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{preview.summary.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-4 text-center">
                  <PlayCircle className="h-5 w-5 text-violet-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold">{manualOverrideCount}</p>
                  <p className="text-xs text-muted-foreground">Manual Overrides</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={preview.summary.completionReady ? "default" : "secondary"}>
                  {preview.summary.completionReady ? "Result Completion: Ready" : "Result Completion: Not Ready"}
                </Badge>
                <Badge variant="outline">Final Exam: {preview.examSession.examName}</Badge>
                {preview.examSession.academicYear ? <Badge variant="outline">Year: {preview.examSession.academicYear}</Badge> : null}
                <Badge variant="outline">Required Subjects: {preview.requiredSubjects.length}</Badge>
              </div>

              {!preview.summary.completionReady && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Promotion finalization is blocked until all required subject marks are completed for every student in this class, unless Principal enables special permission for incomplete records.
                </div>
              )}

              {!preview.summary.completionReady && (
                <div className="mb-6 rounded-md border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allowIncompleteOverride}
                      onCheckedChange={(checked) => setAllowIncompleteOverride(Boolean(checked))}
                    />
                    <div>
                      <p className="font-medium">Allow Principal Special Promotion For Incomplete Records</p>
                      <p className="text-xs text-muted-foreground">
                        Enable this only when Principal explicitly approves incomplete students for promotion.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium mb-3">Eligible Students (Merit Order)</h4>
                {preview.eligible.length === 0 ? (
                  <EmptyState title="No eligible students" description="No student currently passes all required subjects." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merit</TableHead>
                          <TableHead>Current Roll</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Total Marks</TableHead>
                          <TableHead>GPA</TableHead>
                          <TableHead>Proposed Roll</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.eligible.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.meritRank || "-"}</TableCell>
                            <TableCell>{student.currentRoll || "-"}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.totalMarks}</TableCell>
                            <TableCell>{student.gpa.toFixed(2)}</TableCell>
                            <TableCell>{student.proposedRoll || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">Failed Students (Override Optional)</h4>
                {preview.failed.length === 0 ? (
                  <EmptyState title="No failed students" description="All completed students are currently eligible." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Override</TableHead>
                          <TableHead>Current Roll</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Total Marks</TableHead>
                          <TableHead>Failed Subjects</TableHead>
                          <TableHead>Principal Note (Optional)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.failed.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell>
                              <Checkbox
                                checked={Boolean(overrideMap[student._id])}
                                onCheckedChange={(checked) => onToggleOverride(student._id, "failed", Boolean(checked))}
                              />
                            </TableCell>
                            <TableCell>{student.currentRoll || "-"}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.totalMarks}</TableCell>
                            <TableCell>{student.failedSubjectCount}</TableCell>
                            <TableCell>
                              <Input
                                placeholder="Reason for special approval"
                                value={overrideMap[student._id]?.reason || ""}
                                onChange={(event) => onOverrideReasonChange(student._id, event.target.value)}
                                disabled={!overrideMap[student._id]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">Incomplete Results</h4>
                {preview.incomplete.length === 0 ? (
                  <EmptyState title="No incomplete records" description="All required subjects have marks for every student." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Override</TableHead>
                          <TableHead>Current Roll</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Missing Subject Count</TableHead>
                          <TableHead>Missing Subjects</TableHead>
                          <TableHead>Principal Note (Optional)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.incomplete.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell>
                              <Checkbox
                                checked={Boolean(overrideMap[student._id])}
                                onCheckedChange={(checked) => onToggleOverride(student._id, "incomplete", Boolean(checked))}
                                disabled={!allowIncompleteOverride}
                              />
                            </TableCell>
                            <TableCell>{student.currentRoll || "-"}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.missingSubjectCount}</TableCell>
                            <TableCell>{getMissingSubjectNames(student).join(", ") || "-"}</TableCell>
                            <TableCell>
                              <Input
                                placeholder="Reason for incomplete override"
                                value={overrideMap[student._id]?.reason || ""}
                                onChange={(event) => onOverrideReasonChange(student._id, event.target.value)}
                                disabled={!allowIncompleteOverride || !overrideMap[student._id]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowRunDialog(true)} disabled={!canFinalizePromotion}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Finalize Promotion
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <History className="h-5 w-5" />
          Promotion History
        </h3>

        {historyLoading ? (
          <LoadingSpinner text="Loading history..." />
        ) : historyError ? (
          <EmptyState
            title="Failed to load promotion history"
            description={getErrorMessage(historyQueryError, "Please try again.")}
            variant="error"
            action={{ label: historyFetching ? "Retrying..." : "Retry", onClick: () => refetchHistory() }}
          />
        ) : history.length === 0 ? (
          <EmptyState title="No promotion history yet" description="Promotion history will appear after first finalized run." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Promoted</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>{record.fromClass}</TableCell>
                    <TableCell>{record.toClass}</TableCell>
                    <TableCell>{record.promotedCount}</TableCell>
                    <TableCell>{record.promotedAt ? new Date(record.promotedAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{record.examName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === "completed" ? "default" : "secondary"}>{record.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Final Promotion Run</DialogTitle>
            <DialogDescription>
              This will move eligible students from {selectedClassMeta?.label || "source class"} to {targetClassMeta?.label || "target class"} and regenerate roll numbers by merit.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
            <p>Eligible students: <strong>{preview?.eligible.length || 0}</strong></p>
            <p>Failed override selected: <strong>{failedOverrideCount}</strong></p>
            <p>Incomplete override selected: <strong>{incompleteOverrideCount}</strong></p>
            <p>Total to promote: <strong>{(preview?.eligible.length || 0) + manualOverrideCount}</strong></p>
            <p>Incomplete records: <strong>{preview?.incomplete.length || 0}</strong></p>
            <p>Final exam session: <strong>{selectedExam?.examName || "-"}</strong></p>
            <p>Policy: <strong>{allowIncompleteOverride ? "Incomplete override allowed" : "Incomplete override blocked"}</strong></p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => runPromotionMutation.mutate()} disabled={!canFinalizePromotion || runPromotionMutation.isPending}>
              {runPromotionMutation.isPending ? "Finalizing..." : "Confirm Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
