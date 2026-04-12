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
import { Calendar, Plus, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClassInfo {
  _id: string;
  className: string;
  section: string;
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

export default function RoutinePage() {
  const [showCreate, setShowCreate] = useState(false);
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
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

  if (loadingClasses || loadingRoutines) return <LoadingSpinner text="Loading routines..." />;
  if (classesError || routinesError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Routine Management" description="Manage class schedules and timetables" />
        <EmptyState
          title="Failed to load routine data"
          description={getErrorMessage(classesQueryError || routinesQueryError, "Please try again.")}
          icon={Calendar}
          variant="error"
          action={{
            label: classesFetching || routinesFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchClasses();
              void refetchRoutines();
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
        actionLabel="Create Routine" 
        onAction={() => setShowCreate(true)} 
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
    </div>
  );
}

