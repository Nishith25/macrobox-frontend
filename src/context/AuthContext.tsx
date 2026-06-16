// frontend/src/context/AuthContext.tsx

import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import FullScreenLoader from "../components/FullScreenLoader";
import toast from "react-hot-toast";
import api from "../api/api";

/* ================= TYPES ================= */

export type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating";

export type Onboarding = {
  completed?: boolean;
  completedAt?: string | null;
  currentStep?: number;
  goal?: GoalType | null;
  welcomeCouponShown?: boolean;
  waitlisted?: boolean;
  waitlistPincode?: string;
  waitlistedAt?: string | null;
};

export type BodyMetrics = {
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  gender?: "male" | "female";
  activity?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goalWeight?: number | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  locked?: boolean;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "delivery" | "chef";

  emailVerified?: boolean;
  isPhoneVerified?: boolean;

  onboarding?: Onboarding;
  bodyMetrics?: BodyMetrics;

  deliveryProfile?: {
    phone?: string;
    isActive?: boolean;
    approvalStatus?: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };

  chefProfile?: {
    phone?: string;
    isActive?: boolean;
    approvalStatus?: "pending" | "approved" | "rejected";
    rejectionReason?: string;
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
  role?: "user" | "delivery" | "chef";
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
  isChef: boolean;
  login: (data: LoginPayload) => Promise<User>;
  signup: (data: SignupPayload) => Promise<User | null>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshStoredUser: (freshUser?: User) => void;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/* ================= HELPERS ================= */

const isTokenExpired = (accessToken: string) => {
  try {
    const decoded = jwtDecode<JwtPayload>(accessToken);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

/* ================= PROVIDER ================= */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(token);
  const isAdmin = user?.role === "admin";
  const isDelivery = user?.role === "delivery";
  const isChef = user?.role === "chef";

  /* ================= SAVE SESSION ================= */

  const saveSession = (accessToken: string, userData: User) => {
    setUser(userData);
    setToken(accessToken);

    localStorage.setItem("token", accessToken);
    localStorage.setItem("macrobox_token", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  };

  /* ================= CLEAR SESSION ================= */

  const clearSession = () => {
    setUser(null);
    setToken(null);

    delete api.defaults.headers.common.Authorization;

    localStorage.removeItem("token");
    localStorage.removeItem("macrobox_token");
    localStorage.removeItem("user");
  };

  /* ================= UPDATE STORED USER ================= */

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;

      const merged: User = {
        ...prev,
        ...updatedUser,
        onboarding: {
          ...(prev.onboarding || {}),
          ...(updatedUser.onboarding || {}),
        },
        bodyMetrics: {
          ...(prev.bodyMetrics || {}),
          ...(updatedUser.bodyMetrics || {}),
        },
        deliveryProfile: {
          ...(prev.deliveryProfile || {}),
          ...(updatedUser.deliveryProfile || {}),
        },
        chefProfile: {
          ...(prev.chefProfile || {}),
          ...(updatedUser.chefProfile || {}),
        },
      };

      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  };

  const refreshStoredUser = (freshUser?: User) => {
    if (!freshUser) return;

    setUser(freshUser);
    localStorage.setItem("user", JSON.stringify(freshUser));
  };

  /* ================= LOGOUT ================= */

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout API error and clear local session anyway
    } finally {
      clearSession();
    }
  };

  /* ================= RESTORE SESSION ================= */

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken =
          localStorage.getItem("token") ||
          localStorage.getItem("macrobox_token") ||
          "";

        const savedUser = localStorage.getItem("user");

        if (!savedToken || !savedUser) {
          clearSession();
          return;
        }

        const parsedUser = JSON.parse(savedUser);

        if (!isTokenExpired(savedToken)) {
          setToken(savedToken);
          setUser(parsedUser);
          api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
          return;
        }

        const refreshRes = await api.post("/auth/refresh");
        const freshToken = refreshRes.data?.token;
        const freshUser = refreshRes.data?.user;

        if (!freshToken || !freshUser) {
          clearSession();
          return;
        }

        saveSession(freshToken, freshUser);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= LOGIN ================= */

  const login = async (data: LoginPayload) => {
    try {
      const res = await api.post("/auth/login", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      const { token: accessToken, user: userData } = res.data;

      if (!accessToken || !userData) {
        throw new Error("Invalid login response");
      }

      saveSession(accessToken, userData);

      return userData;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
      throw err;
    }
  };

  /* ================= SIGNUP ================= */

  const signup = async (data: SignupPayload) => {
    try {
      const res = await api.post("/auth/signup", {
        ...data,
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
      });

      const { token: accessToken, user: userData } = res.data;

      if (accessToken && userData) {
        saveSession(accessToken, userData);

        toast.success(
          res.data?.message || "Signup successful! Complete your MacroBox setup."
        );

        return userData;
      }

      toast.success(
        res.data?.message ||
          "Signup successful! Please check your email to verify your account."
      );

      return null;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Signup failed");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isDelivery,
        isChef,
        login,
        signup,
        logout,
        updateUser,
        refreshStoredUser,
      }}
    >
      {loading ? <FullScreenLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);