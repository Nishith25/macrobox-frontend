// frontend/src/api/api.ts (FRONTEND)
import axios from "axios";

// Normalize API base to include /api exactly once
const rawBase =
  import.meta.env.VITE_API_URL ||
  "https://macrobox-backend.onrender.com/api";

const trimmedBase = rawBase.replace(/\/+$/, "");

export const API_BASE = trimmedBase.endsWith("/api")
  ? trimmedBase
  : `${trimmedBase}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// 🔐 Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;