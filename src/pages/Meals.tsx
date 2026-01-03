import { useEffect, useState } from "react";
import MealCard from "../components/MealCard";
import api from "../api/api";

export default function Meals() {
  const [meals, setMeals] = useState<any[]>([]);

  useEffect(() => {
    api.get("meals").then((res) => setMeals(res.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold mb-8">Meals</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {meals.map((meal) => (
          <MealCard key={meal._id} meal={meal} />
        ))}
      </div>
    </div>
  );
}
