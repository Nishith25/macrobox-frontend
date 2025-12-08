import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const success = await login(form);
      if (success) navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>

        {error && (
          <p className="text-red-500 text-center mb-3 font-medium">{error}</p>
        )}

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
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
        >
          Login
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
