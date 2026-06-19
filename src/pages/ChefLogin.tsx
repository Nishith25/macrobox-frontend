// frontend/src/pages/ChefLogin.tsx (FRONTEND)

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

type ChefLoginForm = {
  email: string;
  password: string;
};

export default function ChefLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth() as any;

  const [form, setForm] = useState<ChefLoginForm>({
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email) {
      toast.error("Enter your chef email.");
      return;
    }

    if (!password) {
      toast.error("Enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/chef-login", {
        email,
        password,
      });

      const token = response.data?.token;
      const chefUser = response.data?.user;

      if (!token || !chefUser) {
        toast.error("Invalid login response. Please try again.");
        return;
      }

      if (chefUser.role && chefUser.role !== "chef") {
        toast.error("This login is only for approved chefs.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(chefUser));

      if (setUser) {
        setUser(chefUser);
      }

      toast.success("Chef login successful.");
      navigate("/orderslist", { replace: true });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Chef login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-white text-slate-950">
      <div className="grid h-full lg:grid-cols-[1.05fr_0.95fr]">
        {/* DESKTOP LEFT PANEL */}
        <section className="hidden h-full overflow-hidden bg-slate-950 text-white lg:block">
          <div className="flex h-full flex-col justify-between px-10 py-8 xl:px-14">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-3 text-xl font-black tracking-[-0.04em] text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600">
                <ChefHat size={21} />
              </span>

              MacroBox Kitchen
            </Link>

            <div className="max-w-[620px]">
              <p className="text-xs font-black uppercase tracking-[0.42em] text-green-400">
                Chef Operations Portal
              </p>

              <h1 className="mt-6 text-[52px] font-black leading-[0.94] tracking-[-0.07em] xl:text-[64px]">
                Prepare meals.
                <br />
                Manage orders.
                <br />
                <span className="text-green-400">Serve fresh.</span>
              </h1>

              <p className="mt-6 max-w-[540px] text-base font-semibold leading-8 text-slate-300">
                Manage kitchen orders, prepare meals on schedule and keep every
                MacroBox delivery moving on time.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FeatureCard
                icon={<ClipboardCheck size={18} />}
                label="Kitchen Orders"
              />

              <FeatureCard
                icon={<Flame size={18} />}
                label="Meal Preparation"
              />

              <FeatureCard
                icon={<UtensilsCrossed size={18} />}
                label="Order Updates"
              />
            </div>
          </div>
        </section>

        {/* LOGIN PANEL */}
        <section className="h-full overflow-y-auto bg-white lg:overflow-hidden">
          <div className="mx-auto flex min-h-full w-full max-w-[560px] items-center px-4 py-5 sm:px-7 lg:px-9">
            <div className="w-full">
              {/* MOBILE LOGO */}
              <div className="mb-6 lg:hidden">
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 text-xl font-black tracking-[-0.04em] text-slate-950"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                    <ChefHat size={19} />
                  </span>

                  MacroBox Kitchen
                </Link>
              </div>

              <div className="border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <ShieldCheck size={23} />
                  </span>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-green-600">
                    Kitchen Access
                  </p>

                  <h1 className="mt-3 text-3xl font-black tracking-[-0.055em] text-slate-950 sm:text-4xl">
                    Chef Login
                  </h1>

                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    Log in after admin approval to view and manage kitchen
                    orders.
                  </p>
                </div>

                <form onSubmit={submit} className="mt-7 space-y-5">
                  <Field label="Chef Email">
                    <AuthInputShell icon={<Mail size={18} />}>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="chef@macrobox.com"
                        autoComplete="email"
                        disabled={loading}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        required
                      />
                    </AuthInputShell>
                  </Field>

                  <Field label="Password">
                    <AuthInputShell icon={<LockKeyhole size={18} />}>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        disabled={loading}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="flex h-full w-11 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </AuthInputShell>
                  </Field>

                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-xs font-bold leading-5 text-slate-500">
                      Only chefs approved by the MacroBox admin can access
                      kitchen orders.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(22,163,74,0.22)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login to Kitchen
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-200 pt-6 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    Need chef access?{" "}
                    <Link
                      to="/chefsignup"
                      className="font-black text-green-700 transition hover:text-green-800 hover:underline"
                    >
                      Create a chef account
                    </Link>
                  </p>
                </div>
              </div>

              <p className="mt-5 text-center text-xs font-bold text-slate-400">
                © {new Date().getFullYear()} MacroBox Kitchen Portal
              </p>
            </div>
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
  children: ReactNode;
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

function AuthInputShell({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-12 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-green-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-green-100">
      <span className="flex h-full w-12 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400">
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
    <div className="border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/15 text-green-400">
        {icon}
      </span>

      <p className="mt-2.5 text-sm font-black text-white">{label}</p>
    </div>
  );
}