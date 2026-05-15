// frontend/src/components/MealCard.tsx (FRONTEND)
import Button from "./Button";
import type { Meal } from "../pages/Home";

/* ================= TYPES ================= */

type MealCardProps = {
  meal: Meal;
  onAddToCart: (meal: Meal) => void;
};

/* ================= COMPONENT ================= */

export default function MealCard({ meal, onAddToCart }: MealCardProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg">
      {/* IMAGE */}
      <div className="relative">
        <img
          src={meal.imageUrl || "https://via.placeholder.com/400x300?text=Meal"}
          alt={meal.title}
          className="h-52 w-full object-cover"
          onError={(e) =>
            (e.currentTarget.src =
              "https://via.placeholder.com/400x300?text=Meal")
          }
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-green-700 shadow-sm">
          High Protein
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5">
        <h3 className="line-clamp-1 text-xl font-bold text-gray-900">
          {meal.title || "Untitled Meal"}
        </h3>

        {meal.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {meal.description}
          </p>
        )}

        {/* MACROS */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MacroBadge label="Calories" value={`${meal.calories ?? 0} kcal`} />
          <MacroBadge label="Protein" value={`${meal.protein ?? 0}g`} />
          <MacroBadge label="Carbs" value={`${meal.carbs ?? 0}g`} />
          <MacroBadge label="Fat" value={`${meal.fat ?? 0}g`} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-xl font-extrabold text-gray-900">
              ₹{meal.price ?? 0}
            </p>
          </div>

          <Button className="px-5" onClick={() => onAddToCart(meal)}>
            Add
          </Button>
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