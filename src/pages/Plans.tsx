// frontend/src/pages/Plans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Flame,
  Gift,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
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

  // New plan fields
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

type PlanHistorySummary = {
  planId?: string;
  challengeId?: string;
  title: string;
  badge?: string;
  goal?: string;
  durationDays?: number;
  purchasedTimes?: number;
  completedTimes?: number;
  latestPurchasedAt?: string | null;
  latestCompletedAt?: string | null;
};

type PlanHistoryOrder = {
  _id: string;
  planId?: string;
  challengeId?: string;
  title: string;
  badge?: string;
  goal?: string;
  durationDays?: number;
  purchasedAt?: string;
  startedAt?: string;
  completedAt?: string;
  rewardUnlocked?: boolean;

  // Old fields, kept temporarily for compatibility
  attemptNo?: number;
  completedDaysCount?: number;
};

const goalIcon = (goal: string) => {
  if (goal === "couple") return <Users size={20} />;
  if (goal === "muscle_gain") return <Zap size={20} />;
  return <Flame size={20} />;
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

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function Plans() {
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [historySummary, setHistorySummary] = useState<PlanHistorySummary[]>([]);
  const [historyOrders, setHistoryOrders] = useState<PlanHistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = async () => {
    try {
      setLoading(true);

      const [planRes, historyRes] = await Promise.all([
        api.get("/plans"),
        api.get("/plans/history/summary"),
      ]);

      setPlans(Array.isArray(planRes.data) ? planRes.data : []);
      setHistorySummary(
        Array.isArray(historyRes.data?.summary) ? historyRes.data.summary : []
      );
      setHistoryOrders(
        Array.isArray(historyRes.data?.attempts)
          ? historyRes.data.attempts
          : Array.isArray(historyRes.data?.orders)
          ? historyRes.data.orders
          : []
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const stats = useMemo(() => {
    const purchased = plans.filter(
      (item) => item.isPurchased || item.isJoined
    ).length;

    const rewards = historyOrders.filter((item) => item.rewardUnlocked).length;

    return {
      total: plans.length,
      purchased,
      planOrders: historyOrders.length,
      rewards,
    };
  }, [plans, historyOrders]);

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
                <Trophy size={15} />
                MacroBox Plans
              </p>

              <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
                Eat healthy.
                <br />
                <span className="text-green-600">Choose your plan.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                Pick a 7-day MacroBox meal plan, schedule your daily deliveries,
                and get 10% OFF your next plan after successful payment.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MiniFeature icon={<Target size={18} />} title="Goal Based Plans" />
                <MiniFeature icon={<CalendarCheck size={18} />} title="7 Meals Scheduled" />
                <MiniFeature icon={<Gift size={18} />} title="10% Next Plan Reward" />
              </div>
            </div>

            <button
              type="button"
              onClick={loadPlans}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-green-200 bg-white px-5 text-sm font-black text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <HeroStat label="Plans" value={`${stats.total}`} />
            <HeroStat label="Purchased" value={`${stats.purchased}`} />
            <HeroStat label="Plan Orders" value={`${stats.planOrders}`} />
            <HeroStat label="Rewards" value={`${stats.rewards}`} />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                Choose your meal plan
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                MacroBox Meal Plans
              </h2>
            </div>

            <Link
              to="/rewards"
              className="inline-flex w-fit items-center gap-2 rounded-[16px] bg-green-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(22,163,74,0.24)]"
            >
              View Plan Rewards
              <ArrowRight size={17} />
            </Link>
          </div>

          {loading ? (
            <LoadingCard />
          ) : plans.length === 0 ? (
            <EmptyCard title="No plans found" text="Add meal plans from admin panel." />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const duration = plan.durationDays || 7;
                const price = plan.trialPrice || plan.price || 99;
                const originalPrice = plan.originalPrice || null;
                const planId = getPlanId(plan);
                const mealsCount = getProfessionalMealCount(plan);

                const purchasedBefore =
                  plan.isPurchased ||
                  plan.isJoined ||
                  Boolean(plan.completedAttemptsCount);

                const rewardText =
                  plan.rewardEligible === false ? "No reward" : "10% next plan";

                return (
                  <article
                    key={plan._id}
                    className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-green-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                        {plan.badge || goalLabel(plan.goal)}
                      </span>

                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
                        {goalIcon(plan.goal)}
                      </span>
                    </div>

                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {plan.title}
                    </h3>

                    <p className="mt-2 min-h-[72px] text-sm font-medium leading-6 text-slate-500">
                      {plan.description ||
                        "Choose this MacroBox meal plan, schedule your daily meals, and unlock a reward after payment."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox label="Duration" value={`${duration} Days`} />
                      <InfoBox label="Meals" value={`${mealsCount} Meals`} />
                      <InfoBox label="Goal" value={goalLabel(plan.goal)} />
                      <InfoBox label="Reward" value={rewardText} />
                    </div>

                    {purchasedBefore ? (
                      <div className="mt-4 rounded-[16px] border border-green-100 bg-green-50 p-3 text-sm font-black text-green-700">
                        Purchased before
                        {plan.completedAttemptsCount
                          ? ` × ${plan.completedAttemptsCount}`
                          : ""}
                      </div>
                    ) : null}

                    {plan.rewardUnlocked ? (
                      <div className="mt-4 rounded-[16px] border border-green-100 bg-green-50 p-3 text-sm font-black text-green-700">
                        🎉 10% next plan reward unlocked
                      </div>
                    ) : null}

                    <div className="mt-5 rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-green-700 shadow-sm">
                          <Sparkles size={18} />
                        </span>

                        <div>
                          <p className="text-sm font-black text-slate-950">
                            What you get
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {duration}-day meal schedule, selected MacroBox meals,
                            and 10% OFF your next eligible plan after successful
                            payment.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Starts from
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
                        className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
                      >
                        View Plan
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
              <History size={21} />
            </span>

            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                Plan History
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Your purchased MacroBox plans and rewards unlocked from plan orders.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingCard />
          ) : historySummary.length === 0 ? (
            <EmptyCard
              title="No plan purchases yet"
              text="Buy any eligible 7-day MacroBox plan to unlock 10% OFF your next plan."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
                  <Trophy className="text-green-600" size={20} />
                  Purchased Plan Types
                </h3>

                <div className="space-y-3">
                  {historySummary.map((item) => {
                    const purchasedTimes =
                      item.purchasedTimes || item.completedTimes || 0;
                    const latestDate =
                      item.latestPurchasedAt || item.latestCompletedAt || null;

                    return (
                      <div
                        key={item.planId || item.challengeId || item.title}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black text-slate-950">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {item.badge || goalLabel(item.goal || "")} • Latest:{" "}
                              {formatDate(latestDate)}
                            </p>
                          </div>

                          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                            × {purchasedTimes}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
                  <CalendarCheck className="text-green-600" size={20} />
                  Recent Plan Orders
                </h3>

                <div className="space-y-3">
                  {historyOrders.slice(0, 8).map((order) => {
                    const date =
                      order.purchasedAt || order.completedAt || order.startedAt;

                    return (
                      <div
                        key={order._id}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              {order.title}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {order.durationDays || 7}-day plan •{" "}
                              {order.badge || goalLabel(order.goal || "")}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xs font-black text-green-700">
                              {order.rewardUnlocked
                                ? "10% reward unlocked"
                                : "Plan purchased"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {formatDate(date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LoadingCard() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-sm font-black text-slate-600">
        <Loader2 className="animate-spin text-green-600" size={22} />
        Loading plans...
      </div>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function MiniFeature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
          {icon}
        </span>
        <p className="text-sm font-black text-slate-950">{title}</p>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-green-700">
        {value}
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}