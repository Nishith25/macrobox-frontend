// frontend/src/pages/SmartDayPlanner.tsx (FRONTEND)

import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Beef,
  CalendarDays,
  Check,
  CheckSquare,
  Flame,
  ListChecks,
  Loader2,
  Pencil,
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
  const [showGoalDrawer, setShowGoalDrawer] = useState(false);
  const [showSaveDrawer, setShowSaveDrawer] = useState(false);

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
        acc.price += n(item.meal.price) * count;
        acc.items += count;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0, items: 0 }
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
      setShowSaveDrawer(false);
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
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="mr-2 inline animate-spin text-green-600" size={18} />
          Loading Smart Day Planner...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-10 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.38em] text-slate-400 sm:tracking-[0.45em]">
                MacroBox Planner
              </p>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:mt-6 sm:text-6xl">
                Plan your
                <br />
                full day meals
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">
                Build a full-day meal plan based on calories, protein, carbs and
                fat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm sm:min-w-[170px]">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Current Goal
                </p>
                <p className="mt-1 text-lg font-black text-green-700">
                  {goalLabels[goal]}
                </p>
              </div>

              <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm sm:min-w-[170px]">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Today
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {todayText()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  Planner Controls
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Set your goal, auto-generate, clear, or save your selected
                  plan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGoalDrawer(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-green-600 bg-white px-5 text-sm font-black text-green-700 transition hover:bg-green-50 sm:w-auto"
              >
                <Pencil size={16} />
                Change Goal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-200 sm:grid-cols-4">
            <ControlBox label="Goal" value={goalLabels[goal]} />
            <ControlBox label="Selected" value={`${plannedTotals.items} Items`} />
            <ControlBox label="Meals" value={`${meals.length} Available`} />
            <ControlBox label="Saved" value={`${history.length} Plans`} />
          </div>

          <div className="grid gap-3 border-t border-slate-200 p-4 sm:flex sm:flex-wrap sm:p-5">
            <button
              onClick={autoSmartDayPlanner}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
            >
              <Sparkles size={17} />
              Auto Plan
            </button>

            <button
              onClick={clearPlan}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <X size={17} />
              Clear
            </button>

            <button
              onClick={() => setShowSaveDrawer(true)}
              disabled={selectedEntries.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              Save Plan
            </button>

            <button
              onClick={addSelectedPlanToCart}
              disabled={selectedEntries.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-green-600 bg-white px-5 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart size={17} />
              Add to Cart
            </button>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 xl:grid-cols-4">
          <GoalCard
            icon={<Flame size={18} />}
            title="Calories"
            planned={plannedTotals.calories}
            target={macroGoals.calories}
            remaining={remaining.calories}
            unit="kcal"
          />

          <GoalCard
            icon={<Beef size={18} />}
            title="Protein"
            planned={plannedTotals.protein}
            target={macroGoals.protein}
            remaining={remaining.protein}
            unit="g"
          />

          <GoalCard
            icon={<Target size={18} />}
            title="Carbs"
            planned={plannedTotals.carbs}
            target={macroGoals.carbs}
            remaining={remaining.carbs}
            unit="g"
          />

          <GoalCard
            icon={<Utensils size={18} />}
            title="Fat"
            planned={plannedTotals.fat}
            target={macroGoals.fat}
            remaining={remaining.fat}
            unit="g"
          />
        </section>

        {!macroGoals.calories && (
          <div className="mt-5 border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
            Complete your body details in MacroTrack first to get accurate macro
            targets.
          </div>
        )}

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                Choose Meals
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Select breakfast, lunch, snack or dinner for each meal.
              </p>
            </div>

            {meals.length === 0 ? (
              <EmptyState
                title="No meals available"
                description="Add meals from admin to use Smart Day Planner."
              />
            ) : (
              <div className="grid gap-4">
                {meals.map((m) => {
                  const selectedTimes = selected[m._id] || [];

                  return (
                    <article
                      key={m._id}
                      className={`border bg-white shadow-sm transition hover:border-green-200 ${
                        selectedTimes.length
                          ? "border-green-400"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex min-h-[118px]">
                        <div className="h-[118px] w-[104px] shrink-0 overflow-hidden bg-slate-100 sm:w-[130px]">
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
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="line-clamp-1 text-base font-black text-slate-950 sm:text-lg">
                                {m.title}
                              </h3>

                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {n(m.calories)} kcal · {n(m.protein)}g protein
                              </p>
                            </div>

                            <p className="shrink-0 text-lg font-black text-slate-950">
                              ₹{n(m.price)}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                            <Badge>{n(m.calories)} kcal</Badge>
                            <Badge>{n(m.protein)}g P</Badge>
                            <Badge>{n(m.carbs)}g C</Badge>
                            <Badge>{n(m.fat)}g F</Badge>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            {TIMES.map((t) => {
                              const active = selectedTimes.includes(t);

                              return (
                                <button
                                  key={t}
                                  onClick={() => toggleSelect(m._id, t)}
                                  className={`rounded-full border px-3 py-2 text-[11px] font-black transition sm:text-xs ${
                                    active
                                      ? "border-green-600 bg-green-600 text-white"
                                      : "border-green-200 bg-white text-green-700 hover:bg-green-50"
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
          </div>

          <aside className="h-fit border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                  Selected Plan
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {plannedTotals.items} item
                  {plannedTotals.items === 1 ? "" : "s"} selected
                </p>
              </div>

              <ListChecks className="text-green-600" size={22} />
            </div>

            {selectedEntries.length === 0 ? (
              <div className="border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                No meals selected yet. Use Auto Plan or choose manually.
              </div>
            ) : (
              <div className="space-y-3">
                {TIMES.map((time) => {
                  const items = selectedEntries.filter((entry) =>
                    entry.times.includes(time)
                  );

                  return (
                    <div
                      key={time}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                        {timeLabels[time]}
                      </p>

                      {items.length === 0 ? (
                        <p className="text-sm font-bold text-slate-400">
                          No meal selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {items.map(({ meal }) => (
                            <div
                              key={`${time}-${meal._id}`}
                              className="border border-slate-200 bg-white p-3"
                            >
                              <p className="line-clamp-1 text-sm font-black text-slate-950">
                                {meal.title}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {n(meal.calories)} kcal · {n(meal.protein)}g P ·
                                ₹{n(meal.price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-black text-slate-950">
                    Total: ₹{plannedTotals.price}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {plannedTotals.calories} kcal · {plannedTotals.protein}g
                    protein
                  </p>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-6 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Save size={20} className="text-green-600" />
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                Saved Plans
              </h2>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {history.length === 0 ? (
              <EmptyState
                title="No saved plans yet"
                description="Create a plan, give it a name, and save it here."
              />
            ) : (
              <div className="grid gap-4">
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
                      className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">
                            {savedPlanName(plan)}
                          </h3>

                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {new Date(plan.date).toDateString()}
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            {totals.items} items · {totals.calories} kcal ·{" "}
                            {totals.protein}g protein · ₹{totals.price}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <button
                            onClick={() => addSavedPlanToCart(plan)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700"
                          >
                            <ShoppingCart size={15} />
                            Cart
                          </button>

                          <button
                            onClick={() => deletePlan(plan._id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-50 px-4 text-sm font-black text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {plan.items.map((item, idx) => (
                          <div
                            key={`${plan._id}-${item.meal?._id}-${idx}`}
                            className="border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="line-clamp-1 font-black text-slate-900">
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

      {showGoalDrawer && (
        <Drawer
          title="Change Goal"
          subtitle="Select your fitness goal for smart planning."
          onClose={() => setShowGoalDrawer(false)}
        >
          <Field label="YOUR GOAL">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as GoalType)}
              className="input-clean"
            >
              <option value="fat_loss">Fat Loss</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>
          </Field>

          <button
            type="button"
            onClick={() => setShowGoalDrawer(false)}
            className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
          >
            <Check size={18} />
            Save Goal
          </button>
        </Drawer>
      )}

      {showSaveDrawer && (
        <Drawer
          title="Save Day Plan"
          subtitle="Name this plan so you can reuse it later."
          onClose={() => setShowSaveDrawer(false)}
        >
          <Field label="PLAN NAME *">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Example: Muscle Gain Monday Plan"
              className="input-clean"
            />
          </Field>

          <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Selected Summary
            </p>

            <p className="mt-2 text-sm font-black text-slate-950">
              {plannedTotals.items} items · {plannedTotals.calories} kcal ·{" "}
              {plannedTotals.protein}g protein · ₹{plannedTotals.price}
            </p>
          </div>

          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Plan"}
          </button>
        </Drawer>
      )}
    </main>
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
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[430px] sm:rounded-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              {title}
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function ControlBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-slate-950 sm:text-xl">
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
  const percent = target > 0 ? clamp((planned / target) * 100, 0, 100) : 0;

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
          {Math.round(percent)}%
        </p>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200 sm:h-2.5">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-lg font-black leading-none text-slate-950 sm:text-2xl">
        {planned}
        <span className="text-xs font-bold text-slate-400 sm:text-base">
          {" "}
          / {target || "—"} {unit}
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
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
    <div className="border border-slate-200 bg-slate-50 p-8 text-center sm:p-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <CheckSquare size={24} />
      </div>

      <p className="text-base font-black text-slate-950">{title}</p>

      <p className="mt-2 text-sm font-bold text-slate-500">{description}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
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