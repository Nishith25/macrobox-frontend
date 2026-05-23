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
  phone?: string;
  role: "user" | "admin" | "delivery" | "chef";
  deliveryProfile?: {
    phone?: string;
    isActive?: boolean;
    approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };
};

type LoginPayload = {
  email: string;
  password: string;
};

type SignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: "user" | "delivery";
  phoneVerificationToken: string;
};

type JwtPayload = {
  exp: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDelivery: boolean;
  login: (data: LoginPayload) => Promise<User>;
  signup: (data: SignupPayload) => Promise<void>;
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
  const isDelivery = user?.role === "delivery";

  /* ================= LOGOUT ================= */

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

        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          const parsedUser = JSON.parse(savedUser);

          setToken(savedToken);
          setUser(parsedUser);

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

  const login = async (data: LoginPayload) => {
    try {
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

  const signup = async (data: SignupPayload) => {
    try {
      await api.post("/auth/signup", data);

      toast.success(
        "Signup successful! Please check your email to verify your account."
      );
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
        isDelivery,
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