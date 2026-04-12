import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, type UserRole } from "@/stores/authStore";
import {
  LayoutDashboard, School, Users, BookOpen, GraduationCap, ClipboardList,
  Calendar, Bell, DollarSign, Settings, LogOut, Menu, X, UserCircle,
  FileText, BarChart3, Home, ChevronDown, UserCheck, Layers, BookMarked,
  ArrowUpDown, BellRing, Lock, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: React.ElementType; path: string };

const roleNavItems: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/super-admin" },
    { label: "Schools", icon: School, path: "/super-admin/schools" },
    { label: "Analytics", icon: BarChart3, path: "/super-admin/analytics" },
    { label: "Settings", icon: Settings, path: "/super-admin/settings" },
    { label: "Change Password", icon: Lock, path: "/super-admin/change-password" },
    { label: "Reset Password", icon: KeyRound, path: "/super-admin/reset-password" },
  ],
  principal: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/principal" },
    { label: "Classes", icon: Layers, path: "/principal/classes" },
    { label: "Subjects", icon: BookOpen, path: "/principal/subjects" },
    { label: "Teachers", icon: Users, path: "/principal/teachers" },
    { label: "Students", icon: GraduationCap, path: "/principal/students" },
    { label: "Parents", icon: UserCheck, path: "/principal/parents" },
    { label: "Attendance", icon: ClipboardList, path: "/principal/attendance" },
    { label: "Routine", icon: Calendar, path: "/principal/routine" },
    { label: "Exams", icon: FileText, path: "/principal/exams" },
    { label: "Results", icon: BookMarked, path: "/principal/results" },
    { label: "Promotion", icon: ArrowUpDown, path: "/principal/promotion" },
    { label: "Substitute Duty", icon: ClipboardList, path: "/principal/substitute-coverage" },
    { label: "Notices", icon: Bell, path: "/principal/notices" },
    { label: "Finance", icon: DollarSign, path: "/principal/finance" },
    { label: "Settings", icon: Settings, path: "/principal/settings" },
    { label: "Change Password", icon: Lock, path: "/principal/change-password" },
    { label: "Reset Password", icon: KeyRound, path: "/principal/reset-password" },
  ],
  teacher: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/teacher" },
    { label: "My Classes", icon: Layers, path: "/teacher/classes" },
    { label: "Attendance", icon: ClipboardList, path: "/teacher/attendance" },
    { label: "Substitute Duty", icon: ClipboardList, path: "/teacher/substitute-coverage" },
    { label: "Assignments", icon: FileText, path: "/teacher/assignments" },
    { label: "Marks Entry", icon: BookMarked, path: "/teacher/marks" },
    { label: "Profile", icon: UserCircle, path: "/teacher/profile" },
    { label: "Change Password", icon: Lock, path: "/teacher/change-password" },
  ],
  student: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student" },
    { label: "Attendance", icon: ClipboardList, path: "/student/attendance" },
    { label: "Routine", icon: Calendar, path: "/student/routine" },
    { label: "Assignments", icon: FileText, path: "/student/assignments" },
    { label: "Results", icon: BookMarked, path: "/student/results" },
    { label: "Notices", icon: Bell, path: "/student/notices" },
    { label: "Fees", icon: DollarSign, path: "/student/fees" },
    { label: "Profile", icon: UserCircle, path: "/student/profile" },
    { label: "Change Password", icon: Lock, path: "/student/change-password" },
  ],
  parent: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/parent" },
    { label: "Attendance", icon: ClipboardList, path: "/parent/attendance" },
    { label: "Results", icon: BookMarked, path: "/parent/results" },
    { label: "Fees", icon: DollarSign, path: "/parent/fees" },
    { label: "Notices", icon: Bell, path: "/parent/notices" },
    { label: "Change Password", icon: Lock, path: "/parent/change-password" },
  ],
  accountant: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/accountant" },
    { label: "Fee Structure", icon: DollarSign, path: "/accountant/fees" },
    { label: "Invoices", icon: FileText, path: "/accountant/invoices" },
    { label: "Payments", icon: DollarSign, path: "/accountant/payments" },
    { label: "Reports", icon: BarChart3, path: "/accountant/reports" },
    { label: "Change Password", icon: Lock, path: "/accountant/change-password" },
  ],
};

const roleTitles: Record<UserRole, string> = {
  super_admin: "Super Admin",
  principal: "Principal",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  const navItems = roleNavItems[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/30 z-40 lg:hidden animate-fade-in backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center gap-3 px-4 sm:px-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold font-heading truncate text-sidebar-foreground">Smart Campus</h1>
            <p className="text-[10px] text-sidebar-foreground/60">{roleTitles[user.role]}</p>
          </div>
          <button 
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded-lg hover:bg-sidebar-accent transition-colors" 
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive w-full transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sm:h-16 border-b bg-card flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors" 
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Page title for mobile - would be set by page */}
          <div className="lg:hidden flex-1 px-2" />
          
          <div className="hidden lg:block" />
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <div className="relative">
              <button 
                className="p-2 rounded-lg hover:bg-secondary transition-colors relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card rounded-xl shadow-lg border overflow-hidden animate-fade-in">
                  <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-3">
                    <p className="text-sm text-muted-foreground text-center py-4">No new notifications</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* User profile */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-medium leading-none truncate max-w-[120px]">{user.name}</p>
                <p className="text-xs text-muted-foreground">{roleTitles[user.role]}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
