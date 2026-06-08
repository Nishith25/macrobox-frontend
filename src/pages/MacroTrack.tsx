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
          remaining.protein > 0 ? Math.min(protein / remaining.protein, 1.5) : 0;

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10">
        <div className="mx-auto max-w-[1240px] rounded-[24px] border bg-white p-10 text-slate-500 shadow-sm">
          Loading MacroTrack...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-7">
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
            Welcome, {user?.name?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="mt-1 text-base font-medium text-slate-500">
            MacroTrack your calories, protein, carbs and fats for today.
          </p>
        </div>

        <section className="mb-7 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Body Details & Goal
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Used to calculate your daily macro targets.
              </p>
            </div>

            {locked ? (
              <button
                onClick={handleChange}
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-green-600 px-5 py-2.5 text-sm font-black text-green-700 hover:bg-green-50"
              >
                <Pencil size={16} />
                Change Values
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleChange}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-green-600 px-5 py-2.5 text-sm font-black text-white hover:bg-green-700"
                >
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {locked ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
              <Detail icon={<Scale size={15} />} label="HEIGHT" value={`${height || "—"} cm`} />
              <Detail icon={<Gauge size={15} />} label="WEIGHT" value={`${weight || "—"} kg`} />
              <Detail icon={<CalendarDays size={15} />} label="AGE" value={`${age || "—"} yrs`} />
              <Detail icon={<Target size={15} />} label="GENDER" value={gender === "male" ? "Male" : "Female"} />
              <Detail icon={<Zap size={15} />} label="ACTIVITY" value={activityLabels[activity]} />
              <Detail icon={<Target size={15} />} label="GOAL" value={goalLabels[goal]} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="HEIGHT (CM)" value={height} setValue={setHeight} icon={<Scale size={16} />} />
              <Input label="WEIGHT (KG)" value={weight} setValue={setWeight} icon={<Gauge size={16} />} />
              <Input label="AGE (YRS)" value={age} setValue={setAge} icon={<CalendarDays size={16} />} />

              <Field label="GENDER">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-ui">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>

              <Field label="ACTIVITY LEVEL">
                <select value={activity} onChange={(e) => setActivity(e.target.value)} className="input-ui">
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light Active</option>
                  <option value="moderate">Moderately Active (3–5 days/week)</option>
                  <option value="active">Very Active</option>
                  <option value="very_active">Athlete</option>
                </select>
              </Field>

              <Field label="FITNESS GOAL">
                <select value={goal} onChange={(e) => setGoal(e.target.value as GoalType)} className="input-ui">
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

        <section className="mb-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
  <Stat
    icon={<Scale size={20} />}
    title="BMI"
    value={bmi ?? "—"}
    label={bmiLabel}
    color="orange"
  />

  <Stat
    icon={<Flame size={20} />}
    title="TARGET CALORIES"
    value={macroGoals.calories ? `${macroGoals.calories.toLocaleString()} kcal` : "—"}
    label={goalLabels[goal]}
    color="green"
  />

  <Stat
    icon={<Dumbbell size={20} />}
    title="PROTEIN GOAL"
    value={macroGoals.protein ? `${macroGoals.protein} g` : "—"}
    label="Daily protein"
    color="green"
  />

  <Stat
    icon={<Target size={20} />}
    title="MAINTENANCE"
    value={maintenanceCalories ? `${maintenanceCalories.toLocaleString()} kcal` : "—"}
    label="To maintain weight"
    color="blue"
  />
</section>

        <section className="mb-7 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                MacroTrack Today
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Track how much you ate and how much is still remaining today.
              </p>
            </div>

            <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              {todayKey()}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MacroProgress title="Calories" consumed={consumed.calories} goal={macroGoals.calories} remaining={remaining.calories} unit="kcal" color="orange" icon={<Flame size={18} />} />
            <MacroProgress title="Protein" consumed={consumed.protein} goal={macroGoals.protein} remaining={remaining.protein} unit="g" color="green" icon={<Dumbbell size={18} />} />
            <MacroProgress title="Carbs" consumed={consumed.carbs} goal={macroGoals.carbs} remaining={remaining.carbs} unit="g" color="yellow" icon={<Apple size={18} />} />
            <MacroProgress title="Fat" consumed={consumed.fat} goal={macroGoals.fat} remaining={remaining.fat} unit="g" color="blue" icon={<Target size={18} />} />
          </div>
        </section>

        <section className="grid gap-7 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white">
                <Plus size={20} />
              </span>
              <h2 className="text-xl font-black text-slate-950">Add Food</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="FOOD NAME *" className="md:col-span-2">
                <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Grilled Chicken Breast" className="input-ui" />
              </Field>

              <Field label="MEAL TYPE" className="md:col-span-2">
                <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)} className="input-ui">
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Snack</option>
                  <option>Dinner</option>
                </select>
              </Field>

              <Field label="CALORIES (KCAL) *">
                <input value={foodCalories} onChange={(e) => setFoodCalories(e.target.value)} type="number" placeholder="0" className="input-ui" />
              </Field>

              <Field label="PROTEIN (G) *">
                <input value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)} type="number" placeholder="0" className="input-ui" />
              </Field>

              <Field label="CARBS (G) *">
                <input value={foodCarbs} onChange={(e) => setFoodCarbs(e.target.value)} type="number" placeholder="0" className="input-ui" />
              </Field>

              <Field label="FAT (G) *">
                <input value={foodFat} onChange={(e) => setFoodFat(e.target.value)} type="number" placeholder="0" className="input-ui" />
              </Field>
            </div>

            <button onClick={addFood} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-green-600 text-base font-black text-white hover:bg-green-700">
              <Plus size={18} />
              Add to Today's Log
            </button>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700">
                <Utensils size={18} />
              </span>
              <h2 className="text-xl font-black text-slate-950">
                What Should I Eat Next?
              </h2>
            </div>

            <p className="mb-5 text-sm font-medium text-slate-500">
              Based on your remaining macros, here are smart MacroBox suggestions.
            </p>

            <div className="space-y-3">
              {suggestedMeals.length === 0 ? (
                <p className="rounded-[18px] bg-slate-50 p-4 text-sm font-medium text-slate-500">
                  Add body details and make sure meals have calories, protein, carbs and fat values.
                </p>
              ) : (
                suggestedMeals.map((meal) => (
                  <div key={meal._id} className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-200 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{meal.title}</p>
                        <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-black text-green-700">
                          High Protein
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        🔥 {numberOrZero(meal.calories)} kcal · 🥩 {numberOrZero(meal.protein)}g protein · 🌾 {numberOrZero(meal.carbs)}g carbs · 💧 {numberOrZero(meal.fat)}g fat
                      </p>
                      <p className="mt-1 text-sm font-bold text-green-700">
                        Good match for {goalLabels[goal]}
                      </p>
                    </div>

                    <button onClick={() => addMealToLog(meal)} className="shrink-0 rounded-full bg-green-600 px-5 py-2.5 text-sm font-black text-white hover:bg-green-700">
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700">
                <Apple size={18} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Today's Food Log
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  {foodLog.length} items logged today
                </p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-500">
              🔥 {consumed.calories} kcal &nbsp; 🥩 {consumed.protein}g P &nbsp; 🌾 {consumed.carbs}g C &nbsp; 💧 {consumed.fat}g F
            </p>
          </div>

          {foodLog.length === 0 ? (
            <p className="rounded-[18px] bg-slate-50 p-4 text-sm font-medium text-slate-500">
              No food added yet today.
            </p>
          ) : (
            <div className="space-y-3">
              {foodLog.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-[18px] border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                        {item.mealType}
                      </span>
                      <p className="font-black text-slate-950">{item.name}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      🔥 {item.calories} kcal · 🥩 {item.protein} g · 🌾 {item.carbs} g · 💧 {item.fat} g
                    </p>
                  </div>

                  <button onClick={() => removeFood(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
        <span className="text-green-600">{icon}</span>
        {label}
      </p>
      <p className="text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black text-slate-500">
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
          className="input-ui input-ui-icon"
        />
      </div>
    </Field>
  );
}

function Stat({
  title,
  value,
  label,
  icon,
  color,
}: {
  title: string;
  value: string;
  label: string;
  icon: React.ReactNode;
  color: "green" | "orange" | "blue";
}) {
  const colorClass =
    color === "green"
      ? "bg-green-50 text-green-700"
      : color === "orange"
      ? "bg-orange-50 text-orange-600"
      : "bg-blue-50 text-blue-600";

  const labelColor =
    color === "green"
      ? "text-green-700"
      : color === "orange"
      ? "text-orange-600"
      : "text-blue-600";

  const description =
    title === "BMI"
      ? "Body Mass Index"
      : title === "MAINTENANCE"
      ? "Total daily energy expenditure"
      : title === "PROTEIN GOAL"
      ? "Grams of protein per day"
      : "Daily caloric target";

  return (
    <div className="min-h-[190px] rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-10 flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${colorClass}`}
        >
          {icon}
        </div>

        <p className="max-w-[100px] text-right text-xs font-black uppercase leading-4 text-slate-500">
          {title}
        </p>
      </div>

      <p className="whitespace-nowrap text-[32px] font-black leading-none tracking-[-0.06em] text-slate-950">
        {value}
      </p>

      <p className={`mt-3 text-base font-black ${labelColor}`}>{label}</p>

      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MacroProgress({ title, consumed, goal, remaining, unit, color, icon }: { title: string; consumed: number; goal: number; remaining: number; unit: string; color: "orange" | "green" | "yellow" | "blue"; icon: React.ReactNode }) {
  const percent = goal > 0 ? clamp((consumed / goal) * 100, 0, 100) : 0;

  const fill =
    color === "orange"
      ? "bg-orange-500"
      : color === "green"
      ? "bg-green-600"
      : color === "yellow"
      ? "bg-yellow-500"
      : "bg-blue-500";

  const light =
    color === "orange"
      ? "bg-orange-50 text-orange-600"
      : color === "green"
      ? "bg-green-50 text-green-700"
      : color === "yellow"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-blue-50 text-blue-600";

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${light}`}>
            {icon}
          </span>
          <div>
            <p className="font-black text-slate-950">{title}</p>
            <p className="text-xs font-medium text-slate-500">{unit}</p>
          </div>
        </div>

        <p className={`font-black ${light.split(" ").slice(-1)[0]}`}>
          {round(percent)}%
        </p>
      </div>

      <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
      </div>

      <div className="flex items-end justify-between">
        <p className="text-2xl font-black text-slate-950">
          {consumed}
          <span className="text-base font-bold text-slate-400"> / {goal || "—"} {unit}</span>
        </p>

        <p className="text-right text-sm font-medium text-slate-500">
          Remaining<br />
          <span className={`font-black ${light.split(" ").slice(-1)[0]}`}>
            {remaining} {unit}
          </span>
        </p>
      </div>
    </div>
  );
}