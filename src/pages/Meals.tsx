// frontend/src/pages/Meals.tsx (FRONTEND)
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth, GoalType } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";

type FilterType = "all" | "veg" | "nonveg";

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

export default function Meals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialGoal =
    (searchParams.get("goal") as GoalType) || user?.onboarding?.goal || "";

  const [meals, setMeals] = useState<Meal[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [goal, setGoal] = useState<GoalType | "">(initialGoal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  const welcome = searchParams.get("welcome") === "true";

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {};

        if (goal) {
          params.goal = goal;
        }

        const res = await api.get<Meal[]>("/meals", { params });

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
    })();

    return () => {
      mounted = false;
    };
  }, [goal]);

  const filteredMeals = useMemo(() => {
    if (filter === "all") return meals;
    return meals.filter((meal) => meal.foodType === filter);
  }, [meals, filter]);

  const getCartQty = (mealId: string) => {
    return cart.find((item) => item._id === mealId)?.qty || 0;
  };

  const handleAddToCart = (meal: Meal) => {
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

  const handleIncrease = (meal: Meal) => {
    const existing = cart.find((item) => item._id === meal._id);

    if (existing) {
      increaseQty(meal._id);
    } else {
      handleAddToCart(meal);
    }
  };

  const handleDecrease = (meal: Meal) => {
    decreaseQty(meal._id);
  };

  const changeGoal = (nextGoal: GoalType | "") => {
    setGoal(nextGoal);

    const params: Record<string, string> = {};

    if (nextGoal) params.goal = nextGoal;

    setSearchParams(params);
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
            {goal ? `Best Meals for ${goalLabels[goal]}` : "Meals"}
          </h1>

          <p className="mt-2 text-gray-500">
            Choose meals with complete calories, protein, carbs and fat tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex w-fit gap-2 rounded-xl bg-gray-100 p-1">
            <button
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
      </div>

      <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border bg-white p-3 shadow-sm">
        <button
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
            Add goal tags in Admin Meals or select another goal.
          </p>
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