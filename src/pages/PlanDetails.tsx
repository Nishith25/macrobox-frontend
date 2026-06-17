// frontend/src/pages/PlanDetails.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gift,
  Loader2,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useCart } from "../context/CartContext";

type MealMode = "veg" | "nonveg" | "both";
type UserPreference = "veg" | "nonveg" | "mixed";

type PlanPrices = {
  veg?: number;
  nonveg?: number;
  mixed?: number;
};

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
  vegAlternative?: MealCard | null;
  nonVegAlternative?: MealCard | null;
  availableMeals?: MealCard[];
};

type MealSetDay = {
  day: number;
  title?: string;
  meal?: MealCard | string | null;
  isActive?: boolean;
};

type MealSets = {
  veg?: MealSetDay[];
  nonveg?: MealSetDay[];
  mixed?: MealSetDay[];
};

type BackendPlan = {
  _id: string;
  planId: string;
  challengeId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: string;
  mealMode?: MealMode;
  badge?: string;
  durationDays?: number;
  price?: number;
  prices?: PlanPrices;
  trialPrice?: number | null;
  originalPrice?: number | null;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  days?: PlanDay[];
  mealSets?: MealSets;
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

const getMealId = (meal?: MealCard | string | null) => {
  if (!meal) return "";
  if (typeof meal === "string") return meal;
  return String(meal._id || "");
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

const preferenceToMealSetKey = (preference: UserPreference) => {
  if (preference === "veg") return "veg";
  if (preference === "nonveg") return "nonveg";
  return "mixed";
};

const getPreferenceLabel = (preference: UserPreference) => {
  if (preference === "veg") return "Veg";
  if (preference === "nonveg") return "Non-Veg";
  return "Mixed";
};

const getSafePreferenceFromUrl = (value: string | null): UserPreference | null => {
  if (value === "veg") return "veg";
  if (value === "nonveg") return "nonveg";
  if (value === "mixed") return "mixed";
  return null;
};

const getPlanPriceByPreference = (
  plan: BackendPlan | null,
  preference: UserPreference
) => {
  const fallback =
    Number(plan?.price || 0) ||
    Number(plan?.trialPrice || 0) ||
    Number(plan?.prices?.mixed || 0) ||
    Number(plan?.prices?.nonveg || 0) ||
    Number(plan?.prices?.veg || 0);

  if (preference === "veg") {
    return Number(plan?.prices?.veg || fallback);
  }

  if (preference === "nonveg") {
    return Number(plan?.prices?.nonveg || fallback);
  }

  return Number(plan?.prices?.mixed || fallback);
};

const getMealSetDays = (
  plan: BackendPlan | null,
  preference: UserPreference
): MealSetDay[] => {
  const key = preferenceToMealSetKey(preference);
  const directSet = plan?.mealSets?.[key];

  if (Array.isArray(directSet) && directSet.length > 0) {
    return directSet;
  }

  if (preference === "mixed") {
    const vegSet = plan?.mealSets?.veg || [];
    const nonvegSet = plan?.mealSets?.nonveg || [];

    if (vegSet.length || nonvegSet.length) {
      const maxLength = Math.max(vegSet.length, nonvegSet.length);

      return Array.from({ length: maxLength }, (_, index) => {
        const picked =
          index % 2 === 0
            ? nonvegSet[index] || vegSet[index]
            : vegSet[index] || nonvegSet[index];

        return {
          day: index + 1,
          title: picked?.title || `Day ${index + 1}`,
          meal: picked?.meal || null,
          isActive: picked?.isActive !== false,
        };
      });
    }
  }

  return [];
};

const pickMealForOldDay = (
  day: PlanDay,
  preference: UserPreference,
  mealMode: MealMode
) => {
  const availableMeals = day.availableMeals || [];

  if (mealMode === "veg" || preference === "veg") {
    return (
      day.vegAlternative ||
      availableMeals.find((meal) => getMealDietType(meal) === "veg") ||
      day.defaultMeal ||
      availableMeals[0] ||
      null
    );
  }

  if (mealMode === "nonveg" || preference === "nonveg") {
    return (
      day.nonVegAlternative ||
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [plan, setPlan] = useState<BackendPlan | null>(null);
  const [cartMealsData, setCartMealsData] = useState<CartMealsResponse | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [preference, setPreference] = useState<UserPreference>(
    getSafePreferenceFromUrl(searchParams.get("type")) || "mixed"
  );
  const [planDays, setPlanDays] = useState<PlanDaySelection[]>([]);

  const displayTitle = plan?.title || "MacroBox Meal Plan";

  const displayDescription =
    plan?.description ||
    "Choose your MacroBox meal plan, schedule your daily deliveries, and enjoy goal-based healthy meals.";

  const durationDays = plan?.durationDays || 7;
  const rewardEligible = plan?.rewardEligible !== false;
  const mealMode = plan?.mealMode || cartMealsData?.plan?.mealMode || "both";
  const displayPrice = getPlanPriceByPreference(plan || cartMealsData?.plan || null, preference);
  const originalPrice = plan?.originalPrice || null;

  const availablePreferenceOptions = useMemo(() => {
    if (mealMode === "veg") return ["veg"] as UserPreference[];
    if (mealMode === "nonveg") return ["nonveg"] as UserPreference[];
    return ["mixed", "veg", "nonveg"] as UserPreference[];
  }, [mealMode]);

  const allMeals = useMemo(() => {
    const fromApi = cartMealsData?.meals || [];
    const fromMealSets: MealCard[] = [];

    const sets = plan?.mealSets;

    ["veg", "nonveg", "mixed"].forEach((key) => {
      const days = sets?.[key as keyof MealSets] || [];

      days.forEach((day) => {
        if (day.meal && typeof day.meal !== "string") {
          fromMealSets.push(day.meal);
        }
      });
    });

    const merged = [...fromApi, ...fromMealSets];
    const map = new Map<string, MealCard>();

    merged.forEach((meal) => {
      if (meal?._id) {
        map.set(String(meal._id), meal);
      }
    });

    return Array.from(map.values());
  }, [cartMealsData, plan]);

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
        "Choose Veg, Non-Veg, or Mixed plan",
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
    selectedPreference: UserPreference,
    currentPlan: BackendPlan | null
  ) => {
    const mode = data.plan?.mealMode || currentPlan?.mealMode || "both";

    const mealSetDays = getMealSetDays(
      currentPlan || data.plan,
      selectedPreference
    );

    if (mealSetDays.length > 0) {
      return mealSetDays.map((day, index) => ({
        day: day.day || index + 1,
        selectedMealId: getMealId(day.meal),
        preference: selectedPreference,
      }));
    }

    return (data.days || []).map((day) => {
      const selectedMeal = pickMealForOldDay(day, selectedPreference, mode);

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
      const urlPreference = getSafePreferenceFromUrl(searchParams.get("type"));

      const defaultPreference: UserPreference =
        urlPreference ||
        (mode === "veg" ? "veg" : mode === "nonveg" ? "nonveg" : "mixed");

      setPreference(defaultPreference);
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
    if (!cartMealsData) return;

    const mergedPlan = plan || cartMealsData.plan;
    setPlanDays(buildInitialPlanDays(cartMealsData, preference, mergedPlan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference, cartMealsData, plan]);

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
        _id: `plan-${planId}-${preference}`,
        itemType: "plan",
        planId: planId || "",
        title: `${displayTitle} - ${getPreferenceLabel(preference)}`,
        description: `Includes ${durationDays} meals delivered across ${durationDays} days.`,
        price: Number(displayPrice || 0),
        protein: totals.protein,
        calories: totals.calories,
        carbs: totals.carbs,
        fat: totals.fat,
        qty: 1,
        preference,
        selectedPlanType: preference,
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
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading plan...
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-4 py-10">
        <div className="mx-auto max-w-[900px] rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">
            Plan not found
          </h1>

          <button
            type="button"
            onClick={() => navigate("/plans")}
            className="mt-5 rounded-xl bg-green-600 px-6 py-3 text-sm font-black text-white"
          >
            Back to Plans
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <Link
          to="/plans"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Plans
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-green-50 via-white to-white p-6 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-700">
                    {plan.badge || "MacroBox Plan"}
                  </p>

                  <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-6xl">
                    {displayTitle}
                  </h1>

                  <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                    {displayDescription}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-2 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {availablePreferenceOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPreference(option)}
                        disabled={loadingMeals}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition disabled:opacity-60 ${
                          preference === option
                            ? "bg-green-600 text-white"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {getPreferenceLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard
                  label="Selected Type"
                  value={getPreferenceLabel(preference)}
                />
                <InfoCard
                  label="Duration"
                  value={`${durationDays} Day${durationDays > 1 ? "s" : ""}`}
                />
                <InfoCard
                  label="Meals Ready"
                  value={
                    loadingMeals
                      ? "Loading"
                      : `${selectedMeals.length}/${durationDays}`
                  }
                />
              </div>

              {selectedMeals.length > 0 && (
                <section className="mt-6">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                        Meals included
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Your selected {getPreferenceLabel(preference)} plan menu
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedMeals.map((meal, index) => (
                      <div
                        key={`${meal._id}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-green-600">
                              Day {index + 1}
                            </p>

                            <h3 className="mt-1 text-base font-black text-slate-950">
                              {meal.title}
                            </h3>

                            <p className="mt-1 text-xs font-bold capitalize text-slate-500">
                              {getMealDietType(meal)} meal
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            ₹{meal.price || 0}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <MiniLightStat label="Protein" value={`${meal.protein || 0}g`} />
                          <MiniLightStat label="Calories" value={`${meal.calories || 0}`} />
                          <MiniLightStat label="Carbs" value={`${meal.carbs || 0}g`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-slate-100 pb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Plan Price
              </p>

              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-black tracking-[-0.06em] text-slate-950">
                  ₹{displayPrice}
                </p>

                {originalPrice && originalPrice > displayPrice && (
                  <p className="mb-2 text-lg font-black text-slate-400 line-through">
                    ₹{originalPrice}
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                {getPreferenceLabel(preference)} plan · {durationDays} days ·{" "}
                {selectedMeals.length} meals
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniPriceStat label="Protein" value={`${selectedTotals.protein}g`} />
              <MiniPriceStat label="Calories" value={`${selectedTotals.calories}`} />
              <MiniPriceStat label="Carbs" value={`${selectedTotals.carbs}g`} />
              <MiniPriceStat label="Fat" value={`${selectedTotals.fat}g`} />
            </div>

            <button
              type="button"
              onClick={addPlanToCart}
              disabled={adding || loadingMeals}
              className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
            >
              {adding || loadingMeals ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShoppingCart size={18} />
              )}

              Add Plan to Cart
              <ArrowRight size={18} />
            </button>

            <div className="mt-6">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.04em] text-slate-950">
                <Sparkles className="text-green-600" size={21} />
                What you get
              </h2>

              <div className="mt-4 space-y-3">
                {perks.map((perk: string) => (
                  <div
                    key={perk}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
              <Gift className="text-green-600" />
              Plan Reward
            </h2>

            <div className="mt-4 space-y-3">
              {rewards.map((reward: string) => (
                <div
                  key={reward}
                  className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold leading-6 text-green-800"
                >
                  {reward}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              How it works
            </h2>

            <div className="mt-4 space-y-3">
              <Step number="01" text="Choose Mixed, Veg or Non-Veg." />
              <Step number="02" text="Add the plan to cart." />
              <Step
                number="03"
                text="Select delivery date and slot for every plan day."
              />
              <Step
                number="04"
                text="Pay once and unlock your next-plan reward."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniLightStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniPriceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
        {number}
      </span>

      <p className="text-sm font-bold text-slate-700">{text}</p>
    </div>
  );
}