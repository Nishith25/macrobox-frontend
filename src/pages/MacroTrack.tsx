// frontend/src/pages/MacroTrack.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Apple,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import {
  calculateMacroTargets,
  type GoalType,
} from "../utils/macroCalculator";


type MealType =
  | "Breakfast"
  | "Lunch"
  | "Snack"
  | "Dinner";

type FoodLogItem = {
  id: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "macrobox";
};

type Meal = {
  _id: string;
  title: string;
  price?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  image?: string;
  imageUrl?: string;
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

const activityLabels: Record<
  string,
  string
> = {
  sedentary: "Sedentary",
  light: "Light Active",
  moderate: "Moderately Active",
  active: "Very Active",
  very_active: "Athlete",
};

const todayKey = () =>
  new Date().toISOString().slice(0, 10);

const todayText = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const foodLogStorageKey = (
  userId?: string
) =>
  `macrotrack-food-log-${
    userId || "guest"
  }-${todayKey()}`;

const goalStorageKey = (
  userId?: string
) =>
  `macrotrack-goal-${
    userId || "guest"
  }`;

const numberOrZero = (
  value: unknown
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};


const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

export default function MacroTrack() {
  const { user } = useAuth();

  const [height, setHeight] =
    useState("");

  const [weight, setWeight] =
    useState("");

  const [age, setAge] =
    useState("");

  const [gender, setGender] =
    useState("male");

  const [activity, setActivity] =
    useState("moderate");

  const [goalWeight, setGoalWeight] =
    useState("");

  const [goal, setGoal] =
    useState<GoalType>("fat_loss");

  const [, setLocked] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savingBody, setSavingBody] =
    useState(false);

  const [foodName, setFoodName] =
    useState("");

  const [mealType, setMealType] =
    useState<MealType>("Lunch");

  const [
    foodCalories,
    setFoodCalories,
  ] = useState("");

  const [
    foodProtein,
    setFoodProtein,
  ] = useState("");

  const [foodCarbs, setFoodCarbs] =
    useState("");

  const [foodFat, setFoodFat] =
    useState("");

  const [foodLog, setFoodLog] =
    useState<FoodLogItem[]>([]);

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [
    showAddFood,
    setShowAddFood,
  ] = useState(false);

  const [
    showBodyDrawer,
    setShowBodyDrawer,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
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

        const savedLog =
          localStorage.getItem(
            foodLogStorageKey(
              user?._id
            )
          );

        if (
          savedLog &&
          mounted
        ) {
          try {
            const parsed =
              JSON.parse(savedLog);

            if (Array.isArray(parsed)) {
              setFoodLog(parsed);
            }
          } catch {
            localStorage.removeItem(
              foodLogStorageKey(
                user?._id
              )
            );
          }
        }

        const [
          userResult,
          mealsResult,
        ] =
          await Promise.allSettled([
            api.get("/user/me"),
            api.get("/meals"),
          ]);

        if (!mounted) return;

        if (
          userResult.status ===
          "fulfilled"
        ) {
          const metrics =
            userResult.value.data
              ?.bodyMetrics;

          if (metrics) {
            const savedHeight =
              String(
                metrics.height || ""
              );

            const savedWeight =
              String(
                metrics.weight || ""
              );

            const savedAge =
              String(
                metrics.age || ""
              );

            setHeight(savedHeight);
            setWeight(savedWeight);
            setAge(savedAge);

            setGender(
              metrics.gender || "male"
            );

            setActivity(
              metrics.activity ||
                "moderate"
            );

            setGoalWeight(
              String(
                metrics.goalWeight || ""
              )
            );

            const hasValidValues =
              Number(savedHeight) > 0 &&
              Number(savedWeight) > 0 &&
              Number(savedAge) > 0;

            setLocked(
              Boolean(metrics.locked) &&
                hasValidValues
            );

            setShowBodyDrawer(
              !hasValidValues
            );
          } else {
            setLocked(false);
            setShowBodyDrawer(true);
          }
        }

        if (
          mealsResult.status ===
          "fulfilled"
        ) {
          const data =
            mealsResult.value.data;

          setMeals(
            Array.isArray(data)
              ? data
              : data?.meals || []
          );
        }
      } catch (error) {
        console.error(
          "MACROTRACK LOAD ERROR:",
          error
        );

        toast.error(
          "Unable to load all MacroTrack data."
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
      foodLogStorageKey(user?._id),
      JSON.stringify(foodLog)
    );
  }, [foodLog, user?._id]);

  useEffect(() => {
    localStorage.setItem(
      goalStorageKey(user?._id),
      goal
    );
  }, [goal, user?._id]);

  const heightNumber = Number(height);
  const weightNumber = Number(weight);
  const ageNumber = Number(age);
  const goalWeightNumber = Number(goalWeight);

  const isValid =
    heightNumber > 0 &&
    weightNumber > 0 &&
    ageNumber > 0;

  const needsBodySetup = !isValid;

  const calculatedTargets = useMemo(() => {
    if (!isValid) return null;

    try {
      return calculateMacroTargets({
        height: heightNumber,
        weight: weightNumber,
        age: ageNumber,
        gender: gender === "female" ? "female" : "male",
        activity,
        goal,
        goalWeight: goalWeightNumber > 0 ? goalWeightNumber : undefined,
      });
    } catch (error) {
      console.error("MACRO CALCULATION ERROR:", error);
      return null;
    }
  }, [
    isValid,
    heightNumber,
    weightNumber,
    ageNumber,
    gender,
    activity,
    goal,
    goalWeightNumber,
  ]);

  const bmi = calculatedTargets
    ? calculatedTargets.bmi.toFixed(1)
    : null;

  const bmiLabel =
    bmi === null
      ? "Set values"
      : Number(bmi) < 18.5
        ? "Underweight"
        : Number(bmi) < 25
          ? "Normal"
          : Number(bmi) < 30
            ? "Overweight"
            : "Obese";

  const maintenanceCalories =
    calculatedTargets?.maintenanceCalories || 0;

  const macroGoals = calculatedTargets
    ? {
        calories: calculatedTargets.calories,
        protein: calculatedTargets.protein,
        carbs: calculatedTargets.carbs,
        fat: calculatedTargets.fat,
      }
    : {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

  const consumed = useMemo(
    () =>
      foodLog.reduce(
        (total, item) => {
          total.calories +=
            numberOrZero(
              item.calories
            );

          total.protein +=
            numberOrZero(
              item.protein
            );

          total.carbs +=
            numberOrZero(
              item.carbs
            );

          total.fat +=
            numberOrZero(
              item.fat
            );

          return total;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      ),
    [foodLog]
  );

  const remaining = {
    calories: Math.max(
      macroGoals.calories -
        consumed.calories,
      0
    ),

    protein: Math.max(
      macroGoals.protein -
        consumed.protein,
      0
    ),

    carbs: Math.max(
      macroGoals.carbs -
        consumed.carbs,
      0
    ),

    fat: Math.max(
      macroGoals.fat -
        consumed.fat,
      0
    ),
  };

  const suggestedMeals =
    useMemo(() => {
      if (
        !meals.length ||
        !macroGoals.calories
      ) {
        return [];
      }

      return [...meals]
        .map((meal) => {
          const calories =
            numberOrZero(
              meal.calories
            );

          const protein =
            numberOrZero(
              meal.protein
            );

          const calorieFit =
            calories <=
              remaining.calories ||
            remaining.calories === 0
              ? 1
              : 0.4;

          const proteinScore =
            remaining.protein > 0
              ? Math.min(
                  protein /
                    remaining.protein,
                  1.5
                )
              : 0;

          const score =
            proteinScore * 60 +
            calorieFit * 25 +
            (goal ===
              "muscle_gain" &&
            protein >= 30
              ? 15
              : 0) +
            (goal === "fat_loss" &&
            protein >= 25 &&
            calories <= 600
              ? 15
              : 0);

          return {
            ...meal,
            score,
          };
        })
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 4);
    }, [
      meals,
      remaining.calories,
      remaining.protein,
      macroGoals.calories,
      goal,
    ]);

  const handleSave = async () => {
    if (!isValid) {
      toast.error(
        "Enter valid height, weight and age."
      );

      return;
    }

    try {
      setSavingBody(true);

      await api.post(
        "/user/body-metrics",
        {
          height: heightNumber,
          weight: weightNumber,
          age: ageNumber,
          gender,
          activity,
          goalWeight:
            goalWeightNumber || null,
          locked: true,
        }
      );

      setLocked(true);
      setShowBodyDrawer(false);

      toast.success(
        "Body details and targets updated."
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.message ||
          "Failed to save body details."
      );
    } finally {
      setSavingBody(false);
    }
  };

  const handleEditValues =
    async () => {
      if (!isValid) {
        setLocked(false);
        setShowBodyDrawer(true);
        return;
      }

      try {
        await api.post(
          "/user/body-metrics",
          {
            height: heightNumber,
            weight: weightNumber,
            age: ageNumber,
            gender,
            activity,
            goalWeight:
              goalWeightNumber || null,
            locked: false,
          }
        );
      } catch {
        // Local editing remains available.
      }

      setLocked(false);
      setShowBodyDrawer(true);
    };

  const handleCancelEdit = () => {
    if (needsBodySetup) return;

    setLocked(true);
    setShowBodyDrawer(false);
  };

  const resetFoodForm = () => {
    setFoodName("");
    setFoodCalories("");
    setFoodProtein("");
    setFoodCarbs("");
    setFoodFat("");
  };

  const addFood = () => {
    if (!foodName.trim()) {
      toast.error(
        "Enter the food name."
      );

      return;
    }

    const item: FoodLogItem = {
      id: createId(),
      name: foodName.trim(),
      mealType,
      calories:
        numberOrZero(
          foodCalories
        ),
      protein:
        numberOrZero(
          foodProtein
        ),
      carbs:
        numberOrZero(foodCarbs),
      fat:
        numberOrZero(foodFat),
      source: "manual",
    };

    setFoodLog((previous) => [
      item,
      ...previous,
    ]);

    resetFoodForm();
    setShowAddFood(false);

    toast.success(
      `${item.name} added to today's log.`
    );
  };

  const addMealToLog = (
    meal: Meal
  ) => {
    const item: FoodLogItem = {
      id: createId(),
      name: meal.title,
      mealType: "Lunch",
      calories:
        numberOrZero(
          meal.calories
        ),
      protein:
        numberOrZero(
          meal.protein
        ),
      carbs:
        numberOrZero(meal.carbs),
      fat:
        numberOrZero(meal.fat),
      source: "macrobox",
    };

    setFoodLog((previous) => [
      item,
      ...previous,
    ]);

    toast.success(
      `${meal.title} added to today's log.`
    );
  };

  const removeFood = (
    id: string
  ) => {
    setFoodLog((previous) =>
      previous.filter(
        (item) => item.id !== id
      )
    );

    toast.success(
      "Food removed from today's log."
    );
  };

  if (loading) {
    return <MacroTrackLoading />;
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                  MacroBox Tracker
                </p>

                <h1 className="mb-text mt-4 max-w-3xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[76px]">
                  Understand your
                  <br />
                  daily nutrition.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Track calories, protein,
                  carbs and fat while getting
                  MacroBox meal suggestions
                  based on what remains.
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
                  Personal setup
                </p>

                <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
                  Body details & goal
                </h2>

                <p className="mb-text-muted mt-2 text-sm leading-6">
                  These values determine your
                  daily calorie and macro
                  targets.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleEditValues
                }
                className="mb-outline-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-medium sm:w-auto"
              >
                <Pencil size={16} />

                {needsBodySetup
                  ? "Set values"
                  : "Change values"}
              </button>
            </div>

            {needsBodySetup && (
              <div className="mb-accent-surface border-x-0 border-t-0 p-4 sm:p-5">
                <p className="text-sm font-semibold">
                  Complete your body
                  details first
                </p>

                <p className="mt-1 text-xs leading-5 opacity-80 sm:text-sm">
                  Add height, weight and age
                  to calculate personalized
                  targets and suggestions.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Detail
                icon={
                  <Scale size={16} />
                }
                label="Height"
                value={
                  height
                    ? `${height} cm`
                    : "—"
                }
              />

              <Detail
                icon={
                  <Gauge size={16} />
                }
                label="Weight"
                value={
                  weight
                    ? `${weight} kg`
                    : "—"
                }
              />

              <Detail
                icon={
                  <CalendarDays
                    size={16}
                  />
                }
                label="Age"
                value={
                  age
                    ? `${age} yrs`
                    : "—"
                }
              />

              <Detail
                icon={
                  <Target size={16} />
                }
                label="Gender"
                value={
                  gender === "male"
                    ? "Male"
                    : "Female"
                }
              />

              <Detail
                icon={
                  <Zap size={16} />
                }
                label="Activity"
                value={
                  activityLabels[
                    activity
                  ] || "Moderate"
                }
              />

              <Detail
                icon={
                  <Sparkles
                    size={16}
                  />
                }
                label="Goal"
                value={
                  goalLabels[goal]
                }
              />
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 lg:grid-cols-4">
            <Stat
              icon={
                <Scale size={19} />
              }
              title="BMI"
              value={bmi ?? "—"}
              label={bmiLabel}
              description="Body Mass Index"
            />

            <Stat
              icon={
                <Flame size={19} />
              }
              title="Daily target"
              value={
                macroGoals.calories
                  ? macroGoals.calories.toLocaleString(
                      "en-IN"
                    )
                  : "Set"
              }
              suffix="kcal"
              label={
                needsBodySetup
                  ? "Enter details"
                  : goalLabels[goal]
              }
              description="Recommended calories"
            />

            <Stat
              icon={
                <Dumbbell size={19} />
              }
              title="Protein"
              value={
                macroGoals.protein
                  ? String(
                      macroGoals.protein
                    )
                  : "Set"
              }
              suffix="g"
              label={
                needsBodySetup
                  ? "Enter details"
                  : "Daily protein"
              }
              description="Protein target"
            />

            <Stat
              icon={
                <Target size={19} />
              }
              title="Maintenance"
              value={
                maintenanceCalories
                  ? maintenanceCalories.toLocaleString(
                      "en-IN"
                    )
                  : "Set"
              }
              suffix="kcal"
              label={
                needsBodySetup
                  ? "Enter details"
                  : "Maintain"
              }
              description="Energy requirement"
            />
          </section>

          <section className="mb-glass mt-5 overflow-hidden rounded-[30px] sm:mt-6">
            <div className="mb-divider flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Daily progress
                </p>

                <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
                  MacroTrack today
                </h2>

                <p className="mb-text-muted mt-2 text-sm">
                  Consumed versus remaining
                  for today.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddFood(true)
                }
                className="mb-primary-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium sm:w-auto"
              >
                <Plus size={17} />
                Add food
              </button>
            </div>

            {needsBodySetup && (
              <div className="mb-info-message border-x-0 border-t-0 p-4 text-sm sm:p-5">
                Daily targets will appear
                after your body details are
                completed.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-4 lg:p-6">
              <MacroProgress
                title="Calories"
                consumed={
                  consumed.calories
                }
                goal={
                  macroGoals.calories
                }
                remaining={
                  remaining.calories
                }
                unit="kcal"
                icon={
                  <Flame size={17} />
                }
              />

              <MacroProgress
                title="Protein"
                consumed={
                  consumed.protein
                }
                goal={
                  macroGoals.protein
                }
                remaining={
                  remaining.protein
                }
                unit="g"
                icon={
                  <Dumbbell
                    size={17}
                  />
                }
              />

              <MacroProgress
                title="Carbs"
                consumed={
                  consumed.carbs
                }
                goal={macroGoals.carbs}
                remaining={
                  remaining.carbs
                }
                unit="g"
                icon={
                  <Apple size={17} />
                }
              />

              <MacroProgress
                title="Fat"
                consumed={consumed.fat}
                goal={macroGoals.fat}
                remaining={
                  remaining.fat
                }
                unit="g"
                icon={
                  <Target size={17} />
                }
              />
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <SmartSuggestions
              suggestions={
                suggestedMeals
              }
              goal={goal}
              needsBodySetup={
                needsBodySetup
              }
              onAdd={
                addMealToLog
              }
            />

            <FoodLogPanel
              foodLog={foodLog}
              consumed={consumed}
              onRemove={removeFood}
              onAdd={() =>
                setShowAddFood(true)
              }
            />
          </section>
        </div>
      </div>

      {showAddFood && (
        <Drawer
          title="Add food"
          subtitle="Log a custom meal or snack for today."
          onClose={() =>
            setShowAddFood(false)
          }
        >
          <div className="grid gap-4">
            <ThemeField label="Food name">
              <input
                value={foodName}
                onChange={(event) =>
                  setFoodName(
                    event.target.value
                  )
                }
                placeholder="e.g. Grilled chicken breast"
                className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
              />
            </ThemeField>

            <ThemeField label="Meal type">
              <select
                value={mealType}
                onChange={(event) =>
                  setMealType(
                    event.target
                      .value as MealType
                  )
                }
                className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
              >
                <option value="Breakfast">
                  Breakfast
                </option>

                <option value="Lunch">
                  Lunch
                </option>

                <option value="Snack">
                  Snack
                </option>

                <option value="Dinner">
                  Dinner
                </option>
              </select>
            </ThemeField>

            <div className="grid grid-cols-2 gap-3">
              <ThemeField label="Calories">
                <input
                  value={
                    foodCalories
                  }
                  onChange={(event) =>
                    setFoodCalories(
                      event.target.value
                    )
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="mb-input mb-number-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
                />
              </ThemeField>

              <ThemeField label="Protein">
                <input
                  value={
                    foodProtein
                  }
                  onChange={(event) =>
                    setFoodProtein(
                      event.target.value
                    )
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="mb-input mb-number-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
                />
              </ThemeField>

              <ThemeField label="Carbs">
                <input
                  value={foodCarbs}
                  onChange={(event) =>
                    setFoodCarbs(
                      event.target.value
                    )
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="mb-input mb-number-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
                />
              </ThemeField>

              <ThemeField label="Fat">
                <input
                  value={foodFat}
                  onChange={(event) =>
                    setFoodFat(
                      event.target.value
                    )
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="mb-input mb-number-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
                />
              </ThemeField>
            </div>
          </div>

          <button
            type="button"
            onClick={addFood}
            className="mb-primary-button mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            <Plus size={18} />
            Add to today's log
          </button>
        </Drawer>
      )}

      {showBodyDrawer && (
        <Drawer
          title={
            needsBodySetup
              ? "Set body values"
              : "Change values"
          }
          subtitle="Update your body details, activity and fitness goal."
          onClose={
            handleCancelEdit
          }
        >
          <div className="grid gap-4">
            <ThemeInput
              label="Height"
              suffix="cm"
              value={height}
              setValue={setHeight}
              icon={
                <Scale size={16} />
              }
            />

            <ThemeInput
              label="Weight"
              suffix="kg"
              value={weight}
              setValue={setWeight}
              icon={
                <Gauge size={16} />
              }
            />

            <ThemeInput
              label="Age"
              suffix="yrs"
              value={age}
              setValue={setAge}
              icon={
                <CalendarDays
                  size={16}
                />
              }
            />

            <ThemeInput
              label="Goal weight"
              suffix="kg"
              value={goalWeight}
              setValue={
                setGoalWeight
              }
              icon={
                <Target size={16} />
              }
              optional
            />

            <ThemeField label="Gender">
              <select
                value={gender}
                onChange={(event) =>
                  setGender(
                    event.target.value
                  )
                }
                className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
              >
                <option value="male">
                  Male
                </option>

                <option value="female">
                  Female
                </option>
              </select>
            </ThemeField>

            <ThemeField label="Activity level">
              <select
                value={activity}
                onChange={(event) =>
                  setActivity(
                    event.target.value
                  )
                }
                className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
              >
                <option value="sedentary">
                  Sedentary
                </option>

                <option value="light">
                  Light Active
                </option>

                <option value="moderate">
                  Moderately Active
                </option>

                <option value="active">
                  Very Active
                </option>

                <option value="very_active">
                  Athlete
                </option>
              </select>
            </ThemeField>

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
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={savingBody}
            className="mb-primary-button mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            {savingBody ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Check size={18} />
            )}

            {savingBody
              ? "Saving..."
              : needsBodySetup
              ? "Set values"
              : "Save changes"}
          </button>
        </Drawer>
      )}
    </main>
  );
}

function MacroTrackLoading() {
  return (
    <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
      <div className="mb-glass rounded-[28px] px-8 py-7 text-center">
        <Loader2
          size={30}
          className="mb-text mx-auto animate-spin"
        />

        <p className="mb-text mt-4 text-sm font-medium">
          Loading MacroTrack
        </p>

        <p className="mb-text-faint mt-1 text-xs">
          Preparing your nutrition data.
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

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-divider min-w-0 border-b border-r p-4 last:border-r-0 sm:p-5">
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

function Stat({
  title,
  value,
  suffix,
  label,
  icon,
  description,
}: {
  title: string;
  value: string;
  suffix?: string;
  label: string;
  icon: ReactNode;
  description: string;
}) {
  return (
    <article className="mb-glass mb-glass-hover rounded-[26px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11">
          {icon}
        </span>

        <p className="mb-text-faint max-w-[105px] text-right text-[9px] font-semibold uppercase leading-4 tracking-[0.13em]">
          {title}
        </p>
      </div>

      <p className="mb-text mt-7 text-2xl font-light leading-none tracking-[-0.05em] sm:text-3xl">
        {value}

        {suffix && (
          <span className="mb-text-faint ml-1 text-xs font-medium tracking-normal sm:text-sm">
            {suffix}
          </span>
        )}
      </p>

      <p className="mb-accent mt-3 text-xs font-semibold sm:text-sm">
        {label}
      </p>

      <p className="mb-text-muted mt-1 text-xs leading-5 sm:text-sm">
        {description}
      </p>
    </article>
  );
}

function MacroProgress({
  title,
  consumed,
  goal,
  remaining,
  unit,
  icon,
}: {
  title: string;
  consumed: number;
  goal: number;
  remaining: number;
  unit: string;
  icon: ReactNode;
}) {
  const percent =
  goal > 0
    ? Math.max(0, Math.min(100, (consumed / goal) * 100))
    : 0;

  return (
    <article className="mb-glass-subtle rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
            {icon}
          </span>

          <div>
            <p className="mb-text text-sm font-medium">
              {title}
            </p>

            <p className="mb-text-faint text-[10px]">
              {unit}
            </p>
          </div>
        </div>

        <p className="mb-accent text-xs font-semibold">
          {Math.round(percent)}%
        </p>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--mb-surface-strong)]">
        <div
          className="h-full rounded-full bg-[var(--mb-accent)] transition-[width] duration-500"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <p className="mb-text mt-5 text-xl font-light leading-none">
        {consumed}

        <span className="mb-text-faint text-xs font-medium">
          {" "}
          / {goal || "—"} {unit}
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

function SmartSuggestions({
  suggestions,
  goal,
  needsBodySetup,
  onAdd,
}: {
  suggestions: Array<
    Meal & {
      score: number;
    }
  >;
  goal: GoalType;
  needsBodySetup: boolean;
  onAdd: (meal: Meal) => void;
}) {
  return (
    <section className="mb-glass rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mb-primary-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <Utensils size={19} />
        </span>

        <div>
          <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            Smart suggestions
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
            What should I eat next?
          </h2>

          <p className="mb-text-muted mt-2 text-sm leading-6">
            Recommendations based on
            remaining calories and
            protein.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {suggestions.length === 0 ? (
          <div className="mb-glass-subtle rounded-[22px] p-5 text-center">
            <Sparkles
              size={25}
              className="mb-text-faint mx-auto"
            />

            <p className="mb-text mt-3 text-sm font-medium">
              {needsBodySetup
                ? "Complete your body details"
                : "No suggestions available"}
            </p>

            <p className="mb-text-faint mt-1 text-xs leading-5">
              {needsBodySetup
                ? "Personalized suggestions appear after your targets are calculated."
                : "Add more MacroBox meals to receive recommendations."}
            </p>
          </div>
        ) : (
          suggestions.map((meal) => (
            <SuggestionCard
              key={meal._id}
              meal={meal}
              goal={goal}
              onAdd={() =>
                onAdd(meal)
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

function SuggestionCard({
  meal,
  goal,
  onAdd,
}: {
  meal: Meal;
  goal: GoalType;
  onAdd: () => void;
}) {
  const image =
    meal.imageUrl ||
    meal.image ||
    "/placeholder-meal.png";

  return (
    <article className="mb-glass-subtle mb-glass-hover overflow-hidden rounded-[22px]">
      <div className="grid grid-cols-[82px_1fr] gap-3 p-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
        <img
          src={image}
          alt={meal.title}
          className="h-[82px] w-[82px] rounded-[17px] object-cover sm:h-24 sm:w-24"
          onError={(event) => {
            event.currentTarget.src =
              "/placeholder-meal.png";
          }}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mb-text line-clamp-1 text-sm font-medium sm:text-base">
              {meal.title}
            </h3>

            <span className="mb-accent-surface rounded-full px-2.5 py-1 text-[9px] font-semibold">
              Good match
            </span>
          </div>

          <p className="mb-text-muted mt-2 line-clamp-2 text-xs leading-5">
            {numberOrZero(
              meal.calories
            )}{" "}
            kcal ·{" "}
            {numberOrZero(
              meal.protein
            )}
            g protein ·{" "}
            {numberOrZero(
              meal.carbs
            )}
            g carbs
          </p>

          <p className="mb-accent mt-1 text-[11px] font-semibold">
            For {goalLabels[goal]}
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mb-primary-button mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium sm:hidden"
          >
            Add
            <Plus size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="mb-primary-button hidden h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium sm:inline-flex"
        >
          Add
          <Plus size={15} />
        </button>
      </div>
    </article>
  );
}

function FoodLogPanel({
  foodLog,
  consumed,
  onRemove,
  onAdd,
}: {
  foodLog: FoodLogItem[];
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="mb-glass rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            Food diary
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
            Today's food log
          </h2>

          <p className="mb-text-muted mt-2 text-sm">
            {foodLog.length}{" "}
            {foodLog.length === 1
              ? "item"
              : "items"}{" "}
            logged
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="mb-outline-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <Plus size={17} />
        </button>
      </div>

      <div className="mb-glass-subtle mt-5 grid grid-cols-2 gap-3 rounded-[20px] p-4">
        <div>
          <p className="mb-text-faint text-[9px] uppercase tracking-[0.14em]">
            Calories consumed
          </p>

          <p className="mb-text mt-1 text-lg font-light">
            {consumed.calories} kcal
          </p>
        </div>

        <div>
          <p className="mb-text-faint text-[9px] uppercase tracking-[0.14em]">
            Protein consumed
          </p>

          <p className="mb-text mt-1 text-lg font-light">
            {consumed.protein}g
          </p>
        </div>
      </div>

      {foodLog.length === 0 ? (
        <div className="mb-glass-subtle mt-4 rounded-[22px] p-6 text-center">
          <Utensils
            size={25}
            className="mb-text-faint mx-auto"
          />

          <p className="mb-text mt-3 text-sm font-medium">
            No food added yet
          </p>

          <p className="mb-text-faint mt-1 text-xs">
            Start logging meals to track
            today's progress.
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mb-primary-button mt-5 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
          >
            <Plus size={16} />
            Add first food
          </button>
        </div>
      ) : (
        <div className="mb-themed-scrollbar mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {foodLog.map((item) => (
            <FoodLogCard
              key={item.id}
              item={item}
              onRemove={() =>
                onRemove(item.id)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FoodLogCard({
  item,
  onRemove,
}: {
  item: FoodLogItem;
  onRemove: () => void;
}) {
  return (
    <article className="mb-glass-subtle mb-glass-hover rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="mb-accent-surface rounded-full px-3 py-1 text-[9px] font-semibold">
              {item.mealType}
            </span>

            <span className="mb-outline-button rounded-full px-3 py-1 text-[9px] font-medium">
              {item.source ===
              "macrobox"
                ? "MacroBox"
                : "Manual"}
            </span>
          </div>

          <h3 className="mb-text mt-3 truncate text-sm font-medium sm:text-base">
            {item.name}
          </h3>

          <p className="mb-text-muted mt-1 text-xs leading-5">
            {item.calories} kcal ·{" "}
            {item.protein}g P ·{" "}
            {item.carbs}g C ·{" "}
            {item.fat}g F
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
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
              MacroTrack
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

function ThemeInput({
  label,
  suffix,
  value,
  setValue,
  icon,
  optional = false,
}: {
  label: string;
  suffix: string;
  value: string;
  setValue: (value: string) => void;
  icon: ReactNode;
  optional?: boolean;
}) {
  return (
    <ThemeField
      label={`${label}${
        optional ? " · Optional" : ""
      }`}
    >
      <div className="relative">
        <span className="mb-accent pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          {icon}
        </span>

        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            setValue(
              event.target.value
            )
          }
          className="mb-input mb-number-input h-12 w-full rounded-2xl pl-11 pr-12 text-sm font-medium"
        />

        <span className="mb-text-faint pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium">
          {suffix}
        </span>
      </div>
    </ThemeField>
  );
}