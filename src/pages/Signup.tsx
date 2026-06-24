// frontend/src/pages/Signup.tsx (FRONTEND)

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const cleanPhone = form.phone.replace(/\D/g, "").slice(0, 10);
  const phoneReady = cleanPhone.length === 10;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    if (name === "phone") {
      setOtp("");
      setDevOtp("");
      setOtpSent(false);
      setPhoneVerified(false);
      setPhoneVerificationToken("");
    }
  };

  const sendOtp = async () => {
    if (!form.name.trim()) {
      toast.error("Enter your full name first.");
      return;
    }

    if (!phoneReady) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/send-phone-otp", {
        phone: cleanPhone,
        name: form.name.trim() || "MacroBox User",
      });

      setOtpSent(true);
      setOtp("");
      setPhoneVerified(false);
      setPhoneVerificationToken("");

      if (response.data?.devOtp) {
        setDevOtp(response.data.devOtp);
        toast.success("Development OTP generated.");
      } else {
        setDevOtp("");
        toast.success(response.data?.message || "OTP sent successfully.");
      }
    } catch (error: any) {
      setOtpSent(false);
      setDevOtp("");

      toast.error(
        error?.response?.data?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!cleanPhone || otp.trim().length !== 6) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/verify-phone-otp", {
        phone: cleanPhone,
        otp: otp.trim(),
      });

      setPhoneVerificationToken(
        response.data.phoneVerificationToken || ""
      );
      setPhoneVerified(true);

      toast.success("Phone verified successfully.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "OTP verification failed."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Enter your full name.");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Enter your email address.");
      return false;
    }

    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Verify your phone number before creating your account.");
      return false;
    }

    if (form.password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: cleanPhone,
        role: "user",
        phoneVerificationToken,
      });

      toast.success("Account created successfully.");
      navigate("/onboarding", { replace: true });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden">
      <div className="mb-theme-layer grid min-h-screen lg:grid-cols-[minmax(0,1fr)_580px]">
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
              Create your routine
            </div>

            <h1 className="mb-text mt-7 text-[64px] font-light leading-[0.96] tracking-[-0.075em] xl:text-[80px]">
              Build meals around
              <br />
              your daily macros.
            </h1>

            <p className="mb-text-muted mt-6 max-w-2xl text-lg leading-8">
              Create your MacroBox account to discover goal-based meals,
              complete meal plans and smarter daily food tracking.
            </p>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <SignupFeature
                icon={<Zap size={17} />}
                title="Personal"
                text="Meals around your goal"
              />

              <SignupFeature
                icon={<ShieldCheck size={17} />}
                title="Verified"
                text="Secure phone signup"
              />

              <SignupFeature
                icon={<CheckCircle2 size={17} />}
                title="Simple"
                text="Order and track easily"
              />
            </div>
          </div>

          <p className="mb-text-faint text-xs">
            One account for meals, plans, tracking and delivery.
          </p>
        </section>

        {/* SIGNUP PANEL */}
        <section className="flex min-h-screen items-start justify-center px-4 py-6 sm:px-6 sm:py-10 lg:border-l lg:border-[var(--mb-divider)] lg:bg-[var(--mb-bg-overlay)] lg:px-10">
          <div className="w-full max-w-[470px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Close signup"
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
                    Join MacroBox
                  </p>

                  <h1 className="mb-text mt-2 text-3xl font-light tracking-[-0.055em] sm:text-4xl">
                    Create account
                  </h1>

                  <p className="mb-text-muted mt-3 text-sm leading-6">
                    Already registered?{" "}
                    <Link
                      to="/login"
                      className="mb-accent font-medium hover:underline"
                    >
                      Login
                    </Link>
                  </p>
                </div>

                <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <User size={20} />
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
                <AuthInput
                  icon={<User size={17} />}
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                />

                <AuthInput
                  icon={<Mail size={17} />}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                />

                {/* PHONE */}
                <div className="overflow-hidden rounded-2xl border border-[var(--mb-border)] bg-[var(--mb-surface)]">
                  <div className="flex min-w-0">
                    <div className="relative min-w-0 flex-1">
                      <Phone
                        size={17}
                        className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                      />

                      <span className="mb-text-faint pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm">
                        +91
                      </span>

                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        name="phone"
                        placeholder="Phone number"
                        value={form.phone}
                        onChange={handleChange}
                        disabled={phoneVerified}
                        className="h-[54px] w-full min-w-0 bg-transparent pl-[76px] pr-3 text-sm font-medium text-[var(--mb-text)] outline-none placeholder:text-[var(--mb-muted-light)] disabled:opacity-60"
                        required
                      />
                    </div>

                    {!phoneVerified ? (
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={otpLoading || !phoneReady}
                        className="mb-divider min-w-[104px] shrink-0 border-l px-3 text-xs font-medium text-[var(--mb-accent-text)] transition hover:bg-white/5 disabled:opacity-40"
                      >
                        {otpLoading && !otpSent
                          ? "Sending..."
                          : otpSent
                            ? "Resend"
                            : "Get OTP"}
                      </button>
                    ) : (
                      <div className="mb-divider flex min-w-[112px] shrink-0 items-center justify-center gap-1 border-l bg-[var(--mb-accent-soft)] px-3 text-xs font-medium text-[var(--mb-accent-text)]">
                        <Check size={15} />
                        Verified
                      </div>
                    )}
                  </div>
                </div>

                {otpSent && !phoneVerified && (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      maxLength={6}
                      className="mb-input h-[52px] min-w-0 rounded-2xl px-4 text-sm font-medium tracking-[0.24em]"
                    />

                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpLoading || otp.trim().length !== 6}
                      className="mb-primary-button inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-40"
                    >
                      {otpLoading && (
                        <Loader2 className="animate-spin" size={16} />
                      )}
                      {otpLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                )}

                {devOtp && !phoneVerified && (
                  <InlineStatus type="warning">
                    Development OTP: <strong>{devOtp}</strong>
                  </InlineStatus>
                )}

                {otpSent && !phoneVerified && !devOtp && (
                  <InlineStatus type="neutral">
                    OTP sent. Enter the six-digit code to continue.
                  </InlineStatus>
                )}

                {phoneVerified && (
                  <InlineStatus type="success">
                    Phone number verified successfully.
                  </InlineStatus>
                )}

                {/* PASSWORD */}
                <PasswordInput
                  icon={<Lock size={17} />}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  visible={showPassword}
                  onToggle={() => setShowPassword((previous) => !previous)}
                />

                <PasswordInput
                  icon={<ShieldCheck size={17} />}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                />

                <button
                  type="submit"
                  disabled={loading || !phoneVerified}
                  className="mb-primary-button inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="mb-divider border-t pt-4">
                  <p className="mb-text-faint text-[11px] leading-5">
                    By creating an account, you accept the{" "}
                    <span className="mb-text-soft">Terms & Conditions</span> and{" "}
                    <span className="mb-text-soft">Privacy Policy</span>.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthInput({
  icon,
  type,
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  icon: ReactNode;
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

function PasswordInput({
  icon,
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
}: {
  icon: ReactNode;
  name: string;
  autoComplete?: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <span className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
        {icon}
      </span>

      <input
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="mb-input h-[54px] w-full rounded-2xl pl-12 pr-12 text-sm font-medium"
        required
      />

      <button
        type="button"
        onClick={onToggle}
        className="mb-text-faint absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function InlineStatus({
  type,
  children,
}: {
  type: "success" | "warning" | "neutral";
  children: ReactNode;
}) {
  const className =
    type === "success"
      ? "mb-success-message"
      : type === "warning"
        ? "mb-warning-badge"
        : "mb-glass-subtle mb-text-muted";

  return (
    <div className={`rounded-[18px] p-3 text-xs leading-5 ${className}`}>
      <div className="flex items-start gap-2">
        {type === "success" ? (
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        ) : (
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        )}

        <p>{children}</p>
      </div>
    </div>
  );
}

function SignupFeature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
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
