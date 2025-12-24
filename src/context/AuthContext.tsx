import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import FullScreenLoader from "../components/FullScreenLoader";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ================= TYPES ================= */

type User = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

type JwtPayload = {
  exp: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: { email: string; password: string }) => Promise<User>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/* ================= AXIOS INSTANCE ================= */

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/* ================= PROVIDER ================= */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = Boolean(token);
  const isAdmin = user?.role === "admin";

  /* ================= TOKEN REFRESH ================= */

  const scheduleRefresh = (
    accessToken: string,
    refreshTokenValue: string | null
  ) => {
    if (!accessToken || !refreshTokenValue) return;

    try {
      const decoded = jwtDecode<JwtPayload>(accessToken);
      const expiresMs = decoded.exp * 1000 - Date.now();
      const refreshMs = expiresMs - 60_000; // refresh 1 min early

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (refreshMs > 0) {
        refreshTimeoutRef.current = window.setTimeout(
          () => refreshAccessToken(refreshTokenValue),
          refreshMs
        );
      }
    } catch {
      logout();
    }
  };

  const refreshAccessToken = async (refreshTokenValue: string) => {
    try {
      const res = await api.post("/api/auth/refresh", {
        refreshToken: refreshTokenValue,
      });

      const newToken = res.data.token;

      setToken(newToken);
      localStorage.setItem("token", newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      scheduleRefresh(newToken, refreshTokenValue);
    } catch {
      toast.error("Session expired. Please login again.");
      logout();
    }
  };

  /* ================= RESTORE SESSION ================= */

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedRefresh = localStorage.getItem("refreshToken");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedRefresh && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefresh);
      setUser(JSON.parse(savedUser));

      api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      scheduleRefresh(savedToken, savedRefresh);
    }

    setLoading(false);
  }, []);

  /* ================= LOGIN ================= */

  const login = async (data: { email: string; password: string }) => {
    try {
      const res = await api.post("/api/auth/login", data);

      const {
        token: accessToken,
        refreshToken: refreshTokenValue,
        user: userData,
      } = res.data;

      setUser(userData);
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshTokenValue);
      localStorage.setItem("user", JSON.stringify(userData));

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      scheduleRefresh(accessToken, refreshTokenValue);

      return userData;
    } catch (err) {
      throw err; // IMPORTANT: let UI handle messages
    }
  };

  /* ================= SIGNUP ================= */

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      await api.post("/api/auth/signup", data);
    } catch (err) {
      throw err;
    }
  };

  /* ================= LOGOUT ================= */

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    delete api.defaults.headers.common.Authorization;

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
  };

  /* ================= CONTEXT VALUE ================= */

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <FullScreenLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
