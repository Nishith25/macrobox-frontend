// frontend/src/components/MealCard.tsx (FRONTEND)
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import Button from "./Button";
import type { Meal } from "../pages/Home";

type MealCardProps = {
  meal: Meal;
  onAddToCart: (meal: Meal) => void;
  qty?: number;
  onIncrease?: (meal: Meal) => void;
  onDecrease?: (meal: Meal) => void;
};

export default function MealCard({
  meal,
  onAddToCart,
  qty = 0,
  onIncrease,
  onDecrease,
}: MealCardProps) {
  const [showDescription, setShowDescription] = useState(false);

  const hasQtyControls = qty > 0 && onIncrease && onDecrease;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg">
      <img
        src={meal.imageUrl || "https://via.placeholder.com/400x300?text=Meal"}
        alt={meal.title}
        className="h-52 w-full object-cover"
        onError={(e) =>
          (e.currentTarget.src =
            "https://via.placeholder.com/400x300?text=Meal")
        }
      />

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-xl font-bold text-gray-900">
            {meal.title || "Untitled Meal"}
          </h3>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              meal.foodType === "nonveg"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {meal.foodType === "nonveg" ? "Non-Veg" : "Veg"}
          </span>
        </div>

        {meal.description ? (
          <button
            type="button"
            onClick={() => setShowDescription((prev) => !prev)}
            className="mt-1 text-sm font-semibold text-green-700 underline"
          >
            {showDescription ? "Hide Description" : "View Description"}
          </button>
        ) : (
          <p className="mt-1 text-sm text-gray-400">No description added</p>
        )}

        {showDescription && meal.description && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
            {meal.description}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MacroBadge label="Calories" value={`${meal.calories ?? 0} kcal`} />
          <MacroBadge label="Protein" value={`${meal.protein ?? 0}g`} />
          <MacroBadge label="Carbs" value={`${meal.carbs ?? 0}g`} />
          <MacroBadge label="Fat" value={`${meal.fat ?? 0}g`} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-xl font-extrabold text-gray-900">
              ₹{meal.price ?? 0}
            </p>
          </div>

          {hasQtyControls ? (
            <div className="flex items-center gap-3 rounded-xl border bg-green-50 px-3 py-2">
              <button
                type="button"
                onClick={() => onDecrease(meal)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm hover:bg-green-100"
              >
                <Minus size={16} />
              </button>

              <span className="min-w-5 text-center font-bold text-green-700">
                {qty}
              </span>

              <button
                type="button"
                onClick={() => onIncrease(meal)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm hover:bg-green-100"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <Button className="px-5" onClick={() => onAddToCart(meal)}>
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MacroBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}