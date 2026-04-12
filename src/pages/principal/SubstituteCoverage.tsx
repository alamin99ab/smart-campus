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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Users } from "lucide-react";
import { toast } from "sonner";

type TeacherRow = {
  _id: string;
  name?: string;
  email?: string;
};

type SlotRow = {
  _id: string;
  className: string;
  section: string;
  subjectName: string;
  periodNumber: number;
  status: string;
  substituteTeacher?: { _id: string; name?: string; email?: string } | null;
  acceptanceNote?: string;
};

type RequestRow = {
  _id: string;
  absenceDate: string;
  reason?: string;
  status: string;
  absentTeacher?: { _id: string; name?: string; email?: string };
  slots: SlotRow[];
};

export default function PrincipalSubstituteCoveragePage() {
  const qc = useQueryClient();
  const [selectionBySlot, setSelectionBySlot] = useState<Record<string, string>>({});
  const [noteBySlot, setNoteBySlot] = useState<Record<string, string>>({});

  const {
    data: absenceRequests = [],
    isLoading: loadingRequests,
    isError: requestsError,
    error: requestsQueryError,
    refetch: refetchRequests,
  } = useQuery<RequestRow[]>({
    queryKey: ["principal-absence-requests"],
    queryFn: async () => {
      const res = await api.get("/principal/absence-requests");
      return extractApiArray<RequestRow>(res.data);
    },
  });

  const {
    data: teachers = [],
    isLoading: loadingTeachers,
    isError: teachersError,
    error: teachersQueryError,
    refetch: refetchTeachers,
  } = useQuery<TeacherRow[]>({
    queryKey: ["principal-teachers-for-substitute"],
    queryFn: async () => {
      const res = await api.get("/principal/teachers");
      return extractApiArray<TeacherRow>(res.data, ["teachers"]);
    },
  });

  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher._id,
        label: teacher.name ? `${teacher.name}${teacher.email ? ` (${teacher.email})` : ""}` : teacher.email || "Teacher",
      })),
    [teachers]
  );

  const assignMutation = useMutation({
    mutationFn: async ({
      requestId,
      slotId,
      substituteTeacherId,
      note,
    }: {
      requestId: string;
      slotId: string;
      substituteTeacherId: string;
      note?: string;
    }) => {
      const res = await api.patch(`/principal/absence-requests/${requestId}/slots/${slotId}/assign`, {
        substituteTeacherId,
        note,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Substitute assigned");
      void qc.invalidateQueries({ queryKey: ["principal-absence-requests"] });
      void qc.invalidateQueries({ queryKey: ["teacher-substitute-assignments"] });
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-open"] });
      void qc.invalidateQueries({ queryKey: ["teacher-absence-requests-mine"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to assign substitute"));
    },
  });

  const retryAll = () => {
    void refetchRequests();
    void refetchTeachers();
  };

  if (loadingRequests || loadingTeachers) {
    return <LoadingSpinner text="Loading substitute coverage..." />;
  }

  if (requestsError || teachersError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Substitute Coverage" description="Principal assignment for class-period teacher absences" />
        <EmptyState
          title="Failed to load substitute coverage data"
          description={`${getErrorMessage(requestsQueryError, "")} ${getErrorMessage(teachersQueryError, "")}`.trim() || "Please retry."}
          icon={ClipboardList}
          variant="error"
          action={{ label: "Retry", onClick: retryAll }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Substitute Coverage"
        description="Review teacher absence requests and assign substitute teachers for class-period attendance responsibility."
      />

      {absenceRequests.length === 0 ? (
        <EmptyState
          title="No absence requests"
          description="Teacher absence requests will appear here for substitute assignment and tracking."
          icon={Users}
        />
      ) : (
        <div className="space-y-4">
          {absenceRequests.map((request) => (
            <section key={request._id} className="bg-card rounded-xl border p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {new Date(request.absenceDate).toLocaleDateString()} - {request.absentTeacher?.name || "Teacher"} - Status:{" "}
                <span className="capitalize">{request.status.replace("_", " ")}</span>
              </div>
              <div className="text-sm">{request.reason || "No reason provided."}</div>

              <div className="space-y-3">
                {(request.slots || []).map((slot) => {
                  const slotKey = `${request._id}:${slot._id}`;
                  const selectedTeacherId = selectionBySlot[slotKey] || slot.substituteTeacher?._id || "";
                  const note = noteBySlot[slotKey] || slot.acceptanceNote || "";
                  const assignable = !["completed", "cancelled"].includes(slot.status);

                  return (
                    <div key={slot._id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end border rounded-lg p-3">
                      <div className="lg:col-span-4 text-sm">
                        <div className="font-medium">
                          {slot.className} {slot.section}
                        </div>
                        <div className="text-muted-foreground">
                          {slot.subjectName} - Period {slot.periodNumber}
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <Label>Substitute Teacher</Label>
                        <Select
                          value={selectedTeacherId}
                          onValueChange={(value) => setSelectionBySlot((prev) => ({ ...prev, [slotKey]: value }))}
                          disabled={!assignable}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherOptions.map((teacher) => (
                              <SelectItem key={teacher.value} value={teacher.value}>
                                {teacher.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="lg:col-span-3">
                        <Label>Note (Optional)</Label>
                        <Input
                          value={note}
                          onChange={(e) => setNoteBySlot((prev) => ({ ...prev, [slotKey]: e.target.value }))}
                          disabled={!assignable}
                          placeholder="Assignment note"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <Button
                          className="w-full"
                          disabled={!assignable || !selectedTeacherId || assignMutation.isPending}
                          onClick={() =>
                            assignMutation.mutate({
                              requestId: request._id,
                              slotId: slot._id,
                              substituteTeacherId: selectedTeacherId,
                              note,
                            })
                          }
                        >
                          {assignMutation.isPending ? "Assigning..." : "Assign"}
                        </Button>
                      </div>

                      <div className="lg:col-span-12 text-xs text-muted-foreground">
                        Slot status: <span className="capitalize">{slot.status}</span>
                        {slot.substituteTeacher?.name ? ` - Current substitute: ${slot.substituteTeacher.name}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

