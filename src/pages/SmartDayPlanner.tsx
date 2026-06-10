// frontend/src/pages/SmartDayPlanner.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Beef,
  CalendarDays,
  CheckSquare,
  Flame,
  Save,
  ShoppingCart,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

type GoalType =
  | "weight_loss"
  | "maintenance"
  | "weight_gain"
  | "muscle_gain"
  | "fat_loss";

type MealTime = "breakfast" | "lunch" | "snack" | "dinner";

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

const TIMES: MealTime[] = ["breakfast", "lunch", "snack", "dinner"];

const timeLabels: Record<MealTime, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
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

const goalStorageKey = (userId?: string) =>
  `macrotrack-goal-${userId || "guest"}`;

const n = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const todayText = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const savedPlanName = (plan: SavedPlan) =>
  plan.name ||
  plan.planName ||
  plan.title ||
  `Saved Plan - ${new Date(plan.date).toLocaleDateString("en-IN")}`;

export default function SmartDayPlanner() {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<Record<string, MealTime[]>>({});
  const [planName, setPlanName] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [goal, setGoal] = useState<GoalType>("fat_loss");
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const savedGoal = localStorage.getItem(goalStorageKey(user?._id));
        if (savedGoal) setGoal(savedGoal as GoalType);

        const [mealsRes, historyRes, userRes] = await Promise.allSettled([
          api.get("/meals", { params: { all: "true" } }),
          api.get("/user/day-plan"),
          api.get("/user/me"),
        ]);

        if (mealsRes.status === "fulfilled") {
          const data = mealsRes.value.data;
          const allMeals: Meal[] = Array.isArray(data)
            ? data
            : data?.meals || [];

          setMeals(allMeals.filter((meal) => meal.isAvailable !== false));
        }

        if (historyRes.status === "fulfilled") {
          setHistory(historyRes.value.data || []);
        }

        if (userRes.status === "fulfilled") {
          setBodyMetrics(userRes.value.data?.bodyMetrics || null);
        }
      } catch (error) {
        console.error("SMART DAY PLANNER LOAD ERROR:", error);
        toast.error("Failed to load Smart Day Planner");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?._id]);

  useEffect(() => {
    localStorage.setItem(goalStorageKey(user?._id), goal);
  }, [goal, user?._id]);

  const fetchHistory = async () => {
    const res = await api.get("/user/day-plan");
    setHistory(res.data || []);
  };

  const macroGoals = useMemo(() => {
    const h = n(bodyMetrics?.height);
    const w = n(bodyMetrics?.weight);
    const a = n(bodyMetrics?.age);
    const gw = n(bodyMetrics?.goalWeight);
    const gender = bodyMetrics?.gender || "male";
    const activity = bodyMetrics?.activity || "moderate";

    if (!h || !w || !a) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, maintenance: 0 };
    }

    const bmr =
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

    const maintenance = Math.round(
      bmr * (activityMultipliers[activity] || 1.55)
    );

    let adjustment = 0;
    if (goal === "weight_loss") adjustment = -450;
    if (goal === "fat_loss") adjustment = -550;
    if (goal === "weight_gain") adjustment = 400;
    if (goal === "muscle_gain") adjustment = 250;

    if (gw && w) {
      const raw = Math.round(((gw - w) * 7700) / 60);
      adjustment = clamp(raw, -700, 700);
    }

    const calories = Math.max(1200, maintenance + adjustment);

    let proteinMultiplier = 1.6;
    let fatRatio = 0.25;

    if (goal === "fat_loss") proteinMultiplier = 2.2;
    if (goal === "weight_loss") proteinMultiplier = 2.0;
    if (goal === "muscle_gain") proteinMultiplier = 2.1;
    if (goal === "weight_gain") {
      proteinMultiplier = 1.8;
      fatRatio = 0.28;
    }

    const protein = Math.round(w * proteinMultiplier);
    const fat = Math.round((calories * fatRatio) / 9);
    const carbs = Math.round(Math.max(calories - protein * 4 - fat * 9, 0) / 4);

    return {
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
      maintenance,
    };
  }, [bodyMetrics, goal]);

  const selectedEntries = useMemo(() => {
    return Object.entries(selected)
      .filter(([, times]) => times.length > 0)
      .map(([mealId, times]) => {
        const meal = meals.find((m) => m._id === mealId);
        return meal ? { meal, times } : null;
      })
      .filter(Boolean) as { meal: Meal; times: MealTime[] }[];
  }, [selected, meals]);

  const plannedTotals = useMemo(() => {
    return selectedEntries.reduce(
      (acc, item) => {
        const count = item.times.length;
        acc.calories += n(item.meal.calories) * count;
        acc.protein += n(item.meal.protein) * count;
        acc.carbs += n(item.meal.carbs) * count;
        acc.fat += n(item.meal.fat) * count;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [selectedEntries]);

  const remaining = {
    calories: Math.max(macroGoals.calories - plannedTotals.calories, 0),
    protein: Math.max(macroGoals.protein - plannedTotals.protein, 0),
    carbs: Math.max(macroGoals.carbs - plannedTotals.carbs, 0),
    fat: Math.max(macroGoals.fat - plannedTotals.fat, 0),
  };

  const toggleSelect = (mealId: string, time: MealTime) => {
    setSelected((prev) => {
      const current = prev[mealId] || [];
      const exists = current.includes(time);

      return {
        ...prev,
        [mealId]: exists
          ? current.filter((t) => t !== time)
          : [...current, time],
      };
    });
  };

  const scoreMeal = (
    meal: Meal,
    remainingCalories: number,
    remainingProtein: number
  ) => {
    const calories = n(meal.calories);
    const protein = n(meal.protein);
    const carbs = n(meal.carbs);
    const fat = n(meal.fat);

    const proteinScore =
      remainingProtein > 0 ? Math.min(protein / remainingProtein, 1.5) * 50 : 0;

    const calorieFit =
      remainingCalories > 0
        ? 30 - Math.abs(remainingCalories / 4 - calories) / 20
        : 0;

    const hasGoalTag =
      goal === "fat_loss"
        ? meal.goalTypes?.includes("fat_loss")
        : goal === "muscle_gain"
        ? meal.goalTypes?.includes("muscle_gain")
        : goal === "weight_gain"
        ? meal.goalTypes?.includes("weight_gain")
        : true;

    const tagBonus = hasGoalTag ? 20 : 0;

    const goalBonus =
      goal === "fat_loss" && protein >= 25 && calories <= 600
        ? 20
        : goal === "muscle_gain" && protein >= 30
        ? 20
        : goal === "weight_gain" && calories >= 500
        ? 15
        : 0;

    const macroPenalty = fat > 35 ? 10 : 0;
    const carbBonus = carbs > 0 ? 5 : 0;

    return (
      proteinScore + calorieFit + goalBonus + tagBonus + carbBonus - macroPenalty
    );
  };

  const autoSmartDayPlanner = () => {
    if (!meals.length) {
      toast.error("No meals available");
      return;
    }

    if (!macroGoals.calories) {
      toast.error("Please complete body details in MacroTrack first");
      return;
    }

    let remainingCalories = macroGoals.calories;
    let remainingProtein = macroGoals.protein;
    const usedMealIds = new Set<string>();
    const nextSelected: Record<string, MealTime[]> = {};

    TIMES.forEach((time) => {
      const candidates = meals
        .filter((meal) => !usedMealIds.has(meal._id))
        .map((meal) => ({
          meal,
          score: scoreMeal(meal, remainingCalories, remainingProtein),
        }))
        .sort((a, b) => b.score - a.score);

      const best = candidates[0]?.meal;
      if (!best) return;

      usedMealIds.add(best._id);
      nextSelected[best._id] = [...(nextSelected[best._id] || []), time];

      remainingCalories -= n(best.calories);
      remainingProtein -= n(best.protein);
    });

    setSelected(nextSelected);
    toast.success("Smart day plan generated");
  };

  const clearPlan = () => {
    setSelected({});
    setPlanName("");
  };

  const handleSavePlan = async () => {
    const cleanName = planName.trim();

    if (!cleanName) {
      toast.error("Please enter a plan name before saving.");
      return;
    }

    const items = Object.entries(selected)
      .filter(([, times]) => times.length > 0)
      .map(([mealId, times]) => ({ mealId, times }));

    if (items.length === 0) {
      toast.error("Select at least one meal");
      return;
    }

    setSaving(true);

    try {
      await api.post("/user/day-plan", {
        name: cleanName,
        planName: cleanName,
        items,
      });

      setSelected({});
      setPlanName("");
      await fetchHistory();
      toast.success("Plan saved");
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const addSelectedPlanToCart = () => {
    if (selectedEntries.length === 0) {
      toast.error("Select at least one meal");
      return;
    }

    selectedEntries.forEach(({ meal, times }) => {
      times.forEach(() => {
        addToCart({
          _id: meal._id,
          title: meal.title,
          price: n(meal.price),
          protein: n(meal.protein),
          calories: n(meal.calories),
          carbs: n(meal.carbs),
          fat: n(meal.fat),
          imageUrl: meal.imageUrl,
        });
      });
    });

    toast.success("Selected plan added to cart");
  };

  const addSavedPlanToCart = (plan: SavedPlan) => {
    if (!plan.items?.length) {
      toast.error("This saved plan has no meals.");
      return;
    }

    plan.items.forEach((item) => {
      item.times.forEach(() => {
        addToCart({
          _id: item.meal._id,
          title: item.meal.title,
          price: n(item.meal.price),
          protein: n(item.meal.protein),
          calories: n(item.meal.calories),
          carbs: n(item.meal.carbs),
          fat: n(item.meal.fat),
          imageUrl: item.meal.imageUrl,
        });
      });
    });

    toast.success(`${savedPlanName(plan)} added to cart`);
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this saved plan?")) return;

    try {
      await api.delete(`/user/day-plan/${id}`);
      await fetchHistory();
      toast.success("Plan deleted");
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-[1240px] rounded-[24px] border bg-white p-8 text-slate-500 shadow-sm">
          Loading Smart Day Planner...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1240px]">
        <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                <CalendarDays size={20} />
              </span>

              <h1 className="text-[30px] font-black tracking-[-0.04em] text-slate-950">
                Smart Day Planner
              </h1>
            </div>

            <p className="text-base font-medium leading-7 text-slate-500">
              Build a full day meal plan based on calories, protein, carbs and
              fat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              ↗ {goalLabels[goal]}
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500">
              {todayText()}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-6">
          <label className="mb-3 block text-xs font-black uppercase tracking-wide text-slate-500">
            Your Goal
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as GoalType)}
              className="input-ui"
            >
              <option value="fat_loss">Fat Loss</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <button
                onClick={autoSmartDayPlanner}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700 sm:px-5"
              >
                <Sparkles size={17} />
                Auto Plan
              </button>

              <button
                onClick={clearPlan}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 sm:px-5"
              >
                <X size={17} />
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">
              Daily Macro Targets
            </h2>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-500">
              {selectedEntries.length} meals selected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <GoalCard
              icon={<Flame size={20} />}
              title="Calories"
              planned={plannedTotals.calories}
              target={macroGoals.calories}
              remaining={remaining.calories}
              unit="kcal"
              color="orange"
            />

            <GoalCard
              icon={<Beef size={20} />}
              title="Protein"
              planned={plannedTotals.protein}
              target={macroGoals.protein}
              remaining={remaining.protein}
              unit="g"
              color="green"
            />

            <GoalCard
              icon={<Target size={20} />}
              title="Carbs"
              planned={plannedTotals.carbs}
              target={macroGoals.carbs}
              remaining={remaining.carbs}
              unit="g"
              color="yellow"
            />

            <GoalCard
              icon={<Utensils size={20} />}
              title="Fat"
              planned={plannedTotals.fat}
              target={macroGoals.fat}
              remaining={remaining.fat}
              unit="g"
              color="blue"
            />
          </div>
        </section>

        {!macroGoals.calories && (
          <div className="mb-8 rounded-[18px] border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
            Complete your body details in MacroTrack first to get accurate macro
            targets.
          </div>
        )}

        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-950">
              Choose Meals for Each Time
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Select breakfast, lunch, snack, or dinner for each meal.
            </p>
          </div>

          {meals.length === 0 ? (
            <div className="rounded-[24px] border bg-white p-10 text-center text-slate-500">
              No meals available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {meals.map((m) => {
                const selectedTimes = selected[m._id] || [];

                return (
                  <article
                    key={m._id}
                    className={`overflow-hidden rounded-[20px] border bg-white shadow-sm transition ${
                      selectedTimes.length
                        ? "border-green-400 bg-green-50/40"
                        : "border-slate-200 hover:border-green-200"
                    }`}
                  >
                    <div className="flex min-h-[122px]">
                      <div className="h-[122px] w-[112px] shrink-0 overflow-hidden bg-slate-100 sm:w-[130px]">
                        <img
                          src={m.imageUrl || "/placeholder-meal.png"}
                          alt={m.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-meal.png";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1 p-3 sm:p-4">
                        <h3 className="truncate text-base font-black text-slate-950">
                          {m.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                          <Badge color="orange">🔥 {n(m.calories)} kcal</Badge>
                          <Badge color="green">🥩 {n(m.protein)}g</Badge>
                          <Badge color="yellow">🌾 {n(m.carbs)}g</Badge>
                          <Badge color="blue">💧 {n(m.fat)}g</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                          {TIMES.map((t) => {
                            const active = selectedTimes.includes(t);

                            return (
                              <button
                                key={t}
                                onClick={() => toggleSelect(m._id, t)}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${
                                  active
                                    ? "border-green-600 bg-green-600 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-green-500"
                                }`}
                              >
                                {timeLabels[t]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <CheckSquare size={20} className="text-green-600" />
              <h2 className="text-xl font-black text-slate-950">
                Selected Day Plan
              </h2>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Plan Name <span className="text-red-500">*</span>
              </label>

              <input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Example: Muscle Gain Monday Plan"
                className="input-ui"
              />

              <p className="mt-2 text-xs font-semibold text-slate-500">
                A plan name is compulsory before saving.
              </p>
            </div>

            {selectedEntries.length === 0 ? (
              <EmptyState
                title="No meals selected yet"
                description="Use Auto Plan or choose meals manually to build your day."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {TIMES.map((time) => {
                  const items = selectedEntries.filter((entry) =>
                    entry.times.includes(time)
                  );

                  return (
                    <div
                      key={time}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                        {timeLabels[time]}
                      </p>

                      {items.length === 0 ? (
                        <p className="text-sm font-medium text-slate-400">
                          No meal selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {items.map(({ meal }) => (
                            <div
                              key={`${time}-${meal._id}`}
                              className="rounded-[14px] bg-white p-3"
                            >
                              <p className="font-black text-slate-950">
                                {meal.title}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {n(meal.calories)} kcal · {n(meal.protein)}g
                                protein · ₹{n(meal.price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-[18px] bg-green-600 px-6 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Plan"}
              </button>

              <button
                onClick={addSelectedPlanToCart}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-[18px] border border-green-600 px-6 text-sm font-black text-green-700 hover:bg-green-50"
              >
                <ShoppingCart size={17} />
                Add Selected Meals to Cart
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <Save size={20} className="text-green-600" />
              <h2 className="text-xl font-black text-slate-950">
                Saved Plans
              </h2>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {history.length === 0 ? (
              <EmptyState
                title="No saved plans yet"
                description="Create a plan, give it a name, and save it here."
              />
            ) : (
              <div className="space-y-4">
                {history.map((plan) => {
                  const totals = plan.items.reduce(
                    (acc, item) => {
                      const count = item.times.length;
                      acc.calories += n(item.meal?.calories) * count;
                      acc.protein += n(item.meal?.protein) * count;
                      acc.carbs += n(item.meal?.carbs) * count;
                      acc.fat += n(item.meal?.fat) * count;
                      acc.price += n(item.meal?.price) * count;
                      acc.items += count;
                      return acc;
                    },
                    {
                      calories: 0,
                      protein: 0,
                      carbs: 0,
                      fat: 0,
                      price: 0,
                      items: 0,
                    }
                  );

                  return (
                    <div
                      key={plan._id}
                      className="rounded-[20px] border border-slate-200 p-4 sm:p-5"
                    >
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">
                            {savedPlanName(plan)}
                          </h3>

                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {new Date(plan.date).toDateString()}
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            {totals.items} items · {totals.calories} kcal ·{" "}
                            {totals.protein}g protein · {totals.carbs}g carbs ·{" "}
                            {totals.fat}g fat · ₹{totals.price}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <button
                            onClick={() => addSavedPlanToCart(plan)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700"
                          >
                            <ShoppingCart size={15} />
                            Cart
                          </button>

                          <button
                            onClick={() => deletePlan(plan._id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-red-50 px-4 text-sm font-black text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {plan.items.map((item, idx) => (
                          <div
                            key={`${plan._id}-${item.meal?._id}-${idx}`}
                            className="rounded-[16px] bg-slate-50 p-4"
                          >
                            <p className="font-black text-slate-900">
                              {item.meal?.title || "Meal"}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {item.times
                                .map((t) => timeLabels[t])
                                .join(", ")}
                            </p>

                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              {n(item.meal?.calories)} kcal ·{" "}
                              {n(item.meal?.protein)}g protein · ₹
                              {n(item.meal?.price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function GoalCard({
  icon,
  title,
  planned,
  target,
  remaining,
  unit,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  planned: number;
  target: number;
  remaining: number;
  unit: string;
  color: "orange" | "green" | "yellow" | "blue";
}) {
  const percent = target > 0 ? clamp((planned / target) * 100, 0, 100) : 0;

  const colorClass =
    color === "orange"
      ? "border-orange-100 bg-orange-50 text-orange-600"
      : color === "green"
      ? "border-green-100 bg-green-50 text-green-700"
      : color === "yellow"
      ? "border-yellow-100 bg-yellow-50 text-yellow-600"
      : "border-blue-100 bg-blue-50 text-blue-600";

  const fill =
    color === "orange"
      ? "bg-orange-500"
      : color === "green"
      ? "bg-green-600"
      : color === "yellow"
      ? "bg-yellow-500"
      : "bg-blue-500";

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full border sm:h-11 sm:w-11 ${colorClass}`}
        >
          {icon}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${colorClass}`}
        >
          {Math.round(percent)}%
        </span>
      </div>

      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {title}
      </p>

      <p className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">
        {planned}
        <span className="text-sm font-bold text-slate-400 sm:text-base">
          {" "}
          / {target || "—"} {unit}
        </span>
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs font-bold text-slate-500 sm:text-sm">
        {remaining} {unit} remaining
      </p>
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "orange" | "green" | "yellow" | "blue";
  children: React.ReactNode;
}) {
  const className =
    color === "orange"
      ? "bg-orange-50 text-orange-600"
      : color === "green"
      ? "bg-green-50 text-green-700"
      : color === "yellow"
      ? "bg-yellow-50 text-yellow-700"
      : "bg-blue-50 text-blue-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
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
    <div className="rounded-[20px] bg-slate-50 p-8 text-center sm:p-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <CheckSquare size={24} />
      </div>

      <p className="text-base font-black text-slate-950">{title}</p>

      <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}