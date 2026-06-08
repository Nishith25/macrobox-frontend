// frontend/src/pages/Home.tsx (FRONTEND)

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Flame,
  Leaf,
  Star,
  Target,
  Utensils,
  Zap,
} from "lucide-react";

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
    <main className="min-h-[calc(100vh-76px)] overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50">
      <section className="mx-auto flex min-h-[calc(100vh-156px)] max-w-[1240px] flex-col justify-center px-4 py-8 sm:px-6">
        {/* HERO */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              <Leaf size={15} />
              Science-backed nutrition for real results
            </div>

            <h1 className="max-w-3xl text-[48px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
              Fuel Your Day
              <br />
              <span className="text-green-600">with MacroBox</span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600">
              Goal-based meals for fat loss, muscle gain, weight gain and
              everyday clean eating — with complete calories, protein, carbs and
              fat tracking.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/meals"
                className="inline-flex h-13 items-center gap-2 rounded-[18px] bg-green-600 px-7 text-base font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
              >
                Explore Meals
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/macrotrack"
                className="inline-flex h-13 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-6 text-base font-black text-slate-900 shadow-sm transition hover:border-green-300 hover:bg-green-50"
              >
                <Zap size={18} className="text-green-600" />
                MacroTrack
              </Link>

              <Link
                to="/smart-day-planner"
                className="inline-flex h-13 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-6 text-base font-black text-slate-900 shadow-sm transition hover:border-green-300 hover:bg-green-50"
              >
                <CalendarCheck size={18} className="text-green-600" />
                Day Planner
              </Link>
            </div>

            <div className="mt-7 grid max-w-[560px] grid-cols-4 gap-3">
              <MiniStat icon={<Utensils size={18} />} value="200+" label="Curated Meals" />
              <MiniStat icon={<Target size={18} />} value="98%" label="Goal Achievement" />
              <MiniStat icon={<Star size={18} />} value="4.9★" label="App Rating" />
              <MiniStat icon={<CheckCircle2 size={18} />} value="100%" label="Dietitian Approved" />
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -left-24 top-0 rounded-[18px] bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <ArrowRight size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-400">This week</p>
                  <p className="text-sm font-black text-slate-900">
                    Goal on track 🎯
                  </p>
                </div>
              </div>
            </div>

            <div className="ml-auto max-w-[420px] rounded-[30px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-400">
                    Today's Progress
                  </p>
                  <p className="text-base font-black text-slate-900">
                    Muscle Gain Plan
                  </p>
                </div>

                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <Zap size={21} />
                </span>
              </div>

              <div className="rounded-[22px] bg-slate-50 p-5">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-green-600 text-sm font-black text-slate-950">
                    72%
                  </div>

                  <div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                      1,728
                    </p>
                    <p className="text-sm font-medium text-slate-400">
                      of 2,400 kcal
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <ProgressLine label="Protein" value="142g" width="82%" />
                <ProgressLine label="Carbs" value="198g" width="66%" />
                <ProgressLine label="Fat" value="48g" width="55%" />
              </div>

              <div className="mt-5 flex items-center justify-between rounded-[22px] border border-green-100 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Leaf size={18} />
                  </span>

                  <div>
                    <p className="text-sm font-black text-green-800">
                      Grilled Chicken Bowl
                    </p>
                    <p className="text-xs font-medium text-green-700">
                      Suggested for dinner · 520 kcal
                    </p>
                  </div>
                </div>

                <ArrowRight size={17} className="text-green-700" />
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="mt-10 border-t border-green-100 pt-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                How it works
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                From goal to results in 4 steps
              </h2>
            </div>

            <Link
              to="/meals"
              className="hidden rounded-[18px] bg-green-600 px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 md:inline-flex md:items-center md:gap-2"
            >
              Get Started
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <StepCard
              number="01"
              title="Set Your Goal"
              description="Tell us if you want to lose fat, build muscle, or maintain — we handle the math."
            />

            <StepCard
              number="02"
              title="Pick Your Meals"
              description="Browse 200+ chef-crafted meals filtered by your goal and daily macro budget."
            />

            <StepCard
              number="03"
              title="Track & Adjust"
              description="Log meals, watch your macro rings fill up, and get smart suggestions when you're off track."
            />

            <StepCard
              number="04"
              title="Reach Your Target"
              description="Consistent tracking + goal-aligned meals = real, measurable results."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[16px] border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
          {icon}
        </span>

        <div>
          <p className="text-lg font-black leading-none text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-medium leading-3 text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-bold text-slate-900">{value}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
          style={{ width }}
        />
      </div>
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
    <div className="min-h-[138px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-3xl font-black tracking-[-0.06em] text-green-100">
        {number}
      </p>

      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>

      <p className="mt-2 text-sm font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}