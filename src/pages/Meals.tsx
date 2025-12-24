import { useState, useEffect } from "react";
import MealCard from "../components/MealCard";
import api from "../api/api";

export default function Meals() {
  const [meals, setMeals] = useState<any[]>([]);
  const [proteinFilter, setProteinFilter] = useState("all");
  const [calorieFilter, setCalorieFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Fetch meals from backend
  useEffect(() => {
    api.get("/api/meals")
      .then((res) => {
        setMeals(res.data);
        setLoading(false);
      })
      .catch((err) => {
  console.error(err);
  setLoading(false);
});
  }, []);

  // Filtering logic
  const filteredMeals = meals.filter((meal) => {
    let pass = true;

    // Protein filter
    if (proteinFilter !== "all") {
      if (proteinFilter === "high" && meal.protein < 100) pass = false;
      if (proteinFilter === "medium" && (meal.protein < 60 || meal.protein >= 100)) pass = false;
    }

    // Calorie filter
    if (calorieFilter !== "all") {
      if (calorieFilter === "low" && meal.calories >= 1800) pass = false;
      if (calorieFilter === "medium" && (meal.calories < 1800 || meal.calories > 2200)) pass = false;
    }

    return pass;
  });

  // Loading UI
  if (loading) {
    return (
      <p className="text-center text-lg mt-20">Loading meals...</p>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">

      <h1 className="text-4xl font-bold mb-8">All Meal Plans</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-6 mb-10">

        {/* Protein Filter */}
        <select
          className="border px-4 py-2 rounded-lg"
          value={proteinFilter}
          onChange={(e) => setProteinFilter(e.target.value)}
        >
          <option value="all">All Protein Levels</option>
          <option value="high">High Protein (100g+)</option>
          <option value="medium">Medium Protein (60–100g)</option>
        </select>

        {/* Calorie Filter */}
        <select
          className="border px-4 py-2 rounded-lg"
          value={calorieFilter}
          onChange={(e) => setCalorieFilter(e.target.value)}
        >
          <option value="all">All Calories</option>
          <option value="low">Low (below 1800)</option>
          <option value="medium">Medium (1800–2200)</option>
        </select>
      </div>

      {/* Meals Grid */}
      {filteredMeals.length === 0 ? (
        <p className="text-gray-500 text-lg mt-10">No meals match the selected filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
