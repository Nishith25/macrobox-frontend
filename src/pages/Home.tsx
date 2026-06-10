// frontend/src/pages/Home.tsx (FRONTEND)

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Flame,
  Gift,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goProtected = (path: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate(path);
  };

  return (
    <main className="min-h-[calc(100vh-76px)] overflow-x-hidden bg-gradient-to-br from-green-50 via-white to-green-50 text-slate-950">
      <section className="mx-auto flex max-w-[1240px] flex-col justify-center px-5 py-10 sm:px-6 lg:py-16">
        {/* HERO */}
        <div className="grid items-center gap-10">
          <div>
            <h1 className="mx-auto max-w-3xl text-center text-[48px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:mx-0 sm:text-left sm:text-[64px]">
              Fuel Your Day
              <br />
              <span className="text-green-600">with MacroBox</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-center text-[17px] font-medium leading-8 text-slate-600 sm:mx-0 sm:text-left sm:text-lg">
              Goal-based meals for fat loss, muscle gain, weight gain and
              everyday clean eating — with complete calories, protein, carbs and
              fat tracking.
            </p>

            {/* MAIN ACTION BUTTONS - SINGLE LINE */}
            <div className="mx-auto mt-8 grid w-full max-w-[420px] grid-cols-1 gap-3 sm:mx-0 sm:max-w-none sm:grid-cols-2 lg:flex lg:flex-nowrap lg:items-center">
              <button
                type="button"
                onClick={() => navigate("/meals")}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-[18px] bg-green-600 px-7 text-sm font-black text-white shadow-[0_18px_35px_rgba(22,163,74,0.25)] transition hover:bg-green-700 lg:w-auto"
              >
                Explore Meals
                <ArrowRight size={19} />
              </button>

              <button
                type="button"
                onClick={() => goProtected("/challenges")}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-[18px] border border-green-200 bg-white px-7 text-sm font-black text-green-700 shadow-sm transition hover:bg-green-50 lg:w-auto"
              >
                <Trophy size={18} />
                7-Day Challenge
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => goProtected("/macrotrack")}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-7 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 lg:w-auto"
              >
                <Zap size={18} className="text-green-600" />
                MacroTrack
              </button>

              <button
                type="button"
                onClick={() => goProtected("/smart-day-planner")}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-7 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 lg:w-auto"
              >
                <CalendarCheck size={18} className="shrink-0 text-green-600" />
                Smart Day Planner
              </button>
            </div>
          </div>
        </div>

        {/* ₹99 TRIAL BOWL */}
        <div className="mt-10 rounded-[26px] border border-green-200 bg-green-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-green-700">
                <Gift size={16} />
                Launch Offer
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                Try MacroBox ₹99 Trial Bowl
              </h2>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Choose your first goal-based protein bowl for Fat Loss, Muscle
                Gain or Clean Eating.
              </p>
            </div>

            <button
              type="button"
              onClick={() => goProtected("/challenges/student-power-box")}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-green-600 px-6 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 md:w-auto"
            >
              Claim ₹99 Bowl
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="mt-12 border-t border-green-100 pt-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                How it works
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                From goal to results in 4 steps
              </h2>
            </div>

            <button
              type="button"
              onClick={() => goProtected("/challenges")}
              className="hidden rounded-[18px] bg-green-600 px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 md:inline-flex md:items-center md:gap-2"
            >
              Get Started
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StepCard
              icon={<Target size={20} />}
              number="01"
              title="Set Your Goal"
              description="Choose fat loss, muscle gain, weight gain or clean eating."
            />

            <StepCard
              icon={<Flame size={20} />}
              number="02"
              title="Pick Your Meals"
              description="Browse meals filtered by your goal and daily macro budget."
            />

            <StepCard
              icon={<Trophy size={20} />}
              number="03"
              title="Join Challenge"
              description="Start a 7-day MacroBox challenge and stay consistent."
            />

            <StepCard
              icon={<ShieldCheck size={20} />}
              number="04"
              title="Reach Your Target"
              description="Track your progress, complete the plan and unlock rewards."
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
    <div className="min-h-[138px] rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm">
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