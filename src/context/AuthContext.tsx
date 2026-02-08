// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import FullScreenLoader from "../components/FullScreenLoader";
import toast from "react-hot-toast";
import api from "../api/api";

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
  signup: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/* ================= PROVIDER ================= */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(token);
  const isAdmin = user?.role === "admin";

  /* ================= LOGOUT (used in restore) ================= */

  const logout = () => {
    setUser(null);
    setToken(null);

    delete api.defaults.headers.common.Authorization;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  /* ================= RESTORE SESSION ================= */

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const decoded = jwtDecode<JwtPayload>(savedToken);

        // token expired
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
        }
      } catch {
        logout();
      }
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= LOGIN ================= */

  const login = async (data: { email: string; password: string }) => {
    try {
      // ✅ use leading "/" for safety
      const res = await api.post("/auth/login", data);

      const { token: accessToken, user: userData } = res.data;

      setUser(userData);
      setToken(accessToken);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      return userData;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
      throw err;
    }
  };

  /* ================= SIGNUP ================= */

  const signup = async (data: { name: string; email: string; password: string }) => {
    try {
      // ✅ FIX: backend route is /api/auth/signup (NOT /register)
      await api.post("/auth/signup", data);

      toast.success("Signup successful! Please check your email to verify your account.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Signup failed");
      throw err;
    }
  };

  /* ================= CONTEXT VALUE ================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        login,
        signup,
        logout,
      }}
    >
      {loading ? <FullScreenLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
