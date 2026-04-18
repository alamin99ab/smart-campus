import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

interface AcademicSessionRow {
  _id: string;
  name?: string;
  sessionName?: string;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  isActive?: boolean;
}

const currentYear = new Date().getFullYear();

const DEFAULT_FORM = {
  name: "",
  academicYear: `${currentYear}-${currentYear + 1}`,
  startDate: "",
  endDate: "",
  isCurrent: true,
};

export default function PrincipalAcademicSessionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const qc = useQueryClient();

  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<AcademicSessionRow[]>({
    queryKey: ["principal", "academic-sessions"],
    queryFn: async () => {
      const res = await api.get("/academic-sessions");
      return extractApiArray<AcademicSessionRow>(res.data);
    },
  });

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const aTs = new Date(a.startDate || 0).getTime();
        const bTs = new Date(b.startDate || 0).getTime();
        return bTs - aTs;
      }),
    [sessions]
  );

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        academicYear: form.academicYear.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        isCurrent: form.isCurrent,
      };
      const res = await api.post("/academic-sessions", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Academic session created");
      qc.invalidateQueries({ queryKey: ["principal", "academic-sessions"] });
      qc.invalidateQueries({ queryKey: ["academic-sessions"] });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to create academic session"));
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.put(`/academic-sessions/${sessionId}/current`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Current session updated");
      qc.invalidateQueries({ queryKey: ["principal", "academic-sessions"] });
      qc.invalidateQueries({ queryKey: ["academic-sessions"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to set current session"));
    },
  });

  const onCreate = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Session name is required");
      return;
    }
    if (!form.academicYear.trim()) {
      toast.error("Academic year is required");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start date and end date are required");
      return;
    }

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      toast.error("Please provide a valid date range");
      return;
    }

    createSessionMutation.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading academic sessions..." />;
  }

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Academic Sessions" description="Manage school academic session periods" />
        <EmptyState
          title="Failed to load sessions"
          description={getErrorMessage(error, "Please try again.")}
          icon={Calendar}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Academic Sessions"
        description="Create session periods and choose the active session used by principal workflows."
        actionLabel="Add Session"
        onAction={() => setShowCreate(true)}
      />

      {sortedSessions.length === 0 ? (
        <EmptyState
          title="No academic sessions found"
          description="Create your first academic session so routine and exam planning can use a clear session context."
          icon={Calendar}
          actionLabel="Add Session"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSessions.map((session) => {
                const label = session.name || session.sessionName || "Session";
                const isCurrent = Boolean(session.isCurrent);
                const isActive = session.isActive !== false;
                return (
                  <TableRow key={session._id}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>{session.academicYear || "-"}</TableCell>
                    <TableCell>
                      {session.startDate ? new Date(session.startDate).toLocaleDateString() : "-"} to{" "}
                      {session.endDate ? new Date(session.endDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={isCurrent ? "default" : "secondary"}>
                          {isCurrent ? "Current" : "Inactive"}
                        </Badge>
                        {!isActive ? <Badge variant="outline">Disabled</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={isCurrent || setCurrentMutation.isPending}
                        onClick={() => setCurrentMutation.mutate(session._id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Set Current
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Academic Session
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Session Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Session 2026"
                required
              />
            </div>

            <div>
              <Label htmlFor="academicYear">Academic Year *</Label>
              <Input
                id="academicYear"
                value={form.academicYear}
                onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                placeholder="e.g. 2026-2027"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              />
              Set as current session now
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSessionMutation.isPending}>
                {createSessionMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
