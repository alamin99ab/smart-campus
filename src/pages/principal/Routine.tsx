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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, Trash2, Upload, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

interface ClassInfo {
  _id: string;
  className: string;
  section: string;
}

interface AcademicSessionInfo {
  _id: string;
  name?: string;
  sessionName?: string;
  academicYear?: string;
  isActive?: boolean;
}

/** One ClassRoutine document from GET /routines (one school day per row) */
interface RoutineDoc {
  _id: string;
  studentClass: string;
  section?: string;
  day: string;
  academicYear: string;
  semester?: string;
  periods: Array<{
    period: number;
    subject: string;
    startTime: string;
    endTime: string;
    room?: string;
    teacher?: { name?: string } | string;
  }>;
  isActive?: boolean;
}

interface ParsedRoutineData {
  success: boolean;
  message: string;
  data?: {
    importBatchId?: string;
    preview?: {
      entries?: Array<{
        dayOfWeek?: string;
        periodNumber?: number;
        subjectName?: string;
        teacherName?: string;
        startTime?: string;
        endTime?: string;
        roomName?: string;
      }>;
      warnings?: string[];
      stats?: {
        totalEntries?: number;
        validEntries?: number;
        invalidEntries?: number;
      };
    };
    validation?: {
      warnings?: string[];
      criticalErrors?: string[];
      validEntries?: unknown[];
      invalidEntries?: unknown[];
    };
    originalFileName?: string;
    parserVersion?: string;
  };
}

