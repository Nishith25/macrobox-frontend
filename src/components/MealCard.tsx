import type { Meal } from "../types/meal";
import Button from "./Button";

export default function MealCard({ meal }: { meal: Meal }) {
  const handleAddToCart = () => {
    // later connect to cart context / backend
    alert(`${meal.title} added to cart`);
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden w-full">
      {/* IMAGE */}
      <img
        src={meal.imageUrl}
        alt={meal.title}
        className="w-full h-52 object-cover"
      />

      {/* CONTENT */}
      <div className="p-5 space-y-3">
        {/* TITLE */}
        <h3 className="text-xl font-semibold">{meal.title}</h3>

        {/* DESCRIPTION */}
        {meal.description && (
          <p className="text-gray-600 text-sm">
            {meal.description}
          </p>
        )}

        {/* MACROS */}
        <div className="flex justify-between text-sm font-medium">
          <span>
            Protein:{" "}
            <span className="text-green-600">
              {meal.protein}g
            </span>
          </span>
          <span>
            Calories:{" "}
            <span className="text-blue-600">
              {meal.calories}
            </span>
          </span>
        </div>

        {/* PRICE */}
        <div className="text-lg font-semibold text-gray-800">
          ₹{meal.price}
        </div>

        {/* ACTION */}
        <Button
          className="w-full mt-2"
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
