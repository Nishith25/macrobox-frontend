import { Minus, Plus } from "lucide-react";
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
  const hasQtyControls = qty > 0 && onIncrease && onDecrease;

  return (
    <article className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="relative h-[255px] overflow-hidden bg-slate-100">
        <img
          src={meal.imageUrl || "/placeholder-meal.png"}
          alt={meal.title || "Meal"}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-meal.png";
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[21px] font-black tracking-[-0.03em] text-slate-950">
            {meal.title || "Untitled Meal"}
          </h3>

          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
              meal.foodType === "nonveg"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {meal.foodType === "nonveg" ? "Non-Veg" : "Veg"}
          </span>
        </div>

        <p className="min-h-[48px] text-sm font-medium leading-6 text-slate-500">
          {meal.description || "No description added"}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MacroBadge label="Calories" value={`${meal.calories ?? 0} kcal`} />
          <MacroBadge label="Protein" value={`${meal.protein ?? 0}g`} />
          <MacroBadge label="Carbs" value={`${meal.carbs ?? 0}g`} />
          <MacroBadge label="Fat" value={`${meal.fat ?? 0}g`} />
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-semibold text-slate-400">Price</p>
            <p className="text-[25px] font-black tracking-[-0.04em] text-slate-950">
              ₹{meal.price ?? 0}
            </p>
          </div>

          {hasQtyControls ? (
            <div className="flex overflow-hidden rounded-[18px] border border-green-600 bg-white">
              <button
                type="button"
                onClick={() => onDecrease(meal)}
                className="flex h-12 w-14 items-center justify-center bg-white text-green-700 transition hover:bg-green-50"
              >
                <Minus size={18} strokeWidth={3} />
              </button>

              <span className="flex h-12 w-12 items-center justify-center bg-white font-black text-green-700">
                {qty}
              </span>

              <button
                type="button"
                onClick={() => onIncrease(meal)}
                className="flex h-12 w-14 items-center justify-center bg-green-50 text-green-700 transition hover:bg-green-100"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(meal)}
              className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
            >
              <Plus size={18} />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MacroBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}