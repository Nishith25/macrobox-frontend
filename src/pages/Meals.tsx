import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";
import {
  ArrowUpDown,
  CheckCircle2,
  Filter,
  Flame,
  Leaf,
  Plus,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";
type FilterType = "all" | "veg" | "nonveg";
type SortType = "default" | "calories_low" | "protein_high" | "price_low";

type MealWithGoals = Meal & {
  goalTypes?: GoalType[];
  isAvailable?: boolean;
};

const goalLabels: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const goalOptions: { key: GoalType; label: string; icon: React.ReactNode }[] = [
  { key: "fat_loss", label: "Fat Loss", icon: <Flame size={14} /> },
  { key: "muscle_gain", label: "Muscle Gain", icon: <SlidersHorizontal size={14} /> },
  { key: "weight_gain", label: "Weight Gain", icon: <TrendingUp size={14} /> },
  { key: "clean_eating", label: "Clean Eating", icon: <Leaf size={14} /> },
];

const isValidGoal = (value: string | null | undefined): value is GoalType =>
  value === "fat_loss" ||
  value === "muscle_gain" ||
  value === "weight_gain" ||
  value === "clean_eating";

export default function Meals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  const urlGoal = searchParams.get("goal");
  const userGoal = user?.onboarding?.goal;

  const initialGoal: GoalType | "" = isValidGoal(urlGoal)
    ? urlGoal
    : isValidGoal(userGoal)
    ? userGoal
    : "";

  const [meals, setMeals] = useState<MealWithGoals[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [goal, setGoal] = useState<GoalType | "">(initialGoal);
  const [maxCalories, setMaxCalories] = useState(1000);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const welcome = searchParams.get("welcome") === "true";

  useEffect(() => {
    let mounted = true;

    const fetchMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<MealWithGoals[]>("/meals", {
          params: { all: "true" },
        });

        if (!mounted) return;
        setMeals(res.data || []);
      } catch {
        if (!mounted) return;
        setMeals([]);
        setError("Failed to load meals. Please try again.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchMeals();

    return () => {
      mounted = false;
    };
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.qty || 0), 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0),
    [cart]
  );

  const maxMealCalories = useMemo(() => {
    if (meals.length === 0) return 1000;
    const highest = Math.max(...meals.map((meal) => Number(meal.calories || 0)));
    return Math.max(300, Math.ceil(highest / 100) * 100);
  }, [meals]);

  useEffect(() => {
    if (meals.length > 0) setMaxCalories(maxMealCalories);
  }, [maxMealCalories, meals.length]);

  const filteredMeals = useMemo(() => {
    const result = meals.filter((meal) => {
      if (meal.isAvailable === false) return false;

      if (goal) {
        if (!meal.goalTypes || meal.goalTypes.length === 0) return false;
        if (!meal.goalTypes.includes(goal)) return false;
      }

      if (filter !== "all" && meal.foodType !== filter) return false;
      if (Number(meal.calories || 0) > maxCalories) return false;

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "calories_low") {
        return Number(a.calories || 0) - Number(b.calories || 0);
      }

      if (sortBy === "protein_high") {
        return Number(b.protein || 0) - Number(a.protein || 0);
      }

      if (sortBy === "price_low") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      return 0;
    });
  }, [meals, goal, filter, maxCalories, sortBy]);

  const getCartQty = (mealId: string) =>
    cart.find((item) => item._id === mealId)?.qty || 0;

  const handleAdd = (meal: MealWithGoals) => {
    addToCart({
      _id: meal._id,
      title: meal.title,
      price: meal.price,
      protein: meal.protein,
      calories: meal.calories,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      imageUrl: meal.imageUrl,
    });

    toast.custom(
      () => (
        <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-32px)] rounded-[18px] border border-green-100 bg-green-50 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 text-green-700" />
            <div>
              <p className="font-extrabold text-green-800">
                {meal.title} added to cart
              </p>
              <p className="mt-1 text-sm font-semibold text-green-700">
                ₹{meal.price} · {meal.calories} kcal
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 1800, position: "bottom-right" }
    );
  };

  const handleIncrease = (meal: MealWithGoals) => {
    const existing = cart.find((item) => item._id === meal._id);
    if (existing) increaseQty(meal._id);
    else handleAdd(meal);
  };

  const changeGoal = (nextGoal: GoalType | "") => {
    setGoal(nextGoal);

    const params: Record<string, string> = {};
    if (nextGoal) params.goal = nextGoal;
    if (welcome) params.welcome = "true";
    setSearchParams(params);
  };

  const resetFilters = () => {
    setGoal("");
    setFilter("all");
    setSortBy("default");
    setMaxCalories(maxMealCalories);
    setSearchParams(welcome ? { welcome: "true" } : {});
  };

  const typeLabel =
    filter === "all"
      ? "All (Veg + Non-Veg)"
      : filter === "veg"
      ? "Veg Only"
      : "Non-Veg Only";

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 pb-32 pt-10 sm:px-6">
      <div className="mx-auto max-w-[1420px]">
        <section className="mb-9 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[34px] font-black tracking-[-0.04em] text-slate-950 sm:text-[40px]">
              {goal ? `${goalLabels[goal]} Meals` : "Meals"}
            </h1>
            <p className="mt-2 text-[15px] font-medium text-slate-500 sm:text-base">
              Choose meals with complete calories, protein, carbs and fat tracking.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-[18px] border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {(["all", "veg", "nonveg"] as FilterType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`min-w-[76px] rounded-[14px] px-5 py-2.5 text-sm font-extrabold transition ${
                  filter === type
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-Veg"}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_220px_230px] lg:items-center xl:grid-cols-[1fr_260px_260px]">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-2 flex items-center gap-2 text-[15px] font-extrabold text-slate-500">
                <Filter size={16} />
                Goals
              </div>

              <button
                type="button"
                onClick={() => changeGoal("")}
                className={`rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                  goal === ""
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                All Goals
              </button>

              {goalOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => changeGoal(item.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                    goal === item.key
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <SlidersHorizontal size={13} />
                  Calories ≤
                </span>
                <span className="text-green-700">{maxCalories} kcal</span>
              </div>

              <input
                type="range"
                min={100}
                max={maxMealCalories}
                step={50}
                value={maxCalories}
                onChange={(e) => setMaxCalories(Number(e.target.value))}
                className="macro-range h-2 w-full cursor-pointer accent-green-600"
              />

              <div className="mt-1 flex justify-between text-xs font-medium text-slate-400">
                <span>100</span>
                <span>{maxMealCalories} kcal</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-slate-500" />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
              >
                <option value="default">Sort by: Default</option>
                <option value="calories_low">Calories: Low to High</option>
                <option value="protein_high">Protein: High to Low</option>
                <option value="price_low">Price: Low to High</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-5 py-3 text-xs">
            <span className="rounded-full bg-slate-100 px-3.5 py-1.5 font-extrabold text-slate-500">
              {goal ? goalLabels[goal] : "All Goals"}
            </span>

            <span className="rounded-full bg-slate-100 px-3.5 py-1.5 font-extrabold text-slate-500">
              {typeLabel}
            </span>

            <span className="rounded-full bg-green-50 px-3.5 py-1.5 font-black text-green-700">
              {filteredMeals.length} Results
            </span>

            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[26px] border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">
            Loading meals...
          </div>
        ) : error ? (
          <div className="rounded-[26px] border border-red-100 bg-red-50 p-12 text-center font-bold text-red-600">
            {error}
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="rounded-[26px] border border-slate-200 bg-white p-12 text-center">
            <p className="font-black text-slate-900">No meals available for this filter.</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try resetting the filters or increasing calories.
            </p>
          </div>
        ) : (
          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {filteredMeals.map((meal, index) => {
              const qty = getCartQty(meal._id);

              return (
                <article
                  key={meal._id}
                  className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative h-[255px] overflow-hidden bg-slate-100">
                    <img
                      src={meal.imageUrl || "/placeholder-meal.png"}
                      alt={meal.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-meal.png";
                      }}
                    />

                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />

                    {index === 0 && (
                      <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white shadow-lg">
                        ★ Popular
                      </span>
                    )}

                    <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                      {meal.goalTypes?.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-black text-blue-700 shadow-sm backdrop-blur"
                        >
                          {goalLabels[g]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 text-[21px] font-black tracking-[-0.03em] text-slate-950">
                        {meal.title || "Untitled Meal"}
                      </h2>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                          meal.foodType === "veg"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {meal.foodType === "veg" ? "Veg" : "Non-Veg"}
                      </span>
                    </div>

                    <p className="min-h-[48px] text-sm font-medium leading-6 text-slate-500">
                      {meal.description || "No description added"}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <MacroBox label="Calories" value={`${meal.calories || 0} kcal`} />
                      <MacroBox label="Protein" value={`${meal.protein || 0}g`} />
                      <MacroBox label="Carbs" value={`${meal.carbs || 0}g`} />
                      <MacroBox label="Fat" value={`${meal.fat || 0}g`} />
                    </div>

                    <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-400">Price</p>
                        <p className="text-[25px] font-black tracking-[-0.04em] text-slate-950">
                          ₹{meal.price || 0}
                        </p>
                      </div>

                      {qty > 0 ? (
                        <div className="flex overflow-hidden rounded-[18px] border border-green-600 bg-white">
                          <button
                            type="button"
                            onClick={() => decreaseQty(meal._id)}
                            className="h-12 w-14 bg-white text-xl font-black text-green-700 transition hover:bg-green-50"
                          >
                            −
                          </button>

                          <span className="flex h-12 w-12 items-center justify-center bg-white font-black text-green-700">
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleIncrease(meal)}
                            className="h-12 w-14 bg-green-50 text-xl font-black text-green-700 transition hover:bg-green-100"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(meal)}
                          className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
                        >
                          <Plus size={18} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {cartCount > 0 && (
          <div className="fixed left-1/2 z-[9999] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 rounded-[24px] bg-slate-950 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.45)] [bottom:calc(20px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 pl-2 text-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-green-600">
                  <ShoppingCart size={19} />
                </div>

                <div>
                  <p className="text-sm font-black">
                    {cartCount} item{cartCount > 1 ? "s" : ""} in cart
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300">
                    Total ₹{cartTotal}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="rounded-[16px] bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
              >
                View Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}