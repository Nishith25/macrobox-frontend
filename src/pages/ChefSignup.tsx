// frontend/src/pages/ChefSignup.tsx (FRONTEND)

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UtensilsCrossed,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type ChefSignupForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function ChefSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ChefSignupForm>({
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
  const isPhoneValid = cleanPhone.length === 10;

  const passwordMatches =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const resetPhoneVerification = () => {
    setOtp("");
    setDevOtp("");
    setOtpSent(false);
    setPhoneVerified(false);
    setPhoneVerificationToken("");
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    if (name === "phone") {
      resetPhoneVerification();
    }
  };

  const sendOtp = async () => {
    if (!isPhoneValid) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/send-phone-otp", {
        phone: cleanPhone,
      });

      setOtp("");
      setOtpSent(true);
      setPhoneVerified(false);
      setPhoneVerificationToken("");

      setDevOtp(
        response.data?.devOtp ? String(response.data.devOtp) : ""
      );

      toast.success(response.data?.message || "OTP sent successfully.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!isPhoneValid) {
      toast.error("Enter a valid phone number.");
      return;
    }

    if (!otp.trim()) {
      toast.error("Enter the OTP sent to your phone.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/verify-phone-otp", {
        phone: cleanPhone,
        otp: otp.trim(),
      });

      const token = String(
        response.data?.phoneVerificationToken || ""
      );

      if (!token) {
        toast.error("Phone verification token was not received.");
        return;
      }

      setPhoneVerificationToken(token);
      setPhoneVerified(true);

      toast.success(
        response.data?.message || "Phone verified successfully."
      );
    } catch (error: any) {
      setPhoneVerified(false);
      setPhoneVerificationToken("");

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "OTP verification failed."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = cleanPhone;
    const password = form.password;

    if (!name || !email || !phone || !password || !form.confirmPassword) {
      toast.error("Please fill all fields.");
      return;
    }

    if (!isPhoneValid) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Verify your phone number before creating the account.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/chef-signup", {
        name,
        email,
        phone,
        password,
        phoneVerificationToken,
      });

      toast.success(
        "Chef account created. Verify your email and wait for admin approval."
      );

      navigate("/cheflogin", { replace: true });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Chef signup failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-white text-slate-950">
      <div className="grid h-full lg:grid-cols-[1.03fr_0.97fr]">
        {/* DESKTOP LEFT PANEL */}
        <section className="hidden h-full overflow-hidden bg-slate-950 text-white lg:block">
          <div className="flex h-full flex-col justify-between px-10 py-7 xl:px-14 xl:py-8">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-3 text-xl font-black tracking-[-0.04em] text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600">
                <ChefHat size={21} />
              </span>

              MacroBox Kitchen
            </Link>

            <div className="max-w-[620px]">
              <p className="text-xs font-black uppercase tracking-[0.42em] text-green-400">
                Join the Kitchen Team
              </p>

              <h1 className="mt-6 text-[52px] font-black leading-[0.94] tracking-[-0.07em] xl:text-[64px]">
                Prepare meals.
                <br />
                Manage orders.
                <br />
                <span className="text-green-400">Serve fresh.</span>
              </h1>

              <p className="mt-6 max-w-[540px] text-base font-semibold leading-8 text-slate-300">
                Create your chef account to manage kitchen orders, update
                preparation stages and keep every delivery on schedule.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FeatureCard
                icon={<ClipboardCheck size={18} />}
                label="Kitchen Orders"
              />

              <FeatureCard
                icon={<Flame size={18} />}
                label="Meal Preparation"
              />

              <FeatureCard
                icon={<UtensilsCrossed size={18} />}
                label="Status Updates"
              />
            </div>
          </div>
        </section>

        {/* SIGNUP PANEL */}
        <section className="h-full overflow-y-auto bg-white lg:overflow-hidden">
          <div className="mx-auto flex min-h-full w-full max-w-[590px] items-center px-4 py-4 sm:px-7 lg:px-8 lg:py-4">
            <div className="w-full">
              {/* MOBILE LOGO */}
              <div className="mb-4 lg:hidden">
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 text-xl font-black tracking-[-0.04em] text-slate-950"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                    <ChefHat size={19} />
                  </span>

                  MacroBox Kitchen
                </Link>
              </div>

              <div className="border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:px-7 sm:py-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <ShieldCheck size={21} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-green-600">
                      Kitchen Registration
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] text-slate-950 sm:text-[34px]">
                      Create Chef Account
                    </h1>

                    <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
                      Register, verify your phone and wait for admin approval.
                    </p>
                  </div>
                </div>

                <form onSubmit={submit} className="mt-5 space-y-3">
                  <Field label="Full Name">
                    <AuthInputShell icon={<User size={17} />}>
                      <input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        disabled={loading}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        required
                      />
                    </AuthInputShell>
                  </Field>

                  <Field label="Email Address">
                    <AuthInputShell icon={<Mail size={17} />}>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="chef@macrobox.com"
                        autoComplete="email"
                        disabled={loading}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        required
                      />
                    </AuthInputShell>
                  </Field>

                  <Field label="Phone Number">
                    <div className="flex gap-2">
                      <AuthInputShell
                        icon={<Phone size={17} />}
                        valid={phoneVerified}
                        className="min-w-0 flex-1"
                      >
                        <input
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="10-digit phone number"
                          autoComplete="tel"
                          inputMode="numeric"
                          disabled={loading || phoneVerified}
                          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                          required
                        />

                        {phoneVerified && (
                          <span className="flex h-full w-10 shrink-0 items-center justify-center text-green-600">
                            <CheckCircle2 size={17} />
                          </span>
                        )}
                      </AuthInputShell>

                      {!phoneVerified && (
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={otpLoading || loading || !isPhoneValid}
                          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-green-600 bg-white px-3 text-xs font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:text-sm"
                        >
                          {otpLoading && !otpSent ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : otpSent ? (
                            <RefreshCw size={15} />
                          ) : (
                            <Phone size={15} />
                          )}

                          {otpSent ? "Resend" : "Send OTP"}
                        </button>
                      )}
                    </div>
                  </Field>

                  {otpSent && !phoneVerified && (
                    <div className="rounded-xl border border-green-100 bg-green-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-950">
                            Verify Phone Number
                          </p>

                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            OTP sent to +91 {cleanPhone}
                          </p>
                        </div>

                        <ShieldCheck size={17} className="text-green-600" />
                      </div>

                      <div className="mt-2.5 flex gap-2">
                        <input
                          type="text"
                          value={otp}
                          onChange={(event) =>
                            setOtp(
                              event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            )
                          }
                          placeholder="Enter OTP"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={otpLoading}
                          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black tracking-[0.24em] text-slate-950 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-green-500 disabled:opacity-60"
                        />

                        <button
                          type="button"
                          onClick={verifyOtp}
                          disabled={otpLoading || !otp.trim()}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 text-xs font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {otpLoading ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Check size={15} />
                          )}

                          Verify
                        </button>
                      </div>

                      {devOtp && (
                        <p className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] font-bold text-yellow-800">
                          Development OTP:{" "}
                          <span className="font-black">{devOtp}</span>
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={otpLoading}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-green-700 hover:underline disabled:opacity-50"
                      >
                        <RefreshCw size={13} />
                        Send a new OTP
                      </button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Password">
                      <AuthInputShell icon={<LockKeyhole size={17} />}>
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Minimum 6 characters"
                          autoComplete="new-password"
                          disabled={loading}
                          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-xs placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                          required
                        />

                        <PasswordButton
                          visible={showPassword}
                          disabled={loading}
                          onClick={() =>
                            setShowPassword((current) => !current)
                          }
                        />
                      </AuthInputShell>
                    </Field>

                    <Field label="Confirm Password">
                      <AuthInputShell
                        icon={<LockKeyhole size={17} />}
                        valid={passwordMatches}
                      >
                        <input
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          disabled={loading}
                          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-xs placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                          required
                        />

                        {passwordMatches && (
                          <span className="flex h-full w-8 shrink-0 items-center justify-center text-green-600">
                            <CheckCircle2 size={16} />
                          </span>
                        )}

                        <PasswordButton
                          visible={showConfirmPassword}
                          disabled={loading}
                          onClick={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                        />
                      </AuthInputShell>
                    </Field>
                  </div>

                  {form.confirmPassword &&
                    form.password !== form.confirmPassword && (
                      <p className="-mt-1 text-[11px] font-bold text-red-600">
                        Passwords do not match.
                      </p>
                    )}

                  <div
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
                      phoneVerified
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {phoneVerified ? (
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                    ) : (
                      <ShieldCheck
                        size={17}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />
                    )}

                    <p
                      className={`text-[11px] font-bold leading-5 ${
                        phoneVerified
                          ? "text-green-800"
                          : "text-slate-500"
                      }`}
                    >
                      {phoneVerified
                        ? "Phone verified. Complete signup and wait for admin approval."
                        : "Phone verification is required before creating your chef account."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneVerified}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(22,163,74,0.2)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={17} />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Chef Account
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 border-t border-slate-200 pt-4 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    Already have chef access?{" "}
                    <Link
                      to="/cheflogin"
                      className="font-black text-green-700 transition hover:text-green-800 hover:underline"
                    >
                      Login to Kitchen
                    </Link>
                  </p>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
                © {new Date().getFullYear()} MacroBox Kitchen Portal
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function AuthInputShell({
  icon,
  children,
  valid = false,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  valid?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex h-11 w-full overflow-hidden rounded-xl border transition focus-within:border-green-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-green-100 ${
        valid
          ? "border-green-300 bg-green-50"
          : "border-slate-200 bg-slate-50"
      } ${className}`}
    >
      <span
        className={`flex h-full w-11 shrink-0 items-center justify-center border-r ${
          valid
            ? "border-green-200 text-green-600"
            : "border-slate-200 text-slate-400"
        }`}
      >
        {icon}
      </span>

      {children}
    </div>
  );
}

function PasswordButton({
  visible,
  disabled,
  onClick,
}: {
  visible: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={visible ? "Hide password" : "Show password"}
      className="flex h-full w-10 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
    >
      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}

function FeatureCard({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/15 text-green-400">
        {icon}
      </span>

      <p className="mt-2.5 text-sm font-black text-white">{label}</p>
    </div>
  );
}