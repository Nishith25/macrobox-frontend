import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(form);

      toast.success("Login successful!");
      navigate("/dashboard");

    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        "Login failed. Please try again.";

      // 🔒 Email not verified
      if (status === 403) {
        toast.error("Please verify your email before logging in.");
        navigate("/resend-verification");
        return;
      }

      // ❌ User not found
      if (status === 404) {
        toast.error("User not registered. Please sign up first.");
        navigate("/signup");
        return;
      }

      // ❌ Wrong password
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
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:outline-none"
          required
        />

        {/* Password */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:outline-none"
          required
        />

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-green-600 text-white py-3 rounded-lg font-medium transition ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot Password */}
        <p className="mt-4 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-green-600 hover:underline"
          >
            Forgot password?
          </button>
        </p>

        {/* Signup */}
        <p className="mt-2 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-green-600 hover:underline font-medium"
          >
            Sign Up
          </button>
        </p>
      </form>
    </div>
  );
}
