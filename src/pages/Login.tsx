// frontend/src/pages/Login.tsx (FRONTEND)

import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";

type LoggedInUser = {
  role: "user" | "admin" | "delivery" | "chef";
  onboarding?: {
    completed?: boolean;
  };
};

type LocationState = {
  from?: string;
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LocationState | null;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
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

    if (locationState?.from === "/cart") {
      navigate("/cart", { replace: true });
      return;
    }

    if (userData.role === "user" && !userData.onboarding?.completed) {
      navigate("/onboarding", { replace: true });
      return;
    }

    navigate(locationState?.from || "/meals", { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

      toast.success("Login successful.");
      redirectAfterLogin(userData as LoggedInUser);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";

      if (status === 403) {
        toast.error(message || "Verify your email before logging in.");

        navigate("/resend-verification", {
          replace: true,
          state: {
            email: form.email.trim().toLowerCase(),
          },
        });

        return;
      }

      if (status === 404) {
        toast.error("User not registered. Please create an account.");
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
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden">
      <div className="mb-theme-layer grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        {/* DESKTOP BRAND PANEL */}
        <section className="hidden px-8 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-outline-button inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-medium"
          >
            <X size={16} />
            Back to MacroBox
          </button>

          <div className="max-w-3xl py-12">
            <div className="mb-accent-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
              <Sparkles size={14} />
              Welcome back
            </div>

            <h1 className="mb-text mt-7 text-[68px] font-light leading-[0.95] tracking-[-0.075em] xl:text-[84px]">
              Fuel your day
              <br />
              with MacroBox.
            </h1>

            <p className="mb-text-muted mt-6 max-w-2xl text-lg leading-8">
              Sign in to order goal-based meals, track your macros, build smart
              day plans and manage your deliveries.
            </p>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <LoginFeature
                icon={<Flame size={17} />}
                title="Track"
                text="Calories and macros"
              />

              <LoginFeature
                icon={<Zap size={17} />}
                title="Plan"
                text="Your full food day"
              />

              <LoginFeature
                icon={<ShieldCheck size={17} />}
                title="Order"
                text="Securely and easily"
              />
            </div>
          </div>

          <p className="mb-text-faint text-xs">
            Healthy food built around your goals.
          </p>
        </section>

        {/* LOGIN PANEL */}
        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:border-l lg:border-[var(--mb-divider)] lg:bg-[var(--mb-bg-overlay)] lg:px-10">
          <div className="w-full max-w-[440px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Close login"
              >
                <X size={18} />
              </button>

              <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
                MacroBox
              </p>
            </div>

            <div className="mb-glass rounded-[28px] p-5 shadow-[var(--mb-shadow-large)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.18em]">
                    Secure access
                  </p>

                  <h1 className="mb-text mt-2 text-4xl font-light tracking-[-0.055em]">
                    Login
                  </h1>

                  <p className="mb-text-muted mt-3 text-sm leading-6">
                    New to MacroBox?{" "}
                    <Link
                      to="/signup"
                      state={{ from: locationState?.from }}
                      className="mb-accent font-medium hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>

                <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <Lock size={20} />
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
                <AuthField
                  icon={<Mail size={17} />}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                />

                <div className="relative">
                  <Lock
                    size={17}
                    className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="mb-input h-[54px] w-full rounded-2xl pl-12 pr-12 text-sm font-medium"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="mb-text-faint absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="mb-accent text-xs font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mb-primary-button inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="mb-divider border-t pt-4">
                  <p className="mb-text-faint text-[11px] leading-5">
                    By continuing, you agree to the{" "}
                    <span className="mb-text-soft">Terms & Conditions</span> and{" "}
                    <span className="mb-text-soft">Privacy Policy</span>.
                  </p>
                </div>
              </form>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden">
              <MobileTrust text="Secure payment" />
              <MobileTrust text="Goal-based meals" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthField({
  icon,
  type,
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type: string;
  name: string;
  autoComplete?: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <span className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
        {icon}
      </span>

      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="mb-input h-[54px] w-full rounded-2xl pl-12 pr-4 text-sm font-medium"
        required
      />
    </div>
  );
}

function LoginFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[20px] p-4">
      <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
        {icon}
      </span>

      <p className="mb-text mt-4 text-sm font-medium">{title}</p>
      <p className="mb-text-faint mt-1 text-xs">{text}</p>
    </div>
  );
}

function MobileTrust({ text }: { text: string }) {
  return (
    <div className="mb-glass-subtle flex items-center gap-2 rounded-[18px] p-3">
      <CheckCircle2 className="mb-accent shrink-0" size={14} />
      <span className="mb-text-muted text-[10px]">{text}</span>
    </div>
  );
}
