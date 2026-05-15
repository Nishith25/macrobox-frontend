// frontend/src/pages/SmartDayPlanner.tsx (FRONTEND)
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Beef,
  CalendarDays,
  Flame,
  Sparkles,
  Target,
  Trash2,
  Utensils,
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
}

interface SavedPlan {
  _id: string;
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

export default function SmartDayPlanner() {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<Record<string, MealTime[]>>({});
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [goal, setGoal] = useState<GoalType>("fat_loss");
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  /* ---------------- FETCH MEALS + HISTORY + USER ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const savedGoal = localStorage.getItem(goalStorageKey(user?._id));
        if (savedGoal) setGoal(savedGoal as GoalType);

        const [mealsRes, historyRes, userRes] = await Promise.allSettled([
          api.get("/meals"),
          api.get("/user/day-plan"),
          api.get("/user/me"),
        ]);

        if (mealsRes.status === "fulfilled") {
          const data = mealsRes.value.data;
          setMeals(Array.isArray(data) ? data : data?.meals || []);
        }

        if (historyRes.status === "fulfilled") {
          setHistory(historyRes.value.data || []);
        }

        if (userRes.status === "fulfilled") {
          setBodyMetrics(userRes.value.data?.bodyMetrics || null);
        }
      } catch (error) {
        console.error("PLAN MY DAY LOAD ERROR:", error);
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

  /* ---------------- MACRO TARGETS ---------------- */
  const macroGoals = useMemo(() => {
    const h = n(bodyMetrics?.height);
    const w = n(bodyMetrics?.weight);
    const a = n(bodyMetrics?.age);
    const gw = n(bodyMetrics?.goalWeight);
    const gender = bodyMetrics?.gender || "male";
    const activity = bodyMetrics?.activity || "moderate";

    if (!h || !w || !a) {
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
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

    const maintenance = Math.round(bmr * (activityMultipliers[activity] || 1.55));

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

    const calories = Math.max(1200, maintenance + adjustment);

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

  /* ---------------- SELECTED MEALS ---------------- */
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

  /* ---------------- TOGGLE SLOT ---------------- */
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

  /* ---------------- AUTO PLAN ---------------- */
  const scoreMeal = (meal: Meal, remainingCalories: number, remainingProtein: number) => {
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

    return proteinScore + calorieFit + goalBonus + carbBonus - macroPenalty;
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
  };

  /* ---------------- SAVE PLAN ---------------- */
  const handleSavePlan = async () => {
    setSaving(true);

    const items = Object.entries(selected)
      .filter(([, times]) => times.length > 0)
      .map(([mealId, times]) => ({ mealId, times }));

    if (items.length === 0) {
      toast.error("Select at least one meal");
      setSaving(false);
      return;
    }

    try {
      await api.post("/user/day-plan", { items });
      setSelected({});
      fetchHistory();
      toast.success("Smart Day Plan saved");
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- ADD PLAN TO CART ---------------- */
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

  /* ---------------- DELETE PLAN ---------------- */
  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;

    try {
      await api.delete(`/user/day-plan/${id}`);
      fetchHistory();
      toast.success("Plan deleted");
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-gray-500">Loading Smart Day Planner...</p>
      </div>
    );
  }

  /* ======================= UI ======================= */
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Smart Day Planner
          </h1>
          <p className="mt-2 text-gray-600">
            Build a full day meal plan based on calories, protein, carbs and fat.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
  <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
    {goalLabels[goal]}
  </div>

  <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
    {todayText()}
  </div>
</div>
      </div>

      {/* GOAL + ACTIONS */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Your Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as GoalType)}
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="fat_loss">Fat Loss</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={autoSmartDayPlanner}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Sparkles size={16} />
              Auto Plan My Day
            </button>

            <button
              onClick={clearPlan}
              className="h-11 rounded-xl border px-4 text-sm font-semibold hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* TARGETS */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <GoalCard
          icon={<Flame size={20} />}
          title="Calories"
          planned={plannedTotals.calories}
          target={macroGoals.calories}
          remaining={remaining.calories}
          unit="kcal"
        />

        <GoalCard
          icon={<Beef size={20} />}
          title="Protein"
          planned={plannedTotals.protein}
          target={macroGoals.protein}
          remaining={remaining.protein}
          unit="g"
          highlight
        />

        <GoalCard
          icon={<Target size={20} />}
          title="Carbs"
          planned={plannedTotals.carbs}
          target={macroGoals.carbs}
          remaining={remaining.carbs}
          unit="g"
        />

        <GoalCard
          icon={<Utensils size={20} />}
          title="Fat"
          planned={plannedTotals.fat}
          target={macroGoals.fat}
          remaining={remaining.fat}
          unit="g"
        />
      </div>

      {!macroGoals.calories && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Complete your body details in MacroTrack first to get accurate macro targets.
        </div>
      )}

      {/* MEALS */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Choose Meals for Each Time
          </h2>
          <p className="text-sm text-gray-500">
            {selectedEntries.length} meal{selectedEntries.length === 1 ? "" : "s"} selected
          </p>
        </div>

        {meals.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
            No meals available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {meals.map((m) => {
              const selectedTimes = selected[m._id] || [];

              return (
                <div
                  key={m._id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                    selectedTimes.length
                      ? "border-green-400 bg-green-50/40"
                      : "hover:border-green-200"
                  }`}
                >
                  <div className="mb-3 flex gap-3">
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt={m.title}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-gray-900">
                        {m.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {n(m.calories)} kcal • {n(m.protein)}g protein
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {n(m.carbs)}g carbs • {n(m.fat)}g fat
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TIMES.map((t) => {
                      const active = selectedTimes.includes(t);

                      return (
                        <button
                          key={t}
                          onClick={() => toggleSelect(m._id, t)}
                          className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${
                            active
                              ? "border-green-600 bg-green-600 text-white"
                              : "bg-white text-gray-700 hover:border-green-500"
                          }`}
                        >
                          {timeLabels[t]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED PLAN SUMMARY */}
      <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Selected Day Plan
        </h2>

        {selectedEntries.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            No meals selected yet. Use Auto Plan or select meals manually.
          </p>
        ) : (
          <div className="space-y-3">
            {TIMES.map((time) => {
              const items = selectedEntries.filter((entry) =>
                entry.times.includes(time)
              );

              return (
                <div key={time} className="rounded-xl border p-3">
                  <p className="mb-2 font-bold text-gray-900">
                    {timeLabels[time]}
                  </p>

                  {items.length === 0 ? (
                    <p className="text-sm text-gray-500">No meal selected</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map(({ meal }) => (
                        <p key={meal._id} className="text-sm text-gray-700">
                          {meal.title} — {n(meal.calories)} kcal,{" "}
                          {n(meal.protein)}g protein
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Plan"}
          </button>

          <button
            onClick={addSelectedPlanToCart}
            className="rounded-xl border border-green-600 px-5 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Add Selected Meals to Cart
          </button>
        </div>
      </div>

      {/* HISTORY */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={20} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Last 15 Days Plans</h2>
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            No plans saved yet.
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((plan) => {
              const totals = plan.items.reduce(
                (acc, item) => {
                  acc.protein += n(item.meal?.protein) * item.times.length;
                  acc.calories += n(item.meal?.calories) * item.times.length;
                  acc.carbs += n(item.meal?.carbs) * item.times.length;
                  acc.fat += n(item.meal?.fat) * item.times.length;
                  return acc;
                },
                { protein: 0, calories: 0, carbs: 0, fat: 0 }
              );

              return (
                <div key={plan._id} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(plan.date).toDateString()}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {totals.calories} kcal • {totals.protein}g protein •{" "}
                        {totals.carbs}g carbs • {totals.fat}g fat
                      </p>
                    </div>

                    <button
                      onClick={() => deletePlan(plan._id)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-red-600"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>

                  <ul className="space-y-1 text-sm text-gray-700">
                    {plan.items.map((i, idx) => (
                      <li key={idx}>
                        <strong>{i.meal?.title || "Meal"}</strong> →{" "}
                        {i.times.map((t) => timeLabels[t]).join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  planned: number;
  target: number;
  remaining: number;
  unit: string;
  highlight?: boolean;
}) {
  const percent = target > 0 ? clamp((planned / target) * 100, 0, 100) : 0;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight ? "border-green-300 bg-green-50" : "bg-white"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-green-700">
          {icon}
        </div>

        <p className="text-xs font-semibold text-gray-500">
          {Math.round(percent)}%
        </p>
      </div>

      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {planned} / {target || "—"} {unit}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs font-medium text-green-700">
        Remaining: {remaining} {unit}
      </p>
    </div>
  );
}