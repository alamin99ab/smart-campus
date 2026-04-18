import api from "@/lib/api";
import { toast } from "sonner";

export interface ExportOptions {
  format?: 'xlsx' | 'pdf';
  examId?: string;
  from?: string;
  to?: string;
  month?: number;
  year?: number;
  schoolId?: string;
  schoolCode?: string;
}

export const getFilenameFromDisposition = (disposition: string | undefined): string | null => {
  if (!disposition) return null;
  const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch && filenameMatch[1]) {
    const filename = filenameMatch[1].replace(/['"]/g, '');
    return filename || null;
  }
  return null;
};

export const downloadFile = async (endpoint: string, options: ExportOptions = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (options.format) params.append('format', options.format);
    if (options.examId) params.append('examId', options.examId);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.month) params.append('month', options.month.toString());
    if (options.year) params.append('year', options.year.toString());
    if (options.schoolId) params.append('schoolId', options.schoolId);
    if (options.schoolCode) params.append('schoolCode', options.schoolCode);
    
    const url = `${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await api.get(url, { responseType: "blob" });
    
    const filename = getFilenameFromDisposition(response.headers?.["content-disposition"]) || 
                     `export_${Date.now()}.${options.format || 'xlsx'}`;
    
    const blob = new Blob([response.data], { 
      type: options.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success(`Export downloaded: ${filename}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Export failed";
    toast.error(errorMessage);
  }
};

// Export functions for different data types
export const exportStudents = (options: ExportOptions = {}) => 
  downloadFile('/exports/students', { ...options, format: options.format || 'xlsx' });

export const exportTeachers = (options: ExportOptions = {}) => 
  downloadFile('/exports/teachers', { ...options, format: options.format || 'xlsx' });

export const exportAttendance = (options: ExportOptions = {}) => 
  downloadFile('/exports/attendance', { ...options, format: options.format || 'xlsx' });

export const exportResults = (options: ExportOptions = {}) => 
  downloadFile('/exports/results', { ...options, format: options.format || 'xlsx' });

export const exportFees = (options: ExportOptions = {}) => 
  downloadFile('/exports/fees', { ...options, format: options.format || 'xlsx' });

export const exportNotices = (options: ExportOptions = {}) => 
  downloadFile('/exports/notices', { ...options, format: options.format || 'xlsx' });

export const exportFullSchoolSummary = (options: ExportOptions = {}) => 
  downloadFile('/exports/full-school-summary', { ...options, format: options.format || 'xlsx' });
