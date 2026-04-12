import { Suspense, lazy, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute, roleRedirects } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuthStore } from "@/stores/authStore";

const Login = lazy(() => import("@/pages/Login"));
const SuperAdminLogin = lazy(() => import("@/pages/SuperAdminLogin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/Dashboard"));
const SchoolsPage = lazy(() => import("@/pages/super-admin/Schools"));
const SchoolDetailsPage = lazy(() => import("@/pages/super-admin/SchoolDetails"));
const AnalyticsPage = lazy(() => import("@/pages/super-admin/Analytics"));

const PrincipalDashboard = lazy(() => import("@/pages/principal/Dashboard"));
const ClassesPage = lazy(() => import("@/pages/principal/Classes"));
const SubjectsPage = lazy(() => import("@/pages/principal/Subjects"));
const TeachersPage = lazy(() => import("@/pages/principal/Teachers"));
const StudentsPage = lazy(() => import("@/pages/principal/Students"));
const ParentsPage = lazy(() => import("@/pages/principal/Parents"));
const PrincipalAttendance = lazy(() => import("@/pages/principal/Attendance"));
const RoutinePage = lazy(() => import("@/pages/principal/Routine"));
const ExamsPage = lazy(() => import("@/pages/principal/Exams"));
const ResultsPage = lazy(() => import("@/pages/principal/Results"));
const NoticesPage = lazy(() => import("@/pages/principal/Notices"));
const FinancePage = lazy(() => import("@/pages/principal/Finance"));
const PromotionPage = lazy(() => import("@/pages/principal/Promotion"));
const PrincipalSubstituteCoverage = lazy(() => import("@/pages/principal/SubstituteCoverage"));

const TeacherDashboard = lazy(() => import("@/pages/teacher/Dashboard"));
const TeacherClasses = lazy(() => import("@/pages/teacher/Classes"));
const TeacherAttendance = lazy(() => import("@/pages/teacher/Attendance"));
const TeacherAssignments = lazy(() => import("@/pages/teacher/Assignments"));
const TeacherMarks = lazy(() => import("@/pages/teacher/Marks"));
const TeacherSubstituteCoverage = lazy(() => import("@/pages/teacher/SubstituteCoverage"));

const StudentDashboard = lazy(() => import("@/pages/student/Dashboard"));
const StudentAttendance = lazy(() => import("@/pages/student/Attendance"));
const StudentRoutine = lazy(() => import("@/pages/student/Routine"));
const StudentResults = lazy(() => import("@/pages/student/Results"));
const StudentAssignments = lazy(() => import("@/pages/student/Assignments"));
const StudentNotices = lazy(() => import("@/pages/student/Notices"));
const StudentFees = lazy(() => import("@/pages/student/Fees"));

const ParentDashboard = lazy(() => import("@/pages/parent/Dashboard"));
const ParentAttendance = lazy(() => import("@/pages/parent/Attendance"));
const ParentResults = lazy(() => import("@/pages/parent/Results"));
const ParentFees = lazy(() => import("@/pages/parent/Fees"));
const ParentNotices = lazy(() => import("@/pages/parent/Notices"));

const AccountantDashboard = lazy(() => import("@/pages/accountant/Dashboard"));
const AccountantFees = lazy(() => import("@/pages/accountant/Fees"));
const AccountantInvoices = lazy(() => import("@/pages/accountant/Invoices"));
const AccountantPayments = lazy(() => import("@/pages/accountant/Payments"));
const AccountantReports = lazy(() => import("@/pages/accountant/Reports"));

const SettingsPage = lazy(() => import("@/pages/shared/Settings"));
const ProfilePage = lazy(() => import("@/pages/shared/Profile"));
const ChangePasswordPage = lazy(() => import("@/pages/shared/ChangePassword"));
const ResetUserPasswordPage = lazy(() => import("@/pages/shared/ResetUserPassword"));

const queryClient = new QueryClient();

function AuthBootstrap() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    if (localStorage.getItem("sc_token")) {
      void loadUser();
    }
  }, [loadUser]);

  return null;
}

function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={roleRedirects[user.role]} replace />;
  }
  return <Navigate to="/login" replace />;
}

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <LoadingSpinner text="Loading page..." />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/super-admin-login" element={<SuperAdminLogin />} />

              <Route element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/super-admin" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/schools" element={<SchoolsPage />} />
                <Route path="/super-admin/schools/:id" element={<SchoolDetailsPage />} />
                <Route path="/super-admin/analytics" element={<AnalyticsPage />} />
                <Route path="/super-admin/settings" element={<SettingsPage />} />
                <Route path="/super-admin/change-password" element={<ChangePasswordPage />} />
                <Route path="/super-admin/reset-password" element={<ResetUserPasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["principal"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/principal" element={<PrincipalDashboard />} />
                <Route path="/principal/classes" element={<ClassesPage />} />
                <Route path="/principal/subjects" element={<SubjectsPage />} />
                <Route path="/principal/teachers" element={<TeachersPage />} />
                <Route path="/principal/students" element={<StudentsPage />} />
                <Route path="/principal/parents" element={<ParentsPage />} />
                <Route path="/principal/attendance" element={<PrincipalAttendance />} />
                <Route path="/principal/routine" element={<RoutinePage />} />
                <Route path="/principal/exams" element={<ExamsPage />} />
                <Route path="/principal/results" element={<ResultsPage />} />
                <Route path="/principal/notices" element={<NoticesPage />} />
                <Route path="/principal/finance" element={<FinancePage />} />
                <Route path="/principal/promotion" element={<PromotionPage />} />
                <Route path="/principal/substitute-coverage" element={<PrincipalSubstituteCoverage />} />
                <Route path="/principal/settings" element={<SettingsPage />} />
                <Route path="/principal/change-password" element={<ChangePasswordPage />} />
                <Route path="/principal/reset-password" element={<ResetUserPasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["teacher"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/teacher/classes" element={<TeacherClasses />} />
                <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                <Route path="/teacher/substitute-coverage" element={<TeacherSubstituteCoverage />} />
                <Route path="/teacher/assignments" element={<TeacherAssignments />} />
                <Route path="/teacher/marks" element={<TeacherMarks />} />
                <Route path="/teacher/profile" element={<ProfilePage />} />
                <Route path="/teacher/change-password" element={<ChangePasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["student"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/attendance" element={<StudentAttendance />} />
                <Route path="/student/routine" element={<StudentRoutine />} />
                <Route path="/student/results" element={<StudentResults />} />
                <Route path="/student/assignments" element={<StudentAssignments />} />
                <Route path="/student/notices" element={<StudentNotices />} />
                <Route path="/student/fees" element={<StudentFees />} />
                <Route path="/student/profile" element={<ProfilePage />} />
                <Route path="/student/change-password" element={<ChangePasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["parent"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="/parent/attendance" element={<ParentAttendance />} />
                <Route path="/parent/results" element={<ParentResults />} />
                <Route path="/parent/fees" element={<ParentFees />} />
                <Route path="/parent/notices" element={<ParentNotices />} />
                <Route path="/parent/change-password" element={<ChangePasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["accountant"]}><DashboardLayout /></ProtectedRoute>}>
                <Route path="/accountant" element={<AccountantDashboard />} />
                <Route path="/accountant/fees" element={<AccountantFees />} />
                <Route path="/accountant/invoices" element={<AccountantInvoices />} />
                <Route path="/accountant/payments" element={<AccountantPayments />} />
                <Route path="/accountant/reports" element={<AccountantReports />} />
                <Route path="/accountant/change-password" element={<ChangePasswordPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
