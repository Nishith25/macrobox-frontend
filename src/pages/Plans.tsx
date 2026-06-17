// frontend/src/pages/Plans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type MealSetDay = {
  day?: number;
  meal?: any;
  isActive?: boolean;
};

type MealSets = {
  veg?: MealSetDay[];
  nonveg?: MealSetDay[];
  mixed?: MealSetDay[];
};

type BackendPlan = {
  _id: string;

  planId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: string;
  badge?: string;
  mealMode?: "veg" | "nonveg" | "both" | string;
  durationDays?: number;
  price?: number;
  trialPrice?: number | null;
  originalPrice?: number | null;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  mealSets?: MealSets;
  days?: any[];
  planItems?: any[];
  isPurchased?: boolean;
  rewardEligible?: boolean;
  rewardUnlocked?: boolean;

  // Temporary backward compatibility until backend/models are fully renamed
  challengeId?: string;
  isJoined?: boolean;
  canStartAgain?: boolean;
  userStatus?: "joined" | "in_progress" | "completed" | "cancelled" | null;
  currentAttemptNo?: number | null;
  latestAttemptNo?: number | null;
  completedAttemptsCount?: number;
  latestCompletedAt?: string | null;
  completedDaysCount?: number;
};

const goalIcon = (goal: string) => {
  if (goal === "couple") return <Users size={18} />;
  if (goal === "muscle_gain") return <Zap size={18} />;
  if (goal === "clean_eating") return <Sparkles size={18} />;
  return <Flame size={18} />;
};

const goalLabel = (goal: string) => {
  if (goal === "fat_loss") return "Fat Loss";
  if (goal === "muscle_gain") return "Muscle Gain";
  if (goal === "weight_gain") return "Weight Gain";
  if (goal === "clean_eating") return "Clean Eating";
  if (goal === "student_power") return "Student Power";
  if (goal === "couple") return "Couple";
  if (goal === "office_fit") return "Office Fit";
  if (goal === "bulk") return "Bulk";
  if (goal === "lean") return "Lean";
  if (goal === "mixed") return "Mixed";
  if (goal === "veg") return "Veg";
  if (goal === "nonveg") return "Non-Veg";
  return "MacroBox";
};

const getPlanId = (plan: BackendPlan) => {
  return plan.planId || plan.challengeId || plan._id;
};

const hasMeal = (item?: MealSetDay) => {
  if (!item || item.isActive === false) return false;

  if (!item.meal) return false;

  if (typeof item.meal === "string") {
    return item.meal.trim().length > 0;
  }

  return Boolean(item.meal?._id);
};

const countMealSet = (items?: MealSetDay[]) => {
  if (!Array.isArray(items)) return 0;
  return items.filter(hasMeal).length;
};

const getProfessionalMealCount = (plan: BackendPlan) => {
  const vegCount = countMealSet(plan.mealSets?.veg);
  const nonvegCount = countMealSet(plan.mealSets?.nonveg);
  const mixedCount = countMealSet(plan.mealSets?.mixed);

  const bestMealSetCount = Math.max(vegCount, nonvegCount, mixedCount);

  if (bestMealSetCount > 0) {
    return bestMealSetCount;
  }

  if (Array.isArray(plan.days) && plan.days.length > 0) {
    return plan.days.filter((day) => day?.isActive !== false).length;
  }

  if (Array.isArray(plan.planItems) && plan.planItems.length > 0) {
    return plan.planItems.length;
  }

  if (Array.isArray(plan.meals) && plan.meals.length > 0) {
    return plan.meals.length;
  }

  return plan.durationDays || 7;
};

const getPlanPrice = (plan: BackendPlan) => {
  return Number(plan.price || plan.trialPrice || 0);
};

