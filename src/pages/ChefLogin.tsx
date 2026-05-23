import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import { ChefHat, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ChefLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth() as any;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await api.post("/auth/chef-login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      if (setUser) setUser(res.data.user);

      toast.success("Chef login successful.");
      navigate("/orderslist", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Chef login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <ChefHat className="mx-auto mb-3 text-orange-600" size={44} />
          <h2 className="text-3xl font-extrabold text-gray-900">
            Chef Login
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Login after admin approval to manage kitchen orders.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              name="email"
              type="email"
              placeholder="Chef Email"
              value={form.email}
              onChange={handleChange}
              required
              className="h-12 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="h-12 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <button
            disabled={loading}
            className="h-12 w-full rounded-xl bg-orange-600 font-bold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login as Chef"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-gray-600">
          Need chef access?{" "}
          <Link to="/chefsignup" className="font-bold text-orange-700">
            Chef Signup
          </Link>
        </p>
      </form>
    </div>
  );
}