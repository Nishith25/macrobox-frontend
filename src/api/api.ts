import axios from "axios";

// ------------------------------
//  BASE API INSTANCE
// ------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// ------------------------------
//  REQUEST INTERCEPTOR
//  → Adds JWT token automatically
// ------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ------------------------------
//  RESPONSE INTERCEPTOR
//  Auto-refresh expired token (Cookie-based)
// ------------------------------
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Cookie-based refresh (NO body)
        const response = await api.post("/auth/refresh");

        const newToken = response.data.token;
        localStorage.setItem("token", newToken);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ------------------------------
//  API ERROR PARSER
// ------------------------------
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) return error.response.data.message;

  if (error.response)
    return "Server error. Please try again later.";

  if (error.request)
    return "Cannot reach server. Check your network connection.";

  return "Unexpected error occurred.";
};

export default api;
