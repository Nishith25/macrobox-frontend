// frontend/src/pages/Plans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Utensils,
} from "lucide-react";
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

  // Temporary backward compatibility
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

const getPlanId = (plan: BackendPlan) =>
  plan.planId || plan.challengeId || plan._id;

const hasMeal = (item?: MealSetDay) => {
  if (!item || item.isActive === false || !item.meal) {
    return false;
  }

  if (typeof item.meal === "string") {
    return item.meal.trim().length > 0;
  }

  return Boolean(item.meal?._id);
};

const countMealSet = (items?: MealSetDay[]) => {
  if (!Array.isArray(items)) return 0;

  return items.filter(hasMeal).length;
};

const getProfessionalMealCount = (
  plan: BackendPlan,
  mode?: PlanMode
) => {
  const vegCount = countMealSet(plan.mealSets?.veg);
  const nonvegCount = countMealSet(plan.mealSets?.nonveg);
  const mixedCount = countMealSet(plan.mealSets?.mixed);

  if (mode === "veg" && vegCount > 0) return vegCount;
  if (mode === "nonveg" && nonvegCount > 0) return nonvegCount;
  if (mode === "mixed" && mixedCount > 0) return mixedCount;

  const bestMealSetCount = Math.max(
    vegCount,
    nonvegCount,
    mixedCount
  );

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

const getBasePlanPrice = (plan: BackendPlan) =>
  Number(plan.price || plan.trialPrice || 0);

const getModePrice = (plan: BackendPlan, mode: PlanMode) => {
  const basePrice = getBasePlanPrice(plan);

  const prices =
    plan.prices ||
    plan.planPrices ||
    plan.modePrices ||
    {};

  if (mode === "veg") {
    return Number(
      plan.vegPrice ||
        prices.veg ||
        basePrice
    );
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

  return Number(
    plan.mixedPrice ||
      prices.mixed ||
      basePrice
  );
};

const hasModePrice = (plan: BackendPlan, mode: PlanMode) => {
  const prices =
    plan.prices ||
    plan.planPrices ||
    plan.modePrices ||
    {};

  if (mode === "veg") {
    return Boolean(plan.vegPrice || prices.veg);
  }

  if (mode === "nonveg") {
    return Boolean(
      plan.nonVegPrice ||
        plan.nonvegPrice ||
        prices.nonVeg ||
        prices.nonveg
    );
  }

  return Boolean(plan.mixedPrice || prices.mixed);
};

const hasModeMeals = (plan: BackendPlan, mode: PlanMode) => {
  if (mode === "veg") {
    return countMealSet(plan.mealSets?.veg) > 0;
  }

  if (mode === "nonveg") {
    return countMealSet(plan.mealSets?.nonveg) > 0;
  }

  return countMealSet(plan.mealSets?.mixed) > 0;
};

const getAvailableModes = (plan: BackendPlan): PlanMode[] => {
  const configuredMode = String(plan.mealMode || "").toLowerCase();

  if (configuredMode === "veg") return ["veg"];

  if (
    configuredMode === "nonveg" ||
    configuredMode === "non-veg"
  ) {
    return ["nonveg"];
  }

  if (configuredMode === "mixed") return ["mixed"];

  const modes: PlanMode[] = [];

  if (
    hasModeMeals(plan, "mixed") ||
    hasModePrice(plan, "mixed")
  ) {
    modes.push("mixed");
  }

  if (
    hasModeMeals(plan, "veg") ||
    hasModePrice(plan, "veg")
  ) {
    modes.push("veg");
  }

  if (
    hasModeMeals(plan, "nonveg") ||
    hasModePrice(plan, "nonveg")
  ) {
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

  const [selectedModes, setSelectedModes] = useState<
    Record<string, PlanMode>
  >({});

  const loadPlans = async () => {
    try {
      setLoading(true);

      const response = await api.get("/plans");

      const apiPlans: BackendPlan[] = Array.isArray(response.data)
        ? response.data
        : [];

      setPlans(apiPlans);

      setSelectedModes((current) => {
        const next = { ...current };

        apiPlans.forEach((plan) => {
          const key = String(plan._id);

          if (!next[key]) {
            next[key] = getDefaultMode(plan);
          }
        });

        return next;
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load plans."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return plans.filter((plan) => {
      const modesText = getAvailableModes(plan)
        .map(getModeLabel)
        .join(" ");

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

  const handleModeChange = (
    planId: string,
    mode: PlanMode
  ) => {
    setSelectedModes((current) => ({
      ...current,
      [planId]: mode,
    }));
  };

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-9 pt-9 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                  MacroBox Plans
                </p>

                <h1 className="mb-text mt-4 max-w-4xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[76px]">
                  Healthy meal plans,
                  <br />
                  built around you.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Choose a goal-based plan, select Veg, Non-Veg or Mixed,
                  and schedule every daily delivery from your cart.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HeaderSummary
                  label="Available"
                  value={`${plans.length} ${
                    plans.length === 1 ? "plan" : "plans"
                  }`}
                  icon={<Utensils size={17} />}
                />

                <HeaderSummary
                  label="Reward"
                  value="10% off"
                  icon={<Gift size={17} />}
                  accent
                />
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search
                  size={18}
                  className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search plans, goals or meal types..."
                  className="mb-input h-14 w-full rounded-full pl-12 pr-5 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <Link
                  to="/rewards"
                  className="mb-primary-button inline-flex h-14 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  Rewards
                  <ArrowRight size={16} />
                </Link>

                <button
                  type="button"
                  onClick={loadPlans}
                  disabled={loading}
                  className="mb-outline-button inline-flex h-14 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  {loading ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <RefreshCw size={17} />
                  )}

                  Refresh
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <RewardBanner />

          <section className="mt-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
                  Explore subscriptions
                </p>

                <h2 className="mb-text mt-2 text-[32px] font-light tracking-[-0.05em] sm:text-[42px]">
                  Meal plans
                </h2>
              </div>

              <p className="mb-text-faint shrink-0 text-xs font-medium">
                {loading
                  ? "Loading"
                  : `${filteredPlans.length} ${
                      filteredPlans.length === 1 ? "plan" : "plans"
                    }`}
              </p>
            </div>

            <div className="mt-6">
              {loading ? (
                <PlansLoading />
              ) : filteredPlans.length === 0 ? (
                <EmptyState
                  title="No plans found"
                  description="Try another plan name, goal or meal type."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPlans.map((plan) => {
                    const planKey = String(plan._id);
                    const availableModes = getAvailableModes(plan);

                    const selectedMode =
                      selectedModes[planKey] ||
                      getDefaultMode(plan);

                    const safeSelectedMode =
                      availableModes.includes(selectedMode)
                        ? selectedMode
                        : availableModes[0] || "mixed";

                    const duration = plan.durationDays || 7;
                    const price = getModePrice(
                      plan,
                      safeSelectedMode
                    );

                    const planId = getPlanId(plan);

                    const mealsCount =
                      getProfessionalMealCount(
                        plan,
                        safeSelectedMode
                      );

                    return (
                      <PlanCard
                        key={plan._id}
                        plan={plan}
                        planId={planId}
                        duration={duration}
                        price={price}
                        mealsCount={mealsCount}
                        availableModes={availableModes}
                        selectedMode={safeSelectedMode}
                        onModeChange={(mode) =>
                          handleModeChange(planKey, mode)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function HeaderSummary({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-glass min-w-0 rounded-[22px] p-4 sm:min-w-[170px]">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent
            ? "mb-accent-surface"
            : "mb-outline-button"
        }`}
      >
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium sm:text-base">
        {value}
      </p>
    </div>
  );
}

function RewardBanner() {
  return (
    <section className="mb-glass overflow-hidden rounded-[30px]">
      <div className="mb-divider flex flex-col gap-5 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <Gift size={20} />
          </span>

          <div>
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
              Member benefit
            </p>

            <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
              Plan reward
            </h2>

            <p className="mb-text-muted mt-2 max-w-xl text-sm leading-6">
              Purchase an eligible 7-day plan and unlock 10% off your next
              eligible MacroBox plan.
            </p>
          </div>
        </div>

        <Link
          to="/rewards"
          className="mb-primary-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium sm:w-auto"
        >
          View rewards
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-3">
        <RewardInfo
          label="Reward"
          value="10% off"
        />

        <RewardInfo
          label="Eligibility"
          value="7-day plan"
        />

        <RewardInfo
          label="Use"
          value="Next plan"
        />
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  planId,
  duration,
  price,
  mealsCount,
  availableModes,
  selectedMode,
  onModeChange,
}: {
  plan: BackendPlan;
  planId: string;
  duration: number;
  price: number;
  mealsCount: number;
  availableModes: PlanMode[];
  selectedMode: PlanMode;
  onModeChange: (mode: PlanMode) => void;
}) {
  return (
    <article className="mb-glass mb-glass-hover group overflow-hidden rounded-[30px]">
      <div className="relative min-h-[225px] overflow-hidden border-b border-[var(--mb-divider)] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--mb-accent-soft)] blur-[55px]" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="mb-accent-surface rounded-full px-3 py-1 text-[10px] font-semibold">
                {getModeLabel(selectedMode)}
              </span>

              {plan.badge && (
                <span className="mb-highlight-badge rounded-full px-3 py-1 text-[10px] font-semibold">
                  {plan.badge}
                </span>
              )}
            </div>

            <span className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium">
              {duration} days
            </span>
          </div>

          <p className="mb-text-faint mt-8 text-[10px] font-semibold uppercase tracking-[0.17em]">
            {goalLabel(plan.goal)}
          </p>

          <h3 className="mb-text mt-2 text-[27px] font-light leading-tight tracking-[-0.045em]">
            {plan.title}
          </h3>

          <p className="mb-text-muted mt-3 line-clamp-2 min-h-[48px] text-sm leading-6">
            {plan.description ||
              plan.subtitle ||
              "A goal-based MacroBox plan with scheduled daily meals."}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <InfoPill
            label="Duration"
            value={`${duration} days`}
          />

          <InfoPill
            label="Included"
            value={`${mealsCount} meals`}
          />
        </div>

        <div className="mt-5">
          <p className="mb-text-faint mb-3 text-[9px] font-semibold uppercase tracking-[0.15em]">
            Select plan type
          </p>

          <div
            className={`grid gap-2 ${
              availableModes.length === 1
                ? "grid-cols-1"
                : availableModes.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {availableModes.map((mode) => {
              const active = selectedMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-2 text-xs font-medium transition ${
                    active
                      ? "mb-primary-button border-transparent"
                      : "mb-outline-button"
                  }`}
                >
                  {active && <Check size={13} />}
                  {getModeLabel(mode)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-divider mt-6 flex items-end justify-between gap-4 border-t pt-5">
          <div>
            <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.15em]">
              Plan price
            </p>

            <p className="mb-text mt-2 text-3xl font-light tracking-[-0.05em]">
              ₹{price}
            </p>

            <p className="mb-text-faint mt-1 text-[11px]">
              {getModeLabel(selectedMode)} plan
            </p>
          </div>

          <Link
            to={`/plans/${planId}?type=${selectedMode}`}
            className="mb-primary-button inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium"
          >
            View plan
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function RewardInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-divider min-w-0 border-r p-4 last:border-r-0 sm:p-5">
      <p className="mb-text-faint text-[8px] font-semibold uppercase tracking-[0.15em] sm:text-[9px]">
        {label}
      </p>

      <p className="mb-text mt-2 truncate text-sm font-medium sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[18px] p-3">
      <p className="mb-text-faint text-[8px] uppercase tracking-[0.13em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function PlansLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="mb-glass overflow-hidden rounded-[30px]"
        >
          <div className="h-[225px] animate-pulse bg-[var(--mb-surface-strong)]" />

          <div className="space-y-4 p-5">
            <div className="h-12 animate-pulse rounded-2xl bg-[var(--mb-surface)]" />
            <div className="h-12 animate-pulse rounded-2xl bg-[var(--mb-surface)]" />
            <div className="h-14 animate-pulse rounded-full bg-[var(--mb-surface-strong)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[28px] p-9 text-center">
      <span className="mb-primary-button mx-auto flex h-14 w-14 items-center justify-center rounded-full">
        <Sparkles size={22} />
      </span>

      <h2 className="mb-text mt-5 text-2xl font-light">
        {title}
      </h2>

      <p className="mb-text-muted mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
    </div>
  );
}