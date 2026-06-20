// frontend/src/pages/SmartDayPlanner.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Beef,
  CalendarDays,
  Check,
  CheckSquare,
  Flame,
  ListChecks,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  ShoppingCart,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

type GoalType =
  | "weight_loss"
  | "maintenance"
  | "weight_gain"
  | "muscle_gain"
  | "fat_loss";

type MealTime =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner";

interface Meal {
  _id: string;
  title: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  price?: number;
  imageUrl?: string;
  goalTypes?: string[];
  isAvailable?: boolean;
}

interface SavedPlan {
  _id: string;
  name?: string;
  planName?: string;
  title?: string;
  date: string;

  items: {
    meal: Meal;
    times: MealTime[];
  }[];
}

type BodyMetrics = {
  height?: number;
  weight?: number;
  age?: number;
  gender?: "male" | "female";
  activity?: string;
  goalWeight?: number;
};

type SelectedEntry = {
  meal: Meal;
  times: MealTime[];
};

type PlannedTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  items: number;
};

const TIMES: MealTime[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
];

const timeLabels: Record<
  MealTime,
  string
> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const shortTimeLabels: Record<
  MealTime,
  string
> = {
  breakfast: "B",
  lunch: "L",
  snack: "S",
  dinner: "D",
};

const activityMultipliers: Record<
  string,
  number
> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const goalLabels: Record<
  GoalType,
  string
> = {
  weight_loss: "Weight Loss",
  maintenance: "Maintenance",
  weight_gain: "Weight Gain",
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
};

const goalStorageKey = (
  userId?: string
) =>
  `macrotrack-goal-${
    userId || "guest"
  }`;

const numberOrZero = (
  value: unknown
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.max(
    min,
    Math.min(max, value)
  );

const todayText = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const savedPlanName = (
  plan: SavedPlan
) =>
  plan.name ||
  plan.planName ||
  plan.title ||
  `Saved Plan - ${new Date(
    plan.date
  ).toLocaleDateString("en-IN")}`;

const emptyTotals = (): PlannedTotals => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  price: 0,
  items: 0,
});

