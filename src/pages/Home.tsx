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
      // ✅ IMPORTANT: fetch ONLY featured meals
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
    });
    toast.success("Added to cart");
  };

  return (
    <>
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">Fuel Your Day with MacroBox</h1>
        <p className="text-gray-600">High-protein, clean meals built for daily health</p>
      </div>

      <Container>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle title="Featured" />

          {isAdmin && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-sm text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh featured"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center py-10">Loading...</p>
        ) : meals.length === 0 ? (
          <p className="text-center py-10">No featured meals</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <MealCard key={meal._id} meal={meal} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
