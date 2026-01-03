import { useEffect, useState } from "react";
import api from "../api/api";
import Button from "../components/Button";

interface Meal {
  _id: string;
  title: string;
  calories: number;
  protein: number;
}

interface SavedPlan {
  _id: string;
  date: string;
  items: {
    meal: Meal;
    times: string[];
  }[];
}

const TIMES = ["breakfast", "lunch", "snack", "dinner"];

export default function PlanMyDay() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SavedPlan[]>([]);

  /* ---------------- FETCH MEALS + HISTORY ---------------- */
  useEffect(() => {
    api.get("/meals").then((res) => setMeals(res.data));
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const res = await api.get("/user/day-plan");
    setHistory(res.data);
  };

  /* ---------------- TOGGLE SLOT ---------------- */
  const toggleSelect = (mealId: string, time: string) => {
    setSelected((prev) => {
      const current = prev[mealId] || [];
      const exists = current.includes(time);

      return {
        ...prev,
        [mealId]: exists
          ? current.filter((t) => t !== time)
          : [...current, time],
      };
    });
  };

  /* ---------------- SAVE PLAN ---------------- */
  const handleSavePlan = async () => {
    setSaving(true);

    const items = Object.entries(selected)
      .filter(([_, times]) => times.length > 0)
      .map(([mealId, times]) => ({ mealId, times }));

    if (items.length === 0) {
      alert("Select at least one meal");
      setSaving(false);
      return;
    }

    try {
      await api.post("/user/day-plan", { items });
      setSelected({});
      fetchHistory();
      alert("Plan saved!");
    } catch {
      alert("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- DELETE PLAN ---------------- */
  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    await api.delete(`/user/day-plan/${id}`);
    fetchHistory();
  };

  /* ---------------- TODAY TOTALS ---------------- */
  const totalProtein = meals.reduce((sum, m) => {
    const times = selected[m._id];
    return times?.length ? sum + m.protein * times.length : sum;
  }, 0);

  const totalCalories = meals.reduce((sum, m) => {
    const times = selected[m._id];
    return times?.length ? sum + m.calories * times.length : sum;
  }, 0);

  /* ======================= UI ======================= */
  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-2">Build Your Day Plan</h1>
      <p className="text-gray-600 mb-6">
        Choose meals and assign them to breakfast, lunch, snack, or dinner.
      </p>

      {/* TOTALS */}
      <div className="mb-6 p-4 border rounded-lg flex gap-8">
        <div>
          <p className="font-semibold">Total Protein</p>
          <p className="text-xl font-bold text-green-600">
            {totalProtein}g
          </p>
        </div>
        <div>
          <p className="font-semibold">Total Calories</p>
          <p className="text-xl font-bold text-blue-600">
            {totalCalories}
          </p>
        </div>
      </div>

      {/* MEALS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {meals.map((m) => (
          <div key={m._id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-1">{m.title}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {m.protein}g protein • {m.calories} kcal
            </p>

            <div className="flex gap-2 flex-wrap">
              {TIMES.map((t) => {
                const active = selected[m._id]?.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleSelect(m._id, t)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      active
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSavePlan} disabled={saving}>
        {saving ? "Saving..." : "Save Plan"}
      </Button>

      {/* ---------------- HISTORY ---------------- */}
      <h2 className="text-2xl font-bold mt-12 mb-4">
        Last 15 Days Plans
      </h2>

      {history.length === 0 && (
        <p className="text-gray-500">No plans saved yet</p>
      )}

      <div className="space-y-4">
        {history.map((plan) => {
          const totals = plan.items.reduce(
            (acc, item) => {
              acc.protein += item.meal.protein * item.times.length;
              acc.calories += item.meal.calories * item.times.length;
              return acc;
            },
            { protein: 0, calories: 0 }
          );

          return (
            <div key={plan._id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">
                    {new Date(plan.date).toDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="text-green-600 font-semibold">
                      {totals.protein}g protein
                    </span>{" "}
                    •{" "}
                    <span className="text-blue-600 font-semibold">
                      {totals.calories} kcal
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => deletePlan(plan._id)}
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>

              <ul className="text-sm text-gray-700 space-y-1 mt-2">
                {plan.items.map((i, idx) => (
                  <li key={idx}>
                    <strong>{i.meal.title}</strong> →{" "}
                    {i.times.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
