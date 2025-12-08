import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import FullScreenLoader from "../components/FullScreenLoader";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type JwtPayload = {
  exp: number; // unix seconds
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: { email: string; password: string }) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = !!token;
  const isAdmin = user?.role === "admin";

  const scheduleRefresh = (accessToken: string, refreshTokenValue: string | null) => {
    if (!accessToken || !refreshTokenValue) return;

    try {
      const decoded = jwtDecode<JwtPayload>(accessToken);
      const expiresMs = decoded.exp * 1000 - Date.now();
      const refreshMs = expiresMs - 60_000; // 1 min before expiry

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      if (refreshMs > 0) {
        refreshTimeoutRef.current = window.setTimeout(() => {
          refreshAccessToken(refreshTokenValue);
        }, refreshMs);
      }
    } catch (err) {
      console.error("scheduleRefresh error:", err);
    }
  };

  const refreshAccessToken = async (refreshTokenValue: string) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/refresh`, {
        refreshToken: refreshTokenValue,
      });

      const newToken = res.data.token;
      setToken(newToken);
      localStorage.setItem("token", newToken);
      scheduleRefresh(newToken, refreshTokenValue);
    } catch (err) {
      console.error("Refresh token failed, logging out");
      logout();
    }
  };

  // Restore on first load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedRefresh = localStorage.getItem("refreshToken");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedRefresh && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefresh);
      setUser(JSON.parse(savedUser));
      scheduleRefresh(savedToken, savedRefresh);
    }

    setLoading(false);
  }, []);

  // LOGIN
  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      const accessToken = res.data.token;
      const refreshTokenValue = res.data.refreshToken;
      const userData = res.data.user;

      setUser(userData);
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshTokenValue);
      localStorage.setItem("user", JSON.stringify(userData));

      scheduleRefresh(accessToken, refreshTokenValue);

      return true;
    } catch (err: any) {
      console.error("Login error:", err?.response?.data || err);
      return false;
    }
  };

  // SIGNUP
  const signup = async (data: { name: string; email: string; password: string }) => {
    try {
      await axios.post(`${API_BASE}/api/auth/signup`, data);
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      return false;
    }
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
  };

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
