// frontend/src/pages/Signup.tsx (FRONTEND)

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

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

  const phoneReady = form.phone.replace(/\D/g, "").length >= 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
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
    if (!phoneReady) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    try {
      setOtpLoading(true);

      const res = await api.post("/auth/send-phone-otp", {
        phone: form.phone.trim(),
        name: form.name.trim() || "MacroBox User",
      });

      setOtpSent(true);
      setOtp("");
      setPhoneVerified(false);
      setPhoneVerificationToken("");

      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
        toast.success("Dev OTP generated successfully.");
      } else {
        setDevOtp("");
        toast.success(res.data?.message || "OTP sent successfully.");
      }
    } catch (error: any) {
      setOtpSent(false);
      setDevOtp("");

      toast.error(
        error?.response?.data?.message ||
          "Failed to generate OTP. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!form.phone.trim() || !otp.trim()) {
      toast.error("Please enter OTP.");
      return;
    }

    try {
      setOtpLoading(true);

      const res = await api.post("/auth/verify-phone-otp", {
        phone: form.phone.trim(),
        otp: otp.trim(),
      });

      setPhoneVerificationToken(res.data.phoneVerificationToken);
      setPhoneVerified(true);

      toast.success("Phone verified successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "OTP verification failed.");
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Please enter your full name.");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Please enter your email.");
      return false;
    }

    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Please verify your phone number before signup.");
      return false;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        role: "user",
        phoneVerificationToken,
      });

      toast.success("Account created successfully!");
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
    <main className="min-h-[calc(100vh-73px)] bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1500px] lg:grid-cols-[1fr_560px]">
        {/* LEFT SIDE */}
        <section className="hidden px-10 py-12 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-3xl">
            

            <h1 className="text-[60px] font-black leading-[1.02] tracking-[-0.07em] text-slate-950">
              Build your meals around
              <br />
              <span className="text-green-600">your daily macros.</span>
            </h1>

            

            
          </div>
        </section>

        {/* RIGHT SIDE SIGNUP PANEL */}
        <section className="flex min-h-[calc(100vh-73px)] items-start justify-center bg-white px-5 py-8 shadow-[-24px_0_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12">
          <div className="w-full max-w-[450px]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-8 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
              aria-label="Close signup"
            >
              <X size={24} />
            </button>

            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[34px] font-black tracking-[-0.04em] text-slate-950">
                  Create Account
                </h1>

                <p className="mt-2 text-base font-medium text-slate-700">
                  or{" "}
                  <Link
                    to="/login"
                    className="font-black text-green-600 hover:underline"
                  >
                    login to your account
                  </Link>
                </p>

                <div className="mt-5 h-[3px] w-12 rounded-full bg-slate-950" />
              </div>

              <div className="hidden h-24 w-24 items-center justify-center rounded-full bg-green-50 text-5xl sm:flex">
                🥗
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <InputWithIcon
                icon={<User size={18} />}
                type="text"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
              />

              <InputWithIcon
                icon={<Mail size={18} />}
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
              />

              <div className="border border-slate-300 bg-white">
                <div className="flex">
                  <div className="relative flex-1">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone number"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={phoneVerified}
                      className="h-16 w-full border-0 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-500 disabled:bg-slate-50"
                      required
                    />
                  </div>

                  {!phoneVerified ? (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading || !phoneReady}
                      className="min-w-[116px] border-l border-slate-300 px-4 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {otpLoading && !otpSent
                        ? "Sending..."
                        : otpSent
                        ? "Resend"
                        : "Get OTP"}
                    </button>
                  ) : (
                    <div className="flex min-w-[120px] items-center justify-center gap-1 border-l border-slate-300 bg-green-50 px-4 text-sm font-black text-green-700">
                      <CheckCircle2 size={17} />
                      Verified
                    </div>
                  )}
                </div>
              </div>

              {otpSent && !phoneVerified && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    className="h-14 flex-1 border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-green-600"
                  />

                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={otpLoading || otp.trim().length !== 6}
                    className="h-14 bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpLoading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}

              {devOtp && !phoneVerified && (
                <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800">
                  Dev OTP: <span className="font-black">{devOtp}</span>
                </div>
              )}

              {otpSent && !phoneVerified && (
                <p className="text-xs font-medium text-slate-500">
                  {devOtp
                    ? "This is development OTP mode. Use the OTP shown above to continue."
                    : "OTP sent successfully. Please enter it to continue."}
                </p>
              )}

              {phoneVerified && (
                <p className="text-xs font-black text-green-700">
                  Phone number verified successfully.
                </p>
              )}

              <PasswordInput
                icon={<Lock size={18} />}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />

              <InputWithIcon
                icon={<ShieldCheck size={18} />}
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
              />

              <button
                type="submit"
                disabled={loading || !phoneVerified}
                className="h-14 w-full bg-green-600 text-sm font-black uppercase tracking-wide text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <p className="pt-1 text-xs font-medium leading-5 text-slate-600">
                By clicking on Create Account, I accept the{" "}
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

function InputWithIcon({
  icon,
  type,
  name,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </div>

      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-16 w-full border border-slate-300 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-green-600"
        required
      />
    </div>
  );
}

function PasswordInput({
  icon,
  name,
  placeholder,
  value,
  onChange,
  showPassword,
  setShowPassword,
}: {
  icon: React.ReactNode;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </div>

      <input
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-16 w-full border border-slate-300 bg-white pl-12 pr-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-green-600"
        required
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}

