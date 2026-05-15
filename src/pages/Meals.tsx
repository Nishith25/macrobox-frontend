// frontend/src/pages/Meals.tsx (FRONTEND)
import { useEffect, useState } from "react";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";

export default function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<Meal[]>("/meals?featured=false");

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

  const handleAddToCart = (meal: Meal) => {
    addToCart({
      _id: meal._id,
      title: meal.title,
      price: meal.price,
      protein: meal.protein,
      calories: meal.calories,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
    });

    toast.success("Added to cart");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Meals</h1>
        <p className="mt-2 text-gray-500">
          Choose meals with complete calories, protein, carbs and fat tracking.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center">Loading...</p>
      ) : error ? (
        <p className="py-10 text-center text-red-600">{error}</p>
      ) : meals.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          No meals available.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {meals.map((meal) => (
            <MealCard
              key={meal._id}
              meal={meal}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}