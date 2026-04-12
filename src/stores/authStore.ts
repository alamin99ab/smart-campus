import { create } from "zustand";
import api, { type ApiResponse } from "@/lib/api";

export type UserRole = "super_admin" | "principal" | "teacher" | "student" | "parent" | "accountant";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolCode?: string;
  schoolName?: string;
  phone?: string;
  isApproved?: boolean;
  /** Platform Super Admin logged in via SUPER_ADMIN_* env (no DB user) */
  isEnvBased?: boolean;
  schoolDetails?: {
    schoolName: string;
    plan: string;
    subscriptionStatus: string;
    expiryDate?: Date;
  };
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    schoolCode?: string,
    options?: { superAdmin?: boolean }
  ) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const u = localStorage.getItem("sc_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem("sc_token"),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem("sc_token"),

  login: async (
    email: string,
    password: string,
    schoolCode?: string,
    options?: { superAdmin?: boolean }
  ) => {
    const isSuperAdminLogin = options?.superAdmin === true;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSchoolCode = typeof schoolCode === 'string' ? schoolCode.trim().toUpperCase() : schoolCode;

    if (!isSuperAdminLogin && (!normalizedSchoolCode || !normalizedSchoolCode.trim())) {
      throw new Error("School code is required for school users");
    }

    set({ isLoading: true });
    try {
      const endpoint = isSuperAdminLogin ? "/auth/super-admin/login" : "/auth/login";
      const res = await api.post(endpoint, { 
        email: normalizedEmail, 
        password, 
        ...(isSuperAdminLogin ? { isSuperAdminLogin: true } : { schoolCode: normalizedSchoolCode })
      });
      const responseData = res.data as Record<string, unknown>;

      // Backend login response format:
      // {
      //   success: true,
      //   message: "Login successful",
      //   data: {
      //     user: { _id, name, email, role, schoolCode, schoolName, isApproved, schoolDetails },
      //     token: "...",
      //     refreshToken: "...",
      //     deviceId: "..."
      //   }
      // }

      if (!responseData.success) {
        throw new Error(String(responseData.message || "Login failed"));
      }

      const data = responseData.data as Record<string, unknown>;
      if (!data) {
        throw new Error("Invalid response format from server");
      }

      // Extract token and refreshToken
      const token = String(data.token || '');
      const refreshToken = String(data.refreshToken || '');

      if (!token) {
        throw new Error("No authentication token received");
      }

      // Extract user data from data.user
      const userData = data.user as Record<string, unknown> | undefined;
      if (!userData) {
        throw new Error("No user data in response");
      }

      const user: User = {
        _id: String(userData._id || ''),
        name: String(userData.name || ''),
        email: String(userData.email || ''),
        role: String(userData.role || 'student') as UserRole,
        schoolCode: userData.schoolCode as string | undefined,
        schoolName: userData.schoolName as string | undefined,
        isApproved: userData.isApproved as boolean | undefined,
        phone: userData.phone as string | undefined,
        schoolDetails: userData.schoolDetails as User['schoolDetails'] | undefined,
        isEnvBased: userData.isEnvBased === true,
      };

      if (user.role === "super_admin" && !isSuperAdminLogin) {
        // Clear any partial login and force super admin portal usage
        localStorage.removeItem("sc_token");
        localStorage.removeItem("sc_refresh_token");
        localStorage.removeItem("sc_user");
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        throw new Error("Super Admin must sign in via /super-admin-login");
      }

      // Store in localStorage
      localStorage.setItem("sc_token", token);
      localStorage.setItem("sc_refresh_token", refreshToken);
      localStorage.setItem("sc_user", JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false });
      const axiosErr = err as {
        response?: { data?: { message?: string; code?: string } };
        message?: string;
      };
      const backendMessage = axiosErr.response?.data?.message;
      const backendCode = axiosErr.response?.data?.code;
      const normalizedError = new Error(backendMessage || axiosErr.message || "Login failed. Please try again.") as Error & { code?: string };
      if (backendCode) {
        normalizedError.code = backendCode;
      }
      throw normalizedError;
    }
  },

  logout: () => {
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_refresh_token");
    localStorage.removeItem("sc_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const res = await api.get<ApiResponse<User>>("/auth/profile");
      // Backend returns: { success: true, data: { ...userFields } }
      if (res.data.success && res.data.data) {
        const userData = res.data.data as Record<string, unknown>;
        // Map the response to our User type
        const user: User = {
          _id: String(userData._id || userData.id || ''),
          name: String(userData.name || ''),
          email: String(userData.email || ''),
          role: String(userData.role || 'student') as UserRole,
          schoolCode: userData.schoolCode as string | undefined,
          schoolName: userData.schoolName as string | undefined,
          phone: userData.phone as string | undefined,
          isApproved: userData.isApproved as boolean | undefined,
          isEnvBased: userData.isEnvBased === true,
        };
        localStorage.setItem("sc_user", JSON.stringify(user));
        set({ user, isAuthenticated: true });
      }
    } catch {
      // silent - token might be invalid
    }
  },

  setUser: (user: User) => {
    localStorage.setItem("sc_user", JSON.stringify(user));
    set({ user });
  },
}));
