import { useEffect, useState } from "react";
import MealCard from "../components/MealCard";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";

export default function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    api.get("/meals").then((res) => setMeals(res.data));
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

      <div className="grid md:grid-cols-3 gap-8">
        {meals.map((meal) => (
          <MealCard
            key={meal._id}
            meal={meal}
            onAddToCart={handleAddToCart} // ✅ CORRECT
          />
        ))}
      </div>
    </div>
  );
}
