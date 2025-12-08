import { useParams } from "react-router-dom";
import meals from "../data/meals";

export default function MealDetails() {
  const { id } = useParams();
  const meal = meals.find((m) => m.id.toString() === id);

  if (!meal) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold">Meal Not Found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* TITLE */}
      <h1 className="text-4xl font-bold mb-3">{meal.title}</h1>

      {/* SUBTITLE */}
      <p className="text-gray-600 text-lg mb-6">
        {meal.description}
      </p>

      {/* IMAGE */}
      <img
        src={meal.image}
        alt={meal.title}
        className="w-full h-80 object-cover rounded-xl shadow-md mb-8"
      />

      {/* MACROS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center mb-10">
        <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold">Protein</h3>
          <p className="text-2xl font-bold mt-1">{meal.protein}g</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold">Calories</h3>
          <p className="text-2xl font-bold mt-1">{meal.calories}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold">Meal Type</h3>
          <p className="text-lg font-medium mt-1">Premium Meal</p>
        </div>
      </div>

      {/* CTA BUTTON */}
      <button className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition">
        Add to My Day Plan
      </button>
    </div>
  );
}
