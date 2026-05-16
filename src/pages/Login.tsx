// frontend/src/pages/Login.tsx (FRONTEND)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

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
    setForm({ ...form, [e.target.name]: e.target.value });
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
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      toast.success("Login successful!");
      navigate("/", { replace: true });
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";

      if (status === 403) {
        toast.error(message || "Please verify your email before logging in.");
        navigate("/resend-verification");
        return;
      }

      if (status === 404) {
        toast.error("User not registered. Please sign up first.");
        navigate("/signup");
        return;
      }

      if (status === 400) {
        toast.error("Incorrect email or password.");
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_460px]">
        {/* LEFT SECTION */}
        <div className="hidden lg:block">
          <p className="mb-3 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Welcome back to MacroBox
          </p>

          <h1 className="max-w-xl text-5xl font-extrabold leading-tight text-gray-900">
            Continue where your health goals left off.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-gray-600">
            Login to manage your meals, track your macros, plan your day, and
            follow your orders from checkout to delivery.
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            <Feature text="Resume MacroTrack and see today’s remaining calories, protein, carbs and fat." />
            <Feature text="Open your Smart Day Planner and build meals around your exact goal." />
            <Feature text="Track paid orders, delivery agent updates, ETA and live route in one place." />
          </div>
        </div>

        {/* LOGIN CARD */}
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-3xl border bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6 text-center">
            <p className="mx-auto mb-3 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              MacroBox Login
            </p>

            <h2 className="text-3xl font-bold text-gray-900">Login</h2>

            <p className="mt-2 text-sm text-gray-500">
              Access your MacroBox account securely.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="h-12 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                required
              />
            </div>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="h-12 w-full rounded-xl border pl-10 pr-12 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck size={14} className="text-green-600" />
                Secure login
              </div>

              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm font-semibold text-green-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-green-600 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link to="/signup" className="font-semibold text-green-700">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <CheckCircle2 size={20} className="shrink-0 text-green-600" />
      <p className="font-medium text-gray-700">{text}</p>
    </div>
  );
}