// frontend/src/pages/Meals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";

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

const isValidGoal = (value: string | null): value is GoalType => {
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
    : isValidGoal(userGoal || null)
    ? (userGoal as GoalType)
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
    <div className="mx-auto max-w-6xl px-6 py-16">
      {welcome && (
        <div className="mb-8 rounded-3xl border border-green-200 bg-green-50 p-5">
          <p className="text-lg font-extrabold text-green-800">
            Welcome offer — 20% off your first order
          </p>
          <p className="mt-1 text-sm text-green-700">
            Your meals are personalized. Pick your first MacroBox meal now.
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            {goal ? `${goalLabels[goal]} Meals` : "Meals"}
          </h1>

          <p className="mt-2 text-gray-500">
            Choose meals with complete calories, protein, carbs and fat tracking.
          </p>
        </div>

        <div className="flex w-fit gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              filter === "all"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("veg")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              filter === "veg"
                ? "bg-white text-green-700 shadow"
                : "text-gray-600"
            }`}
          >
            Veg
          </button>

          <button
            type="button"
            onClick={() => setFilter("nonveg")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              filter === "nonveg"
                ? "bg-white text-red-700 shadow"
                : "text-gray-600"
            }`}
          >
            Non-Veg
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeGoal("")}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              goal === ""
                ? "bg-gray-900 text-white"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            All Goals
          </button>

          {goalOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => changeGoal(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                goal === item.key
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Calories Range</p>
              <p className="text-xs text-gray-500">
                Showing meals up to{" "}
                <span className="font-bold text-green-700">
                  {maxCalories} kcal
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
            >
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
            className="mt-4 w-full accent-green-600"
          />

          <div className="mt-2 flex justify-between text-xs font-semibold text-gray-500">
            <span>100 kcal</span>
            <span>{maxMealCalories} kcal</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold">
            Goal: {goal ? goalLabels[goal] : "All Goals"}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold">
            Type:{" "}
            {filter === "all"
              ? "All"
              : filter === "veg"
              ? "Veg"
              : "Non-Veg"}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold">
            Calories: Under {maxCalories} kcal
          </span>

          <span className="rounded-full bg-green-50 px-3 py-1 font-bold text-green-700">
            Results: {filteredMeals.length}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center">Loading...</p>
      ) : error ? (
        <p className="py-10 text-center text-red-600">{error}</p>
      ) : filteredMeals.length === 0 ? (
        <div className="rounded-3xl border bg-gray-50 p-10 text-center">
          <p className="font-bold text-gray-800">
            No meals available for this filter.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Try changing the goal, Veg / Non-Veg filter, or increasing the
            calorie range.
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