export default function RoutinePage() {
  const user = useAuthStore((state) => state.user);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRoutineData | null>(null);
  const [importConfig, setImportConfig] = useState({
    classId: "",
    sessionId: "",
    importMode: "merge" as "merge" | "replace",
  });
  const [form, setForm] = useState({
    classId: "",
    academicYear: new Date().getFullYear().toString(),
    semester: "First",
    schedule: [] as Array<{
      day: string;
      periods: Array<{
        subject: string;
        teacher: string;
        startTime: string;
        endTime: string;
        room: string;
      }>;
    }>
  });
  const qc = useQueryClient();

  // Get classes
  const {
    data: classes = [],
    isLoading: loadingClasses,
    isError: classesError,
    error: classesQueryError,
    isFetching: classesFetching,
    refetch: refetchClasses,
  } = useQuery<ClassInfo[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return extractApiArray<ClassInfo>(res.data);
    },
  });

  const {
    data: academicSessions = [],
    isLoading: loadingSessions,
    isError: sessionsError,
    error: sessionsQueryError,
    isFetching: sessionsFetching,
    refetch: refetchSessions,
  } = useQuery<AcademicSessionInfo[]>({
    queryKey: ["academic-sessions"],
    queryFn: async () => {
      const res = await api.get("/academic-sessions");
      return extractApiArray<AcademicSessionInfo>(res.data);
    },
  });

  const {
    data: routines = [],
    isLoading: loadingRoutines,
    isError: routinesError,
    error: routinesQueryError,
    isFetching: routinesFetching,
    refetch: refetchRoutines,
  } = useQuery<RoutineDoc[]>({
    queryKey: ["routines"],
    queryFn: async () => {
      const res = await api.get("/routines");
      return extractApiArray<RoutineDoc>(res.data, ["routines"]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const cls = classes.find((c) => c._id === form.classId);
      if (!cls) throw new Error("Select a class");
      if (!form.schedule.length) throw new Error("Add at least one day with periods");
      const seenDays = new Set<string>();

      for (const dayRow of form.schedule) {
        if (!dayRow.day || !dayRow.periods.length) {
          throw new Error("Each added day must include a weekday and at least one period.");
        }
        if (seenDays.has(dayRow.day)) {
          throw new Error(`Duplicate day selected: ${dayRow.day}. Use one row per day.`);
        }
        seenDays.add(dayRow.day);
      }
      for (const dayRow of form.schedule) {
        const periods = dayRow.periods.map((p, i) => ({
          period: i + 1,
          subject: p.subject?.trim() || "Period",
          startTime: p.startTime || "09:00",
          endTime: p.endTime || "10:00",
          room: p.room?.trim() || "",
        }));
        await api.post("/routines", {
          studentClass: cls.className,
          section: cls.section,
          day: dayRow.day,
          periods,
          academicYear: form.academicYear,
          semester: form.semester,
        });
      }
    },
    onSuccess: () => {
      toast.success("Routine saved (one API row per day)");
      qc.invalidateQueries({ queryKey: ["routines"] });
      setShowCreate(false);
      setForm({
        classId: "",
        academicYear: new Date().getFullYear().toString(),
        semester: "First",
        schedule: [],
      });
    },
    onError: (error: unknown) => {
      const msg =
        getErrorMessage(error, "") ||
        "Failed to create routine";
      toast.error(msg);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.schoolId) {
        throw new Error("School context is missing. Please sign in again.");
      }
      if (!importConfig.classId || !importConfig.sessionId) {
        throw new Error("Class and academic session are required for import.");
      }

      const formData = new FormData();
      formData.append("routinePdf", file);
      formData.append("schoolId", user.schoolId);
      formData.append("classId", importConfig.classId);
      formData.append("sessionId", importConfig.sessionId);

      const res = await api.post("/routines/import/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data as ParsedRoutineData;
    },
    onSuccess: (data) => {
      setParsedData(data);
      if (data.success && data.data?.importBatchId) {
        toast.success("Routine PDF parsed successfully");
      } else {
        toast.error(data.message || "Failed to parse routine");
      }
    },
    onError: (error: unknown) => {
      const msg = getErrorMessage(error, "Failed to upload routine PDF");
      toast.error(msg);
      setParsedData(null);
    },
  });

  const confirmImportMutation = useMutation({
    mutationFn: async () => {
      const importBatchId = parsedData?.data?.importBatchId;
      if (!importBatchId) {
        throw new Error("No parsed data to import");
      }

      const res = await api.post("/routines/import/confirm", {
        importBatchId,
        importMode: importConfig.importMode,
      });

      return res.data;
    },
    onSuccess: () => {
      toast.success("Routine imported successfully");
      qc.invalidateQueries({ queryKey: ["routines"] });
      setShowImport(false);
      resetImport();
    },
    onError: (error: unknown) => {
      const msg = getErrorMessage(error, "Failed to import routine");
      toast.error(msg);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  // Import handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setParsedData(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    if (!importConfig.classId) {
      toast.error("Select class before uploading");
      return;
    }
    if (!importConfig.sessionId) {
      toast.error("Select academic session before uploading");
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const handleConfirmImport = () => {
    confirmImportMutation.mutate();
  };

  const resetImport = () => {
    setSelectedFile(null);
    setParsedData(null);
    setImportConfig({ classId: "", sessionId: "", importMode: "merge" });
  };

  // Schedule management functions
  const addDay = () => {
    setForm({
      ...form,
      schedule: [...form.schedule, { day: "", periods: [] }]
    });
  };

  const removeDay = (dayIndex: number) => {
    setForm({
      ...form,
      schedule: form.schedule.filter((_, i) => i !== dayIndex)
    });
  };

  const updateDay = (dayIndex: number, day: string) => {
    const newSchedule = [...form.schedule];
    newSchedule[dayIndex].day = day;
    setForm({ ...form, schedule: newSchedule });
  };

  const addPeriod = (dayIndex: number) => {
    const newSchedule = [...form.schedule];
    newSchedule[dayIndex].periods.push({
      subject: "",
      teacher: "",
      startTime: "",
      endTime: "",
      room: ""
    });
    setForm({ ...form, schedule: newSchedule });
  };

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    const newSchedule = [...form.schedule];
    newSchedule[dayIndex].periods = newSchedule[dayIndex].periods.filter((_, i) => i !== periodIndex);
    setForm({ ...form, schedule: newSchedule });
  };

  const updatePeriod = (dayIndex: number, periodIndex: number, field: string, value: string) => {
    const newSchedule = [...form.schedule];
    const period = newSchedule[dayIndex].periods[periodIndex];
    const nextPeriod = { ...period };
    if (field === "subject" || field === "teacher" || field === "startTime" || field === "endTime" || field === "room") {
      nextPeriod[field] = value;
    }
    newSchedule[dayIndex].periods[periodIndex] = nextPeriod;
    setForm({ ...form, schedule: newSchedule });
  };

  if (loadingClasses || loadingRoutines || loadingSessions) return <LoadingSpinner text="Loading routines..." />;
  if (classesError || routinesError || sessionsError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Routine Management" description="Manage class schedules and timetables" />
        <EmptyState
          title="Failed to load routine data"
          description={getErrorMessage(classesQueryError || routinesQueryError || sessionsQueryError, "Please try again.")}
          icon={Calendar}
          variant="error"
          action={{
            label: classesFetching || routinesFetching || sessionsFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchClasses();
              void refetchRoutines();
              void refetchSessions();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Routine Management" 
        description="Manage class schedules and timetables" 
        actions={
          <>
            <Button type="button" onClick={() => setShowCreate(true)}>
              Create Routine
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowImport(true)}>
              Import Routine
            </Button>
          </>
        } 
      />

      {routines.length === 0 ? (
        <EmptyState 
          title="No routines yet" 
          description="Create class timetables to organize your school schedule" 
          icon={Calendar} 
          actionLabel="Create Routine" 
          onAction={() => setShowCreate(true)} 
        />
      ) : (
        <div className="space-y-4">
          {routines.map((routine) => (
            <div key={routine._id} className="bg-card rounded-xl border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {routine.studentClass}
                    {routine.section ? ` - Sec ${routine.section}` : ""} - {routine.day}
                    {routine.semester ? ` - ${routine.semester}` : ""}
                  </h3>
                  <p className="text-sm text-muted-foreground">Academic year: {routine.academicYear}</p>
                </div>
                <Badge variant={routine.isActive !== false ? "default" : "secondary"}>
                  {routine.isActive !== false ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {routine.day}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {routine.periods?.map((period, pIndex) => {
                      const teacherLabel =
                        typeof period.teacher === "object" && period.teacher?.name
                          ? period.teacher.name
                          : typeof period.teacher === "string"
                            ? period.teacher
                            : "-";
                      return (
                        <div key={pIndex} className="text-sm bg-muted p-2 rounded">
                          <p className="font-medium">
                            P{period.period}: {period.subject}
                          </p>
                          <p className="text-muted-foreground">{teacherLabel}</p>
                          <p className="text-xs">
                            {period.startTime} - {period.endTime}
                          </p>
                          <p className="text-xs">Room: {period.room || "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-3">
                Editing & deletion are managed in backend; contact admin if a schedule needs changes.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Routine Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Class Routine</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="classId">Class *</Label>
              <Select value={form.classId} onValueChange={(value) => setForm({ ...form, classId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.className} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="academicYear">Academic Year *</Label>
              <Input
                id="academicYear"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                placeholder="e.g., 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="semester">Semester *</Label>
              <Select value={form.semester} onValueChange={(value) => setForm({ ...form, semester: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First">First Semester</SelectItem>
                  <SelectItem value="Second">Second Semester</SelectItem>
                  <SelectItem value="Summer">Summer Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Schedule</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDay}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Day
                </Button>
              </div>

              <div className="space-y-4">
                {form.schedule.map((daySchedule, dayIndex) => (
                  <div key={dayIndex} className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Select value={daySchedule.day} onValueChange={(value) => updateDay(dayIndex, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="sm" onClick={() => addPeriod(dayIndex)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Period
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeDay(dayIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {daySchedule.periods.map((period, periodIndex) => (
                        <div key={periodIndex} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-background rounded border">
                          <div>
                            <Label className="text-sm">Subject</Label>
                            <Input
                              value={period.subject}
                              onChange={(e) => updatePeriod(dayIndex, periodIndex, 'subject', e.target.value)}
                              placeholder="Subject name"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Teacher</Label>
                            <Input
                              value={period.teacher}
                              onChange={(e) => updatePeriod(dayIndex, periodIndex, 'teacher', e.target.value)}
                              placeholder="Teacher name"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Start Time</Label>
                            <Input
                              type="time"
                              value={period.startTime}
                              onChange={(e) => updatePeriod(dayIndex, periodIndex, 'startTime', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">End Time</Label>
                            <Input
                              type="time"
                              value={period.endTime}
                              onChange={(e) => updatePeriod(dayIndex, periodIndex, 'endTime', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-sm">Room</Label>
                              <Input
                                value={period.room}
                                onChange={(e) => updatePeriod(dayIndex, periodIndex, 'room', e.target.value)}
                                placeholder="Room number"
                              />
                            </div>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removePeriod(dayIndex, periodIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Routine"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Routine Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Routine from PDF</DialogTitle>
          </DialogHeader>

          {!parsedData ? (
            <div className="space-y-6">
              {!user?.schoolId ? (
                <div className="border rounded-lg p-3 bg-red-50 border-red-200 text-sm text-red-700">
                  School context is missing from current session. Please sign out and sign in again before importing routine PDF.
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="importClass">Class *</Label>
                  <Select
                    value={importConfig.classId}
                    onValueChange={(value) => setImportConfig((prev) => ({ ...prev, classId: value }))}
                  >
                    <SelectTrigger id="importClass" className="mt-2">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.className} - {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="importSession">Academic Session *</Label>
                  <Select
                    value={importConfig.sessionId}
                    onValueChange={(value) => setImportConfig((prev) => ({ ...prev, sessionId: value }))}
                  >
                    <SelectTrigger id="importSession" className="mt-2">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicSessions.map((session) => (
                        <SelectItem key={session._id} value={session._id}>
                          {session.name || session.sessionName || session.academicYear || session._id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {academicSessions.length === 0 ? (
                <div className="border rounded-lg p-3 bg-amber-50 border-amber-200 text-sm text-amber-700">
                  No academic session found. Create an academic session first, then import routine PDF.
                </div>
              ) : null}

              <div>
                <Label htmlFor="importMode">Import Mode</Label>
                <Select
                  value={importConfig.importMode}
                  onValueChange={(value: "merge" | "replace") => setImportConfig((prev) => ({ ...prev, importMode: value }))}
                >
                  <SelectTrigger id="importMode" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Merge (keep existing entries)</SelectItem>
                    <SelectItem value="replace">Replace conflicts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="routinePdf">Select PDF File *</Label>
                <Input
                  id="routinePdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Upload a PDF file containing class routine information. Maximum file size: 10MB.
                </p>
              </div>

              {selectedFile && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowImport(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending || !user?.schoolId || academicSessions.length === 0}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload & Parse"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {parsedData.success && parsedData.data ? (
                <>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-medium mb-2">Import Session</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Batch ID:</span>
                        <span className="ml-2 font-medium">{parsedData.data.importBatchId || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">File:</span>
                        <span className="ml-2 font-medium">{parsedData.data.originalFileName || selectedFile?.name || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Parser:</span>
                        <span className="ml-2 font-medium">{parsedData.data.parserVersion || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mode:</span>
                        <span className="ml-2 font-medium capitalize">{importConfig.importMode}</span>
                      </div>
                    </div>
                  </div>

                  {parsedData.data.validation?.criticalErrors?.length ? (
                    <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <h4 className="font-medium text-red-800">Critical Errors</h4>
                      </div>
                      <ul className="text-sm text-red-700 space-y-1">
                        {parsedData.data.validation.criticalErrors.map((item, index) => (
                          <li key={index}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {(parsedData.data.validation?.warnings?.length || parsedData.data.preview?.warnings?.length) ? (
                    <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <h4 className="font-medium text-amber-800">Warnings</h4>
                      </div>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {[...(parsedData.data.preview?.warnings || []), ...(parsedData.data.validation?.warnings || [])]
                          .slice(0, 20)
                          .map((warning, index) => (
                            <li key={index}>- {warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      Parsed Entries ({parsedData.data.preview?.stats?.validEntries ?? parsedData.data.preview?.entries?.length ?? 0} valid)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                      <div className="bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-medium">{parsedData.data.preview?.stats?.totalEntries ?? parsedData.data.preview?.entries?.length ?? 0}</span>
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground">Valid:</span>{" "}
                        <span className="font-medium">{parsedData.data.preview?.stats?.validEntries ?? 0}</span>
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground">Invalid:</span>{" "}
                        <span className="font-medium">{parsedData.data.preview?.stats?.invalidEntries ?? 0}</span>
                      </div>
                    </div>
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {(parsedData.data.preview?.entries || []).slice(0, 40).map((entry, index) => (
                        <div key={`${entry.dayOfWeek || "day"}-${entry.periodNumber || index}-${index}`} className="border rounded p-3 bg-muted/20 text-sm">
                          <div className="font-medium">
                            {entry.dayOfWeek || "Day"} - Period {entry.periodNumber || "-"}
                          </div>
                          <div>{entry.subjectName || "Subject"}</div>
                          <div className="text-muted-foreground">
                            {entry.teacherName || "Teacher"} | {entry.startTime || "--:--"} - {entry.endTime || "--:--"}
                            {entry.roomName ? ` | Room ${entry.roomName}` : ""}
                          </div>
                        </div>
                      ))}
                      {(parsedData.data.preview?.entries || []).length > 40 ? (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing first 40 entries of {(parsedData.data.preview?.entries || []).length}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={resetImport}>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Different File
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowImport(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleConfirmImport}
                        disabled={confirmImportMutation.isPending || Boolean(parsedData.data.validation?.criticalErrors?.length)}
                      >
                        {confirmImportMutation.isPending ? "Importing..." : "Confirm Import"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                // Error State
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h4 className="font-medium text-red-800 mb-2">Failed to Parse PDF</h4>
                  <p className="text-sm text-red-600 mb-4">{parsedData.message}</p>
                  <div className="flex justify-center gap-2">
                    <Button type="button" variant="outline" onClick={resetImport}>
                      Try Again
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowImport(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

