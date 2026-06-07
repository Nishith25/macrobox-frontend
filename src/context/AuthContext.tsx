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
  isChef: boolean;
  login: (data: LoginPayload) => Promise<User>;
  signup: (data: SignupPayload) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshStoredUser: (freshUser?: User) => void;
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
  const isChef = user?.role === "chef";

  const saveSession = (accessToken: string, userData: User) => {
    setUser(userData);
    setToken(accessToken);

    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;

      const merged = {
        ...prev,
        ...updatedUser,
        onboarding: {
          ...prev.onboarding,
          ...updatedUser.onboarding,
        },
        bodyMetrics: {
          ...prev.bodyMetrics,
          ...updatedUser.bodyMetrics,
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
    const res = await api.post("/auth/signup", data);

    const { token: accessToken, user: userData } = res.data;

    if (accessToken && userData) {
      setUser(userData);
      setToken(accessToken);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    }

    toast.success(
      res.data?.message || "Signup successful! Complete your MacroBox setup."
    );
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