export default function SmartDayPlanner() {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [selected, setSelected] =
    useState<
      Record<string, MealTime[]>
    >({});

  const [planName, setPlanName] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [history, setHistory] =
    useState<SavedPlan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [goal, setGoal] =
    useState<GoalType>("fat_loss");

  const [
    bodyMetrics,
    setBodyMetrics,
  ] = useState<BodyMetrics | null>(
    null
  );

  const [
    showGoalDrawer,
    setShowGoalDrawer,
  ] = useState(false);

  const [
    showSaveDrawer,
    setShowSaveDrawer,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const savedGoal =
          localStorage.getItem(
            goalStorageKey(user?._id)
          );

        if (
          savedGoal &&
          mounted
        ) {
          setGoal(
            savedGoal as GoalType
          );
        }

        const [
          mealsResult,
          historyResult,
          userResult,
        ] =
          await Promise.allSettled([
            api.get("/meals", {
              params: {
                all: "true",
              },
            }),

            api.get("/user/day-plan"),

            api.get("/user/me"),
          ]);

        if (!mounted) return;

        if (
          mealsResult.status ===
          "fulfilled"
        ) {
          const data =
            mealsResult.value.data;

          const allMeals: Meal[] =
            Array.isArray(data)
              ? data
              : data?.meals || [];

          setMeals(
            allMeals.filter(
              (meal) =>
                meal.isAvailable !==
                false
            )
          );
        }

        if (
          historyResult.status ===
          "fulfilled"
        ) {
          const data =
            historyResult.value.data;

          setHistory(
            Array.isArray(data)
              ? data
              : []
          );
        }

        if (
          userResult.status ===
          "fulfilled"
        ) {
          setBodyMetrics(
            userResult.value.data
              ?.bodyMetrics || null
          );
        }
      } catch (error) {
        console.error(
          "SMART DAY PLANNER LOAD ERROR:",
          error
        );

        toast.error(
          "Failed to load Smart Day Planner."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [user?._id]);

  useEffect(() => {
    localStorage.setItem(
      goalStorageKey(user?._id),
      goal
    );
  }, [goal, user?._id]);

  const fetchHistory = async () => {
    const response = await api.get(
      "/user/day-plan"
    );

    setHistory(
      Array.isArray(response.data)
        ? response.data
        : []
    );
  };

  const macroGoals = useMemo(() => {
    const height = numberOrZero(
      bodyMetrics?.height
    );

    const weight = numberOrZero(
      bodyMetrics?.weight
    );

    const age = numberOrZero(
      bodyMetrics?.age
    );

    const goalWeight = numberOrZero(
      bodyMetrics?.goalWeight
    );

    const gender =
      bodyMetrics?.gender || "male";

    const activity =
      bodyMetrics?.activity ||
      "moderate";

    if (!height || !weight || !age) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        maintenance: 0,
      };
    }

    const bmr =
      gender === "male"
        ? 10 * weight +
          6.25 * height -
          5 * age +
          5
        : 10 * weight +
          6.25 * height -
          5 * age -
          161;

    const maintenance =
      Math.round(
        bmr *
          (activityMultipliers[
            activity
          ] || 1.55)
      );

    let adjustment = 0;

    if (
      goal === "weight_loss"
    ) {
      adjustment = -450;
    }

    if (goal === "fat_loss") {
      adjustment = -550;
    }

    if (
      goal === "weight_gain"
    ) {
      adjustment = 400;
    }

    if (
      goal === "muscle_gain"
    ) {
      adjustment = 250;
    }

    if (goalWeight && weight) {
      const raw = Math.round(
        ((goalWeight - weight) *
          7700) /
          60
      );

      adjustment = clamp(
        raw,
        -700,
        700
      );
    }

    const calories = Math.max(
      1200,
      maintenance + adjustment
    );

    let proteinMultiplier = 1.6;
    let fatRatio = 0.25;

    if (goal === "fat_loss") {
      proteinMultiplier = 2.2;
    }

    if (
      goal === "weight_loss"
    ) {
      proteinMultiplier = 2;
    }

    if (
      goal === "muscle_gain"
    ) {
      proteinMultiplier = 2.1;
    }

    if (
      goal === "weight_gain"
    ) {
      proteinMultiplier = 1.8;
      fatRatio = 0.28;
    }

    const protein = Math.round(
      weight * proteinMultiplier
    );

    const fat = Math.round(
      (calories * fatRatio) / 9
    );

    const carbs = Math.round(
      Math.max(
        calories -
          protein * 4 -
          fat * 9,
        0
      ) / 4
    );

    return {
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
      maintenance,
    };
  }, [bodyMetrics, goal]);

  const selectedEntries =
    useMemo<SelectedEntry[]>(() => {
      return Object.entries(selected)
        .filter(
          ([, times]) =>
            times.length > 0
        )
        .map(([mealId, times]) => {
          const meal = meals.find(
            (item) =>
              item._id === mealId
          );

          return meal
            ? {
                meal,
                times,
              }
            : null;
        })
        .filter(
          (
            entry
          ): entry is SelectedEntry =>
            Boolean(entry)
        );
    }, [selected, meals]);

  const plannedTotals =
    useMemo<PlannedTotals>(() => {
      return selectedEntries.reduce(
        (total, entry) => {
          const count =
            entry.times.length;

          total.calories +=
            numberOrZero(
              entry.meal.calories
            ) * count;

          total.protein +=
            numberOrZero(
              entry.meal.protein
            ) * count;

          total.carbs +=
            numberOrZero(
              entry.meal.carbs
            ) * count;

          total.fat +=
            numberOrZero(
              entry.meal.fat
            ) * count;

          total.price +=
            numberOrZero(
              entry.meal.price
            ) * count;

          total.items += count;

          return total;
        },
        emptyTotals()
      );
    }, [selectedEntries]);

  const remaining = {
    calories: Math.max(
      macroGoals.calories -
        plannedTotals.calories,
      0
    ),

    protein: Math.max(
      macroGoals.protein -
        plannedTotals.protein,
      0
    ),

    carbs: Math.max(
      macroGoals.carbs -
        plannedTotals.carbs,
      0
    ),

    fat: Math.max(
      macroGoals.fat -
        plannedTotals.fat,
      0
    ),
  };

  const toggleSelect = (
    mealId: string,
    time: MealTime
  ) => {
    setSelected((previous) => {
      const current =
        previous[mealId] || [];

      const exists =
        current.includes(time);

      return {
        ...previous,

        [mealId]: exists
          ? current.filter(
              (item) =>
                item !== time
            )
          : [...current, time],
      };
    });
  };

  const scoreMeal = (
    meal: Meal,
    remainingCalories: number,
    remainingProtein: number
  ) => {
    const calories = numberOrZero(
      meal.calories
    );

    const protein = numberOrZero(
      meal.protein
    );

    const carbs = numberOrZero(
      meal.carbs
    );

    const fat = numberOrZero(
      meal.fat
    );

    const proteinScore =
      remainingProtein > 0
        ? Math.min(
            protein /
              remainingProtein,
            1.5
          ) * 50
        : 0;

    const calorieFit =
      remainingCalories > 0
        ? 30 -
          Math.abs(
            remainingCalories / 4 -
              calories
          ) /
            20
        : 0;

    const hasGoalTag =
      goal === "fat_loss"
        ? meal.goalTypes?.includes(
            "fat_loss"
          )
        : goal === "muscle_gain"
        ? meal.goalTypes?.includes(
            "muscle_gain"
          )
        : goal === "weight_gain"
        ? meal.goalTypes?.includes(
            "weight_gain"
          )
        : true;

    const tagBonus =
      hasGoalTag ? 20 : 0;

    const goalBonus =
      goal === "fat_loss" &&
      protein >= 25 &&
      calories <= 600
        ? 20
        : goal ===
            "muscle_gain" &&
          protein >= 30
        ? 20
        : goal ===
            "weight_gain" &&
          calories >= 500
        ? 15
        : 0;

    const macroPenalty =
      fat > 35 ? 10 : 0;

    const carbBonus =
      carbs > 0 ? 5 : 0;

    return (
      proteinScore +
      calorieFit +
      goalBonus +
      tagBonus +
      carbBonus -
      macroPenalty
    );
  };

  const autoSmartDayPlanner = () => {
    if (!meals.length) {
      toast.error(
        "No meals are currently available."
      );

      return;
    }

    if (!macroGoals.calories) {
      toast.error(
        "Complete your body details in MacroTrack first."
      );

      return;
    }

    let remainingCalories =
      macroGoals.calories;

    let remainingProtein =
      macroGoals.protein;

    const usedMealIds =
      new Set<string>();

    const nextSelected: Record<
      string,
      MealTime[]
    > = {};

    TIMES.forEach((time) => {
      const candidates = meals
        .filter(
          (meal) =>
            !usedMealIds.has(
              meal._id
            )
        )
        .map((meal) => ({
          meal,

          score: scoreMeal(
            meal,
            remainingCalories,
            remainingProtein
          ),
        }))
        .sort(
          (a, b) =>
            b.score - a.score
        );

      const best =
        candidates[0]?.meal;

      if (!best) return;

      usedMealIds.add(best._id);

      nextSelected[best._id] = [
        ...(nextSelected[
          best._id
        ] || []),

        time,
      ];

      remainingCalories -=
        numberOrZero(
          best.calories
        );

      remainingProtein -=
        numberOrZero(
          best.protein
        );
    });

    setSelected(nextSelected);

    toast.success(
      "Smart day plan generated."
    );
  };

  const clearPlan = () => {
    setSelected({});
    setPlanName("");

    toast.success(
      "Current plan cleared."
    );
  };

  const handleSavePlan = async () => {
    const cleanName =
      planName.trim();

    if (!cleanName) {
      toast.error(
        "Enter a plan name before saving."
      );

      return;
    }

    const items = Object.entries(
      selected
    )
      .filter(
        ([, times]) =>
          times.length > 0
      )
      .map(([mealId, times]) => ({
        mealId,
        times,
      }));

    if (items.length === 0) {
      toast.error(
        "Select at least one meal."
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/user/day-plan",
        {
          name: cleanName,
          planName: cleanName,
          items,
        }
      );

      setSelected({});
      setPlanName("");
      setShowSaveDrawer(false);

      await fetchHistory();

      toast.success(
        "Day plan saved."
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.message ||
          "Failed to save plan."
      );
    } finally {
      setSaving(false);
    }
  };

  const addSelectedPlanToCart =
    () => {
      if (
        selectedEntries.length ===
        0
      ) {
        toast.error(
          "Select at least one meal."
        );

        return;
      }

      selectedEntries.forEach(
        ({ meal, times }) => {
          times.forEach(() => {
            addToCart({
              _id: meal._id,
              title: meal.title,
              price: numberOrZero(
                meal.price
              ),
              protein: numberOrZero(
                meal.protein
              ),
              calories: numberOrZero(
                meal.calories
              ),
              carbs: numberOrZero(
                meal.carbs
              ),
              fat: numberOrZero(
                meal.fat
              ),
              imageUrl:
                meal.imageUrl,
            });
          });
        }
      );

      toast.success(
        "Selected day plan added to cart."
      );
    };

  const addSavedPlanToCart = (
    plan: SavedPlan
  ) => {
    if (!plan.items?.length) {
      toast.error(
        "This saved plan has no meals."
      );

      return;
    }

    plan.items.forEach((item) => {
      item.times.forEach(() => {
        addToCart({
          _id: item.meal._id,
          title: item.meal.title,
          price: numberOrZero(
            item.meal.price
          ),
          protein: numberOrZero(
            item.meal.protein
          ),
          calories: numberOrZero(
            item.meal.calories
          ),
          carbs: numberOrZero(
            item.meal.carbs
          ),
          fat: numberOrZero(
            item.meal.fat
          ),
          imageUrl:
            item.meal.imageUrl,
        });
      });
    });

    toast.success(
      `${savedPlanName(
        plan
      )} added to cart.`
    );
  };

  const deletePlan = async (
    id: string
  ) => {
    const shouldDelete =
      window.confirm(
        "Delete this saved plan?"
      );

    if (!shouldDelete) return;

    try {
      await api.delete(
        `/user/day-plan/${id}`
      );

      await fetchHistory();

      toast.success(
        "Saved plan deleted."
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.message ||
          "Failed to delete plan."
      );
    }
  };

  if (loading) {
    return <PlannerLoading />;
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                  MacroBox Planner
                </p>

                <h1 className="mb-text mt-4 max-w-3xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[76px]">
                  Plan a smarter
                  <br />
                  day of meals.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Build a full-day meal
                  plan around your calories,
                  protein, carbs and fat.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HeaderSummary
                  label="Current goal"
                  value={
                    goalLabels[goal]
                  }
                  icon={
                    <Target size={17} />
                  }
                  accent
                />

                <HeaderSummary
                  label="Today"
                  value={todayText()}
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="mb-glass overflow-hidden rounded-[30px]">
            <div className="mb-divider flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Personalized planning
                </p>

                <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
                  Smart plan builder
                </h2>

                <p className="mb-text-muted mt-2 text-sm leading-6">
                  Generate a complete plan
                  automatically or choose
                  each meal manually.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() =>
                    setShowGoalDrawer(
                      true
                    )
                  }
                  className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <Pencil size={16} />
                  Change goal
                </button>

                <button
                  type="button"
                  onClick={
                    autoSmartDayPlanner
                  }
                  className="mb-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <Sparkles size={17} />
                  Auto plan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4">
              <ControlBox
                label="Goal"
                value={
                  goalLabels[goal]
                }
                icon={
                  <Target size={16} />
                }
              />

              <ControlBox
                label="Selected"
                value={`${plannedTotals.items} ${
                  plannedTotals.items ===
                  1
                    ? "item"
                    : "items"
                }`}
                icon={
                  <CheckSquare
                    size={16}
                  />
                }
              />

              <ControlBox
                label="Available"
                value={`${meals.length} meals`}
                icon={
                  <Utensils
                    size={16}
                  />
                }
              />

              <ControlBox
                label="Saved"
                value={`${history.length} ${
                  history.length === 1
                    ? "plan"
                    : "plans"
                }`}
                icon={
                  <Save size={16} />
                }
              />
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 lg:grid-cols-4">
            <GoalCard
              icon={
                <Flame size={18} />
              }
              title="Calories"
              planned={
                plannedTotals.calories
              }
              target={
                macroGoals.calories
              }
              remaining={
                remaining.calories
              }
              unit="kcal"
            />

            <GoalCard
              icon={
                <Beef size={18} />
              }
              title="Protein"
              planned={
                plannedTotals.protein
              }
              target={
                macroGoals.protein
              }
              remaining={
                remaining.protein
              }
              unit="g"
            />

            <GoalCard
              icon={
                <Target size={18} />
              }
              title="Carbs"
              planned={
                plannedTotals.carbs
              }
              target={
                macroGoals.carbs
              }
              remaining={
                remaining.carbs
              }
              unit="g"
            />

            <GoalCard
              icon={
                <Utensils
                  size={18}
                />
              }
              title="Fat"
              planned={
                plannedTotals.fat
              }
              target={macroGoals.fat}
              remaining={
                remaining.fat
              }
              unit="g"
            />
          </section>

          {!macroGoals.calories && (
            <div className="mb-warning-badge mt-5 rounded-[22px] border p-4 text-sm leading-6">
              Complete your body details
              in MacroTrack first to
              generate accurate macro
              targets and automatic plans.
            </div>
          )}

          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
            <div className="min-w-0">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Meal selection
                  </p>

                  <h2 className="mb-text mt-2 text-3xl font-light tracking-[-0.045em]">
                    Choose your meals
                  </h2>

                  <p className="mb-text-muted mt-2 text-sm leading-6">
                    Assign each meal to
                    breakfast, lunch, snack
                    or dinner.
                  </p>
                </div>

                <TimeLegend />
              </div>

              {meals.length === 0 ? (
                <EmptyState
                  title="No meals available"
                  description="Add available meals from the admin panel to use the Smart Day Planner."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {meals.map((meal) => {
                    const selectedTimes =
                      selected[
                        meal._id
                      ] || [];

                    return (
                      <MealSelectionCard
                        key={meal._id}
                        meal={meal}
                        selectedTimes={
                          selectedTimes
                        }
                        onToggle={(
                          time
                        ) =>
                          toggleSelect(
                            meal._id,
                            time
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <SelectedPlanPanel
              entries={
                selectedEntries
              }
              totals={
                plannedTotals
              }
              onSave={() =>
                setShowSaveDrawer(
                  true
                )
              }
              onCart={
                addSelectedPlanToCart
              }
              onClear={clearPlan}
            />
          </section>

          <SavedPlansSection
            history={history}
            onAddToCart={
              addSavedPlanToCart
            }
            onDelete={deletePlan}
          />
        </div>
      </div>

      {showGoalDrawer && (
        <Drawer
          title="Change goal"
          subtitle="Choose the goal used for meal scoring and smart plan generation."
          onClose={() =>
            setShowGoalDrawer(
              false
            )
          }
        >
          <ThemeField label="Fitness goal">
            <select
              value={goal}
              onChange={(event) =>
                setGoal(
                  event.target
                    .value as GoalType
                )
              }
              className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
            >
              <option value="fat_loss">
                Fat Loss
              </option>

              <option value="weight_loss">
                Weight Loss
              </option>

              <option value="maintenance">
                Maintenance
              </option>

              <option value="weight_gain">
                Weight Gain
              </option>

              <option value="muscle_gain">
                Muscle Gain
              </option>
            </select>
          </ThemeField>

          <button
            type="button"
            onClick={() => {
              setShowGoalDrawer(false);

              toast.success(
                `Goal changed to ${
                  goalLabels[goal]
                }.`
              );
            }}
            className="mb-primary-button mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            <Check size={18} />
            Save goal
          </button>
        </Drawer>
      )}

      {showSaveDrawer && (
        <Drawer
          title="Save day plan"
          subtitle="Give this day plan a name so you can reuse it later."
          onClose={() =>
            setShowSaveDrawer(
              false
            )
          }
        >
          <ThemeField label="Plan name">
            <input
              value={planName}
              onChange={(event) =>
                setPlanName(
                  event.target.value
                )
              }
              placeholder="Example: High Protein Monday"
              className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
            />
          </ThemeField>

          <div className="mb-glass-subtle mt-5 rounded-[22px] p-4">
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.16em]">
              Selected summary
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryValue
                label="Items"
                value={String(
                  plannedTotals.items
                )}
              />

              <SummaryValue
                label="Price"
                value={`₹${plannedTotals.price}`}
              />

              <SummaryValue
                label="Calories"
                value={`${plannedTotals.calories} kcal`}
              />

              <SummaryValue
                label="Protein"
                value={`${plannedTotals.protein}g`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleSavePlan
            }
            disabled={saving}
            className="mb-primary-button mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            {saving ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            {saving
              ? "Saving plan..."
              : "Save plan"}
          </button>
        </Drawer>
      )}
    </main>
  );
}

function PlannerLoading() {
  return (
    <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
      <div className="mb-glass rounded-[28px] px-8 py-7 text-center">
        <Loader2
          size={30}
          className="mb-text mx-auto animate-spin"
        />

        <p className="mb-text mt-4 text-sm font-medium">
          Loading Smart Day Planner
        </p>

        <p className="mb-text-faint mt-1 text-xs">
          Preparing meals and saved plans.
        </p>
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
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-glass min-w-0 rounded-[22px] p-4 sm:min-w-[180px]">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent
            ? "mb-accent-surface"
            : "mb-outline-button"
        }`}
      >
        {icon}
      </div>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium sm:text-base">
        {value}
      </p>
    </div>
  );
}

function ControlBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-divider min-w-0 border-b border-r p-4 sm:p-5">
      <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium sm:text-base">
        {value}
      </p>
    </div>
  );
}

function GoalCard({
  icon,
  title,
  planned,
  target,
  remaining,
  unit,
}: {
  icon: ReactNode;
  title: string;
  planned: number;
  target: number;
  remaining: number;
  unit: string;
}) {
  const percent =
    target > 0
      ? clamp(
          (planned / target) *
            100,
          0,
          100
        )
      : 0;

  return (
    <article className="mb-glass mb-glass-hover rounded-[26px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full">
          {icon}
        </span>

        <div className="text-right">
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.13em]">
            {title}
          </p>

          <p className="mb-accent mt-1 text-xs font-semibold">
            {Math.round(percent)}%
          </p>
        </div>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[var(--mb-surface-strong)]">
        <div
          className="h-full rounded-full bg-[var(--mb-accent)] transition-[width] duration-500"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <p className="mb-text mt-5 text-xl font-light leading-none sm:text-2xl">
        {planned}

        <span className="mb-text-faint text-xs font-medium">
          {" "}
          / {target || "—"} {unit}
        </span>
      </p>

      <p className="mb-text-muted mt-2 text-xs">
        <span className="mb-accent font-semibold">
          {remaining} {unit}
        </span>{" "}
        remaining
      </p>
    </article>
  );
}

function TimeLegend() {
  return (
    <div className="macrobox-hide-scrollbar flex max-w-full gap-2 overflow-x-auto">
      {TIMES.map((time) => (
        <span
          key={time}
          className="mb-outline-button inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[10px] font-medium"
        >
          <strong className="mb-text">
            {shortTimeLabels[time]}
          </strong>

          {timeLabels[time]}
        </span>
      ))}
    </div>
  );
}

function MealSelectionCard({
  meal,
  selectedTimes,
  onToggle,
}: {
  meal: Meal;
  selectedTimes: MealTime[];
  onToggle: (time: MealTime) => void;
}) {
  const selected =
    selectedTimes.length > 0;

  return (
    <article
      className={`group overflow-hidden rounded-[26px] border backdrop-blur-2xl transition duration-300 ${
        selected
          ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] shadow-[var(--mb-shadow-small)]"
          : "mb-glass mb-glass-hover"
      }`}
    >
      <div className="relative h-32 overflow-hidden bg-black/10 sm:h-40">
        <img
          src={
            meal.imageUrl ||
            "/placeholder-meal.png"
          }
          alt={meal.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src =
              "/placeholder-meal.png";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

        {selected && (
          <span className="mb-accent-surface absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-semibold">
            <Check size={11} />
            Selected
          </span>
        )}

        <span className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-xl">
          ₹{numberOrZero(meal.price)}
        </span>
      </div>

      <div className="p-3.5 sm:p-4">
        <h3 className="mb-text line-clamp-2 min-h-[40px] text-sm font-medium leading-5 sm:text-base">
          {meal.title}
        </h3>

        <p className="mb-text-muted mt-2 text-[11px] leading-5">
          {numberOrZero(
            meal.calories
          )}{" "}
          kcal ·{" "}
          {numberOrZero(
            meal.protein
          )}
          g protein
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MacroChip
            label="Carbs"
            value={`${numberOrZero(
              meal.carbs
            )}g`}
          />

          <MacroChip
            label="Fat"
            value={`${numberOrZero(
              meal.fat
            )}g`}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {TIMES.map((time) => {
            const active =
              selectedTimes.includes(
                time
              );

            return (
              <button
                key={time}
                type="button"
                title={
                  timeLabels[time]
                }
                onClick={() =>
                  onToggle(time)
                }
                className={`flex h-9 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  active
                    ? "border-transparent bg-[var(--mb-button-bg)] text-[var(--mb-button-text)] shadow-[var(--mb-shadow-small)]"
                    : "border-[var(--mb-border)] bg-[var(--mb-surface)] text-[var(--mb-text-soft)] hover:border-[var(--mb-border-hover)] hover:bg-[var(--mb-surface-hover)]"
                }`}
              >
                {shortTimeLabels[time]}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function MacroChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-xl px-2.5 py-2">
      <p className="mb-text-faint text-[8px] uppercase tracking-wider">
        {label}
      </p>

      <p className="mb-text-soft mt-0.5 text-[11px] font-medium">
        {value}
      </p>
    </div>
  );
}

function SelectedPlanPanel({
  entries,
  totals,
  onSave,
  onCart,
  onClear,
}: {
  entries: SelectedEntry[];
  totals: PlannedTotals;
  onSave: () => void;
  onCart: () => void;
  onClear: () => void;
}) {
  return (
    <aside className="mb-glass h-fit rounded-[30px] p-5 lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            Your selection
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
            Selected plan
          </h2>

          <p className="mb-text-muted mt-2 text-sm">
            {totals.items}{" "}
            {totals.items === 1
              ? "item"
              : "items"}{" "}
            selected
          </p>
        </div>

        <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
          <ListChecks size={20} />
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="mb-glass-subtle mt-5 rounded-[22px] p-6 text-center">
          <Sparkles
            size={26}
            className="mb-text-faint mx-auto"
          />

          <p className="mb-text mt-3 text-sm font-medium">
            Your plan is empty
          </p>

          <p className="mb-text-faint mt-1 text-xs leading-5">
            Use Auto Plan or select meal
            times manually.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-themed-scrollbar mt-5 max-h-[475px] space-y-3 overflow-y-auto pr-1">
            {TIMES.map((time) => {
              const items =
                entries.filter(
                  (entry) =>
                    entry.times.includes(
                      time
                    )
                );

              return (
                <SelectedTimeGroup
                  key={time}
                  time={time}
                  meals={items.map(
                    (entry) =>
                      entry.meal
                  )}
                />
              );
            })}
          </div>

          <div className="mb-divider mt-5 border-t pt-5">
            <div className="grid grid-cols-2 gap-3">
              <SummaryValue
                label="Total price"
                value={`₹${totals.price}`}
              />

              <SummaryValue
                label="Calories"
                value={`${totals.calories} kcal`}
              />

              <SummaryValue
                label="Protein"
                value={`${totals.protein}g`}
              />

              <SummaryValue
                label="Meals"
                value={String(
                  totals.items
                )}
              />
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={onSave}
                className="mb-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                <Save size={16} />
                Save plan
              </button>

              <button
                type="button"
                onClick={onCart}
                className="mb-accent-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                <ShoppingCart
                  size={16}
                />
                Add to cart
              </button>

              <button
                type="button"
                onClick={onClear}
                className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                <RotateCcw size={16} />
                Clear plan
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function SelectedTimeGroup({
  time,
  meals,
}: {
  time: MealTime;
  meals: Meal[];
}) {
  return (
    <section className="mb-glass-subtle rounded-[20px] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.15em]">
          {timeLabels[time]}
        </p>

        <span className="mb-outline-button flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold">
          {shortTimeLabels[time]}
        </span>
      </div>

      {meals.length === 0 ? (
        <p className="mb-text-extra-faint mt-3 text-xs">
          No meal selected
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {meals.map((meal) => (
            <div
              key={`${time}-${meal._id}`}
              className="mb-glass rounded-[16px] p-3"
            >
              <p className="mb-text line-clamp-1 text-xs font-medium sm:text-sm">
                {meal.title}
              </p>

              <p className="mb-text-faint mt-1 text-[10px] leading-4">
                {numberOrZero(
                  meal.calories
                )}{" "}
                kcal ·{" "}
                {numberOrZero(
                  meal.protein
                )}
                g P · ₹
                {numberOrZero(
                  meal.price
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[16px] p-3">
      <p className="mb-text-faint text-[8px] uppercase tracking-[0.13em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function SavedPlansSection({
  history,
  onAddToCart,
  onDelete,
}: {
  history: SavedPlan[];
  onAddToCart: (
    plan: SavedPlan
  ) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mb-glass mt-6 overflow-hidden rounded-[30px]">
      <div className="mb-divider flex items-center gap-3 border-b p-5 sm:p-6">
        <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
          <Save size={19} />
        </span>

        <div>
          <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            Plan history
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
            Saved plans
          </h2>
        </div>
      </div>

      <div className="p-4 sm:p-5 lg:p-6">
        {history.length === 0 ? (
          <EmptyState
            title="No saved plans yet"
            description="Create a day plan, give it a name, and save it for later."
          />
        ) : (
          <div className="grid gap-4">
            {history.map((plan) => (
              <SavedPlanCard
                key={plan._id}
                plan={plan}
                onAddToCart={() =>
                  onAddToCart(plan)
                }
                onDelete={() =>
                  onDelete(plan._id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SavedPlanCard({
  plan,
  onAddToCart,
  onDelete,
}: {
  plan: SavedPlan;
  onAddToCart: () => void;
  onDelete: () => void;
}) {
  const totals =
    plan.items.reduce(
      (total, item) => {
        const count =
          item.times.length;

        total.calories +=
          numberOrZero(
            item.meal?.calories
          ) * count;

        total.protein +=
          numberOrZero(
            item.meal?.protein
          ) * count;

        total.carbs +=
          numberOrZero(
            item.meal?.carbs
          ) * count;

        total.fat +=
          numberOrZero(
            item.meal?.fat
          ) * count;

        total.price +=
          numberOrZero(
            item.meal?.price
          ) * count;

        total.items += count;

        return total;
      },
      emptyTotals()
    );

  return (
    <article className="mb-glass-subtle mb-glass-hover rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="mb-text text-lg font-medium tracking-[-0.02em]">
            {savedPlanName(plan)}
          </h3>

          <p className="mb-text-faint mt-1 text-xs">
            {new Date(
              plan.date
            ).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium">
              {totals.items} items
            </span>

            <span className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium">
              {totals.calories} kcal
            </span>

            <span className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium">
              {totals.protein}g protein
            </span>

            <span className="mb-accent-surface rounded-full px-3 py-1 text-[10px] font-semibold">
              ₹{totals.price}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={onAddToCart}
            className="mb-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium sm:text-sm"
          >
            <ShoppingCart
              size={15}
            />
            Add to cart
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-4 text-xs font-medium text-red-200 transition hover:bg-red-500/20 sm:text-sm"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {plan.items.map(
          (item, index) => (
            <div
              key={`${plan._id}-${
                item.meal?._id ||
                index
              }-${index}`}
              className="mb-glass rounded-[18px] p-3"
            >
              <p className="mb-text line-clamp-1 text-sm font-medium">
                {item.meal?.title ||
                  "Meal"}
              </p>

              <p className="mb-accent mt-1 text-[10px] font-semibold">
                {item.times
                  .map(
                    (time) =>
                      timeLabels[time]
                  )
                  .join(", ")}
              </p>

              <p className="mb-text-faint mt-2 text-[10px] leading-4">
                {numberOrZero(
                  item.meal
                    ?.calories
                )}{" "}
                kcal ·{" "}
                {numberOrZero(
                  item.meal
                    ?.protein
                )}
                g protein · ₹
                {numberOrZero(
                  item.meal?.price
                )}
              </p>
            </div>
          )
        )}
      </div>
    </article>
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
    <div className="mb-glass-subtle rounded-[26px] p-8 text-center sm:p-10">
      <span className="mb-primary-button mx-auto flex h-14 w-14 items-center justify-center rounded-full">
        <CheckSquare size={23} />
      </span>

      <p className="mb-text mt-5 text-base font-medium">
        {title}
      </p>

      <p className="mb-text-muted mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
    </div>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      <aside className="mb-divider absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[32px] border-t bg-[var(--mb-bg-secondary)] shadow-[var(--mb-shadow-large)] sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[460px] sm:rounded-none sm:border-l sm:border-t-0">
        <div className="mb-divider flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <div>
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
              Smart Day Planner
            </p>

            <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mb-text-muted mt-2 text-sm leading-6">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mb-outline-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-themed-scrollbar flex-1 overflow-y-auto p-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}

function ThemeField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-text-faint mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>

      {children}
    </label>
  );
}