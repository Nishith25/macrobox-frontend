import type { Meal } from "../types/meal";
import Button from "./Button";
import { Link } from "react-router-dom";
import api from "../api/api";
import { useState } from "react";

export default function MealCard({ meal }: { meal: Meal }) {
  const [favLoading, setFavLoading] = useState(false);

  const handleFavorite = async () => {
    setFavLoading(true);
    try {
      await api.post(`/user/favorites/${meal._id}`);
      // you can also show toast or change state
      alert("Favorites updated");
    } catch {
      alert("Login required to favorite meals");
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden w-full">
      <img
        src={meal.image}
        alt={meal.title}
        className="w-full h-52 object-cover"
      />

      <div className="p-5 space-y-2">
        <h3 className="text-xl font-semibold mb-1">{meal.title}</h3>
        <p className="text-gray-600 text-sm mb-2">{meal.description}</p>

        <div className="flex justify-between text-sm mb-3">
          <p>Protein: <b className="text-green-600">{meal.protein}g</b></p>
          <p>Calories: <b className="text-blue-600">{meal.calories}</b></p>
        </div>

        <div className="flex gap-2">
          <Link to={`/meal/${meal._id}`} className="flex-1">
            <Button className="w-full">View Plan</Button>
          </Link>
          <button
            className="px-3 py-2 border rounded-lg text-sm"
            onClick={handleFavorite}
            disabled={favLoading}
          >
            {favLoading ? "..." : "★"}
          </button>
        </div>
      </div>
    </div>
  );
}
