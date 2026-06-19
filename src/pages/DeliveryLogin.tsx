// frontend/src/pages/DeliveryLogin.tsx (FRONTEND)

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Navigation,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";

type LoginForm = {
  email: string;
  password: string;
};

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const user = await login({
        email,
        password,
      });

      if (user?.role !== "delivery") {
        toast.error("This login is only for delivery partners.");
        return;
      }

      toast.success("Delivery login successful.");
      navigate("/delivery", { replace: true });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to log in. Check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-slate-200 bg-slate-950 text-white lg:flex">
          <div className="flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-3 text-xl font-black tracking-[-0.04em] text-white"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600">
                  <Truck size={21} />
                </span>

                MacroBox Delivery
              </Link>

              <div className="mt-20 max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-green-400">
                  Delivery Partner Portal
                </p>

                <h1 className="mt-6 text-6xl font-black leading-[0.94] tracking-[-0.07em]">
                  Deliver meals.
                  <br />
                  Track progress.
                  <br />
                  <span className="text-green-400">Serve better.</span>
                </h1>

                <p className="mt-6 max-w-lg text-base font-semibold leading-8 text-slate-300">
                  Accept available deliveries, update order status and share
                  your live location with MacroBox customers.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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

        <section className="flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-[470px]">
            <div className="mb-8 lg:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-3 text-xl font-black tracking-[-0.04em] text-slate-950"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
                  <Truck size={21} />
                </span>

                MacroBox Delivery
              </Link>
            </div>

            <div className="border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <ShieldCheck size={23} />
                </span>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-green-600">
                  Partner Access
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Delivery Partner Login
                </h1>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Log in to manage assigned deliveries and update customer
                  tracking.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <Field label="Email Address">
                  <div className="relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="partner@macrobox.com"
                      autoComplete="email"
                      disabled={loading}
                      className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-950 outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      required
                    />
                  </div>
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm font-bold text-slate-950 outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(22,163,74,0.22)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login to Dashboard
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-6 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  New delivery partner?{" "}
                  <Link
                    to="/deliverysignup"
                    className="font-black text-green-700 transition hover:text-green-800 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 border border-slate-200 bg-slate-50 p-4">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <p className="text-xs font-bold leading-5 text-slate-500">
                This portal is restricted to approved MacroBox delivery
                partners. Customer and admin accounts cannot log in here.
              </p>
            </div>

            <p className="mt-6 text-center text-xs font-bold text-slate-400">
              © {new Date().getFullYear()} MacroBox. Delivery Partner Portal.
            </p>
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
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function FeatureCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
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