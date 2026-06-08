// frontend/src/pages/Meals.tsx (FRONTEND)

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
  {
    key: "muscle_gain",
    label: "Muscle Gain",
    icon: <SlidersHorizontal size={14} />,
  },
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
      if (sortBy === "calories_low")
        return Number(a.calories || 0) - Number(b.calories || 0);
      if (sortBy === "protein_high")
        return Number(b.protein || 0) - Number(a.protein || 0);
      if (sortBy === "price_low")
        return Number(a.price || 0) - Number(b.price || 0);
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
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 text-green-700" />
            <div>
              <p className="font-bold text-green-800">
                {meal.title} added to cart
              </p>
              <p className="text-sm text-green-700">
                ₹{meal.price} · {meal.calories} kcal
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 1800 }
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
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">
            {goal ? `${goalLabels[goal]} Meals` : "Meals"}
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Choose meals with complete calories, protein, carbs and fat tracking.
          </p>
        </div>

        <div className="flex rounded-2xl border bg-white p-1 shadow-sm">
          {(["all", "veg", "nonveg"] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
                filter === type
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-Veg"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px_260px] lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center gap-2 text-sm font-bold text-gray-500">
              <Filter size={15} />
              Goals
            </div>

            <button
              type="button"
              onClick={() => changeGoal("")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                goal === ""
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              All Goals
            </button>

            {goalOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => changeGoal(item.key)}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                  goal === item.key
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1 text-gray-600">
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
              className="h-2 w-full cursor-pointer accent-green-600"
            />

            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>100</span>
              <span>{maxMealCalories} kcal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={15} className="text-gray-500" />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="h-11 w-full rounded-2xl border bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="default">Sort by: Default</option>
              <option value="calories_low">Calories: Low to High</option>
              <option value="protein_high">Protein: High to Low</option>
              <option value="price_low">Price: Low to High</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t bg-white px-5 py-3 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-500">
            {goal ? goalLabels[goal] : "All Goals"}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-500">
            {typeLabel}
          </span>

          <span className="rounded-full bg-green-50 px-3 py-1 font-extrabold text-green-700">
            {filteredMeals.length} Results
          </span>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 rounded-full border px-3 py-1 font-bold text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500">Loading meals...</p>
      ) : error ? (
        <p className="py-10 text-center text-red-600">{error}</p>
      ) : filteredMeals.length === 0 ? (
        <div className="rounded-3xl border bg-gray-50 p-10 text-center">
          <p className="font-bold text-gray-800">
            No meals available for this filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {filteredMeals.map((meal, index) => {
            const qty = getCartQty(meal._id);

            return (
              <div
                key={meal._id}
                className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  <img
                    src={meal.imageUrl || "/placeholder-meal.png"}
                    alt={meal.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-meal.png";
                    }}
                  />

                  {index === 0 && (
                    <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-extrabold text-white shadow">
                      ★ Popular
                    </span>
                  )}

                  <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                    {meal.goalTypes?.slice(0, 2).map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700 shadow-sm backdrop-blur"
                      >
                        {goalLabels[g]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="line-clamp-1 text-xl font-extrabold text-gray-900">
                      {meal.title}
                    </h2>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${
                        meal.foodType === "veg"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {meal.foodType === "veg" ? "Veg" : "Non-Veg"}
                    </span>
                  </div>

                  <p className="min-h-[44px] text-sm leading-6 text-gray-500">
                    {meal.description || "No description added"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MacroBox label="Calories" value={`${meal.calories} kcal`} />
                    <MacroBox label="Protein" value={`${meal.protein}g`} />
                    <MacroBox label="Carbs" value={`${meal.carbs || 0}g`} />
                    <MacroBox label="Fat" value={`${meal.fat || 0}g`} />
                  </div>

                  <div className="mt-5 flex items-end justify-between border-t pt-4">
                    <div>
                      <p className="text-sm text-gray-400">Price</p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        ₹{meal.price}
                      </p>
                    </div>

                    {qty > 0 ? (
                      <div className="flex overflow-hidden rounded-2xl border border-green-600">
                        <button
                          type="button"
                          onClick={() => decreaseQty(meal._id)}
                          className="h-11 w-14 bg-white text-lg font-bold text-green-700 hover:bg-green-50"
                        >
                          −
                        </button>

                        <span className="flex h-11 w-12 items-center justify-center bg-white font-extrabold text-green-700">
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleIncrease(meal)}
                          className="h-11 w-14 bg-green-50 text-lg font-bold text-green-700 hover:bg-green-100"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(meal)}
                        className="inline-flex h-12 items-center gap-2 rounded-2xl bg-green-600 px-6 text-sm font-extrabold text-white shadow-sm hover:bg-green-700"
                      >
                        <Plus size={18} />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-3xl bg-gray-950 p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 pl-2 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-600">
                <ShoppingCart size={18} />
              </div>

              <div>
                <p className="text-sm font-extrabold">
                  {cartCount} item{cartCount > 1 ? "s" : ""} in cart
                </p>
                <p className="text-xs text-gray-300">₹{cartTotal}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-700"
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className="mt-1 text-base font-extrabold text-gray-900">{value}</p>
    </div>
  );
}