// frontend/src/api/api.ts (FRONTEND)

import axios from "axios";

// Normalize API base to include /api exactly once
const rawBase =
  import.meta.env.VITE_API_URL || "https://macrobox-backend.onrender.com/api";

const trimmedBase = String(rawBase).replace(/\/+$/, "");

export const API_BASE = trimmedBase.endsWith("/api")
  ? trimmedBase
  : `${trimmedBase}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

// Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("macrobox_token") ||
      "";

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Common auth error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const currentPath = window.location.pathname;

      const isAuthPage =
        currentPath === "/login" ||
        currentPath === "/signup" ||
        currentPath === "/deliverylogin" ||
        currentPath === "/cheflogin";

      if (!isAuthPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("macrobox_token");
      }
    }

    return Promise.reject(error);
  }
);

export default api;