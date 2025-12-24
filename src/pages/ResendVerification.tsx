import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ResendVerification() {
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldown > 0 || loading) return;

    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/auth/resend-verification`, {
        email,
      });

      toast.success(res.data.message);

      // Start 60-sec cooldown
      setCooldown(60);

      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Could not send verification email";

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Resend Verification Email</h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter your email to receive a new verification link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL INPUT */}
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* BUTTON */}
          <button
            type="submit"
            disabled={cooldown > 0 || loading}
            className={`w-full py-2 text-white font-semibold rounded-lg transition ${
              cooldown > 0 || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading
              ? "Sending..."
              : cooldown > 0
              ? `Wait ${cooldown}s`
              : "Send Verification Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
