// frontend/src/pages/Plans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, Loader2, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type PlanMode = "veg" | "nonveg" | "mixed";

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
  mealMode?: "veg" | "nonveg" | "both" | "mixed" | string;

  durationDays?: number;

  price?: number;
  trialPrice?: number | null;
  originalPrice?: number | null;

  vegPrice?: number;
  nonVegPrice?: number;
  nonvegPrice?: number;
  mixedPrice?: number;

  prices?: {
    veg?: number;
    nonveg?: number;
    nonVeg?: number;
    mixed?: number;
  };

  planPrices?: {
    veg?: number;
    nonveg?: number;
    nonVeg?: number;
    mixed?: number;
  };

  modePrices?: {
    veg?: number;
    nonveg?: number;
    nonVeg?: number;
    mixed?: number;
  };

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

const getProfessionalMealCount = (plan: BackendPlan, mode?: PlanMode) => {
  const vegCount = countMealSet(plan.mealSets?.veg);
  const nonvegCount = countMealSet(plan.mealSets?.nonveg);
  const mixedCount = countMealSet(plan.mealSets?.mixed);

  if (mode === "veg" && vegCount > 0) return vegCount;
  if (mode === "nonveg" && nonvegCount > 0) return nonvegCount;
  if (mode === "mixed" && mixedCount > 0) return mixedCount;

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

const getBasePlanPrice = (plan: BackendPlan) => {
  return Number(plan.price || plan.trialPrice || 0);
};

const getModePrice = (plan: BackendPlan, mode: PlanMode) => {
  const basePrice = getBasePlanPrice(plan);
  const prices = plan.prices || plan.planPrices || plan.modePrices || {};

  if (mode === "veg") {
    return Number(plan.vegPrice || prices.veg || basePrice);
  }

  if (mode === "nonveg") {
    return Number(
      plan.nonVegPrice ||
        plan.nonvegPrice ||
        prices.nonVeg ||
        prices.nonveg ||
        basePrice
    );
  }

  return Number(plan.mixedPrice || prices.mixed || basePrice);
};

const hasModePrice = (plan: BackendPlan, mode: PlanMode) => {
  const prices = plan.prices || plan.planPrices || plan.modePrices || {};

  if (mode === "veg") {
    return Boolean(plan.vegPrice || prices.veg);
  }

  if (mode === "nonveg") {
    return Boolean(
      plan.nonVegPrice || plan.nonvegPrice || prices.nonVeg || prices.nonveg
    );
  }

  return Boolean(plan.mixedPrice || prices.mixed);
};

const hasModeMeals = (plan: BackendPlan, mode: PlanMode) => {
  if (mode === "veg") return countMealSet(plan.mealSets?.veg) > 0;
  if (mode === "nonveg") return countMealSet(plan.mealSets?.nonveg) > 0;
  return countMealSet(plan.mealSets?.mixed) > 0;
};

const getAvailableModes = (plan: BackendPlan): PlanMode[] => {
  const mode = String(plan.mealMode || "").toLowerCase();

  if (mode === "veg") return ["veg"];
  if (mode === "nonveg" || mode === "non-veg") return ["nonveg"];
  if (mode === "mixed") return ["mixed"];

  const modes: PlanMode[] = [];

  if (hasModeMeals(plan, "mixed") || hasModePrice(plan, "mixed")) {
    modes.push("mixed");
  }

  if (hasModeMeals(plan, "veg") || hasModePrice(plan, "veg")) {
    modes.push("veg");
  }

  if (hasModeMeals(plan, "nonveg") || hasModePrice(plan, "nonveg")) {
    modes.push("nonveg");
  }

  if (modes.length > 0) {
    return modes;
  }

  return ["mixed", "veg", "nonveg"];
};

const getDefaultMode = (plan: BackendPlan): PlanMode => {
  const modes = getAvailableModes(plan);

  if (modes.includes("mixed")) return "mixed";
  if (modes.includes("veg")) return "veg";
  return modes[0] || "mixed";
};

const getModeLabel = (mode: PlanMode) => {
  if (mode === "veg") return "Veg";
  if (mode === "nonveg") return "Non-Veg";
  return "Mixed";
};

export default function Plans() {
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModes, setSelectedModes] = useState<Record<string, PlanMode>>(
    {}
  );

  const loadPlans = async () => {
    try {
      setLoading(true);

      const planRes = await api.get("/plans");
      const apiPlans = Array.isArray(planRes.data) ? planRes.data : [];

      setPlans(apiPlans);

      setSelectedModes((current) => {
        const next = { ...current };

        apiPlans.forEach((plan: BackendPlan) => {
          const key = String(plan._id);

          if (!next[key]) {
            next[key] = getDefaultMode(plan);
          }
        });

        return next;
      });
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
      const modesText = getAvailableModes(plan).map(getModeLabel).join(" ");

      const searchableText = [
        plan.title,
        plan.subtitle,
        plan.description,
        plan.badge,
        goalLabel(plan.goal),
        modesText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !term || searchableText.includes(term);
    });
  }, [plans, searchTerm]);

  const handleModeChange = (planId: string, mode: PlanMode) => {
    setSelectedModes((current) => ({
      ...current,
      [planId]: mode,
    }));
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-slate-400">
                MacroBox Plans
              </p>

              <h1 className="mt-6 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:text-6xl">
                Meal plans made
                <br />
                healthy
              </h1>

              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-500">
                Choose a goal-based MacroBox meal plan, select Veg, Non-Veg or
                Mixed, and schedule your daily delivery slots.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/rewards"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800"
              >
                View Rewards
                <ArrowRight size={17} />
              </Link>

              <button
                type="button"
                onClick={loadPlans}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <RefreshCw size={17} />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-green-600">
                  <Gift size={24} />
                </span>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                    Plan Reward
                  </h2>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Buy a 7-day plan and unlock 10% OFF your next eligible plan.
                  </p>
                </div>
              </div>

              <Link
                to="/rewards"
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
              >
                View Rewards
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            <RewardInfo label="Reward" value="10% OFF" />
            <RewardInfo label="Eligibility" value="7-Day Plan" />
            <RewardInfo label="Use" value="Next Plan" />
          </div>
        </section>

        <section className="sticky top-0 z-20 mt-6 border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search plans"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                Plans
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
              text="Try searching with another plan name, type, or goal."
            />
          ) : (
            <div className="grid gap-4">
              {filteredPlans.map((plan) => {
                const planKey = String(plan._id);
                const availableModes = getAvailableModes(plan);
                const selectedMode =
                  selectedModes[planKey] || getDefaultMode(plan);

                const safeSelectedMode = availableModes.includes(selectedMode)
                  ? selectedMode
                  : availableModes[0] || "mixed";

                const duration = plan.durationDays || 7;
                const price = getModePrice(plan, safeSelectedMode);
                const planId = getPlanId(plan);
                const mealsCount = getProfessionalMealCount(
                  plan,
                  safeSelectedMode
                );

                return (
                  <article
                    key={plan._id}
                    className="border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            {getModeLabel(safeSelectedMode)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {duration} Days
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {mealsCount} Meals
                          </span>
                        </div>

                        <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                          {plan.title}
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                          {plan.description ||
                            "Choose this MacroBox meal plan and schedule your daily meals."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {availableModes.map((mode) => {
                            const isActive = safeSelectedMode === mode;

                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => handleModeChange(planKey, mode)}
                                className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                                  isActive
                                    ? "border-green-600 bg-green-600 text-white"
                                    : "border-green-200 bg-white text-green-700 hover:border-green-500 hover:bg-green-50"
                                }`}
                              >
                                {getModeLabel(mode)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-4 border-t border-slate-100 pt-4 lg:w-[250px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="text-left lg:text-right">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Price
                          </p>

                          <p className="mt-1 text-4xl font-black tracking-[-0.06em] text-slate-950">
                            ₹{price}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {getModeLabel(safeSelectedMode)} plan
                          </p>
                        </div>

                        <Link
                          to={`/plans/${planId}?type=${safeSelectedMode}`}
                          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-green-600 bg-white px-4 text-sm font-black text-green-700 transition hover:bg-green-600 hover:text-white"
                        >
                          View Plan
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
    <div className="flex min-h-[260px] items-center justify-center border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-sm font-black text-slate-600">
        <Loader2 className="animate-spin text-green-600" size={22} />
        Loading plans...
      </div>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function RewardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">
        {value}
      </p>
    </div>
  );
}