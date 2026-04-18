import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

// Resolve API base URL from env with deployment-safe defaults.
const getApiBaseUrl = () => {
  const envUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

  if (envUrl) {
    if (import.meta.env.PROD && /(localhost|127\.0\.0\.1)/i.test(envUrl)) {
      console.error("Invalid production VITE_API_URL detected (localhost). Falling back to relative /api.");
      return "/api";
    }

    return envUrl;
  }

  if (import.meta.env.PROD) {
    console.error("VITE_API_URL is not set for production. Falling back to relative /api.");
    return "/api";
  }

  return "http://localhost:3001/api";
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  code?: string;
  message: string;
  data?: T;
};

const API_BASE_URL = getApiBaseUrl();
const EXPECTED_401_AUTH_PATH_REGEX = /\/auth\/(login|super-admin\/login|refresh|register|forgot-password|reset-password|verify-email)(\/|$)/;

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("sc_device_id");
  if (deviceId) return deviceId;

  try {
    deviceId = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  } catch {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  localStorage.setItem("sc_device_id", deviceId);
  return deviceId;
};

const getRequestPath = (url?: string) => {
  if (!url) return "";

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname;
    }

    const base = API_BASE_URL.startsWith("http")
      ? API_BASE_URL
      : `${window.location.origin}${API_BASE_URL}`;
    return new URL(url, base).pathname;
  } catch {
    return url;
  }
};

const isExpectedAuth401Request = (config?: InternalAxiosRequestConfig) => {
  const path = getRequestPath(config?.url);
  return EXPECTED_401_AUTH_PATH_REGEX.test(path);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Add device ID header for security
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("sc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add stable device identity for session-bound refresh/auth checks.
  const deviceId = getOrCreateDeviceId();
  config.headers["x-device-id"] = deviceId;
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const backendCode = error.response?.data?.code;
    const backendMessage = error.response?.data?.message;

    if (error.response?.status === 401) {
      const shouldPassThrough401 = isExpectedAuth401Request(error.config);

      if (!shouldPassThrough401) {
        const refreshToken = localStorage.getItem("sc_refresh_token");
        if (refreshToken && error.config && !(error.config as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
          (error.config as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true;
          try {
            const deviceId = getOrCreateDeviceId();
            const res = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken, deviceId },
              { headers: { "x-device-id": deviceId } }
            );

            // Backend returns: { token, refreshToken } or { success: true, data: { token } }
            const responseData = res.data as Record<string, unknown>;
            let newToken: string | null = null;
            let newRefreshToken: string | null = null;

            // Handle both response formats
            if ('token' in responseData && responseData.token) {
              // Flat format: { token, refreshToken }
              newToken = String(responseData.token);
              if ('refreshToken' in responseData && responseData.refreshToken) {
                newRefreshToken = String(responseData.refreshToken);
              }
            } else if (responseData.success && responseData.data && typeof responseData.data === 'object') {
              // Wrapped format: { success: true, data: { token } }
              const data = responseData.data as Record<string, unknown>;
              if ('token' in data) {
                newToken = String(data.token);
              }
              if ('refreshToken' in data && data.refreshToken) {
                newRefreshToken = String(data.refreshToken);
              }
            }

            if (newToken) {
              localStorage.setItem("sc_token", newToken);
              if (newRefreshToken) {
                localStorage.setItem("sc_refresh_token", newRefreshToken);
              }
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return api(error.config);
            }
          } catch {
            // refresh failed
          }
        }

        localStorage.removeItem("sc_token");
        localStorage.removeItem("sc_refresh_token");
        let redirect = "/login";
        try {
          const raw = localStorage.getItem("sc_user");
          if (raw) {
            const u = JSON.parse(raw) as { role?: string };
            if (u.role === "super_admin") redirect = "/super-admin-login";
          }
        } catch {
          /* ignore */
        }
        localStorage.removeItem("sc_user");
        window.location.href = redirect;
      }

      return Promise.reject(error);
    }

    if (!error.response) {
      // network error (no response from server)
      toast.error("Network error: Please check your connection and try again.");
    } else if (error.response.status >= 500) {
      if (error.response.status === 503 && backendCode === "DB_UNAVAILABLE") {
        toast.error(backendMessage || "Database is temporarily unavailable. Please try again shortly.");
      } else {
        toast.error(backendMessage || "Server error: Please try again later.");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
