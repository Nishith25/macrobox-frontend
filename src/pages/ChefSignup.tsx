import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import { ChefHat, Mail, Phone, ShieldCheck, User } from "lucide-react";

export default function ChefSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error("Please fill all fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/chef-signup", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });

      toast.success(
        "Chef signup successful. Verify email and wait for admin approval."
      );

      navigate("/cheflogin");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Chef signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_480px]">
        <div className="hidden lg:block">
          <p className="mb-3 inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            MacroBox Kitchen Team
          </p>

          <h1 className="max-w-xl text-5xl font-extrabold leading-tight text-gray-900">
            Manage fresh meal preparation with clear order stages.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-gray-600">
            Chefs can view incoming MacroBox orders and update kitchen status
            after admin approval.
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            <Feature text="View all customer orders in one kitchen dashboard." />
            <Feature text="Mark meals as Started Preparing and Prepared." />
            <Feature text="Admin approval keeps kitchen access secure." />
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6 text-center">
            <ChefHat className="mx-auto mb-3 text-orange-600" size={42} />
            <h2 className="text-3xl font-bold text-gray-900">Chef Signup</h2>
            <p className="mt-2 text-sm text-gray-500">
              Create a chef account and wait for admin approval.
            </p>
          </div>

          <div className="space-y-4">
            <Input icon={<User size={18} />} name="name" placeholder="Full Name" value={form.name} onChange={handleChange} />
            <Input icon={<Mail size={18} />} name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} />
            <Input icon={<Phone size={18} />} name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} />
            <Input icon={<ShieldCheck size={18} />} name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} />
            <Input icon={<ShieldCheck size={18} />} name="confirmPassword" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} />

            <button
              disabled={loading}
              className="h-12 w-full rounded-xl bg-orange-600 font-bold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Chef Account"}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already approved?{" "}
            <Link to="/cheflogin" className="font-bold text-orange-700">
              Chef Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Input({
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: any) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        name={name}
        value={value}
        type={type}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="h-12 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
      />
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 font-semibold text-gray-700 shadow-sm">
      {text}
    </div>
  );
}