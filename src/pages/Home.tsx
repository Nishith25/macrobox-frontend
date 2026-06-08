// frontend/src/pages/Home.tsx (FRONTEND)

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Flame,
  ShieldCheck,
  Target,
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
    <main className="min-h-[calc(100vh-76px)] overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-156px)] max-w-[1240px] flex-col justify-center px-4 py-8 sm:px-6">
        <div className="grid items-center gap-10">
          <div>
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

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/meals"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-[18px] bg-green-600 px-8 text-base font-black text-white shadow-[0_18px_35px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
              >
                Explore Meals
                <ArrowRight size={20} />
              </Link>

              <Link
                to="/macrotrack"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-[18px] border border-slate-200 bg-white px-8 text-base font-black text-slate-950 shadow-sm transition hover:bg-slate-50"
              >
                <Zap size={20} className="text-green-600" />
                MacroTrack
              </Link>

              <Link
                to="/smart-day-planner"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-[18px] border border-slate-200 bg-white px-8 text-base font-black text-slate-950 shadow-sm transition hover:bg-slate-50"
              >
                <CalendarCheck size={20} className="text-green-600" />
                Day Planner
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-green-100 pt-8">
          <div className="mb-6 flex items-end justify-between gap-4">
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
              icon={<Target size={20} />}
              number="01"
              title="Set Your Goal"
              description="Tell us if you want to lose fat, build muscle, or maintain your body."
            />

            <StepCard
              icon={<Flame size={20} />}
              number="02"
              title="Pick Your Meals"
              description="Browse meals filtered by your goal and daily macro budget."
            />

            <StepCard
              icon={<Zap size={20} />}
              number="03"
              title="Track & Adjust"
              description="Log meals and adjust your food choices based on your daily targets."
            />

            <StepCard
              icon={<ShieldCheck size={20} />}
              number="04"
              title="Reach Your Target"
              description="Stay consistent with goal-aligned meals and simple tracking."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function StepCard({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[138px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-3xl font-black tracking-[-0.06em] text-green-100">
          {number}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700">
          {icon}
        </span>
      </div>

      <h3 className="text-base font-black text-slate-950">{title}</h3>

      <p className="mt-2 text-sm font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}