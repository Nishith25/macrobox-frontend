// frontend/src/pages/Plans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trophy,
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
  if (goal === "nonveg") return "Nonveg";
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

const getDiscountPercent = (price: number, originalPrice?: number | null) => {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

const goalFilters = [
  { label: "All", value: "all" },
  { label: "Fat Loss", value: "fat_loss" },
  { label: "Muscle Gain", value: "muscle_gain" },
  { label: "Clean Eating", value: "clean_eating" },
  { label: "Couple", value: "couple" },
  { label: "Office Fit", value: "office_fit" },
];

export default function Plans() {
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGoal, setActiveGoal] = useState("all");
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
      const matchesGoal = activeGoal === "all" || plan.goal === activeGoal;

      const searchableText = [
        plan.title,
        plan.subtitle,
        plan.description,
        plan.badge,
        goalLabel(plan.goal),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);

      return matchesGoal && matchesSearch;
    });
  }, [plans, activeGoal, searchTerm]);

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-600">
                MacroBox
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">
                Meal plans made healthy
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Choose a goal-based MacroBox meal plan, schedule daily delivery
                slots, and stay consistent with clean eating.
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search meal plans"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {goalFilters.map((filter) => {
                const isActive = activeGoal === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveGoal(filter.value)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                      isActive
                        ? "border-green-600 bg-green-600 text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-300">
                <Gift size={14} />
                MacroBox Reward
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-4xl">
                Buy a 7-day plan, unlock 10% OFF next plan
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/70">
                Complete your plan payment and get a reward for your next
                eligible MacroBox plan.
              </p>
            </div>

            <Link
              to="/rewards"
              className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-green-50"
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
              text="Try changing the search or filter. Admin can add meal plans from panel."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan) => {
                const duration = plan.durationDays || 7;
                const price = plan.trialPrice || plan.price || 99;
                const originalPrice = plan.originalPrice || null;
                const planId = getPlanId(plan);
                const mealsCount = getProfessionalMealCount(plan);
                const discountPercent = getDiscountPercent(price, originalPrice);

                const purchasedBefore =
                  plan.isPurchased ||
                  plan.isJoined ||
                  Boolean(plan.completedAttemptsCount);

                const rewardText =
                  plan.rewardEligible === false ? "No reward" : "10% OFF next";

                return (
                  <article
                    key={plan._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative h-44 bg-gradient-to-br from-green-50 via-white to-slate-50">
                      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm">
                        <span className="text-green-600">
                          {goalIcon(plan.goal)}
                        </span>
                        {plan.badge || goalLabel(plan.goal)}
                      </div>

                      {discountPercent ? (
                        <div className="absolute bottom-4 left-4 rounded-xl bg-slate-950 px-3 py-2 text-white shadow-lg">
                          <p className="text-xs font-black uppercase tracking-wide text-green-300">
                            Save
                          </p>
                          <p className="text-xl font-black leading-none">
                            {discountPercent}% OFF
                          </p>
                        </div>
                      ) : null}

                      <div className="absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-green-600 shadow-lg">
                        <Trophy size={30} />
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                            {plan.title}
                          </h3>

                          <div className="mt-1 flex items-center gap-1 text-xs font-black text-slate-500">
                            <Star
                              size={14}
                              className="fill-green-600 text-green-600"
                            />
                            4.8 • {duration} days • {mealsCount} meals
                          </div>
                        </div>

                        <div className="rounded-lg bg-green-600 px-2 py-1 text-xs font-black text-white">
                          HEALTHY
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 min-h-[44px] text-sm font-semibold leading-6 text-slate-500">
                        {plan.description ||
                          "Choose this MacroBox meal plan, schedule your daily meals, and unlock a reward after payment."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Pill>{goalLabel(plan.goal)}</Pill>
                        <Pill>{rewardText}</Pill>
                        <Pill>Daily slots</Pill>
                      </div>

                      {purchasedBefore ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-black text-green-700">
                          <CheckCircle2 size={16} />
                          Purchased before
                          {plan.completedAttemptsCount
                            ? ` × ${plan.completedAttemptsCount}`
                            : ""}
                        </div>
                      ) : null}

                      {plan.rewardUnlocked ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-black text-green-700">
                          <Gift size={16} />
                          10% next plan reward unlocked
                        </div>
                      ) : null}

                      <div className="mt-5 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Starting at
                          </p>

                          <div className="mt-1 flex items-end gap-2">
                            <p className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                              ₹{price}
                            </p>

                            {originalPrice && originalPrice > price ? (
                              <p className="mb-1 text-sm font-bold text-slate-400 line-through">
                                ₹{originalPrice}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Link
                          to={`/plans/${planId}`}
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-green-600 bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700"
                        >
                          VIEW
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
      {children}
    </span>
  );
}