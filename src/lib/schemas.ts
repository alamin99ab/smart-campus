import { z } from "zod";

const strongPasswordMessage =
  "Password must be 8+ characters and include uppercase, lowercase, number, and symbol";
const strongPasswordSchema = z
  .string()
  .min(8, strongPasswordMessage)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/, strongPasswordMessage);

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  schoolCode: z.string().min(1, "School code is required"),
  role: z.enum(["super_admin", "principal", "teacher", "student", "parent", "accountant"]).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

// User creation schemas
export const createTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: strongPasswordSchema,
  phone: z.string().optional(),
  subjects: z.string().min(1, "At least one subject is required"),
  classes: z.string().optional(),
});

export const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: strongPasswordSchema,
  phone: z.string().optional(),
  studentClass: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
});

export const createParentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  childId: z.string().min(1, "Child selection is required"),
});

// Notice schema
export const createNoticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"]),
  targetAudience: z.enum(["all", "teachers", "students", "parents"]),
});

// Fee schema
export const createFeeSchema = z.object({
  studentId: z.string().min(1, "Student selection is required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.string().min(1, "Fee type is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

// Assignment schema
export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  subject: z.string().min(1, "Subject is required"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

// Result schema
export const createResultSchema = z.object({
  studentId: z.string().min(1, "Student selection is required"),
  subject: z.string().min(1, "Subject is required"),
  examType: z.string().min(1, "Exam type is required"),
  marks: z.number().min(0, "Marks cannot be negative").max(100, "Marks cannot exceed 100"),
  totalMarks: z.number().positive("Total marks must be positive"),
  grade: z.string().optional(),
});

// Routine schema
export const createRoutineSchema = z.object({
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  subject: z.string().min(1, "Subject is required"),
  teacher: z.string().min(1, "Teacher is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  room: z.string().optional(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;
export type CreateTeacherForm = z.infer<typeof createTeacherSchema>;
export type CreateStudentForm = z.infer<typeof createStudentSchema>;
export type CreateParentForm = z.infer<typeof createParentSchema>;
export type CreateNoticeForm = z.infer<typeof createNoticeSchema>;
export type CreateFeeForm = z.infer<typeof createFeeSchema>;
export type CreateAssignmentForm = z.infer<typeof createAssignmentSchema>;
export type CreateResultForm = z.infer<typeof createResultSchema>;
export type CreateRoutineForm = z.infer<typeof createRoutineSchema>;
