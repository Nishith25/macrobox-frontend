import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

// -------------------------------------
// BASE API INSTANCE
// -------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // needed for refresh cookie
});

// -------------------------------------
// REQUEST INTERCEPTOR
// Attach JWT automatically
// -------------------------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------
// TOKEN REFRESH QUEUE
// -------------------------------------
let isRefreshing = false;

type FailedRequest = {
  resolve: (token: string) => void;
  reject: (error: any) => void;
};

let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    error ? p.reject(error) : p.resolve(token!);
  });
  failedQueue = [];
};

// -------------------------------------
// RESPONSE INTERCEPTOR
// Auto refresh token on 401
// -------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Cookie-based refresh (NO body)
        const res = await api.post("/auth/refresh");
        const newToken = (res.data as { token: string }).token;

        localStorage.setItem("token", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// -------------------------------------
// OPTIONAL API ERROR PARSER
// -------------------------------------
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response) return "Server error. Please try again later.";
    if (error.request) return "Cannot reach server.";
  }
  return "Unexpected error occurred.";
};

export default api;
