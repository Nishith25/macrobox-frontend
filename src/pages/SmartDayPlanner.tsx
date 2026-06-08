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
  Clock,
  Flame,
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

    return proteinScore + calorieFit + goalBonus + tagBonus + carbBonus - macroPenalty;
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

  const clearPlan = () => setSelected({});

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
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10">
        <div className="mx-auto max-w-[1240px] rounded-[24px] border bg-white p-10 text-slate-500 shadow-sm">
          Loading Smart Day Planner...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-10 sm:px-6">
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
            <p className="text-base font-medium text-slate-500">
              Build a full day meal plan based on calories, protein, carbs and fat.
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

        <section className="mb-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <label className="mb-3 block text-xs font-black uppercase tracking-wide text-slate-500">
            Your Goal
          </label>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
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

            <div className="flex flex-wrap gap-3">
              <button
                onClick={autoSmartDayPlanner}
                className="inline-flex h-12 items-center gap-2 rounded-[18px] bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700"
              >
                <Sparkles size={17} />
                Auto Smart Day Plan
              </button>

              <button
                onClick={clearPlan}
                className="inline-flex h-12 items-center gap-2 rounded-[18px] bg-slate-100 px-5 text-sm font-black text-slate-700 hover:bg-slate-200"
              >
                <X size={17} />
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">
              Daily Macro Targets
            </h2>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-500">
              {selectedEntries.length} meals selected
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            Complete your body details in MacroTrack first to get accurate macro targets.
          </div>
        )}

        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-950">
              Choose Meals for Each Time
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Tap a meal card to select or deselect it
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
                      <div className="h-[122px] w-[130px] shrink-0 overflow-hidden bg-slate-100">
                        <img
                          src={m.imageUrl || "/placeholder-meal.png"}
                          alt={m.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-meal.png";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1 p-4">
                        <h3 className="truncate text-base font-black text-slate-950">
                          {m.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge color="orange">🔥 {n(m.calories)} kcal</Badge>
                          <Badge color="green">🥩 {n(m.protein)}g</Badge>
                          <Badge color="yellow">🌾 {n(m.carbs)}g</Badge>
                          <Badge color="blue">💧 {n(m.fat)}g</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {TIMES.map((t) => {
                            const active = selectedTimes.includes(t);

                            return (
                              <button
                                key={t}
                                onClick={() => toggleSelect(m._id, t)}
                                className={`rounded-full border px-3 py-1 text-xs font-black ${
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
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <CheckSquare size={20} className="text-green-600" />
              <h2 className="text-xl font-black text-slate-950">
                Selected Day Plan
              </h2>
            </div>
          </div>

          <div className="p-6">
            {selectedEntries.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={28} />}
                title="No meals selected yet"
                text="Use Auto Plan or tap meal cards to build your day"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {TIMES.map((time) => {
                  const items = selectedEntries.filter((entry) =>
                    entry.times.includes(time)
                  );

                  return (
                    <div key={time} className="rounded-[18px] border border-slate-200 p-4">
                      <p className="mb-3 font-black text-slate-950">
                        {timeLabels[time]}
                      </p>

                      {items.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500">
                          No meal selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {items.map(({ meal }) => (
                            <p
                              key={`${time}-${meal._id}`}
                              className="text-sm font-semibold text-slate-700"
                            >
                              {meal.title} — {n(meal.calories)} kcal
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="inline-flex h-12 items-center gap-2 rounded-[18px] bg-green-600 px-6 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
              >
                <CheckSquare size={17} />
                {saving ? "Saving..." : "Save Plan"}
              </button>

              <button
                onClick={addSelectedPlanToCart}
                className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-green-600 px-6 text-sm font-black text-green-700 hover:bg-green-50"
              >
                <ShoppingCart size={17} />
                Add Selected Meals to Cart
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-green-600" />
              <h2 className="text-xl font-black text-slate-950">
                Last 15 Days Plans
              </h2>
            </div>
          </div>

          <div className="p-6">
            {history.length === 0 ? (
              <EmptyState
                icon={<Clock size={28} />}
                title="No plans saved yet"
                text="Your saved day plans will appear here"
              />
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
                    <div key={plan._id} className="rounded-[18px] border p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {new Date(plan.date).toDateString()}
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {totals.calories} kcal • {totals.protein}g protein •{" "}
                            {totals.carbs}g carbs • {totals.fat}g fat
                          </p>
                        </div>

                        <button
                          onClick={() => deletePlan(plan._id)}
                          className="inline-flex items-center gap-1 text-sm font-black text-red-600"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>

                      <ul className="space-y-1 text-sm font-medium text-slate-700">
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

  const styles = {
    orange: {
      border: "border-orange-100",
      icon: "bg-orange-50 text-orange-600",
      text: "text-orange-600",
      bar: "bg-orange-500",
      pill: "bg-orange-50 text-orange-600",
    },
    green: {
      border: "border-green-100",
      icon: "bg-green-50 text-green-700",
      text: "text-green-700",
      bar: "bg-green-600",
      pill: "bg-green-50 text-green-700",
    },
    yellow: {
      border: "border-yellow-100",
      icon: "bg-yellow-50 text-yellow-600",
      text: "text-yellow-600",
      bar: "bg-yellow-500",
      pill: "bg-yellow-50 text-yellow-600",
    },
    blue: {
      border: "border-blue-100",
      icon: "bg-blue-50 text-blue-600",
      text: "text-blue-600",
      bar: "bg-blue-500",
      pill: "bg-blue-50 text-blue-600",
    },
  }[color];

  return (
    <div className={`rounded-[20px] border bg-white p-5 shadow-sm ${styles.border}`}>
      <div className="mb-7 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${styles.icon}`}>
          {icon}
        </div>

        <span className={`rounded-full px-3 py-1 text-sm font-black ${styles.pill}`}>
          {Math.round(percent)}%
        </span>
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-[28px] font-black leading-none tracking-[-0.05em] text-slate-950">
        {planned}
        <span className="text-base font-bold text-slate-400">
          {" "}
          / {target || "—"} {unit}
        </span>
      </p>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${styles.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className={`mt-3 text-sm font-black ${styles.text}`}>
        {remaining} {unit}{" "}
        <span className="font-medium text-slate-500">remaining</span>
      </p>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "orange" | "green" | "yellow" | "blue";
}) {
  const cls =
    color === "orange"
      ? "bg-orange-50 text-orange-600"
      : color === "green"
      ? "bg-green-50 text-green-700"
      : color === "yellow"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-blue-50 text-blue-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>
      {children}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-100 text-slate-500">
        {icon}
      </div>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}