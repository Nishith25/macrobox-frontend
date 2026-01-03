import Button from "./Button";
import type { Meal } from "../pages/Home"; // adjust path if needed

export default function MealCard({ meal }: { meal: Meal }) {
  const handleAddToCart = () => {
    alert(`${meal.title} added to cart`);
  };

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
        {/* TITLE */}
        <h3 className="text-xl font-semibold">
          {meal.title || "Untitled Meal"}
        </h3>

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
              {typeof meal.protein === "number" ? meal.protein : 0}g
            </span>
          </span>

          <span>
            Calories:{" "}
            <span className="text-blue-600">
              {typeof meal.calories === "number"
                ? meal.calories
                : 0}
            </span>
          </span>
        </div>

        {/* PRICE */}
        <div className="text-lg font-semibold text-gray-800">
          ₹{typeof meal.price === "number" ? meal.price : 0}
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
