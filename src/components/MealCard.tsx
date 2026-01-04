import Button from "./Button";
import type { Meal } from "../pages/Home";

/* ================= TYPES ================= */

type MealCardProps = {
  meal: Meal;
  onAddToCart: (meal: Meal) => void; // ✅ correct
};

/* ================= COMPONENT ================= */

export default function MealCard({ meal, onAddToCart }: MealCardProps) {
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden w-full">
      {/* IMAGE */}
      <img
        src={meal.imageUrl || "https://via.placeholder.com/400x300?text=Meal"}
        alt={meal.title}
        className="w-full h-52 object-cover"
      />

      {/* CONTENT */}
      <div className="p-5 space-y-3">
        <h3 className="text-xl font-semibold">
          {meal.title || "Untitled Meal"}
        </h3>

        {meal.description && (
          <p className="text-gray-600 text-sm">{meal.description}</p>
        )}

        <div className="flex justify-between text-sm font-medium">
          <span>
            Protein: <span className="text-green-600">{meal.protein ?? 0}g</span>
          </span>
          <span>
            Calories: <span className="text-blue-600">{meal.calories ?? 0}</span>
          </span>
        </div>

        <div className="text-lg font-semibold text-gray-800">
          ₹{meal.price ?? 0}
        </div>

        {/* ✅ IMPORTANT FIX */}
        <Button
          className="w-full mt-2"
          onClick={() => onAddToCart(meal)}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
