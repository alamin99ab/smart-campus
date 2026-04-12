import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Send, Globe } from "lucide-react";

interface NoticeRow {
  _id: string;
  title?: string;
  noticeType?: string;
  category?: string;
  priority?: string;
  status?: string;
  isPublished?: boolean;
  isPublic?: boolean;
  createdAt?: string;
}

export default function NoticesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general", priority: "medium", targetAudience: "all", isPublic: false });
  const qc = useQueryClient();

  const { data: notices = [], isLoading, isError, error, refetch, isFetching } = useQuery<NoticeRow[]>({
    queryKey: ["notices"],
    queryFn: async () => {
      const res = await api.get("/notices");
      return extractApiArray<NoticeRow>(res.data, ["notices"]);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const audienceMap: Record<string, { targetType: string; targetRoles: string[] }> = {
        all: { targetType: 'all', targetRoles: ['teacher', 'student', 'parent'] },
        teachers: { targetType: 'role', targetRoles: ['teacher'] },
        students: { targetType: 'role', targetRoles: ['student'] },
        parents: { targetType: 'role', targetRoles: ['parent'] }
      };
      const audience = audienceMap[form.targetAudience] || audienceMap.all;
      const payload = {
        title: form.title,
        description: form.content,
        noticeType: form.category || "general",
        priority: form.priority,
        targetType: audience.targetType,
        targetRoles: audience.targetRoles,
        isPublic: form.isPublic
      };
      const res = await api.post("/notices", payload);
      return res.data;
    },
    onSuccess: (d) => { 
      toast.success(d.message || "Notice created"); 
      qc.invalidateQueries({ queryKey: ["notices"] }); 
      setShowCreate(false); 
      setForm({ title: "", content: "", category: "general", priority: "medium", targetAudience: "all", isPublic: false }); 
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to create notice")),
  });

  const deleteNotice = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notices/${id}`);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Notice deleted");
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to delete")),
  });

  const publishNotice = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/notices/${id}/publish`);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Notice published");
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to publish"))
  });

  const unpublishNotice = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/notices/${id}`, { isPublished: false, status: 'draft' });
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Notice unpublished");
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to unpublish"))
  });

  const togglePublicNotice = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await api.put(`/notices/${id}`, { isPublic });
      return res.data;
    },
    onSuccess: (d, vars) => {
      toast.success(d.message || (vars.isPublic ? "Notice is now public" : "Notice is now private"));
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Failed to update website visibility"))
  });

  if (isLoading) return <LoadingSpinner text="Loading notices..." />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Notices" description="School announcements" onAction={() => setShowCreate(true)} actionLabel="Create Notice" />
        <EmptyState
          title="Failed to load notices"
          description={getErrorMessage(error, "Please try again.")}
          icon={Bell}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Notices" 
        description="School announcements" 
        actionLabel="Create Notice"
        onAction={() => setShowCreate(true)}
      />
      
      {notices.length === 0 ? (
        <EmptyState
          title="No notices"
          description="Create announcements for your school"
          icon={Bell}
          actionLabel="Create Notice"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Title</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Category</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Priority</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">Status</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">Website</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n) => (
                  <TableRow key={n._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="capitalize">{n.noticeType || n.category || "-"}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${n.priority === "high" ? "bg-red-100 text-red-800" : n.priority === "low" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                        {n.priority || "medium"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${n.status === "active" || n.isPublished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {n.status || (n.isPublished ? "active" : "draft")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {n.isPublic ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">Yes</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">No</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {n.isPublished ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unpublishNotice.mutate(n._id)}
                            className="text-xs px-2 sm:px-3"
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishNotice.mutate(n._id)}
                            className="text-xs px-2 sm:px-3"
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublicNotice.mutate({ id: n._id, isPublic: !n.isPublic })}
                          className="text-xs px-2 sm:px-3"
                        >
                          <Globe className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">{n.isPublic ? "Make Private" : "Make Public"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotice.mutate(n._id)}
                          className="text-xs text-destructive hover:text-destructive px-2 sm:px-3"
                        >
                          <Trash2 className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Notice
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                required 
                placeholder="Notice title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea 
                value={form.content} 
                onChange={(e) => setForm({ ...form, content: e.target.value })} 
                rows={4} 
                required 
                placeholder="Notice content..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.targetAudience} onValueChange={(val) => setForm({ ...form, targetAudience: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPublic">Website visibility</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="isPublic"
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-muted-foreground">Show on public website</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={create.isPending}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                {create.isPending ? "Creating..." : "Post Notice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

