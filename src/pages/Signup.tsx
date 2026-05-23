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
  Mail,
  Phone,
  ShieldCheck,
  User,
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

  const phoneReady = form.phone.trim().length >= 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
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

      toast.success(
        "Signup successful! Please check your email to verify your account."
      );

      navigate("/login", { replace: true });
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_520px]">
        {/* LEFT SECTION */}
        <div className="hidden lg:block">
          <p className="mb-3 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Join MacroBox
          </p>

          <h1 className="max-w-xl text-5xl font-extrabold leading-tight text-gray-900">
            Build your meals around your real daily macros.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-gray-600">
            Create your account and start using MacroBox as a meal-ordering
            platform connected with your nutrition goals.
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            <Feature text="MacroTrack calculates how many calories, protein, carbs and fat you need each day." />
            <Feature text="Smart Day Planner helps you choose meals for fat loss, muscle gain, weight gain or maintenance." />
            <Feature text="Your orders carry full macro values, saved addresses and live delivery tracking." />
          </div>
        </div>

        {/* SIGNUP CARD */}
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-3xl border bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6 text-center">
            <p className="mx-auto mb-3 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              MacroBox Signup
            </p>

            <h2 className="text-3xl font-bold text-gray-900">
              Create Account
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Verify your phone number and create your MacroBox account.
            </p>
          </div>

          <div className="space-y-4">
            <InputWithIcon
              icon={<User size={18} />}
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
            />

            <InputWithIcon
              icon={<Mail size={18} />}
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
            />

            {/* PHONE + OTP */}
            <div className="rounded-2xl border bg-gray-50 p-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={phoneVerified}
                    className="h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>

                {!phoneVerified ? (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpLoading || !phoneReady}
                    className="h-12 rounded-xl border border-green-600 px-4 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpLoading && !otpSent
                      ? "Generating..."
                      : otpSent
                      ? "Regenerate"
                      : "Get OTP"}
                  </button>
                ) : (
                  <div className="flex h-12 items-center gap-1 rounded-xl bg-green-100 px-4 text-sm font-bold text-green-700">
                    <CheckCircle2 size={17} />
                    Verified
                  </div>
                )}
              </div>

              {otpSent && !phoneVerified && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="h-11 flex-1 rounded-xl border bg-white px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />

                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={otpLoading || !otp.trim()}
                    className="h-11 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpLoading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}

              {devOtp && !phoneVerified && (
                <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  Dev OTP: <span className="font-bold">{devOtp}</span>
                </div>
              )}

              {otpSent && !phoneVerified && (
                <p className="mt-2 text-xs text-gray-500">
                  {devOtp
                    ? "This is development OTP mode. Use the OTP shown above to continue."
                    : "OTP sent successfully. Please enter it to continue."}
                </p>
              )}

              {phoneVerified && (
                <p className="mt-2 text-xs font-medium text-green-700">
                  Phone number verified successfully.
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <ShieldCheck
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <InputWithIcon
              icon={<ShieldCheck size={18} />}
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
            />

            <button
              type="submit"
              disabled={loading || !phoneVerified}
              className="h-12 w-full rounded-xl bg-green-600 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-green-700">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
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
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>

      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        required
      />
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