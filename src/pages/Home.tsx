import { useEffect, useState } from "react";
import Container from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import MealCard from "../components/MealCard";
import api from "../api/api";

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
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedMeals = async () => {
      try {
        const res = await api.get<Meal[]>("/meals/featured");

        // ✅ Always show ONLY 3 on Home
        setMeals(res.data.slice(0, 3));
      } catch (err) {
        console.error("Fetch featured meals error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMeals();
  }, []);

  return (
    <>
      {/* HERO */}
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">
          Fuel Your Day with MacroBox
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          High-protein, clean meals built for muscle gain, fat loss & daily health.
        </p>
      </div>

      {/* FEATURED DAY PACKS */}
      <Container>
        <SectionTitle title="Featured Day Packs" />

        {loading ? (
          <p className="text-center text-gray-500 py-12">
            Loading featured meals...
          </p>
        ) : meals.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No featured meals available
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <MealCard key={meal._id} meal={meal} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
