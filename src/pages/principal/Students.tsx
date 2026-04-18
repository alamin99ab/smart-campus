import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Eye, Download } from "lucide-react";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

type StudentListRow = {
  _id: string;
  name: string;
  email?: string;
  roll?: string;
  rollNumber?: string;
  section?: string;
  studentClass?: string;
  classId?: { _id: string; className?: string; section?: string; classLevel?: number };
};

type ClassOption = {
  _id: string;
  className?: string;
  section?: string;
};

type BulkStudentRow = {
  name?: string;
  email?: string;
  roll?: string;
  rollNumber?: string;
  class?: string;
  studentClass?: string;
};

type ValidationErrorRow = {
  row?: number | string;
  errors?: string[];
  message?: string;
};

type StudentProfileResponse = {
  student: {
    userId?: string | null;
    studentId?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    className?: string | null;
    classLevel?: number | null;
    section?: string | null;
    rollNumber?: string | null;
    parentInfo?: { name?: string; email?: string; phone?: string } | null;
    guardian?: { name?: string; email?: string; phone?: string } | null;
    isApproved?: boolean | null;
    isActive?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  linkage?: {
    userRecordFound?: boolean;
    studentLedgerFound?: boolean;
    dataStudentId?: string | null;
  };
  attendance: {
    summary: {
      totalRecords: number;
      present: number;
      absent: number;
      late: number;
      holiday: number;
      attendancePercentage: number;
    };
    recent: Array<{
      attendanceId: string;
      date: string | null;
      subject?: string | null;
      status: string;
      remarks?: string;
    }>;
  };
  fees: {
    summary: {
      totalInvoices: number;
      totalAmountDue: number;
      totalAmountPaid: number;
      totalOutstanding: number;
      paidInvoices: number;
      partialInvoices: number;
      unpaidInvoices: number;
      lastPaymentAt?: string | null;
    };
    details: Array<{
      feeId: string;
      month: number;
      year: number;
      monthLabel: string;
      amountDue: number;
      amountPaid: number;
      dueAmount: number;
      status: string;
      updatedAt?: string | null;
    }>;
    recentPayments: Array<{
      paymentId: string;
      feeId?: string | null;
      month: number;
      year: number;
      monthLabel: string;
      amount: number;
      paymentMethod: string;
      transactionId?: string | null;
      remarks?: string;
      receivedBy?: { name?: string | null; role?: string | null } | null;
      createdAt?: string | null;
    }>;
  };
  results: {
    summary: {
      totalResults: number;
      publishedResults: number;
      draftResults: number;
      averageGpa: number;
      lastExamDate?: string | null;
    };
    history: Array<{
      resultId: string;
      examName: string;
      academicYear?: string | null;
      examDate?: string | null;
      totalMarks: number;
      gpa: number;
      isPublished: boolean;
      publishedAt?: string | null;
      remarks?: string;
      subjects: Array<{
        subjectName: string;
        marks: number;
        grade?: string | null;
      }>;
    }>;
  };
};

type PdfExportType = "profile" | "result" | "fee" | "attendance";

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

const formatAmount = (value?: number) => {
  const amount = Number(value || 0);
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

const getFilenameFromDisposition = (value?: string) => {
  if (!value) return null;
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/["']/g, "");
    } catch {
      return utf8Match[1].replace(/["']/g, "");
    }
  }
  const simpleMatch = value.match(/filename="?([^"]+)"?/i);
  return simpleMatch?.[1] || null;
};

export default function StudentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    rollNumber: "", 
    classId: "", 
    section: "",
    parentName: "",
    parentEmail: "",
    parentPhone: ""
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BulkStudentRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorRow[]>([]);
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<PdfExportType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const {
    data: studentsResponse,
    isLoading,
    isError: studentsError,
    error: studentsQueryError,
    isFetching: studentsFetching,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["students", currentPage, pageSize],
    queryFn: async () => {
      const res = await api.get("/principal/students", { 
        params: { page: currentPage, limit: pageSize } 
      });
      return res.data;
    },
  });

  const students = studentsResponse?.data || [];
  const pagination = studentsResponse?.pagination || {
    page: currentPage,
    limit: pageSize,
    total: 0,
    totalPages: 0
  };

  const {
    data: classes = [],
    isError: classesError,
    error: classesQueryError,
    isFetching: classesFetching,
    refetch: refetchClasses,
  } = useQuery<ClassOption[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/principal/classes");
      return extractApiArray<ClassOption>(res.data);
    },
  });

  const {
    data: studentProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<StudentProfileResponse | null>({
    queryKey: ["principal-student-profile", selectedStudentId],
    enabled: Boolean(showProfile && selectedStudentId),
    queryFn: async () => {
      const res = await api.get(`/principal/students/${selectedStudentId}/profile`);
      return res.data?.data ?? null;
    },
  });

  const create = useMutation({
    mutationFn: async () => { 
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        rollNumber: form.rollNumber,
        classId: form.classId,
        section: form.section,
        parentInfo: form.parentName || form.parentEmail || form.parentPhone ? {
          name: form.parentName,
          email: form.parentEmail,
          phone: form.parentPhone
        } : undefined
      };
      const res = await api.post("/principal/students", payload); 
      return res.data; 
    },
    onSuccess: (d) => { 
      toast.success(d.message || "Student created"); 
      qc.invalidateQueries({ queryKey: ["students"] }); 
      setShowCreate(false); 
      setForm({ 
        name: "", 
        email: "", 
        password: "", 
        rollNumber: "", 
        classId: "", 
        section: "",
        parentName: "",
        parentEmail: "",
        parentPhone: ""
      }); 
    },
    onError: (e: unknown) => toast.error(errorMessage(e, "Failed")),
  });

  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/bulk/parse-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (res: unknown) => {
      const payload = (res as { data?: unknown })?.data ?? res;
      const responseData = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
      const valid = Array.isArray(responseData.students)
        ? (responseData.students as BulkStudentRow[])
        : (Array.isArray(responseData.validRows) ? (responseData.validRows as BulkStudentRow[]) : []);
      const errs = Array.isArray(responseData.validationErrors)
        ? (responseData.validationErrors as ValidationErrorRow[])
        : (Array.isArray(responseData.errorRows) ? (responseData.errorRows as ValidationErrorRow[]) : []);
      setPreviewData(valid);
      setValidationErrors(errs);
      setIsPreviewed(true);
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, "Failed to parse file"));
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/students/bulk/import', {
        students: previewData,
      });
      return res.data;
    },
    onSuccess: (data) => {
      const n = data?.data?.imported ?? previewData.length;
      toast.success(data.message || `Successfully imported ${n} student(s)`);
      qc.invalidateQueries({ queryKey: ["students"] });
      setShowBulkUpload(false);
      resetBulkUpload();
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, "Failed to import students"));
    },
  });

  const resetBulkUpload = () => {
    setBulkFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setIsPreviewed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
      setIsPreviewed(false);
      parseFileMutation.mutate(file);
    }
  };

  const duplicateErrors = validationErrors.filter((e: { errors?: string[] }) =>
    (e.errors || []).some((m: string) => /duplicate/i.test(m))
  );

  const openStudentProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowProfile(true);
  };

  const downloadStudentPdf = async (type: PdfExportType) => {
    if (!selectedStudentId) return;

    const endpointByType: Record<PdfExportType, string> = {
      profile: `/principal/students/${selectedStudentId}/export/profile-pdf`,
      result: `/principal/students/${selectedStudentId}/export/result-pdf`,
      fee: `/principal/students/${selectedStudentId}/export/fee-pdf`,
      attendance: `/principal/students/${selectedStudentId}/export/attendance-pdf`,
    };

    const fallbackNameByType: Record<PdfExportType, string> = {
      profile: "student_profile.pdf",
      result: "student_result_report.pdf",
      fee: "student_fee_report.pdf",
      attendance: "student_attendance_report.pdf",
    };

    try {
      setExportingPdf(type);
      const response = await api.get(endpointByType[type], { responseType: "blob" });
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) || fallbackNameByType[type];

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF download started.");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to download PDF"));
    } finally {
      setExportingPdf(null);
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading students..." />;
  if (studentsError || classesError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Students" description="Manage enrolled students" />
        <EmptyState
          title="Failed to load student module"
          description={errorMessage(studentsQueryError || classesQueryError, "Please try again.")}
          icon={GraduationCap}
          variant="error"
          action={{
            label: studentsFetching || classesFetching ? "Retrying..." : "Retry",
            onClick: () => {
              void refetchStudents();
              void refetchClasses();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Students" 
        description="Manage enrolled students" 
        actionLabel="Add Student" 
        onAction={() => setShowCreate(true)}
        actions={
          <Button variant="outline" onClick={() => setShowBulkUpload(true)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
        }
      />
      
      {students.length === 0 ? (
        <EmptyState 
          title="No students yet" 
          description="Enroll students in your school" 
          icon={GraduationCap} 
          actionLabel="Add Student" 
          onAction={() => setShowCreate(true)} 
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Roll No.</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Class</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{s.roll ?? s.rollNumber ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.studentClass || s.classId?.className || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => openStudentProfile(String(s._id))}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-muted/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.name || !form.email || !form.password || !form.classId || !form.section || !form.rollNumber) {
              toast.error("Please fill in all required fields before creating a student.");
              return;
            }
            if (!strongPasswordRegex.test(form.password)) {
              toast.error("Student password must include uppercase, lowercase, number, and symbol.");
              return;
            }
            create.mutate();
          }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Student Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Roll Number *</Label>
                <Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required placeholder="Roll no." />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="student@school.edu" />
            </div>
            
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="--------" />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class *</Label>
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
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g., A" />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Parent Information</p>
            </div>
            
            <div className="space-y-2">
              <Label>Parent Name</Label>
              <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="Optional" />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Parent Email</Label>
                <Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Parent Phone</Label>
                <Input type="tel" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || !form.name || !form.email || !form.password || !form.classId || !form.section || !form.rollNumber}
                className="w-full sm:w-auto"
              >
                {create.isPending ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkUpload} onOpenChange={(open) => { setShowBulkUpload(open); if (!open) resetBulkUpload(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Upload Students
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isPreviewed && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 sm:p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bulk-upload-file"
                />
                <label htmlFor="bulk-upload-file" className="cursor-pointer block">
                  <Upload className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                  <p className="font-medium text-sm sm:text-base">Click to upload student file</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Use CSV or JSON (Excel: save as CSV first)</p>
                </label>
                {parseFileMutation.isPending && (
                  <p className="mt-4 text-sm text-muted-foreground">Parsing file...</p>
                )}
              </div>
            )}

            {isPreviewed && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg text-center">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{previewData.length}</p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </div>
                  <div className="bg-amber-50 p-2 sm:p-3 rounded-lg text-center">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-amber-600 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{validationErrors.length}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg text-center">
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{duplicateErrors.length}</p>
                    <p className="text-xs text-muted-foreground">Duplicates</p>
                  </div>
                </div>

                {previewData.length > 0 && (
                  <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Name</TableHead>
                          <TableHead className="whitespace-nowrap">Email</TableHead>
                          <TableHead className="whitespace-nowrap hidden sm:table-cell">Roll No.</TableHead>
                          <TableHead className="whitespace-nowrap hidden md:table-cell">Class</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((student, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs sm:text-sm">{student.email}</TableCell>
                            <TableCell className="hidden sm:table-cell">{student.roll ?? student.rollNumber ?? "-"}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.class || student.studentClass || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {previewData.length > 10 && (
                      <p className="text-center text-xs sm:text-sm text-muted-foreground p-2">
                        Showing first 10 of {previewData.length} students
                      </p>
                    )}
                  </div>
                )}

                {validationErrors.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="font-medium text-red-800 mb-2 flex items-center gap-1 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Validation Errors
                    </p>
                    <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                      {validationErrors.slice(0, 5).map((err, idx: number) => (
                        <li key={idx}>
                          Row {err.row}: {(err.errors || [err.message]).filter(Boolean).join("; ")}
                        </li>
                      ))}
                      {validationErrors.length > 5 && (
                        <li>...and {validationErrors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}

                {duplicateErrors.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-800 mb-2 flex items-center gap-1 text-sm">
                      <XCircle className="h-4 w-4" />
                      Rows flagged as duplicate ({duplicateErrors.length})
                    </p>
                    <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                      {duplicateErrors.slice(0, 5).map((dup, idx: number) => (
                        <li key={idx}>
                          Row {dup.row}: {(dup.errors || []).join("; ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                  <Button variant="outline" onClick={resetBulkUpload} className="w-full sm:w-auto">
                    Choose Different File
                  </Button>
                  <Button 
                    onClick={() => importMutation.mutate()} 
                    disabled={previewData.length === 0 || importMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {importMutation.isPending ? "Importing..." : `Import ${previewData.length} Students`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showProfile}
        onOpenChange={(open) => {
          setShowProfile(open);
          if (!open) {
            setSelectedStudentId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Student Full Profile</DialogTitle>
          </DialogHeader>

          {isProfileLoading ? (
            <LoadingSpinner text="Loading student profile..." />
          ) : isProfileError ? (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm text-destructive">
                {errorMessage(profileError, "Failed to load student profile.")}
              </p>
              <Button type="button" variant="outline" onClick={() => refetchProfile()}>
                Retry
              </Button>
            </div>
          ) : !studentProfile ? (
            <EmptyState
              title="Profile not available"
              description="No linked student data was found for this profile."
              icon={GraduationCap}
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span>{studentProfile.student?.name || "Student"}</span>
                    <Badge variant={studentProfile.student?.isActive ? "default" : "secondary"}>
                      {studentProfile.student?.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={studentProfile.student?.isApproved ? "default" : "outline"}>
                      {studentProfile.student?.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div><span className="text-muted-foreground">Roll:</span> {studentProfile.student?.rollNumber || "-"}</div>
                  <div><span className="text-muted-foreground">Class:</span> {studentProfile.student?.className || "-"}</div>
                  <div><span className="text-muted-foreground">Section:</span> {studentProfile.student?.section || "-"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {studentProfile.student?.email || "-"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Download Student PDFs</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadStudentPdf("profile")}
                    disabled={exportingPdf !== null}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingPdf === "profile" ? "Generating..." : "Profile PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadStudentPdf("result")}
                    disabled={exportingPdf !== null}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingPdf === "result" ? "Generating..." : "Result PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadStudentPdf("fee")}
                    disabled={exportingPdf !== null}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingPdf === "fee" ? "Generating..." : "Fee PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadStudentPdf("attendance")}
                    disabled={exportingPdf !== null}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingPdf === "attendance" ? "Generating..." : "Attendance PDF"}
                  </Button>
                </CardContent>
              </Card>

              <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="fees">Fees</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                      <div><span className="text-muted-foreground">Phone:</span> {studentProfile.student?.phone || "-"}</div>
                      <div><span className="text-muted-foreground">Address:</span> {studentProfile.student?.address || "-"}</div>
                      <div><span className="text-muted-foreground">Parent Name:</span> {studentProfile.student?.parentInfo?.name || studentProfile.student?.guardian?.name || "-"}</div>
                      <div><span className="text-muted-foreground">Parent Email:</span> {studentProfile.student?.parentInfo?.email || studentProfile.student?.guardian?.email || "-"}</div>
                      <div><span className="text-muted-foreground">Parent Phone:</span> {studentProfile.student?.parentInfo?.phone || studentProfile.student?.guardian?.phone || "-"}</div>
                      <div><span className="text-muted-foreground">Created:</span> {formatDate(studentProfile.student?.createdAt)}</div>
                      <div><span className="text-muted-foreground">Updated:</span> {formatDate(studentProfile.student?.updatedAt)}</div>
                      <div><span className="text-muted-foreground">Student Ledger Linked:</span> {studentProfile.linkage?.studentLedgerFound ? "Yes" : "No"}</div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Results</p><p className="text-2xl font-semibold">{studentProfile.results.summary.totalResults}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Published</p><p className="text-2xl font-semibold">{studentProfile.results.summary.publishedResults}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Draft</p><p className="text-2xl font-semibold">{studentProfile.results.summary.draftResults}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Average GPA</p><p className="text-2xl font-semibold">{studentProfile.results.summary.averageGpa}</p></CardContent></Card>
                  </div>

                  {studentProfile.results.history.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">No result history found for this student.</div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exam</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Marks</TableHead>
                            <TableHead>GPA</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentProfile.results.history.map((row) => (
                            <TableRow key={row.resultId}>
                              <TableCell className="font-medium">{row.examName}</TableCell>
                              <TableCell>{formatDate(row.examDate)}</TableCell>
                              <TableCell>{row.academicYear || "-"}</TableCell>
                              <TableCell>{row.totalMarks}</TableCell>
                              <TableCell>{row.gpa}</TableCell>
                              <TableCell>
                                <Badge variant={row.isPublished ? "default" : "outline"}>
                                  {row.isPublished ? "Published" : "Draft"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fees" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Invoices</p><p className="text-2xl font-semibold">{studentProfile.fees.summary.totalInvoices}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Due</p><p className="text-xl font-semibold">{formatAmount(studentProfile.fees.summary.totalAmountDue)}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-xl font-semibold">{formatAmount(studentProfile.fees.summary.totalAmountPaid)}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-semibold">{formatAmount(studentProfile.fees.summary.totalOutstanding)}</p></CardContent></Card>
                  </div>

                  {studentProfile.fees.details.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">No fee records found for this student.</div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead>Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentProfile.fees.details.map((fee) => (
                            <TableRow key={fee.feeId}>
                              <TableCell>{fee.monthLabel}</TableCell>
                              <TableCell>{formatAmount(fee.amountDue)}</TableCell>
                              <TableCell>{formatAmount(fee.amountPaid)}</TableCell>
                              <TableCell>{formatAmount(fee.dueAmount)}</TableCell>
                              <TableCell>{fee.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{studentProfile.attendance.summary.totalRecords}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Present</p><p className="text-2xl font-semibold">{studentProfile.attendance.summary.present}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Late</p><p className="text-2xl font-semibold">{studentProfile.attendance.summary.late}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Absent</p><p className="text-2xl font-semibold">{studentProfile.attendance.summary.absent}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Rate</p><p className="text-2xl font-semibold">{studentProfile.attendance.summary.attendancePercentage}%</p></CardContent></Card>
                  </div>

                  {studentProfile.attendance.recent.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">No attendance records found for this student.</div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentProfile.attendance.recent.map((item) => (
                            <TableRow key={item.attendanceId}>
                              <TableCell>{formatDate(item.date)}</TableCell>
                              <TableCell>{item.subject || "-"}</TableCell>
                              <TableCell>{item.status}</TableCell>
                              <TableCell>{item.remarks || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


