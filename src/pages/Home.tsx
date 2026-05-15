// frontend/src/pages/Home.tsx (FRONTEND)
import { useEffect, useState } from "react";
import Container from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

/* ================= TYPES ================= */

export type Meal = {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  price: number;
  isFeatured: boolean;
};

/* ================= PAGE ================= */

export default function Home() {
  const { isAdmin } = useAuth();
  const { addToCart } = useCart();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeatured = async (withSpinner = true) => {
    if (withSpinner) setLoading(true);

    try {
      const res = await api.get<Meal[]>("/meals?featured=true");
      setMeals(res.data || []);
    } catch {
      setMeals([]);
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFeatured(false);
    setRefreshing(false);
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

  return (
    <>
      <div className="bg-gradient-to-b from-green-50 to-white px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Fuel Your Day with MacroBox
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600">
          High-protein, macro-friendly meals built for daily health, fitness and
          clean eating.
        </p>
      </div>

      <Container>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle title="Featured" />

          {isAdmin && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg border border-emerald-200 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh featured"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-10 text-center">Loading...</p>
        ) : meals.length === 0 ? (
          <p className="py-10 text-center text-gray-500">No featured meals</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {meals.map((meal) => (
              <MealCard
                key={meal._id}
                meal={meal}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}