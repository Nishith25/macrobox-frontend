// frontend/src/pages/Login.tsx (FRONTEND)

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail, X } from "lucide-react";

type LoggedInUser = {
  role: "user" | "admin" | "delivery" | "chef";
  onboarding?: {
    completed?: boolean;
  };
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const redirectAfterLogin = (userData: LoggedInUser) => {
    if (userData.role === "admin") {
      navigate("/admin/meals", { replace: true });
      return;
    }

    if (userData.role === "delivery") {
      navigate("/delivery", { replace: true });
      return;
    }

    if (userData.role === "chef") {
      navigate("/orderslist", { replace: true });
      return;
    }

    if (userData.role === "user" && !userData.onboarding?.completed) {
      navigate("/onboarding", { replace: true });
      return;
    }

    navigate("/meals", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    if (!form.password.trim()) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const userData = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      toast.success("Login successful!");
      redirectAfterLogin(userData as LoggedInUser);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";

      if (status === 403) {
        toast.error(message || "Please verify your email before logging in.");

        navigate("/resend-verification", {
          replace: true,
          state: { email: form.email.trim().toLowerCase() },
        });

        return;
      }

      if (status === 404) {
        toast.error("User not registered. Please sign up first.");
        navigate("/signup", { replace: true });
        return;
      }

      if (status === 400) {
        toast.error(message || "Incorrect email or password.");
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1500px] lg:grid-cols-[1fr_520px]">
        {/* LEFT SIDE - LANDING PREVIEW */}
        <section className="hidden px-10 py-12 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              <span className="text-lg">♨</span>
              Science-backed nutrition for real results
            </div>

            <h1 className="text-[64px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950">
              Fuel Your Day
              <br />
              <span className="text-green-600">with MacroBox</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">
              Login to explore meals, track macros, plan your day and manage
              your healthy orders.
            </p>
          </div>
        </section>

        {/* RIGHT SIDE LOGIN PANEL */}
        <section className="flex min-h-[calc(100vh-73px)] items-start justify-center bg-white px-5 py-8 shadow-[-24px_0_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12">
          <div className="w-full max-w-[430px]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
              aria-label="Close login"
            >
              <X size={24} />
            </button>

            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[34px] font-black tracking-[-0.04em] text-slate-950">
                  Login
                </h1>

                <p className="mt-2 text-base font-medium text-slate-700">
                  or{" "}
                  <Link
                    to="/signup"
                    className="font-black text-green-600 hover:underline"
                  >
                    create an account
                  </Link>
                </p>

                <div className="mt-5 h-[3px] w-12 rounded-full bg-slate-950" />
              </div>

              <div className="hidden h-24 w-24 items-center justify-center rounded-full bg-green-50 text-5xl sm:flex">
                🥗
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  className="h-16 w-full border border-slate-300 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-green-600"
                  required
                />
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="h-16 w-full border border-slate-300 bg-white pl-12 pr-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-green-600"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm font-black text-green-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full bg-green-600 text-sm font-black uppercase tracking-wide text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <p className="pt-1 text-xs font-medium leading-5 text-slate-600">
                By clicking on Login, I accept the{" "}
                <span className="font-black text-slate-950">
                  Terms & Conditions
                </span>{" "}
                &{" "}
                <span className="font-black text-slate-950">
                  Privacy Policy
                </span>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}