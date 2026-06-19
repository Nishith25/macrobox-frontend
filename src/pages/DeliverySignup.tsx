// frontend/src/pages/DeliverySignup.tsx (FRONTEND)

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
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

type SignupForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export default function DeliverySignup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState<SignupForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const cleanPhoneNumber = form.phone.replace(/\D/g, "").slice(0, 10);
  const isValidPhone = cleanPhoneNumber.length === 10;

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
      setOtp("");
      setDevOtp("");
      setOtpSent(false);
      setPhoneVerified(false);
      setPhoneVerificationToken("");
    }
  };

  const sendOtp = async () => {
    if (!isValidPhone) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/send-phone-otp", {
        phone: cleanPhoneNumber,
      });

      setOtp("");
      setOtpSent(true);
      setPhoneVerified(false);
      setPhoneVerificationToken("");
      setShowOtpModal(true);

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
    if (!otp.trim()) {
      toast.error("Enter the OTP sent to your phone.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/verify-phone-otp", {
        phone: cleanPhoneNumber,
        otp: otp.trim(),
      });

      const token = response.data?.phoneVerificationToken || "";

      if (!token) {
        toast.error("Phone verification token was not received.");
        return;
      }

      setPhoneVerificationToken(token);
      setPhoneVerified(true);
      setShowOtpModal(false);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name) {
      toast.error("Enter your full name.");
      return;
    }

    if (!email) {
      toast.error("Enter your email address.");
      return;
    }

    if (!isValidPhone) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return;
    }

    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Verify your phone number before creating the account.");
      return;
    }

    try {
      setLoading(true);

      await signup({
        name,
        email,
        phone: cleanPhoneNumber,
        password,
        role: "delivery",
        phoneVerificationToken,
      });

      toast.success(
        "Delivery account created. Please verify your email before logging in."
      );

      navigate("/deliverylogin", { replace: true });
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
    <main className="h-dvh overflow-hidden bg-white text-slate-950">
      <div className="grid h-full lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT SIDE */}
        <section className="hidden h-full border-r border-slate-800 bg-[#020617] text-white lg:flex">
          <div className="flex h-full w-full flex-col justify-between px-10 py-8 xl:px-14 xl:py-10">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-3 text-xl font-black tracking-[-0.04em] text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600">
                <Truck size={21} />
              </span>

              MacroBox Delivery
            </Link>

            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.4em] text-green-400">
                Join the Delivery Team
              </p>

              <h1 className="mt-5 text-5xl font-black leading-[0.94] tracking-[-0.07em] xl:text-6xl">
                Deliver meals.
                <br />
                Track progress.
                <br />
                <span className="text-green-400">Serve better.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-slate-300">
                Join the MacroBox delivery network, accept delivery orders and
                keep customers updated with live location tracking.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FeatureCard
                icon={<PackageCheck size={18} />}
                label="Accept Orders"
              />

              <FeatureCard
                icon={<Navigation size={18} />}
                label="Live Tracking"
              />

              <FeatureCard
                icon={<MapPin size={18} />}
                label="Easy Navigation"
              />
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex h-full items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-[470px]">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-3 text-lg font-black tracking-[-0.04em] text-slate-950 lg:hidden"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                <Truck size={19} />
              </span>

              MacroBox Delivery
            </Link>

            <div className="border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <ShieldCheck size={21} />
                </span>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-green-600">
                    Partner Registration
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">
                    Create Partner Account
                  </h1>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                    Enter your details and verify your phone number.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                <Field label="Full Name">
                  <InputContainer icon={<User size={17} />}>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={loading}
                      className="delivery-auth-input delivery-auth-input-left"
                      required
                    />
                  </InputContainer>
                </Field>

                <Field label="Email Address">
                  <InputContainer icon={<Mail size={17} />}>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="partner@macrobox.com"
                      autoComplete="email"
                      disabled={loading}
                      className="delivery-auth-input delivery-auth-input-left"
                      required
                    />
                  </InputContainer>
                </Field>

                <Field label="Phone Number">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Phone
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit phone number"
                        autoComplete="tel"
                        inputMode="numeric"
                        disabled={loading || phoneVerified}
                        className={`delivery-auth-input delivery-auth-input-left delivery-auth-input-right ${
                          phoneVerified
                            ? "border-green-300 bg-green-50 text-green-800"
                            : ""
                        }`}
                        required
                      />

                      {phoneVerified && (
                        <CheckCircle2
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600"
                        />
                      )}
                    </div>

                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={otpLoading || loading || !isValidPhone}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-green-600 bg-white px-3 text-xs font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                      >
                        {otpLoading ? (
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

                <Field label="Password">
                  <div className="relative">
                    <LockKeyhole
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      disabled={loading}
                      className="delivery-auth-input delivery-auth-input-left delivery-auth-input-right"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </Field>

                <div
                  className={`flex items-start gap-2 rounded-xl border p-3 ${
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
                    className={`text-xs font-bold leading-5 ${
                      phoneVerified ? "text-green-800" : "text-slate-500"
                    }`}
                  >
                    {phoneVerified
                      ? "Phone verified. You can create your delivery account."
                      : "Phone verification is required before creating your account."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !phoneVerified}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(22,163,74,0.22)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Delivery Account
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 border-t border-slate-200 pt-4 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  Already a delivery partner?{" "}
                  <Link
                    to="/deliverylogin"
                    className="font-black text-green-700 hover:underline"
                  >
                    Login to Dashboard
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
              © {new Date().getFullYear()} MacroBox Delivery Partner Portal
            </p>
          </div>
        </section>
      </div>

      {showOtpModal && (
        <OtpModal
          phone={cleanPhoneNumber}
          otp={otp}
          setOtp={setOtp}
          devOtp={devOtp}
          loading={otpLoading}
          onVerify={verifyOtp}
          onResend={sendOtp}
          onClose={() => setShowOtpModal(false)}
        />
      )}
    </main>
  );
}

function OtpModal({
  phone,
  otp,
  setOtp,
  devOtp,
  loading,
  onVerify,
  onResend,
  onClose,
}: {
  phone: string;
  otp: string;
  setOtp: (value: string) => void;
  devOtp: string;
  loading: boolean;
  onVerify: () => void;
  onResend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
      <button
        type="button"
        aria-label="Close OTP verification"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 w-full max-w-[410px] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
            <ShieldCheck size={21} />
          </span>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
          Verify Phone Number
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Enter the OTP sent to +91 {phone}.
        </p>

        <input
          type="text"
          value={otp}
          onChange={(event) =>
            setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="Enter OTP"
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={loading}
          autoFocus
          className="mt-5 h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black tracking-[0.4em] text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
        />

        {devOtp && (
          <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
            <p className="text-xs font-bold text-yellow-800">
              Development OTP:{" "}
              <span className="font-black">{devOtp}</span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onVerify}
          disabled={loading || !otp.trim()}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={17} />
              Verifying...
            </>
          ) : (
            <>
              <Check size={17} />
              Verify OTP
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 text-sm font-black text-green-700 hover:underline disabled:opacity-50"
        >
          <RefreshCw size={15} />
          Resend OTP
        </button>
      </section>
    </div>
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

function InputContainer({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        {icon}
      </span>

      {children}
    </div>
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
    <div className="border border-white/10 bg-white/5 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/15 text-green-400">
        {icon}
      </span>

      <p className="mt-3 text-sm font-black text-white">{label}</p>
    </div>
  );
}