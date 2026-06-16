// frontend/src/pages/PlanDetails.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Gift,
  Loader2,
  ShoppingCart,
  Sparkles,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useCart } from "../context/CartContext";

type MealMode = "veg" | "nonveg" | "both";
type UserPreference = "veg" | "nonveg" | "mixed";

type MealCard = {
  _id: string;
  planId?: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  type?: string;
  foodType?: string;
  isVeg?: boolean;
  isNonVeg?: boolean;
};

type PlanDay = {
  day: number;
  title?: string;
  defaultMeal?: MealCard | null;
  availableMeals?: MealCard[];
};

type BackendPlan = {
  _id: string;
  planId: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: string;
  mealMode?: MealMode;
  badge?: string;
  durationDays?: number;
  price?: number;
  trialPrice?: number | null;
  originalPrice?: number | null;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  days?: PlanDay[];
  rewardEligible?: boolean;
  rewardUnlocked?: boolean;
};

type CartMealsResponse = {
  plan: BackendPlan;
  days: PlanDay[];
  meals: MealCard[];
  vegMeals: MealCard[];
  nonVegMeals: MealCard[];
};

type PlanDaySelection = {
  day: number;
  selectedMealId: string;
  preference: UserPreference;
};

const getMealDietType = (meal?: MealCard | null) => {
  if (!meal) return "veg";

  const text = [
    meal.type,
    meal.foodType,
    meal.title,
    meal.isVeg ? "veg" : "",
    meal.isNonVeg ? "nonveg" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (meal.isVeg === true) return "veg";
  if (meal.isNonVeg === true) return "nonveg";

  if (
    text.includes("chicken") ||
    text.includes("egg") ||
    text.includes("fish") ||
    text.includes("mutton") ||
    text.includes("nonveg") ||
    text.includes("non-veg") ||
    text.includes("non veg")
  ) {
    return "nonveg";
  }

  return "veg";
};

const getMealById = (meals: MealCard[], id: string) => {
  return meals.find((meal) => String(meal._id) === String(id)) || null;
};

const pickMealForDay = (
  day: PlanDay,
  preference: UserPreference,
  mealMode: MealMode
) => {
  const availableMeals = day.availableMeals || [];

  if (mealMode === "veg" || preference === "veg") {
    return (
      availableMeals.find((meal) => getMealDietType(meal) === "veg") ||
      day.defaultMeal ||
      availableMeals[0] ||
      null
    );
  }

  if (mealMode === "nonveg" || preference === "nonveg") {
    return (
      availableMeals.find((meal) => getMealDietType(meal) === "nonveg") ||
      day.defaultMeal ||
      availableMeals[0] ||
      null
    );
  }

  return day.defaultMeal || availableMeals[0] || null;
};

const sumMeals = (meals: MealCard[]) => {
  return meals.reduce(
    (acc, meal) => {
      acc.price += Number(meal.price || 0);
      acc.protein += Number(meal.protein || 0);
      acc.calories += Number(meal.calories || 0);
      acc.carbs += Number(meal.carbs || 0);
      acc.fat += Number(meal.fat || 0);
      return acc;
    },
    {
      price: 0,
      protein: 0,
      calories: 0,
      carbs: 0,
      fat: 0,
    }
  );
};

export default function PlanDetails() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [plan, setPlan] = useState<BackendPlan | null>(null);
  const [cartMealsData, setCartMealsData] = useState<CartMealsResponse | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [preference, setPreference] = useState<UserPreference>("mixed");
  const [planDays, setPlanDays] = useState<PlanDaySelection[]>([]);

  const displayTitle = plan?.title || "MacroBox Meal Plan";

  const displayDescription =
    plan?.description ||
    "Choose your MacroBox meal plan, schedule your daily deliveries, and enjoy goal-based healthy meals.";

  const displayBadge = plan?.badge || "MacroBox Plan";

  const displayPrice = plan?.trialPrice || plan?.price || 99;

  const originalPrice = plan?.originalPrice || null;

  const durationDays = plan?.durationDays || 7;

  const rewardEligible = plan?.rewardEligible !== false;

  const mealMode = plan?.mealMode || cartMealsData?.plan?.mealMode || "both";

  const availablePreferenceOptions = useMemo(() => {
    if (mealMode === "veg") return ["veg"] as UserPreference[];
    if (mealMode === "nonveg") return ["nonveg"] as UserPreference[];
    return ["mixed", "veg", "nonveg"] as UserPreference[];
  }, [mealMode]);

  const allMeals = useMemo(() => cartMealsData?.meals || [], [cartMealsData]);

  const selectedMeals = useMemo(() => {
    return planDays
      .map((day) => getMealById(allMeals, day.selectedMealId))
      .filter(Boolean) as MealCard[];
  }, [allMeals, planDays]);

  const selectedTotals = useMemo(() => sumMeals(selectedMeals), [selectedMeals]);

  const perks: string[] = plan?.perks?.length
    ? plan.perks
    : [
        "Goal-based meals delivered across the plan",
        "Choose Veg, Nonveg, or Mixed plan",
        "Delivery date and slot will be selected in cart",
        "Pay once and get meals scheduled for every plan day",
      ];

  const rewards: string[] = plan?.rewards?.length
    ? plan.rewards
    : rewardEligible
    ? ["Buy this 7-day MacroBox plan and get 10% OFF your next eligible plan."]
    : ["This plan is not eligible for next-plan reward."];

  const buildInitialPlanDays = (
    data: CartMealsResponse,
    selectedPreference: UserPreference
  ) => {
    const mode = data.plan?.mealMode || "both";

    return (data.days || []).map((day) => {
      const selectedMeal = pickMealForDay(day, selectedPreference, mode);

      return {
        day: day.day,
        selectedMealId: String(selectedMeal?._id || ""),
        preference: selectedPreference,
      };
    });
  };

  const loadPlan = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/plans/${planId}`);
      setPlan(res.data);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Plan not found");
    } finally {
      setLoading(false);
    }
  };

  const loadCartMeals = async () => {
    try {
      setLoadingMeals(true);

      const res = await api.get(`/plans/${planId}/cart-meals`);
      const data: CartMealsResponse = res.data;

      setCartMealsData(data);

      const mode = data.plan?.mealMode || "both";

      const defaultPreference: UserPreference =
        mode === "veg" ? "veg" : mode === "nonveg" ? "nonveg" : "mixed";

      setPreference(defaultPreference);
      setPlanDays(buildInitialPlanDays(data, defaultPreference));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load plan meals");
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    if (planId) {
      loadPlan();
      loadCartMeals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  useEffect(() => {
    if (!cartMealsData?.days?.length) return;

    setPlanDays(buildInitialPlanDays(cartMealsData, preference));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference, cartMealsData]);

  const addPlanToCart = async () => {
    try {
      setAdding(true);

      if (!cartMealsData || !planDays.length) {
        toast.error("Please wait. Plan meals are still loading.");
        return;
      }

      const invalidDay = planDays.find((day) => {
        const selectedMeal = getMealById(allMeals, day.selectedMealId);

        return !day.selectedMealId || !selectedMeal;
      });

      if (invalidDay) {
        toast.error(`Meal not available for Day ${invalidDay.day}.`);
        return;
      }

      const selectedMealsForPlan = planDays
        .map((day) => getMealById(allMeals, day.selectedMealId))
        .filter(Boolean) as MealCard[];

      const totals = sumMeals(selectedMealsForPlan);

      const finalPlanDays = planDays.map((day) => {
        const selectedMeal = getMealById(allMeals, day.selectedMealId);

        return {
          day: day.day,
          date: "",
          slot: "",
          preference: day.preference,
          selectedMeal: selectedMeal?._id || "",
          selectedMealTitle: selectedMeal?.title || "Meal",
          selectedMealPrice: selectedMeal?.price || 0,
          selectedMealProtein: selectedMeal?.protein || 0,
          selectedMealCalories: selectedMeal?.calories || 0,
          selectedMealCarbs: selectedMeal?.carbs || 0,
          selectedMealFat: selectedMeal?.fat || 0,
        };
      });

      addToCart({
        _id: `plan-${planId}`,
        itemType: "plan",
        planId: planId || "",
        title: `${displayTitle}`,
        description: `Includes ${durationDays} meals delivered across ${durationDays} days.`,
        price: Number(displayPrice || totals.price || 0),
        protein: totals.protein,
        calories: totals.calories,
        carbs: totals.carbs,
        fat: totals.fat,
        qty: 1,
        preference,
        rewardEligible,
        planItems: selectedMealsForPlan.map((meal, index) => ({
          _id: String(meal._id),
          title: `Day ${index + 1}: ${meal.title}`,
          price: meal.price,
          protein: meal.protein,
          calories: meal.calories,
          carbs: meal.carbs,
          fat: meal.fat,
          qty: 1,
        })),
        planDays: finalPlanDays,
      } as any);

      toast.success("Plan added to cart");
      navigate("/cart");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add plan");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f8]">
        <div className="flex items-center gap-3 rounded-[20px] bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading plan...
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10">
        <div className="mx-auto max-w-[900px] rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">
            Plan not found
          </h1>

          <button
            type="button"
            onClick={() => navigate("/plans")}
            className="mt-5 rounded-[16px] bg-green-600 px-6 py-3 text-sm font-black text-white"
          >
            Back to Plans
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <Link
          to="/plans"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Plans
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-green-100 bg-gradient-to-br from-green-50 via-white to-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
                <Trophy size={15} />
                {displayBadge}
              </p>

              <div className="rounded-[18px] bg-green-50 p-2">
                <div className="flex flex-wrap gap-2">
                  {availablePreferenceOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPreference(option)}
                      disabled={loadingMeals}
                      className={`rounded-[14px] px-4 py-2 text-xs font-black capitalize transition disabled:opacity-60 ${
                        preference === option
                          ? "bg-green-600 text-white"
                          : "bg-white text-green-700"
                      }`}
                    >
                      {option === "mixed" ? "Mixed" : option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
              {displayTitle}
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
              {displayDescription}
            </p>

            <div className="mt-5 rounded-[20px] border border-green-100 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Selected Plan Type
                  </p>
                  <p className="mt-1 text-lg font-black capitalize text-green-700">
                    {preference === "mixed" ? "Mixed" : preference}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Selected Meals
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {loadingMeals
                      ? "Loading meals..."
                      : `${selectedMeals.length}/${durationDays} meals ready`}
                  </p>
                </div>
              </div>

              {selectedMeals.length > 0 && (
                <div className="mt-4 rounded-[18px] border border-green-100 bg-green-50 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-green-700">
                    Meals Included in This Plan
                  </p>

                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedMeals.map((meal, index) => (
                      <div
                        key={`${meal._id}-${index}`}
                        className="rounded-[14px] border border-green-100 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              Day {index + 1}: {meal.title}
                            </p>

                            <p className="mt-1 text-xs font-bold capitalize text-slate-500">
                              {getMealDietType(meal)} meal
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">
                            ₹{meal.price}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-[10px] bg-slate-50 px-2 py-1.5">
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              Protein
                            </p>
                            <p className="text-xs font-black text-slate-900">
                              {meal.protein}g
                            </p>
                          </div>

                          <div className="rounded-[10px] bg-slate-50 px-2 py-1.5">
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              Calories
                            </p>
                            <p className="text-xs font-black text-slate-900">
                              {meal.calories}
                            </p>
                          </div>

                          <div className="rounded-[10px] bg-slate-50 px-2 py-1.5">
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              Carbs
                            </p>
                            <p className="text-xs font-black text-slate-900">
                              {meal.carbs}g
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <InfoCard
                label="Duration"
                value={`${durationDays} Day${durationDays > 1 ? "s" : ""}`}
              />

              <InfoCard label="Meals" value={`${selectedMeals.length}`} />

              <InfoCard
                label="Reward"
                value={rewardEligible ? "10% Next Plan" : "Not Eligible"}
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={addPlanToCart}
                disabled={adding || loadingMeals}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-green-600 px-6 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
              >
                {adding || loadingMeals ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ShoppingCart size={18} />
                )}

                Add 7-Day Plan to Cart
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="rounded-[24px] bg-slate-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                Plan Price
              </p>

              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-black tracking-[-0.06em]">
                  ₹{displayPrice}
                </p>

                {originalPrice && (
                  <p className="mb-2 text-lg font-black text-slate-400 line-through">
                    ₹{originalPrice}
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                Choose Veg, Nonveg or Mixed. Delivery date and slot will be
                selected in cart for each plan day.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <MiniDarkStat
                  label="Protein"
                  value={`${selectedTotals.protein}g`}
                />
                <MiniDarkStat
                  label="Calories"
                  value={`${selectedTotals.calories}`}
                />
                <MiniDarkStat label="Carbs" value={`${selectedTotals.carbs}g`} />
                <MiniDarkStat label="Fat" value={`${selectedTotals.fat}g`} />
              </div>
            </div>

            <div className="mt-6">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.04em]">
                <Sparkles className="text-green-600" size={21} />
                What you get
              </h2>

              <div className="mt-4 space-y-3">
                {perks.map((perk: string) => (
                  <div
                    key={perk}
                    className="flex items-start gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm font-bold leading-6 text-slate-700">
                      {perk}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
              <Flame className="text-green-600" />
              Plan Reward
            </h2>

            <div className="mt-4 space-y-3">
              {rewards.map((reward: string) => (
                <div
                  key={reward}
                  className="rounded-[18px] border border-green-100 bg-green-50 p-4 text-sm font-bold leading-6 text-green-800"
                >
                  {reward}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
              <Gift className="text-green-600" />
              How it works
            </h2>

            <div className="mt-4 space-y-3">
              <Step number="01" text="Choose Veg, Nonveg or Mixed." />
              <Step number="02" text="Add the plan to cart." />
              <Step number="03" text="Select Day 1 date and daily delivery slots." />
              <Step number="04" text="Pay once and unlock 10% OFF your next eligible plan." />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniDarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white/10 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
        {number}
      </span>

      <p className="text-sm font-bold text-slate-700">{text}</p>
    </div>
  );
}