// frontend/src/pages/MacroTrack.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import {
  Apple,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Gauge,
  Pencil,
  Plus,
  Scale,
  Target,
  Trash2,
  Utensils,
  X,
  Zap,
} from "lucide-react";

type GoalType =
  | "weight_loss"
  | "maintenance"
  | "weight_gain"
  | "muscle_gain"
  | "fat_loss";

type MealType = "Breakfast" | "Lunch" | "Snack" | "Dinner";

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
};

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const goalLabels: Record<GoalType, string> = {
  weight_loss: "Weight Loss",
  maintenance: "Maintenance",
  weight_gain: "Weight Gain",
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
};

const activityLabels: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Light Active",
  moderate: "Mod. Active",
  active: "Very Active",
  very_active: "Athlete",
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const todayText = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const foodLogStorageKey = (userId?: string) =>
  `macrotrack-food-log-${userId || "guest"}-${todayKey()}`;

const goalStorageKey = (userId?: string) =>
  `macrotrack-goal-${userId || "guest"}`;

const numberOrZero = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const round = (value: number) => Math.round(value);

export default function MacroTrack() {
  const { user } = useAuth();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activity, setActivity] = useState("moderate");
  const [goalWeight, setGoalWeight] = useState("");
  const [goal, setGoal] = useState<GoalType>("fat_loss");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");

  const [foodLog, setFoodLog] = useState<FoodLogItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const savedGoal = localStorage.getItem(goalStorageKey(user?._id));
        if (savedGoal) setGoal(savedGoal as GoalType);

        const savedLog = localStorage.getItem(foodLogStorageKey(user?._id));
        if (savedLog) setFoodLog(JSON.parse(savedLog));

        const [userRes, mealsRes] = await Promise.allSettled([
          api.get("/user/me"),
          api.get("/meals"),
        ]);

        if (userRes.status === "fulfilled") {
          const m = userRes.value.data.bodyMetrics;

          if (m) {
            const savedHeight = String(m.height || "");
            const savedWeight = String(m.weight || "");
            const savedAge = String(m.age || "");

            setHeight(savedHeight);
            setWeight(savedWeight);
            setAge(savedAge);
            setGender(m.gender || "male");
            setActivity(m.activity || "moderate");
            setGoalWeight(String(m.goalWeight || ""));

            const hasValidSavedValues =
              Number(savedHeight) > 0 &&
              Number(savedWeight) > 0 &&
              Number(savedAge) > 0;

            setLocked(Boolean(m.locked) && hasValidSavedValues);
          } else {
            setLocked(false);
          }
        }

        if (mealsRes.status === "fulfilled") {
          const data = mealsRes.value.data;
          setMeals(Array.isArray(data) ? data : data?.meals || []);
        }
      } catch (error) {
        console.error("MACROTRACK LOAD ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?._id]);

  useEffect(() => {
    localStorage.setItem(foodLogStorageKey(user?._id), JSON.stringify(foodLog));
  }, [foodLog, user?._id]);

  useEffect(() => {
    localStorage.setItem(goalStorageKey(user?._id), goal);
  }, [goal, user?._id]);

  const h = Number(height);
  const w = Number(weight);
  const a = Number(age);
  const gw = Number(goalWeight);

  const isValid = h > 0 && w > 0 && a > 0;
  const needsBodySetup = !isValid;
  const showBodyForm = !locked || needsBodySetup;

  const bmiValue = isValid ? w / Math.pow(h / 100, 2) : null;
  const bmi = bmiValue ? bmiValue.toFixed(1) : null;

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

  const bmr =
    isValid &&
    (gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161);

  const maintenanceCalories =
    bmr && Math.round(bmr * activityMultipliers[activity]);

  const targetCalories = useMemo(() => {
    if (!maintenanceCalories) return null;

    let adjustment = 0;

    if (goal === "weight_loss") adjustment = -450;
    if (goal === "fat_loss") adjustment = -550;
    if (goal === "weight_gain") adjustment = 400;
    if (goal === "muscle_gain") adjustment = 250;

    if (gw && w) {
      const raw = Math.round(((gw - w) * 7700) / 60);
      adjustment = clamp(raw, -700, 700);
    }

    return Math.max(1200, maintenanceCalories + adjustment);
  }, [maintenanceCalories, goal, gw, w]);

  const macroGoals = useMemo(() => {
    if (!targetCalories || !w) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    let proteinMultiplier = 1.6;
    let fatRatio = 0.25;

    if (goal === "fat_loss") proteinMultiplier = 2.2;
    if (goal === "weight_loss") proteinMultiplier = 2.0;
    if (goal === "muscle_gain") proteinMultiplier = 2.1;
    if (goal === "weight_gain") {
      proteinMultiplier = 1.8;
      fatRatio = 0.28;
    }

    const protein = round(w * proteinMultiplier);
    const fat = round((targetCalories * fatRatio) / 9);
    const carbs = round(
      Math.max(targetCalories - protein * 4 - fat * 9, 0) / 4
    );

    return {
      calories: round(targetCalories),
      protein,
      carbs,
      fat,
    };
  }, [targetCalories, w, goal]);

  const consumed = useMemo(() => {
    return foodLog.reduce(
      (acc, item) => {
        acc.calories += numberOrZero(item.calories);
        acc.protein += numberOrZero(item.protein);
        acc.carbs += numberOrZero(item.carbs);
        acc.fat += numberOrZero(item.fat);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foodLog]);

  const remaining = {
    calories: Math.max(macroGoals.calories - consumed.calories, 0),
    protein: Math.max(macroGoals.protein - consumed.protein, 0),
    carbs: Math.max(macroGoals.carbs - consumed.carbs, 0),
    fat: Math.max(macroGoals.fat - consumed.fat, 0),
  };

  const suggestedMeals = useMemo(() => {
    if (!meals.length || !macroGoals.calories) return [];

    return [...meals]
      .map((meal) => {
        const calories = numberOrZero(meal.calories);
        const protein = numberOrZero(meal.protein);

        const calorieFit =
          calories <= remaining.calories || remaining.calories === 0 ? 1 : 0.4;

        const proteinScore =
          remaining.protein > 0
            ? Math.min(protein / remaining.protein, 1.5)
            : 0;

        const score =
          proteinScore * 60 +
          calorieFit * 25 +
          (goal === "muscle_gain" && protein >= 30 ? 15 : 0) +
          (goal === "fat_loss" && protein >= 25 && calories <= 600 ? 15 : 0);

        return { ...meal, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [meals, remaining, macroGoals.calories, goal]);

  const handleSave = async () => {
    if (!isValid) {
      alert("Please enter valid height, weight and age first.");
      return;
    }

    try {
      await api.post("/user/body-metrics", {
        height: h,
        weight: w,
        age: a,
        gender,
        activity,
        goalWeight: gw,
        locked: true,
      });

      setLocked(true);
    } catch {
      alert("Failed to save body details. Please try again.");
    }
  };

  const handleEditValues = async () => {
    if (!isValid) {
      setLocked(false);
      return;
    }

    try {
      await api.post("/user/body-metrics", {
        height: h,
        weight: w,
        age: a,
        gender,
        activity,
        goalWeight: gw,
        locked: false,
      });
    } catch {
      // still allow user to edit locally
    }

    setLocked(false);
  };

  const handleCancelEdit = () => {
    if (needsBodySetup) return;
    setLocked(true);
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
      alert("Enter food name");
      return;
    }

    const item: FoodLogItem = {
      id: crypto.randomUUID(),
      name: foodName.trim(),
      mealType,
      calories: numberOrZero(foodCalories),
      protein: numberOrZero(foodProtein),
      carbs: numberOrZero(foodCarbs),
      fat: numberOrZero(foodFat),
      source: "manual",
    };

    setFoodLog((prev) => [item, ...prev]);
    resetFoodForm();
    setShowAddFood(false);
  };

  const addMealToLog = (meal: Meal) => {
    const item: FoodLogItem = {
      id: crypto.randomUUID(),
      name: meal.title,
      mealType: "Lunch",
      calories: numberOrZero(meal.calories),
      protein: numberOrZero(meal.protein),
      carbs: numberOrZero(meal.carbs),
      fat: numberOrZero(meal.fat),
      source: "macrobox",
    };

    setFoodLog((prev) => [item, ...prev]);
  };

  const removeFood = (id: string) => {
    setFoodLog((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          Loading MacroTrack...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.38em] text-slate-400 sm:tracking-[0.45em]">
                MacroBox Tracker
              </p>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:mt-6 sm:text-6xl">
                Track your
                <br />
                daily macros
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">
                Track calories, protein, carbs and fat. Add food anytime from
                the quick side drawer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <span className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-xs font-black text-white sm:h-12 sm:px-6 sm:text-sm">
                {goalLabels[goal]}
              </span>

              <span className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm sm:h-12 sm:px-5 sm:text-sm">
                {todayText()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  Body Details & Goal
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Used to calculate your daily macro targets.
                </p>
              </div>

              {!showBodyForm ? (
                <button
                  onClick={handleEditValues}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-green-600 bg-white px-5 text-sm font-black text-green-700 transition hover:bg-green-50 sm:w-auto"
                >
                  <Pencil size={16} />
                  Change Values
                </button>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  {!needsBodySetup && (
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={handleSave}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 ${
                      needsBodySetup ? "col-span-2" : ""
                    }`}
                  >
                    <Check size={16} />
                    {needsBodySetup ? "Set Values" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {needsBodySetup && (
            <div className="border-b border-slate-200 bg-green-50 p-4 sm:p-5">
              <p className="text-base font-black text-green-800">
                Set your values first
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-green-700">
                Enter height, weight and age to calculate your daily macro
                targets.
              </p>
            </div>
          )}

          {!showBodyForm ? (
            <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-6">
              <Detail
                icon={<Scale size={15} />}
                label="HEIGHT"
                value={`${height} cm`}
              />
              <Detail
                icon={<Gauge size={15} />}
                label="WEIGHT"
                value={`${weight} kg`}
              />
              <Detail
                icon={<CalendarDays size={15} />}
                label="AGE"
                value={`${age} yrs`}
              />
              <Detail
                icon={<Target size={15} />}
                label="GENDER"
                value={gender === "male" ? "Male" : "Female"}
              />
              <Detail
                icon={<Zap size={15} />}
                label="ACTIVITY"
                value={activityLabels[activity] || "Moderate"}
              />
              <Detail
                icon={<Target size={15} />}
                label="GOAL"
                value={goalLabels[goal]}
              />
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              <Input
                label="HEIGHT (CM)"
                value={height}
                setValue={setHeight}
                icon={<Scale size={16} />}
              />

              <Input
                label="WEIGHT (KG)"
                value={weight}
                setValue={setWeight}
                icon={<Gauge size={16} />}
              />

              <Input
                label="AGE (YRS)"
                value={age}
                setValue={setAge}
                icon={<CalendarDays size={16} />}
              />

              <Field label="GENDER">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>

              <Field label="ACTIVITY LEVEL">
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                  <option value="very_active">Athlete</option>
                </select>
              </Field>

              <Field label="FITNESS GOAL">
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as GoalType)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white"
                >
                  <option value="fat_loss">Fat Loss</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="weight_gain">Weight Gain</option>
                  <option value="muscle_gain">Muscle Gain</option>
                </select>
              </Field>
            </div>
          )}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={<Scale size={18} />}
            title="BMI"
            value={bmi ?? "—"}
            label={bmiLabel}
            description="Body Mass Index"
          />

          <Stat
            icon={<Flame size={18} />}
            title="TARGET"
            value={
              macroGoals.calories
                ? `${macroGoals.calories.toLocaleString()}`
                : "Set"
            }
            suffix="kcal"
            label={needsBodySetup ? "Enter details" : goalLabels[goal]}
            description="Daily calories"
          />

          <Stat
            icon={<Dumbbell size={18} />}
            title="PROTEIN"
            value={macroGoals.protein ? `${macroGoals.protein}` : "Set"}
            suffix="g"
            label={needsBodySetup ? "Enter details" : "Daily protein"}
            description="Protein target"
          />

          <Stat
            icon={<Target size={18} />}
            title="MAINTAIN"
            value={
              maintenanceCalories
                ? `${maintenanceCalories.toLocaleString()}`
                : "Set"
            }
            suffix="kcal"
            label={needsBodySetup ? "Enter details" : "Maintain"}
            description="Energy needed"
          />
        </section>

        <section className="mt-5 overflow-hidden border border-slate-200 bg-white shadow-sm sm:mt-6">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  MacroTrack Today
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Consumed vs remaining for today.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFood(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 sm:w-auto"
              >
                <Plus size={17} />
                Add Food
              </button>
            </div>
          </div>

          {needsBodySetup && (
            <div className="border-b border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 sm:p-5">
              Your daily macro targets will appear here after you set your body
              values.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            <MacroProgress
              title="Calories"
              consumed={consumed.calories}
              goal={macroGoals.calories}
              remaining={remaining.calories}
              unit="kcal"
              icon={<Flame size={17} />}
            />

            <MacroProgress
              title="Protein"
              consumed={consumed.protein}
              goal={macroGoals.protein}
              remaining={remaining.protein}
              unit="g"
              icon={<Dumbbell size={17} />}
            />

            <MacroProgress
              title="Carbs"
              consumed={consumed.carbs}
              goal={macroGoals.carbs}
              remaining={remaining.carbs}
              unit="g"
              icon={<Apple size={17} />}
            />

            <MacroProgress
              title="Fat"
              consumed={consumed.fat}
              goal={macroGoals.fat}
              remaining={remaining.fat}
              unit="g"
              icon={<Target size={17} />}
            />
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                <Utensils className="text-green-600" size={22} />
                What Should I Eat Next?
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                Smart MacroBox suggestions based on your remaining macros.
              </p>
            </div>

            <div className="space-y-3">
              {suggestedMeals.length === 0 ? (
                <p className="border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  Set body values first to unlock better meal suggestions.
                </p>
              ) : (
                suggestedMeals.map((meal) => (
                  <div
                    key={meal._id}
                    className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-950">
                            {meal.title}
                          </p>

                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            High Protein
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          {numberOrZero(meal.calories)} kcal ·{" "}
                          {numberOrZero(meal.protein)}g protein ·{" "}
                          {numberOrZero(meal.carbs)}g carbs ·{" "}
                          {numberOrZero(meal.fat)}g fat
                        </p>

                        <p className="mt-1 text-sm font-black text-green-700">
                          Good match for {goalLabels[goal]}
                        </p>
                      </div>

                      <button
                        onClick={() => addMealToLog(meal)}
                        className="shrink-0 rounded-full bg-green-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-green-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  Today's Food Log
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {foodLog.length} item{foodLog.length === 1 ? "" : "s"} logged
                </p>
              </div>

              <p className="text-sm font-black leading-6 text-slate-700">
                {consumed.calories} kcal · {consumed.protein}g P
              </p>
            </div>

            {foodLog.length === 0 ? (
              <div className="border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                No food added yet today.
              </div>
            ) : (
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {foodLog.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            {item.mealType}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {item.source === "macrobox" ? "MacroBox" : "Manual"}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-black text-slate-950">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                          {item.calories} kcal · {item.protein}g P ·{" "}
                          {item.carbs}g C · {item.fat}g F
                        </p>
                      </div>

                      <button
                        onClick={() => removeFood(item.id)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setShowAddFood(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_18px_40px_rgba(22,163,74,0.32)] transition hover:bg-green-700"
      >
        <Plus size={19} />
        Add Food
      </button>

      {showAddFood && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close add food drawer"
            onClick={() => setShowAddFood(false)}
            className="absolute inset-0 bg-black/35"
          />

          <aside className="absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[430px] sm:rounded-none">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                  Add Food
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Log custom food quickly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFood(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4">
                <Field label="FOOD NAME *">
                  <input
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g. Grilled Chicken Breast"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                  />
                </Field>

                <Field label="MEAL TYPE">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Snack</option>
                    <option>Dinner</option>
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="CALORIES">
                    <input
                      value={foodCalories}
                      onChange={(e) => setFoodCalories(e.target.value)}
                      type="number"
                      placeholder="0"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                    />
                  </Field>

                  <Field label="PROTEIN">
                    <input
                      value={foodProtein}
                      onChange={(e) => setFoodProtein(e.target.value)}
                      type="number"
                      placeholder="0"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                    />
                  </Field>

                  <Field label="CARBS">
                    <input
                      value={foodCarbs}
                      onChange={(e) => setFoodCarbs(e.target.value)}
                      type="number"
                      placeholder="0"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                    />
                  </Field>

                  <Field label="FAT">
                    <input
                      value={foodFat}
                      onChange={(e) => setFoodFat(e.target.value)}
                      type="number"
                      placeholder="0"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-5">
              <button
                onClick={addFood}
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
              >
                <Plus size={18} />
                Add to Today's Log
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
        <span className="text-green-600">{icon}</span>
        {label}
      </p>

      <p className="truncate text-base font-black text-slate-950 sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  label,
  value,
  setValue,
  icon,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500">
          {icon}
        </span>

        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition focus:border-green-500 focus:bg-white"
        />
      </div>
    </Field>
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
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-start justify-between sm:mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700 sm:h-11 sm:w-11">
          {icon}
        </div>

        <p className="max-w-[92px] text-right text-[10px] font-black uppercase leading-4 text-slate-400 sm:max-w-[110px] sm:text-xs">
          {title}
        </p>
      </div>

      <p className="text-2xl font-black leading-none tracking-[-0.06em] text-slate-950 sm:text-3xl">
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-black tracking-normal text-slate-400">
            {suffix}
          </span>
        ) : null}
      </p>

      <p className="mt-2 text-xs font-black text-green-700 sm:mt-3 sm:text-sm">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
        {description}
      </p>
    </div>
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
  icon: React.ReactNode;
}) {
  const percent = goal > 0 ? clamp((consumed / goal) * 100, 0, 100) : 0;

  return (
    <div className="border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 sm:h-10 sm:w-10">
            {icon}
          </span>

          <div>
            <p className="text-sm font-black text-slate-950 sm:text-base">
              {title}
            </p>
            <p className="text-[11px] font-bold text-slate-500 sm:text-xs">
              {unit}
            </p>
          </div>
        </div>

        <p className="text-xs font-black text-green-700 sm:text-sm">
          {round(percent)}%
        </p>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200 sm:h-2.5">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-lg font-black leading-none text-slate-950 sm:text-2xl">
        {consumed}
        <span className="text-xs font-bold text-slate-400 sm:text-base">
          {" "}
          / {goal || "—"} {unit}
        </span>
      </p>

      <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">
        <span className="font-black text-green-700">
          {remaining} {unit}
        </span>{" "}
        left
      </p>
    </div>
  );
}