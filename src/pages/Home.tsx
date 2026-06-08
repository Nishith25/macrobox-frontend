// frontend/src/pages/Home.tsx (FRONTEND)

import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Flame, Leaf, ShieldCheck, Target } from "lucide-react";

/* ================= TYPES ================= */

export type Meal = {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  price: number;
  foodType: "veg" | "nonveg";
  isFeatured?: boolean;
};

/* ================= PAGE ================= */

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* HERO */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700">
            <Leaf size={16} />
            Fresh macro-balanced meals
          </div>

          <h1 className="max-w-3xl text-[46px] font-black leading-[1.05] tracking-[-0.06em] text-slate-950 sm:text-[64px]">
            Fuel Your Day with{" "}
            <span className="text-green-600">MacroBox</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">
            Goal-based meals for fat loss, muscle gain, weight gain and clean
            eating — with complete calories, protein, carbs and fat tracking.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/meals"
              className="inline-flex h-14 items-center gap-2 rounded-[18px] bg-green-600 px-7 text-base font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
            >
              Explore Meals
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/macrotrack"
              className="inline-flex h-14 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-7 text-base font-black text-slate-900 shadow-sm transition hover:border-green-300 hover:bg-green-50"
            >
              <Flame size={18} className="text-green-600" />
              MacroTrack
            </Link>

            <Link
              to="/smart-day-planner"
              className="inline-flex h-14 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-7 text-base font-black text-slate-900 shadow-sm transition hover:border-green-300 hover:bg-green-50"
            >
              <CalendarCheck size={18} className="text-green-600" />
              Day Planner
            </Link>
          </div>
        </div>

        {/* HERO CARD */}
        <div className="rounded-[32px] border border-green-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="overflow-hidden rounded-[26px] bg-green-50">
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80"
              alt="Healthy MacroBox meal"
              className="h-[360px] w-full object-cover"
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMacro label="Protein" value="35g" />
            <MiniMacro label="Calories" value="620" />
            <MiniMacro label="Carbs" value="68g" />
          </div>

          <div className="mt-5 rounded-[22px] border border-green-100 bg-green-50 p-4">
            <p className="text-sm font-black text-green-700">
              Balanced Paneer Meal
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              A clean, filling meal with protein, carbs and healthy fats.
            </p>
          </div>
        </div>
      </section>

      {/* WHY MACROBOX */}
      <section className="border-t border-green-100 bg-white/70 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
              Why MacroBox
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
              Built for fitness-focused eating
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon={<Target size={22} />}
              title="Goal-Based Meals"
              description="Choose meals based on fat loss, muscle gain, weight gain or everyday clean eating."
            />

            <FeatureCard
              icon={<Flame size={22} />}
              title="Complete Macro Tracking"
              description="Every meal includes calories, protein, carbs and fat for simple daily tracking."
            />

            <FeatureCard
              icon={<ShieldCheck size={22} />}
              title="Simple Healthy Ordering"
              description="Select your meal, add it to cart and plan your full day without confusion."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                How it works
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                From goal to meal in 3 steps
              </h2>
            </div>

            <Link
              to="/meals"
              className="inline-flex w-fit items-center gap-2 rounded-[18px] bg-green-600 px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
            >
              Get Started
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <StepCard
              number="01"
              title="Pick your goal"
              description="Choose fat loss, muscle gain, weight gain or clean eating."
            />

            <StepCard
              number="02"
              title="Choose your meals"
              description="Browse meals with complete macro details before ordering."
            />

            <StepCard
              number="03"
              title="Track and adjust"
              description="Use MacroTrack and Smart Day Planner to stay on target."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function MiniMacro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-slate-50 p-4 text-center">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
        {icon}
      </div>

      <h3 className="text-xl font-black text-slate-950">{title}</h3>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-4xl font-black tracking-[-0.06em] text-green-100">
        {number}
      </p>

      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}