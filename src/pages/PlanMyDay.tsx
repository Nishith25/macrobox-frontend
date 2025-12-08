import { useEffect, useState } from "react";
import api from "../api/api";
import Button from "../components/Button";

interface Meal {
  _id: string;
  title: string;
  calories: number;
  protein: number;
}

export default function PlanMyDay() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<{ [id: string]: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/meals").then((res) => setMeals(res.data));
  }, []);

  const toggleSelect = (id: string, timeOfDay: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: prev[id] === timeOfDay ? "" : timeOfDay,
    }));
  };

  const handleSavePlan = async () => {
    setSaving(true);
    const items = Object.entries(selected)
      .filter(([_, time]) => !!time)
      .map(([mealId, timeOfDay]) => ({ mealId, timeOfDay }));

    try {
      await api.post("/user/day-plan", { items });
      alert("Plan saved!");
    } catch {
      alert("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const totalProtein = meals.reduce(
    (sum, m) => (selected[m._id] ? sum + m.protein : sum),
    0
  );
  const totalCalories = meals.reduce(
    (sum, m) => (selected[m._id] ? sum + m.calories : sum),
    0
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-4">Build Your Day Plan</h1>
      <p className="text-gray-600 mb-6">
        Choose meals and assign them to breakfast, lunch, snacks, or dinner.
      </p>

      <div className="mb-6 p-4 border rounded-lg flex gap-8">
        <div>
          <p className="font-semibold">Total Protein</p>
          <p className="text-xl font-bold text-green-600">{totalProtein}g</p>
        </div>
        <div>
          <p className="font-semibold">Total Calories</p>
          <p className="text-xl font-bold text-blue-600">{totalCalories}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {meals.map((m) => (
          <div key={m._id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{m.title}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {m.protein}g protein • {m.calories} kcal
            </p>
            <div className="flex gap-2 flex-wrap">
              {["breakfast", "lunch", "snack", "dinner"].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleSelect(m._id, t)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selected[m._id] === t
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSavePlan} disabled={saving}>
        {saving ? "Saving..." : "Save Plan"}
      </Button>
    </div>
  );
}
