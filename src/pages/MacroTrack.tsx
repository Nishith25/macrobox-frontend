// frontend/src/pages/MacroTrack.tsx (FRONTEND)
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import {
  Apple,
  Beef,
  Flame,
  Plus,
  Scale,
  Target,
  Trash2,
  Utensils,
} from "lucide-react";

/* ================= TYPES ================= */

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

/* ================= CONSTANTS ================= */

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

const todayKey = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

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

/* ================= DASHBOARD ================= */

export default function Dashboard() {
  const { user } = useAuth();

  /* ================= BODY STATE ================= */
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activity, setActivity] = useState("moderate");
  const [goalWeight, setGoalWeight] = useState("");
  const [goal, setGoal] = useState<GoalType>("fat_loss");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ================= MACROTRACK STATE ================= */
  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");

  const [foodLog, setFoodLog] = useState<FoodLogItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  /* ================= LOAD SAVED DATA ================= */
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
            setHeight(String(m.height || ""));
            setWeight(String(m.weight || ""));
            setAge(String(m.age || ""));
            setGender(m.gender || "male");
            setActivity(m.activity || "moderate");
            setGoalWeight(String(m.goalWeight || ""));
            setLocked(Boolean(m.locked));
          }
        }

        if (mealsRes.status === "fulfilled") {
          const data = mealsRes.value.data;
          setMeals(Array.isArray(data) ? data : data?.meals || []);
        }
      } catch (error) {
        console.error("DASHBOARD LOAD ERROR:", error);
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



  /* ================= PARSED VALUES ================= */
  const h = Number(height);
  const w = Number(weight);
  const a = Number(age);
  const gw = Number(goalWeight);
  const isValid = h > 0 && w > 0 && a > 0;

  /* ================= BMI ================= */
  const bmiValue = isValid ? w / Math.pow(h / 100, 2) : null;
  const bmi = bmiValue ? bmiValue.toFixed(1) : null;

  const bmiLabel =
    bmi === null
      ? "—"
      : Number(bmi) < 18.5
      ? "Underweight"
      : Number(bmi) < 25
      ? "Normal"
      : Number(bmi) < 30
      ? "Overweight"
      : "Obese";

  /* ================= CALORIE CALCULATION ================= */
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
    if (goal === "maintenance") adjustment = 0;

    if (gw && w) {
      const raw = Math.round(((gw - w) * 7700) / 60);
      adjustment = clamp(raw, -700, 700);
    }

    return Math.max(1200, maintenanceCalories + adjustment);
  }, [maintenanceCalories, goal, gw, w]);

  /* ================= MACRO GOALS ================= */
  const macroGoals = useMemo(() => {
    if (!targetCalories || !w) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    let proteinMultiplier = 1.6;
    let fatRatio = 0.25;

    if (goal === "fat_loss") {
      proteinMultiplier = 2.2;
      fatRatio = 0.25;
    }

    if (goal === "weight_loss") {
      proteinMultiplier = 2.0;
      fatRatio = 0.25;
    }

    if (goal === "muscle_gain") {
      proteinMultiplier = 2.1;
      fatRatio = 0.25;
    }

    if (goal === "weight_gain") {
      proteinMultiplier = 1.8;
      fatRatio = 0.28;
    }

    if (goal === "maintenance") {
      proteinMultiplier = 1.6;
      fatRatio = 0.25;
    }

    const protein = round(w * proteinMultiplier);
    const fat = round((targetCalories * fatRatio) / 9);
    const proteinCalories = protein * 4;
    const fatCalories = fat * 9;
    const remainingCalories = Math.max(
      targetCalories - proteinCalories - fatCalories,
      0
    );
    const carbs = round(remainingCalories / 4);

    return {
      calories: round(targetCalories),
      protein,
      carbs,
      fat,
    };
  }, [targetCalories, w, goal]);

  /* ================= CONSUMED TOTALS ================= */
  const consumed = useMemo(() => {
    return foodLog.reduce(
      (acc, item) => {
        acc.calories += numberOrZero(item.calories);
        acc.protein += numberOrZero(item.protein);
        acc.carbs += numberOrZero(item.carbs);
        acc.fat += numberOrZero(item.fat);
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
  }, [foodLog]);

  const remaining = {
    calories: Math.max(macroGoals.calories - consumed.calories, 0),
    protein: Math.max(macroGoals.protein - consumed.protein, 0),
    carbs: Math.max(macroGoals.carbs - consumed.carbs, 0),
    fat: Math.max(macroGoals.fat - consumed.fat, 0),
  };

  /* ================= SUGGESTIONS ================= */
  const suggestedMeals = useMemo(() => {
    if (!meals.length || !macroGoals.calories) return [];

    return [...meals]
      .map((meal) => {
        const calories = numberOrZero(meal.calories);
        const protein = numberOrZero(meal.protein);
        const carbs = numberOrZero(meal.carbs);
        const fat = numberOrZero(meal.fat);

        const calorieFit =
          calories <= remaining.calories || remaining.calories === 0 ? 1 : 0.4;

        const proteinScore =
          remaining.protein > 0 ? Math.min(protein / remaining.protein, 1.5) : 0;

        const caloriePenalty =
          remaining.calories > 0
            ? Math.abs(remaining.calories - calories) / remaining.calories
            : 0;

        const score =
          proteinScore * 60 +
          calorieFit * 25 -
          caloriePenalty * 15 +
          (goal === "muscle_gain" && protein >= 30 ? 15 : 0) +
          (goal === "fat_loss" && protein >= 25 && calories <= 600 ? 15 : 0);

        return {
          ...meal,
          calories,
          protein,
          carbs,
          fat,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [meals, remaining, macroGoals.calories, goal]);

  /* ================= SAVE BODY DETAILS ================= */
  const handleSave = async () => {
    if (!isValid) {
      alert("Please enter valid body details");
      return;
    }

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
  };

  const handleChange = async () => {
    await api.post("/user/body-metrics", {
      height: h,
      weight: w,
      age: a,
      gender,
      activity,
      goalWeight: gw,
      locked: false,
    });

    setLocked(false);
  };

  /* ================= FOOD LOG ================= */
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

    setFoodName("");
    setFoodCalories("");
    setFoodProtein("");
    setFoodCarbs("");
    setFoodFat("");
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

  /* ================= UI ================= */
  if (loading) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-gray-500">Loading dashboard...</p>
    </div>
  );
}
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name} 👋
        </h1>
        <p className="mt-1 text-gray-600">
          MacroTrack your calories, protein, carbs and fats for today.
        </p>
      </div>

      {/* BODY DETAILS */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Body Details & Goal
            </h2>
            <p className="text-sm text-gray-500">
              Used to calculate your daily macro targets.
            </p>
          </div>

          {!locked ? (
            <button
              onClick={handleSave}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Save Details
            </button>
          ) : (
            <button
              onClick={handleChange}
              className="rounded-xl border border-green-600 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Change Values
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Height (cm)"
            value={height}
            setValue={setHeight}
            disabled={locked}
          />
          <Input
            label="Weight (kg)"
            value={weight}
            setValue={setWeight}
            disabled={locked}
          />
          <Input
            label="Age (years)"
            value={age}
            setValue={setAge}
            disabled={locked}
          />

          <select
            disabled={locked}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="h-11 rounded-xl border px-3 text-sm disabled:bg-gray-100"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <select
            disabled={locked}
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="h-11 rounded-xl border px-3 text-sm disabled:bg-gray-100"
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Lightly Active</option>
            <option value="moderate">Moderately Active</option>
            <option value="active">Very Active</option>
            <option value="very_active">Athlete</option>
          </select>

          <Input
            label="Target weight (kg)"
            value={goalWeight}
            setValue={setGoalWeight}
            disabled={locked}
          />

          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as GoalType)}
            className="h-11 rounded-xl border px-3 text-sm md:col-span-3"
          >
            <option value="fat_loss">Fat Loss</option>
            <option value="weight_loss">Weight Loss</option>
            <option value="maintenance">Maintenance</option>
            <option value="weight_gain">Weight Gain</option>
            <option value="muscle_gain">Muscle Gain</option>
          </select>
        </div>
      </div>

      {/* BMI + TARGETS */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat
          icon={<Scale size={20} />}
          title="BMI"
          value={bmi ?? "—"}
          label={bmiLabel}
        />
        <Stat
          icon={<Flame size={20} />}
          title="Target Calories"
          value={macroGoals.calories ? `${macroGoals.calories} kcal` : "—"}
          label={goalLabels[goal]}
        />
        <Stat
          icon={<Beef size={20} />}
          title="Protein Goal"
          value={macroGoals.protein ? `${macroGoals.protein} g` : "—"}
          label="Daily protein"
          highlight
        />
        <Stat
          icon={<Target size={20} />}
          title="Maintenance"
          value={maintenanceCalories ? `${maintenanceCalories} kcal` : "—"}
          label="To maintain weight"
        />
      </div>

      {/* MACROTRACK PROGRESS */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              MacroTrack Today
            </h2>
            <p className="text-sm text-gray-500">
              Track how much you ate and how much is still remaining today.
            </p>
          </div>

          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {todayKey()}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MacroProgress
            title="Calories"
            consumed={consumed.calories}
            goal={macroGoals.calories}
            remaining={remaining.calories}
            unit="kcal"
          />
          <MacroProgress
            title="Protein"
            consumed={consumed.protein}
            goal={macroGoals.protein}
            remaining={remaining.protein}
            unit="g"
          />
          <MacroProgress
            title="Carbs"
            consumed={consumed.carbs}
            goal={macroGoals.carbs}
            remaining={remaining.carbs}
            unit="g"
          />
          <MacroProgress
            title="Fat"
            consumed={consumed.fat}
            goal={macroGoals.fat}
            remaining={remaining.fat}
            unit="g"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ADD FOOD */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Add Food</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Food name"
              className="h-11 rounded-xl border px-3 text-sm md:col-span-2"
            />

            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="h-11 rounded-xl border px-3 text-sm md:col-span-2"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Snack</option>
              <option>Dinner</option>
            </select>

            <input
              value={foodCalories}
              onChange={(e) => setFoodCalories(e.target.value)}
              placeholder="Calories"
              type="number"
              className="h-11 rounded-xl border px-3 text-sm"
            />

            <input
              value={foodProtein}
              onChange={(e) => setFoodProtein(e.target.value)}
              placeholder="Protein (g)"
              type="number"
              className="h-11 rounded-xl border px-3 text-sm"
            />

            <input
              value={foodCarbs}
              onChange={(e) => setFoodCarbs(e.target.value)}
              placeholder="Carbs (g)"
              type="number"
              className="h-11 rounded-xl border px-3 text-sm"
            />

            <input
              value={foodFat}
              onChange={(e) => setFoodFat(e.target.value)}
              placeholder="Fat (g)"
              type="number"
              className="h-11 rounded-xl border px-3 text-sm"
            />
          </div>

          <button
            onClick={addFood}
            className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            Add to Today’s Log
          </button>
        </div>

        {/* SUGGESTIONS */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Utensils size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              What Should I Eat Next?
            </h2>
          </div>

          <p className="mb-4 text-sm text-gray-500">
            Based on your remaining macros, here are smart MacroBox suggestions.
          </p>

          {suggestedMeals.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              Add body details and make sure meals have calories, protein, carbs
              and fat values.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestedMeals.map((meal) => (
                <div
                  key={meal._id}
                  className="flex items-center justify-between gap-4 rounded-xl border p-3"
                >
                  <div>
                    <p className="font-bold text-gray-900">{meal.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {numberOrZero(meal.calories)} kcal •{" "}
                      {numberOrZero(meal.protein)}g protein •{" "}
                      {numberOrZero(meal.carbs)}g carbs •{" "}
                      {numberOrZero(meal.fat)}g fat
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Good match for {goalLabels[goal]}
                    </p>
                  </div>

                  <button
                    onClick={() => addMealToLog(meal)}
                    className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TODAY FOOD LOG */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Apple size={20} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Today’s Food Log</h2>
        </div>

        {foodLog.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            No food added yet today.
          </p>
        ) : (
          <div className="space-y-3">
            {foodLog.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold text-gray-900">
                    {item.name}{" "}
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                      {item.mealType}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.calories} kcal • {item.protein}g protein •{" "}
                    {item.carbs}g carbs • {item.fat}g fat
                  </p>
                </div>

                <button
                  onClick={() => removeFood(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Input({
  label,
  value,
  setValue,
  disabled,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      placeholder={label}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      className={`h-11 rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 ${
        disabled ? "cursor-not-allowed bg-gray-100" : ""
      }`}
    />
  );
}

function Stat({
  title,
  value,
  label,
  highlight,
  icon,
}: {
  title: string;
  value: string;
  label: string;
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight ? "border-green-300 bg-green-50" : "bg-white"
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-green-700">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-green-700">{label}</p>
    </div>
  );
}

function MacroProgress({
  title,
  consumed,
  goal,
  remaining,
  unit,
}: {
  title: string;
  consumed: number;
  goal: number;
  remaining: number;
  unit: string;
}) {
  const percent = goal > 0 ? clamp((consumed / goal) * 100, 0, 100) : 0;

  return (
    <div className="rounded-xl border bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">
          {round(percent)}
          %
        </p>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-sm font-semibold text-gray-900">
        {consumed} / {goal || "—"} {unit}
      </p>
      <p className="mt-1 text-xs text-green-700">
        Remaining: {remaining} {unit}
      </p>
    </div>
  );
}