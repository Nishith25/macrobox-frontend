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
  Check,
  CheckCircle2,
  Gift,
  Loader2,
  ShoppingCart,
  Sparkles,
  Utensils,
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
  image?: string;
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

const getMealId = (
  meal?: MealCard | string | null
) => {
  if (!meal) return "";
  if (typeof meal === "string") return meal;

  return String(meal._id || "");
};

const getMealDietType = (
  meal?: MealCard | null
) => {
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

const getMealById = (
  meals: MealCard[],
  id: string
) =>
  meals.find(
    (meal) =>
      String(meal._id) === String(id)
  ) || null;

const preferenceToMealSetKey = (
  preference: UserPreference
) => {
  if (preference === "veg") return "veg";
  if (preference === "nonveg") return "nonveg";

  return "mixed";
};

const getPreferenceLabel = (
  preference: UserPreference
) => {
  if (preference === "veg") return "Veg";
  if (preference === "nonveg") return "Non-Veg";

  return "Mixed";
};

const getSafePreferenceFromUrl = (
  value: string | null
): UserPreference | null => {
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
    return Number(
      plan?.prices?.veg ||
        fallback
    );
  }

  if (preference === "nonveg") {
    return Number(
      plan?.prices?.nonveg ||
        fallback
    );
  }

  return Number(
    plan?.prices?.mixed ||
      fallback
  );
};

const getMealSetDays = (
  plan: BackendPlan | null,
  preference: UserPreference
): MealSetDay[] => {
  const key =
    preferenceToMealSetKey(
      preference
    );

  const directSet =
    plan?.mealSets?.[key];

  if (
    Array.isArray(directSet) &&
    directSet.length > 0
  ) {
    return directSet;
  }

  if (preference === "mixed") {
    const vegSet =
      plan?.mealSets?.veg || [];

    const nonvegSet =
      plan?.mealSets?.nonveg || [];

    if (
      vegSet.length ||
      nonvegSet.length
    ) {
      const maxLength = Math.max(
        vegSet.length,
        nonvegSet.length
      );

      return Array.from(
        { length: maxLength },
        (_, index) => {
          const picked =
            index % 2 === 0
              ? nonvegSet[index] ||
                vegSet[index]
              : vegSet[index] ||
                nonvegSet[index];

          return {
            day: index + 1,
            title:
              picked?.title ||
              `Day ${index + 1}`,
            meal:
              picked?.meal || null,
            isActive:
              picked?.isActive !==
              false,
          };
        }
      );
    }
  }

  return [];
};

const pickMealForOldDay = (
  day: PlanDay,
  preference: UserPreference,
  mealMode: MealMode
) => {
  const availableMeals =
    day.availableMeals || [];

  if (
    mealMode === "veg" ||
    preference === "veg"
  ) {
    return (
      day.vegAlternative ||
      availableMeals.find(
        (meal) =>
          getMealDietType(meal) ===
          "veg"
      ) ||
      day.defaultMeal ||
      availableMeals[0] ||
      null
    );
  }

  if (
    mealMode === "nonveg" ||
    preference === "nonveg"
  ) {
    return (
      day.nonVegAlternative ||
      availableMeals.find(
        (meal) =>
          getMealDietType(meal) ===
          "nonveg"
      ) ||
      day.defaultMeal ||
      availableMeals[0] ||
      null
    );
  }

  return (
    day.defaultMeal ||
    availableMeals[0] ||
    null
  );
};

const sumMeals = (meals: MealCard[]) =>
  meals.reduce(
    (total, meal) => {
      total.price += Number(
        meal.price || 0
      );

      total.protein += Number(
        meal.protein || 0
      );

      total.calories += Number(
        meal.calories || 0
      );

      total.carbs += Number(
        meal.carbs || 0
      );

      total.fat += Number(
        meal.fat || 0
      );

      return total;
    },
    {
      price: 0,
      protein: 0,
      calories: 0,
      carbs: 0,
      fat: 0,
    }
  );