const getMealModeLabel = (plan: BackendPlan) => {
  const mode = String(plan.mealMode || "").toLowerCase();

  if (mode === "veg") return "Veg";
  if (mode === "nonveg") return "Non-Veg";
  if (mode === "both") return "Mixed";

  const vegCount = countMealSet(plan.mealSets?.veg);
  const nonvegCount = countMealSet(plan.mealSets?.nonveg);
  const mixedCount = countMealSet(plan.mealSets?.mixed);

  if (mixedCount > 0) return "Mixed";
  if (vegCount > 0 && nonvegCount > 0) return "Mixed";
  if (vegCount > 0) return "Veg";
  if (nonvegCount > 0) return "Non-Veg";

  return "Mixed";
};

const getPlanImageGradient = (goal: string) => {
  if (goal === "muscle_gain") {
    return "from-green-50 via-white to-slate-50";
  }

  if (goal === "clean_eating") {
    return "from-green-100 via-white to-slate-50";
  }

  if (goal === "couple") {
    return "from-green-50 via-white to-slate-50";
  }

  if (goal === "office_fit") {
    return "from-green-50 via-white to-slate-50";
  }

  return "from-green-50 via-white to-slate-50";
};

export default function Plans() {
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadPlans = async () => {
    try {
      setLoading(true);

      const planRes = await api.get("/plans");

      setPlans(Array.isArray(planRes.data) ? planRes.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return plans.filter((plan) => {
      const searchableText = [
        plan.title,
        plan.subtitle,
        plan.description,
        plan.badge,
        goalLabel(plan.goal),
        getMealModeLabel(plan),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !term || searchableText.includes(term);
    });
  }, [plans, searchTerm]);

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
                Meal plans made healthy
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Choose a goal-based MacroBox meal plan and schedule your daily
                delivery slots.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPlans}
              disabled={loading}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for plans"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-3xl text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Buy a 7-day plan, unlock 10% OFF next plan
            </h2>

            <Link
              to="/rewards"
              className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(22,163,74,0.22)] transition hover:bg-green-700"
            >
              View Rewards
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                Recommended meal plans
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {loading
                  ? "Loading plans..."
                  : `${filteredPlans.length} plan${
                      filteredPlans.length === 1 ? "" : "s"
                    } available`}
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingCard />
          ) : filteredPlans.length === 0 ? (
            <EmptyCard
              title="No plans found"
              text="Try searching with another plan name or goal."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan) => {
                const duration = plan.durationDays || 7;
                const price = getPlanPrice(plan);
                const planId = getPlanId(plan);
                const mealsCount = getProfessionalMealCount(plan);
                const mealMode = getMealModeLabel(plan);

                return (
                  <article
                    key={plan._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                  >
                    <div
                      className={`relative h-44 bg-gradient-to-br ${getPlanImageGradient(
                        plan.goal
                      )}`}
                    >
                      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                        {goalIcon(plan.goal)}
                      </div>

                      <span className="absolute bottom-4 left-4 rounded-full border border-green-200 bg-white px-3 py-1 text-[11px] font-black text-green-700 shadow-sm">
                        {mealMode}
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                        {plan.title}
                      </h3>

                      <p className="mt-3 line-clamp-2 min-h-[44px] text-sm font-semibold leading-6 text-slate-500">
                        {plan.description ||
                          "Choose this MacroBox meal plan and schedule your daily meals."}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <InfoPill label={`${duration} Days`} />
                        <InfoPill label={`${mealsCount} Meals`} />
                      </div>

                      <div className="mt-5 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
                        <div>
                          <div className="mt-1 flex items-end gap-2">
                            <p className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                              ₹{price}
                            </p>
                          </div>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {mealMode} plan
                          </p>
                        </div>

                        <Link
                          to={`/plans/${planId}`}
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-green-600 bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700"
                        >
                          View
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LoadingCard() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-sm font-black text-slate-600">
        <Loader2 className="animate-spin text-green-600" size={22} />
        Loading plans...
      </div>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-700">
      {label}
    </div>
  );
}