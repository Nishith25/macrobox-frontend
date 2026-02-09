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
  const [error, setError] = useState<string | null>(null); // ✅ small UX improvement
  const { addToCart } = useCart();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Fetch only NON-featured meals
        // (You can also do "/meals" if backend default is non-featured)
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
    });
    toast.success("Added to cart");
  };

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold mb-8">Meals</h1>

      {loading ? (
        <p className="text-center py-10">Loading...</p>
      ) : error ? (
        <p className="text-center py-10 text-red-600">{error}</p>
      ) : meals.length === 0 ? (
        <p className="text-center py-10 text-gray-500">
          No meals available (non-featured).
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
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
