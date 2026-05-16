// frontend/src/pages/Meals.tsx (FRONTEND)
import { useEffect, useMemo, useState } from "react";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";

type FilterType = "all" | "veg" | "nonveg";

export default function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<Meal[]>("/meals");

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
  }, []);

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Meals</h1>
          <p className="mt-2 text-gray-500">
            Choose meals with complete calories, protein, carbs and fat tracking.
          </p>
        </div>

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

      {loading ? (
        <p className="py-10 text-center">Loading...</p>
      ) : error ? (
        <p className="py-10 text-center text-red-600">{error}</p>
      ) : filteredMeals.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          No meals available for this filter.
        </p>
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