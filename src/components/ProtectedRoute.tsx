import { Navigate } from "react-router-dom";
import { useAuthStore, type UserRole } from "@/stores/authStore";

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const roleRedirects: Record<UserRole, string> = {
  super_admin: "/super-admin",
  principal: "/principal",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
  accountant: "/accountant",
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    const target = allowedRoles.includes("super_admin") ? "/super-admin-login" : "/login";
    return <Navigate to={target} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleRedirects[user.role] || "/login"} replace />;
  }

  return <>{children}</>;
}

export { roleRedirects };
