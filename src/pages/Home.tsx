import { useEffect, useState } from "react";
import Container from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export type Meal = {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  protein: number;
  calories: number;
  price: number;
  isFeatured: boolean;
};

export default function Home() {
  const { isAdmin } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeatured = async (withSpinner = true) => {
    if (withSpinner) setLoading(true);
    try {
      const res = await api.get<Meal[]>("/meals/featured");
      setMeals(res.data.slice(0, 3)); // max 3 featured meals
    } catch {
      setMeals([]);
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await fetchFeatured();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFeatured(false);
    setRefreshing(false);
  };

  return (
    <>
      {/* HERO */}
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">
          Fuel Your Day with MacroBox
        </h1>
        <p className="text-gray-600">
          High-protein, clean meals built for daily health
        </p>
      </div>

      {/* FEATURED */}
      <Container>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle title="Featured Day Packs" />

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
              <MealCard key={meal._id} meal={meal} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