export default function PlanDetails() {
  const { planId } = useParams();

  const [searchParams] =
    useSearchParams();

  const navigate = useNavigate();

  const { addToCart } =
    useCart();

  const [plan, setPlan] =
    useState<BackendPlan | null>(
      null
    );

  const [
    cartMealsData,
    setCartMealsData,
  ] =
    useState<CartMealsResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [adding, setAdding] =
    useState(false);

  const [
    loadingMeals,
    setLoadingMeals,
  ] = useState(false);

  const [
    preference,
    setPreference,
  ] = useState<UserPreference>(
    getSafePreferenceFromUrl(
      searchParams.get("type")
    ) || "mixed"
  );

  const [planDays, setPlanDays] =
    useState<PlanDaySelection[]>([]);

  const displayTitle =
    plan?.title ||
    "MacroBox Meal Plan";

  const displayDescription =
    plan?.description ||
    "Choose your MacroBox plan, schedule your daily deliveries and enjoy goal-based healthy meals.";

  const durationDays =
    plan?.durationDays || 7;

  const rewardEligible =
    plan?.rewardEligible !== false;

  const mealMode =
    plan?.mealMode ||
    cartMealsData?.plan?.mealMode ||
    "both";

  const displayPrice =
    getPlanPriceByPreference(
      plan ||
        cartMealsData?.plan ||
        null,
      preference
    );

  const originalPrice =
    plan?.originalPrice || null;

  const availablePreferenceOptions =
    useMemo(() => {
      if (mealMode === "veg") {
        return ["veg"] as UserPreference[];
      }

      if (mealMode === "nonveg") {
        return ["nonveg"] as UserPreference[];
      }

      return [
        "mixed",
        "veg",
        "nonveg",
      ] as UserPreference[];
    }, [mealMode]);

  const allMeals = useMemo(() => {
    const fromApi =
      cartMealsData?.meals || [];

    const fromMealSets: MealCard[] =
      [];

    const sets =
      plan?.mealSets;

    (
      [
        "veg",
        "nonveg",
        "mixed",
      ] as const
    ).forEach((key) => {
      const days =
        sets?.[key] || [];

      days.forEach((day) => {
        if (
          day.meal &&
          typeof day.meal !==
            "string"
        ) {
          fromMealSets.push(
            day.meal
          );
        }
      });
    });

    const merged = [
      ...fromApi,
      ...fromMealSets,
    ];

    const map =
      new Map<string, MealCard>();

    merged.forEach((meal) => {
      if (meal?._id) {
        map.set(
          String(meal._id),
          meal
        );
      }
    });

    return Array.from(map.values());
  }, [cartMealsData, plan]);

  const selectedMeals = useMemo(
    () =>
      planDays
        .map((day) =>
          getMealById(
            allMeals,
            day.selectedMealId
          )
        )
        .filter(Boolean) as MealCard[],
    [allMeals, planDays]
  );

  const selectedTotals = useMemo(
    () => sumMeals(selectedMeals),
    [selectedMeals]
  );

  const perks: string[] =
    plan?.perks?.length
      ? plan.perks
      : [
          "Goal-based meals delivered across the plan",
          "Choose Veg, Non-Veg or Mixed",
          "Select daily delivery date and slots from the cart",
          "Pay once and schedule every plan day",
        ];

  const rewards: string[] =
    plan?.rewards?.length
      ? plan.rewards
      : rewardEligible
      ? [
          "Purchase this eligible 7-day plan and receive 10% off your next eligible MacroBox plan.",
        ]
      : [
          "This plan is not eligible for a next-plan reward.",
        ];

  const buildInitialPlanDays = (
    data: CartMealsResponse,
    selectedPreference: UserPreference,
    currentPlan: BackendPlan | null
  ) => {
    const mode =
      data.plan?.mealMode ||
      currentPlan?.mealMode ||
      "both";

    const mealSetDays =
      getMealSetDays(
        currentPlan || data.plan,
        selectedPreference
      );

    if (mealSetDays.length > 0) {
      return mealSetDays
        .filter(
          (day) =>
            day.isActive !== false
        )
        .map((day, index) => ({
          day:
            day.day ||
            index + 1,

          selectedMealId:
            getMealId(day.meal),

          preference:
            selectedPreference,
        }));
    }

    return (data.days || []).map(
      (day) => {
        const selectedMeal =
          pickMealForOldDay(
            day,
            selectedPreference,
            mode
          );

        return {
          day: day.day,

          selectedMealId:
            String(
              selectedMeal?._id ||
                ""
            ),

          preference:
            selectedPreference,
        };
      }
    );
  };

  const loadPlan = async () => {
    try {
      setLoading(true);

      const response =
        await api.get(
          `/plans/${planId}`
        );

      setPlan(response.data);
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data
          ?.message ||
          "Plan not found."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCartMeals =
    async () => {
      try {
        setLoadingMeals(true);

        const response =
          await api.get(
            `/plans/${planId}/cart-meals`
          );

        const data: CartMealsResponse =
          response.data;

        setCartMealsData(data);

        const mode =
          data.plan?.mealMode ||
          "both";

        const urlPreference =
          getSafePreferenceFromUrl(
            searchParams.get("type")
          );

        const defaultPreference: UserPreference =
          urlPreference ||
          (mode === "veg"
            ? "veg"
            : mode === "nonveg"
            ? "nonveg"
            : "mixed");

        setPreference(
          defaultPreference
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data
            ?.message ||
            "Failed to load plan meals."
        );
      } finally {
        setLoadingMeals(false);
      }
    };

  useEffect(() => {
    if (!planId) return;

    void loadPlan();
    void loadCartMeals();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  useEffect(() => {
    if (!cartMealsData) return;

    const mergedPlan =
      plan || cartMealsData.plan;

    setPlanDays(
      buildInitialPlanDays(
        cartMealsData,
        preference,
        mergedPlan
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preference,
    cartMealsData,
    plan,
  ]);

  const addPlanToCart =
    async () => {
      try {
        setAdding(true);

        if (
          !cartMealsData ||
          !planDays.length
        ) {
          toast.error(
            "Plan meals are still loading."
          );

          return;
        }

        const invalidDay =
          planDays.find((day) => {
            const selectedMeal =
              getMealById(
                allMeals,
                day.selectedMealId
              );

            return (
              !day.selectedMealId ||
              !selectedMeal
            );
          });

        if (invalidDay) {
          toast.error(
            `Meal not available for Day ${invalidDay.day}.`
          );

          return;
        }

        const selectedMealsForPlan =
          planDays
            .map((day) =>
              getMealById(
                allMeals,
                day.selectedMealId
              )
            )
            .filter(
              Boolean
            ) as MealCard[];

        const totals =
          sumMeals(
            selectedMealsForPlan
          );

        const finalPlanDays =
          planDays.map((day) => {
            const selectedMeal =
              getMealById(
                allMeals,
                day.selectedMealId
              );

            return {
              day: day.day,
              date: "",
              slot: "",
              preference:
                day.preference,

              selectedMeal:
                selectedMeal?._id ||
                "",

              selectedMealTitle:
                selectedMeal?.title ||
                "Meal",

              selectedMealPrice:
                selectedMeal?.price ||
                0,

              selectedMealProtein:
                selectedMeal?.protein ||
                0,

              selectedMealCalories:
                selectedMeal?.calories ||
                0,

              selectedMealCarbs:
                selectedMeal?.carbs ||
                0,

              selectedMealFat:
                selectedMeal?.fat ||
                0,
            };
          });

        addToCart({
          _id: `plan-${planId}-${preference}`,
          itemType: "plan",
          planId: planId || "",

          title: `${displayTitle} - ${getPreferenceLabel(
            preference
          )}`,

          description: `Includes ${durationDays} meals delivered across ${durationDays} days.`,

          price: Number(
            displayPrice || 0
          ),

          protein:
            totals.protein,

          calories:
            totals.calories,

          carbs: totals.carbs,
          fat: totals.fat,
          qty: 1,
          preference,

          selectedPlanType:
            preference,

          rewardEligible,

          planItems:
            selectedMealsForPlan.map(
              (meal, index) => ({
                _id: String(
                  meal._id
                ),

                title: `Day ${
                  index + 1
                }: ${meal.title}`,

                price: meal.price,
                protein:
                  meal.protein,
                calories:
                  meal.calories,
                carbs: meal.carbs,
                fat: meal.fat,
                qty: 1,
              })
            ),

          planDays:
            finalPlanDays,
        } as any);

        toast.success(
          "Plan added to cart."
        );

        navigate("/cart");
      } catch (error: any) {
        toast.error(
          error?.response?.data
            ?.message ||
            "Failed to add plan."
        );
      } finally {
        setAdding(false);
      }
    };

  if (loading) {
    return <PlanLoading />;
  }

  if (!plan) {
    return (
      <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
        <div className="mb-glass max-w-lg rounded-[30px] p-8 text-center">
          <span className="mb-primary-button mx-auto flex h-14 w-14 items-center justify-center rounded-full">
            <Utensils size={22} />
          </span>

          <h1 className="mb-text mt-5 text-3xl font-light">
            Plan not found
          </h1>

          <p className="mb-text-muted mt-2 text-sm leading-6">
            This plan may have been removed or is currently unavailable.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/plans")
            }
            className="mb-primary-button mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back to plans
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-9 pt-7 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8 lg:pb-16">
            <Link
              to="/plans"
              className="mb-outline-button inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back to plans
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_350px] lg:items-end">
              <div>
                <div className="flex flex-wrap gap-2">
                  {plan.badge && (
                    <span className="mb-highlight-badge rounded-full px-3 py-1 text-[10px] font-semibold">
                      {plan.badge}
                    </span>
                  )}

                  <span className="mb-accent-surface rounded-full px-3 py-1 text-[10px] font-semibold">
                    {getPreferenceLabel(
                      preference
                    )}
                  </span>
                </div>

                <p className="mb-text-faint mt-5 text-[10px] font-semibold uppercase tracking-[0.26em]">
                  MacroBox Plan
                </p>

                <h1 className="mb-text mt-3 max-w-4xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[72px]">
                  {displayTitle}
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  {displayDescription}
                </p>
              </div>

              <PreferenceSelector
                options={
                  availablePreferenceOptions
                }
                preference={preference}
                loading={loadingMeals}
                onChange={setPreference}
              />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="mb-glass overflow-hidden rounded-[30px]">
              <div className="grid grid-cols-3">
                <InfoCard
                  label="Selected type"
                  value={getPreferenceLabel(
                    preference
                  )}
                />

                <InfoCard
                  label="Duration"
                  value={`${durationDays} ${
                    durationDays === 1
                      ? "day"
                      : "days"
                  }`}
                />

                <InfoCard
                  label="Meals ready"
                  value={
                    loadingMeals
                      ? "Loading"
                      : `${selectedMeals.length}/${durationDays}`
                  }
                />
              </div>

              <div className="mb-divider border-t p-5 sm:p-6">
                <div>
                  <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Daily menu
                  </p>

                  <h2 className="mb-text mt-2 text-3xl font-light tracking-[-0.05em]">
                    Meals included
                  </h2>

                  <p className="mb-text-muted mt-2 text-sm">
                    Your selected{" "}
                    {getPreferenceLabel(
                      preference
                    )}{" "}
                    plan menu.
                  </p>
                </div>

                <div className="mt-6">
                  {selectedMeals.length ===
                  0 ? (
                    <EmptyMeals
                      loading={
                        loadingMeals
                      }
                    />
                  ) : (
                    <div className="grid gap-3">
                      {selectedMeals.map(
                        (meal, index) => (
                          <IncludedMealCard
                            key={`${meal._id}-${index}`}
                            meal={meal}
                            day={
                              planDays[
                                index
                              ]?.day ||
                              index + 1
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <PlanCheckoutCard
              preference={preference}
              durationDays={durationDays}
              mealsCount={
                selectedMeals.length
              }
              displayPrice={
                displayPrice
              }
              originalPrice={
                originalPrice
              }
              selectedTotals={
                selectedTotals
              }
              loadingMeals={
                loadingMeals
              }
              adding={adding}
              onAdd={addPlanToCart}
            />
          </section>

          <section className="mt-6 grid gap-5 md:grid-cols-2">
            <BenefitsCard
              title="What you get"
              icon={
                <Sparkles size={20} />
              }
              items={perks}
              type="perk"
            />

            <BenefitsCard
              title="Plan reward"
              icon={<Gift size={20} />}
              items={rewards}
              type="reward"
            />
          </section>

          <HowItWorks />
        </div>
      </div>
    </main>
  );
}

function PlanLoading() {
  return (
    <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
      <div className="mb-glass rounded-[28px] px-8 py-7 text-center">
        <Loader2
          size={30}
          className="mb-text mx-auto animate-spin"
        />

        <p className="mb-text mt-4 text-sm font-medium">
          Loading plan
        </p>

        <p className="mb-text-faint mt-1 text-xs">
          Preparing the plan menu and pricing.
        </p>
      </div>
    </main>
  );
}

function PreferenceSelector({
  options,
  preference,
  loading,
  onChange,
}: {
  options: UserPreference[];
  preference: UserPreference;
  loading: boolean;
  onChange: (
    preference: UserPreference
  ) => void;
}) {
  return (
    <div className="mb-glass rounded-[26px] p-5">
      <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
        Select plan type
      </p>

      <div
        className={`mt-4 grid gap-2 ${
          options.length === 1
            ? "grid-cols-1"
            : options.length === 2
            ? "grid-cols-2"
            : "grid-cols-3"
        }`}
      >
        {options.map((option) => {
          const active =
            preference === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange(option)
              }
              disabled={loading}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-3 text-xs font-medium transition ${
                active
                  ? "mb-primary-button border-transparent"
                  : "mb-outline-button"
              }`}
            >
              {active && (
                <Check size={13} />
              )}

              {getPreferenceLabel(
                option
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoCard({
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

function EmptyMeals({
  loading,
}: {
  loading: boolean;
}) {
  return (
    <div className="mb-glass-subtle rounded-[24px] p-8 text-center">
      {loading ? (
        <Loader2
          size={26}
          className="mb-text mx-auto animate-spin"
        />
      ) : (
        <Utensils
          size={26}
          className="mb-text-faint mx-auto"
        />
      )}

      <p className="mb-text mt-4 text-sm font-medium">
        {loading
          ? "Loading plan meals"
          : "No meals available"}
      </p>

      <p className="mb-text-muted mt-1 text-xs leading-5">
        {loading
          ? "The daily plan menu is being prepared."
          : "No meals are configured for this plan type."}
      </p>
    </div>
  );
}

function IncludedMealCard({
  meal,
  day,
}: {
  meal: MealCard;
  day: number;
}) {
  const image =
    meal.imageUrl ||
    meal.image ||
    "/placeholder-meal.png";

  const diet =
    getMealDietType(meal);

  return (
    <article className="mb-glass-subtle mb-glass-hover overflow-hidden rounded-[22px]">
      <div className="grid grid-cols-[92px_1fr] gap-3 p-3 sm:grid-cols-[112px_1fr_auto] sm:items-center">
        <div className="relative">
          <img
            src={image}
            alt={meal.title}
            className="h-[92px] w-[92px] rounded-[17px] object-cover sm:h-28 sm:w-28"
            onError={(event) => {
              event.currentTarget.src =
                "/placeholder-meal.png";
            }}
          />

          <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-xl">
            Day {day}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${
                diet === "veg"
                  ? "mb-veg-badge"
                  : "mb-nonveg-badge"
              }`}
            >
              {diet === "veg"
                ? "Veg"
                : "Non-Veg"}
            </span>
          </div>

          <h3 className="mb-text mt-2 line-clamp-2 text-sm font-medium sm:text-lg">
            {meal.title}
          </h3>

          <p className="mb-text-muted mt-2 text-[11px] leading-5 sm:text-xs">
            {meal.calories || 0} kcal ·{" "}
            {meal.protein || 0}g protein ·{" "}
            {meal.carbs || 0}g carbs ·{" "}
            {meal.fat || 0}g fat
          </p>

          <p className="mb-text mt-3 text-sm font-medium sm:hidden">
            ₹{meal.price || 0}
          </p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.15em]">
            Meal price
          </p>

          <p className="mb-text mt-2 text-xl font-light">
            ₹{meal.price || 0}
          </p>
        </div>
      </div>
    </article>
  );
}

function PlanCheckoutCard({
  preference,
  durationDays,
  mealsCount,
  displayPrice,
  originalPrice,
  selectedTotals,
  loadingMeals,
  adding,
  onAdd,
}: {
  preference: UserPreference;
  durationDays: number;
  mealsCount: number;
  displayPrice: number;
  originalPrice: number | null;
  selectedTotals: {
    price: number;
    protein: number;
    calories: number;
    carbs: number;
    fat: number;
  };
  loadingMeals: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <aside className="mb-glass h-fit rounded-[30px] p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="mb-accent text-[10px] font-semibold uppercase tracking-[0.19em]">
        Plan price
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <p className="mb-text text-5xl font-light tracking-[-0.06em]">
          ₹{displayPrice}
        </p>

        {originalPrice &&
          originalPrice >
            displayPrice && (
            <p className="mb-text-faint mb-1 text-lg font-medium line-through">
              ₹{originalPrice}
            </p>
          )}
      </div>

      <p className="mb-text-muted mt-4 text-sm leading-6">
        {getPreferenceLabel(preference)} plan ·{" "}
        {durationDays} days ·{" "}
        {mealsCount} meals
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MiniPriceStat
          label="Protein"
          value={`${selectedTotals.protein}g`}
        />

        <MiniPriceStat
          label="Calories"
          value={`${selectedTotals.calories}`}
        />

        <MiniPriceStat
          label="Carbs"
          value={`${selectedTotals.carbs}g`}
        />

        <MiniPriceStat
          label="Fat"
          value={`${selectedTotals.fat}g`}
        />
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={
          adding ||
          loadingMeals ||
          mealsCount === 0
        }
        className="mb-primary-button mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
      >
        {adding || loadingMeals ? (
          <Loader2
            size={18}
            className="animate-spin"
          />
        ) : (
          <ShoppingCart size={18} />
        )}

        {adding
          ? "Adding plan..."
          : loadingMeals
          ? "Loading meals..."
          : "Add plan to cart"}

        {!adding &&
          !loadingMeals && (
            <ArrowRight size={17} />
          )}
      </button>

      <p className="mb-text-faint mt-4 text-center text-[11px] leading-5">
        Delivery dates and slots for every plan day are selected from the cart.
      </p>
    </aside>
  );
}

function MiniPriceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[17px] p-3">
      <p className="mb-text-faint text-[8px] uppercase tracking-[0.13em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function BenefitsCard({
  title,
  icon,
  items,
  type,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  type: "perk" | "reward";
}) {
  return (
    <section className="mb-glass rounded-[30px] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            type === "reward"
              ? "mb-highlight-badge"
              : "mb-accent-surface"
          }`}
        >
          {icon}
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.17em]">
            {type === "reward"
              ? "Member benefit"
              : "Plan benefits"}
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className={`flex items-start gap-3 rounded-[20px] border p-4 ${
              type === "reward"
                ? "mb-highlight-badge"
                : "mb-glass-subtle"
            }`}
          >
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      text: "Choose Mixed, Veg or Non-Veg.",
    },
    {
      number: "02",
      text: "Add the complete plan to your cart.",
    },
    {
      number: "03",
      text: "Select delivery dates and slots for each day.",
    },
    {
      number: "04",
      text: "Pay once and unlock eligible rewards.",
    },
  ];

  return (
    <section className="mb-glass mt-6 rounded-[30px] p-5 sm:p-6">
      <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
        Simple process
      </p>

      <h2 className="mb-text mt-2 text-3xl font-light tracking-[-0.05em]">
        How it works
      </h2>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="mb-glass-subtle rounded-[22px] p-4"
          >
            <span className="mb-primary-button flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium">
              {step.number}
            </span>

            <p className="mb-text-soft mt-4 text-sm leading-6">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}