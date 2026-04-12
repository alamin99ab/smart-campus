import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Handshake, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Subject = {
  subjectId: string;
  subjectName: string;
};

type ClassInfo = {
  classId: string;
  className: string;
  section: string;
  subjects: Subject[];
};

type AbsenceSlot = {
  _id: string;
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  periodNumber: number;
  status: string;
  acceptanceNote?: string;
};

type AbsenceRequest = {
  _id: string;
  absenceDate: string;
  reason?: string;
  status: string;
  absentTeacher?: { _id: string; name?: string; email?: string };
  slots: AbsenceSlot[];
  counts?: { totalSlots?: number; openSlots?: number; acceptedSlots?: number };
};

type SubstituteAssignment = {
  requestId: string;
  slotId: string;
  absenceDate: string;
  className: string;
  section: string;
  subjectName: string;
  periodNumber: number;
  status: string;
  acceptanceNote?: string;
  absentTeacher?: { name?: string; email?: string };
  temporaryAttendancePermissionActive?: boolean;
};

type SlotFormRow = {
  classId: string;
  subjectId: string;
  periodNumber: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const toClassLabel = (row: ClassInfo) => `${row.className} - ${row.section}`;

export default function TeacherSubstituteCoveragePage() {
  const qc = useQueryClient();
  const [absenceDate, setAbsenceDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [slotRows, setSlotRows] = useState<SlotFormRow[]>([{ classId: "", subjectId: "", periodNumber: "1" }]);
  const [acceptNotes, setAcceptNotes] = useState<Record<string, string>>({});

  const {
    data: classes = [],
    isLoading: loadingClasses,
    isError: classesError,
    error: classesQueryError,
    refetch: refetchClasses,
  } = useQuery<ClassInfo[]>({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-classes");
      return extractApiArray<ClassInfo>(res.data, ["classes"]);
    },
  });

  const {
    data: myRequests = [],
    isLoading: loadingMyRequests,
    isError: myRequestsError,
    error: myRequestsQueryError,
    refetch: refetchMyRequests,
  } = useQuery<AbsenceRequest[]>({
    queryKey: ["teacher-absence-requests-mine"],
    queryFn: async () => {
      const res = await api.get("/teacher/absence-requests/mine");
      return extractApiArray<AbsenceRequest>(res.data);
    },
  });

  const {
    data: openRequests = [],
    isLoading: loadingOpenRequests,
    isError: openRequestsError,
    error: openRequestsQueryError,
    refetch: refetchOpenRequests,
  } = useQuery<AbsenceRequest[]>({
    queryKey: ["teacher-absence-requests-open"],
    queryFn: async () => {
      const res = await api.get("/teacher/absence-requests/open");
      return extractApiArray<AbsenceRequest>(res.data);
    },
  });

  const {
    data: myAssignments = [],
    isLoading: loadingAssignments,
    isError: assignmentsError,
    error: assignmentsQueryError,
    refetch: refetchAssignments,
  } = useQuery<SubstituteAssignment[]>({
    queryKey: ["teacher-substitute-assignments"],
    queryFn: async () => {
      const res = await api.get("/teacher/substitute-assignments");
      return extractApiArray<SubstituteAssignment>(res.data);
    },
  });

  const classesById = useMemo(() => new Map(classes.map((row) => [row.classId, row])), [classes]);

  const updateSlot = (index: number, patch: Partial<SlotFormRow>) => {
    setSlotRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addSlotRow = () => {
    setSlotRows((rows) => [...rows, { classId: "", subjectId: "", periodNumber: "1" }]);
  };

  const removeSlotRow = (index: number) => {
    setSlotRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  };

  const submitRequest = useMutation({
    mutationFn: async () => {
      const payloadSlots = slotRows.map((row) => {
        const classDoc = classesById.get(row.classId);
        if (!row.classId || !row.subjectId || !classDoc) {
          throw new Error("Every slot needs class + subject + period");
        }
        return {
          classId: row.classId,
          section: classDoc.section,
          subjectId: row.subjectId,
          periodNumber: Number(row.periodNumber) || 1,
        };
      });

      const payload = {
        absenceDate,
        reason,
        slots: payloadSlots,
      };
      const res = await api.post("/teacher/absence-requests", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Absence request submitted");
      setReason("");
      setSlotRows([{ classId: "", subjectId: "", periodNumber: "1" }]);
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-mine"] });
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-open"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to submit absence request"));
    },
  });

  const acceptSlot = useMutation({
    mutationFn: async ({ requestId, slotId, note }: { requestId: string; slotId: string; note?: string }) => {
      const res = await api.patch(`/teacher/absence-requests/${requestId}/slots/${slotId}/accept`, { note });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Substitute slot accepted");
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-open"] });
      void qc.invalidateQueries({ queryKey: ["teacher-substitute-assignments"] });
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-mine"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to accept substitute slot"));
    },
  });

  if (loadingClasses) {
    return <LoadingSpinner text="Loading substitute workflow..." />;
  }

  if (classesError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Substitute Coverage" description="Temporary substitute attendance permissions" />
        <EmptyState
          title="Failed to load teacher classes"
          description={getErrorMessage(classesQueryError, "Please retry.")}
          icon={ClipboardList}
          variant="error"
          action={{ label: "Retry", onClick: () => refetchClasses() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Substitute Coverage"
        description="Submit class-period absence requests, accept open substitute slots, and track temporary attendance permissions."
      />

      <section className="bg-card rounded-xl border p-4 space-y-4">
        <h3 className="text-base font-semibold">Submit Absence Request</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Absence Date</Label>
            <Input type="date" value={absenceDate} onChange={(e) => setAbsenceDate(e.target.value)} />
          </div>
          <div>
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for class-period absence"
            />
          </div>
        </div>

        <div className="space-y-3">
          {slotRows.map((row, index) => {
            const classDoc = classesById.get(row.classId);
            const subjects = classDoc?.subjects || [];
            return (
              <div key={`slot-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label>Class</Label>
                  <Select
                    value={row.classId}
                    onValueChange={(val) => {
                      const firstSubject = classesById.get(val)?.subjects?.[0]?.subjectId || "";
                      updateSlot(index, { classId: val, subjectId: firstSubject });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classInfo) => (
                        <SelectItem key={classInfo.classId} value={classInfo.classId}>
                          {toClassLabel(classInfo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4">
                  <Label>Subject</Label>
                  <Select value={row.subjectId} onValueChange={(val) => updateSlot(index, { subjectId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length > 0 ? (
                        subjects.map((subject) => (
                          <SelectItem key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Select class first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Period</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.periodNumber}
                    onChange={(e) => updateSlot(index, { periodNumber: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button variant="outline" onClick={() => removeSlotRow(index)} disabled={slotRows.length === 1}>
                    -
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={addSlotRow}>
            Add Slot
          </Button>
          <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
            {submitRequest.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </section>

      <section className="bg-card rounded-xl border p-4 space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Open Substitute Slots
        </h3>
        {loadingOpenRequests ? (
          <LoadingSpinner text="Loading open slots..." />
        ) : openRequestsError ? (
          <EmptyState
            title="Failed to load open slots"
            description={getErrorMessage(openRequestsQueryError, "Please retry.")}
            icon={Handshake}
            variant="error"
            action={{ label: "Retry", onClick: () => refetchOpenRequests() }}
          />
        ) : openRequests.length === 0 ? (
          <EmptyState
            title="No open substitute slots"
            description="No pending class-period substitution requests match your teaching assignments."
            icon={Handshake}
          />
        ) : (
          <div className="space-y-4">
            {openRequests.map((request) => (
              <div key={request._id} className="border rounded-lg p-3 space-y-2">
                <div className="text-sm text-muted-foreground">
                  {new Date(request.absenceDate).toLocaleDateString()} - Absent teacher: {request.absentTeacher?.name || "Teacher"}
                </div>
                {(request.slots || []).map((slot) => {
                  const noteKey = `${request._id}:${slot._id}`;
                  return (
                    <div key={slot._id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
                      <div className="lg:col-span-7 text-sm">
                        {slot.className} {slot.section} - {slot.subjectName} - Period {slot.periodNumber}
                      </div>
                      <div className="lg:col-span-3">
                        <Input
                          placeholder="Acceptance note (optional)"
                          value={acceptNotes[noteKey] || ""}
                          onChange={(e) => setAcceptNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))}
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <Button
                          className="w-full"
                          onClick={() =>
                            acceptSlot.mutate({
                              requestId: request._id,
                              slotId: slot._id,
                              note: acceptNotes[noteKey] || "",
                            })
                          }
                          disabled={acceptSlot.isPending}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl border p-4 space-y-3">
        <h3 className="text-base font-semibold">My Substitute Assignments</h3>
        {loadingAssignments ? (
          <LoadingSpinner text="Loading substitute assignments..." />
        ) : assignmentsError ? (
          <EmptyState
            title="Failed to load substitute assignments"
            description={getErrorMessage(assignmentsQueryError, "Please retry.")}
            icon={ClipboardList}
            variant="error"
            action={{ label: "Retry", onClick: () => refetchAssignments() }}
          />
        ) : myAssignments.length === 0 ? (
          <EmptyState title="No substitute assignments" description="Accepted/assigned substitute slots will appear here." icon={ClipboardList} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myAssignments.map((assignment) => (
                  <TableRow key={`${assignment.requestId}:${assignment.slotId}`}>
                    <TableCell>{new Date(assignment.absenceDate).toLocaleDateString()}</TableCell>
                    <TableCell>{assignment.className} {assignment.section}</TableCell>
                    <TableCell>{assignment.subjectName}</TableCell>
                    <TableCell>{assignment.periodNumber}</TableCell>
                    <TableCell className="capitalize">{assignment.status}</TableCell>
                    <TableCell>
                      {assignment.temporaryAttendancePermissionActive ? "Active for selected date/period" : "Expired or future-dated"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl border p-4 space-y-3">
        <h3 className="text-base font-semibold">My Submitted Absence Requests</h3>
        {loadingMyRequests ? (
          <LoadingSpinner text="Loading my requests..." />
        ) : myRequestsError ? (
          <EmptyState
            title="Failed to load submitted requests"
            description={getErrorMessage(myRequestsQueryError, "Please retry.")}
            icon={ClipboardList}
            variant="error"
            action={{ label: "Retry", onClick: () => refetchMyRequests() }}
          />
        ) : myRequests.length === 0 ? (
          <EmptyState title="No requests yet" description="Submit a class-period absence request to start substitute coverage." icon={ClipboardList} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total Slots</TableHead>
                  <TableHead>Open Slots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>{new Date(request.absenceDate).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{request.status.replace("_", " ")}</TableCell>
                    <TableCell>{request.reason || "-"}</TableCell>
                    <TableCell>{request.counts?.totalSlots ?? request.slots?.length ?? 0}</TableCell>
                    <TableCell>{request.counts?.openSlots ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

