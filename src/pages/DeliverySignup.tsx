// frontend/src/pages/DeliverySignup.tsx (FRONTEND)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import toast from "react-hot-toast";

export default function DeliverySignup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
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

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    if (e.target.name === "phone") {
      setOtp("");
      setDevOtp("");
      setOtpSent(false);
      setPhoneVerified(false);
      setPhoneVerificationToken("");
    }
  };

  const sendOtp = async () => {
    if (!form.phone.trim()) {
      toast.error("Please enter phone number.");
      return;
    }

    try {
      setOtpLoading(true);

      const res = await api.post("/auth/send-phone-otp", {
        phone: form.phone.trim(),
      });

      setOtpSent(true);

      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }

      toast.success("OTP sent successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send OTP.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Please verify your phone number before signup.");
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone.trim(),
        role: "delivery",
        phoneVerificationToken,
      });

      toast.success(
        "Delivery partner signup successful! Please verify your email."
      );

      navigate("/deliverylogin");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Signup failed. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-6">
          Delivery Partner Signup
        </h2>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-3 rounded mb-4"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-3 rounded mb-4"
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full border p-3 rounded mb-3"
          required
        />

        <div className="mb-4">
          {!otpSent ? (
            <button
              type="button"
              onClick={sendOtp}
              disabled={otpLoading || !form.phone.trim()}
              className="w-full border border-green-600 text-green-700 py-3 rounded-lg font-semibold hover:bg-green-50 disabled:opacity-50"
            >
              {otpLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border p-3 rounded"
                disabled={phoneVerified}
              />

              {devOtp && !phoneVerified && (
                <p className="text-xs text-gray-500">
                  Dev OTP: <b>{devOtp}</b>
                </p>
              )}

              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpLoading || phoneVerified}
                className={`w-full py-3 rounded-lg font-semibold ${
                  phoneVerified
                    ? "bg-green-100 text-green-700"
                    : "border border-green-600 text-green-700 hover:bg-green-50"
                } disabled:opacity-70`}
              >
                {phoneVerified
                  ? "Phone Verified ✅"
                  : otpLoading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>

              {!phoneVerified && (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpLoading}
                  className="w-full text-sm text-green-700 hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          )}
        </div>

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border p-3 rounded mb-4"
          required
        />

        <button
          type="submit"
          disabled={loading || !phoneVerified}
          className={`w-full bg-green-600 text-white py-3 rounded-lg transition ${
            loading || !phoneVerified
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700"
          }`}
        >
          {loading ? "Creating Account..." : "Create Delivery Account"}
        </button>

        <p className="text-center text-gray-600 text-sm mt-4">
          Already a delivery partner?{" "}
          <a href="/deliverylogin" className="text-green-600 font-medium">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}