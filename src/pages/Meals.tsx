// frontend/src/pages/Meals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";
import { Filter, RotateCcw, SlidersHorizontal } from "lucide-react";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";
type FilterType = "all" | "veg" | "nonveg";

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

const goalOptions: { key: GoalType; label: string }[] = [
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "weight_gain", label: "Weight Gain" },
  { key: "clean_eating", label: "Clean Eating" },
];

const isValidGoal = (value: string | null | undefined): value is GoalType => {
  return (
    value === "fat_loss" ||
    value === "muscle_gain" ||
    value === "weight_gain" ||
    value === "clean_eating"
  );
};

export default function Meals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  const welcome = searchParams.get("welcome") === "true";

  useEffect(() => {
    let mounted = true;

    const fetchMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<MealWithGoals[]>("/meals", {
          params: {
            all: "true",
          },
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

  const maxMealCalories = useMemo(() => {
    if (meals.length === 0) return 1000;

    const highest = Math.max(...meals.map((meal) => Number(meal.calories || 0)));

    return Math.max(300, Math.ceil(highest / 100) * 100);
  }, [meals]);

  useEffect(() => {
    if (meals.length > 0) {
      setMaxCalories(maxMealCalories);
    }
  }, [maxMealCalories, meals.length]);

  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      if (meal.isAvailable === false) return false;

      if (goal) {
        if (!meal.goalTypes || meal.goalTypes.length === 0) return false;
        if (!meal.goalTypes.includes(goal)) return false;
      }

      if (filter !== "all" && meal.foodType !== filter) {
        return false;
      }

      if (Number(meal.calories || 0) > maxCalories) {
        return false;
      }

      return true;
    });
  }, [meals, goal, filter, maxCalories]);

  const getCartQty = (mealId: string) => {
    return cart.find((item) => item._id === mealId)?.qty || 0;
  };

  const handleAddToCart = (meal: MealWithGoals) => {
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

    toast.success("Added to cart");
  };

  const handleIncrease = (meal: MealWithGoals) => {
    const existing = cart.find((item) => item._id === meal._id);

    if (existing) {
      increaseQty(meal._id);
    } else {
      handleAddToCart(meal);
    }
  };

  const handleDecrease = (meal: MealWithGoals) => {
    decreaseQty(meal._id);
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
    setMaxCalories(maxMealCalories);
    setSearchParams(welcome ? { welcome: "true" } : {});
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {welcome && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-base font-extrabold text-green-800">
            Welcome offer — 20% off your first order
          </p>
          <p className="mt-1 text-sm text-green-700">
            Your meals are personalized. Pick your first MacroBox meal now.
          </p>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {goal ? `${goalLabels[goal]} Meals` : "Meals"}
          </h1>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Choose meals with complete calories, protein, carbs and fat tracking.
          </p>
        </div>

        {/* VEG / NON-VEG FILTER */}
        <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
          {(["all", "veg", "nonveg"] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filter === type
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-Veg"}
            </button>
          ))}
        </div>
      </div>

      {/* COMPACT FILTER BAR */}
      <div className="mb-8 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* GOALS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-2 text-sm font-bold text-gray-700">
              <Filter size={16} className="text-green-600" />
              Goals
            </div>

            <button
              type="button"
              onClick={() => changeGoal("")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                goal === ""
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>

            {goalOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => changeGoal(item.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  goal === item.key
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CALORIES */}
          <div className="flex flex-col gap-2 lg:w-[360px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <SlidersHorizontal size={16} className="text-green-600" />
                Calories
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-extrabold text-green-700">
                  ≤ {maxCalories} kcal
                </span>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw size={13} />
                Reset
              </button>
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

            <div className="flex justify-between text-[11px] font-semibold text-gray-400">
              <span>100</span>
              <span>{maxMealCalories} kcal</span>
            </div>
          </div>
        </div>

        {/* ACTIVE FILTER SUMMARY */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600">
            {goal ? goalLabels[goal] : "All Goals"}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600">
            {filter === "all" ? "All Types" : filter === "veg" ? "Veg" : "Non-Veg"}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600">
            Under {maxCalories} kcal
          </span>

          <span className="rounded-full bg-green-50 px-3 py-1 font-extrabold text-green-700">
            {filteredMeals.length} Results
          </span>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <p className="py-10 text-center text-gray-500">Loading meals...</p>
      ) : error ? (
        <p className="py-10 text-center text-red-600">{error}</p>
      ) : filteredMeals.length === 0 ? (
        <div className="rounded-3xl border bg-gray-50 p-10 text-center">
          <p className="font-bold text-gray-800">
            No meals available for this filter.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Try changing the goal, Veg / Non-Veg filter, or increasing the calorie range.
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal._id}
              meal={meal}
              qty={getCartQty(meal._id)}
              onAddToCart={handleAddToCart}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          ))}
        </div>
      )}
    </div>
  );
}