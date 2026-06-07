// frontend/src/pages/AdminMeals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

/* ================= TYPES ================= */

type FoodType = "veg" | "nonveg";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";

type Meal = {
  _id: string;
  title: string;
  description?: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  price: number;
  imageUrl: string;
  foodType: FoodType;
  goalTypes?: GoalType[];
};

const goalOptions: { key: GoalType; label: string }[] = [
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "weight_gain", label: "Weight Gain" },
  { key: "clean_eating", label: "Clean Eating" },
];

const goalLabelMap: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

/* ================= MEAL CARD ================= */

function MealRow({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex gap-4">
        <img
          src={meal.imageUrl || "/placeholder-meal.png"}
          className="h-24 w-24 rounded-xl object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder-meal.png")}
          alt={meal.title}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="truncate font-bold text-gray-900">{meal.title}</h3>

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

          <p className="mt-1 text-sm text-slate-500">
            {meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g
            carbs · {meal.fat}g fat · ₹{meal.price}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {meal.goalTypes && meal.goalTypes.length > 0 ? (
              meal.goalTypes.map((goal) => (
                <span
                  key={goal}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                >
                  {goalLabelMap[goal]}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                No goal tags
              </span>
            )}
          </div>

          {meal.description && (
            <button
              type="button"
              onClick={() => setShowDescription((prev) => !prev)}
              className="mt-2 text-sm font-semibold text-green-700 underline"
            >
              {showDescription ? "Hide Description" : "View Description"}
            </button>
          )}

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border px-3 py-1 text-sm font-medium hover:bg-gray-50"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showDescription && meal.description && (
        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          {meal.description}
        </div>
      )}
    </div>
  );
}

/* ================= MAIN ================= */

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    protein: "",
    calories: "",
    carbs: "",
    fat: "",
    price: "",
    foodType: "veg" as FoodType,
    goalTypes: [] as GoalType[],
  });

  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchMeals = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/meals");
      setMeals(res.data || []);
    } catch {
      toast.error("Failed to load meals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      protein: "",
      calories: "",
      carbs: "",
      fat: "",
      price: "",
      foodType: "veg",
      goalTypes: [],
    });

    setImage(null);
    setEditingId(null);
  };

  const toggleGoal = (goal: GoalType) => {
    setForm((prev) => {
      const exists = prev.goalTypes.includes(goal);

      return {
        ...prev,
        goalTypes: exists
          ? prev.goalTypes.filter((g) => g !== goal)
          : [...prev.goalTypes, goal],
      };
    });
  };

  const saveMeal = async () => {
    if (
      !form.title ||
      !form.protein ||
      !form.calories ||
      !form.carbs ||
      !form.fat ||
      !form.price
    ) {
      toast.error("Fill all required fields");
      return;
    }

    if (form.goalTypes.length === 0) {
      toast.error("Please select at least one meal goal");
      return;
    }

    if (!editingId && !image) {
      toast.error("Please choose an image");
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("protein", form.protein);
    data.append("calories", form.calories);
    data.append("carbs", form.carbs);
    data.append("fat", form.fat);
    data.append("price", form.price);
    data.append("foodType", form.foodType);
    data.append("goalTypes", JSON.stringify(form.goalTypes));

    if (image) data.append("image", image);

    try {
      setSaving(true);

      if (editingId) {
        const res = await api.put(`/admin/meals/${editingId}`, data);

        setMeals((prev) =>
          prev.map((m) => (m._id === editingId ? res.data : m))
        );

        toast.success("Meal updated");
      } else {
        const res = await api.post("/admin/meals", data);

        setMeals((prev) => [res.data, ...prev]);

        toast.success("Meal added");
      }

      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meal: Meal) => {
    if (!window.confirm(`Delete "${meal.title}"?`)) return;

    try {
      await api.delete(`/admin/meals/${meal._id}`);
      setMeals((prev) => prev.filter((m) => m._id !== meal._id));
      toast.success("Meal deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingId(meal._id);

    setForm({
      title: meal.title,
      description: meal.description || "",
      protein: String(meal.protein ?? ""),
      calories: String(meal.calories ?? ""),
      carbs: String(meal.carbs ?? ""),
      fat: String(meal.fat ?? ""),
      price: String(meal.price ?? ""),
      foodType: meal.foodType || "veg",
      goalTypes: meal.goalTypes || [],
    });

    setImage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stats = useMemo(() => {
    const veg = meals.filter((m) => m.foodType === "veg").length;
    const nonveg = meals.filter((m) => m.foodType === "nonveg").length;
    const withoutGoals = meals.filter(
      (m) => !m.goalTypes || m.goalTypes.length === 0
    ).length;

    return {
      total: meals.length,
      veg,
      nonveg,
      withoutGoals,
    };
  }, [meals]);

  const vegMeals = meals.filter((m) => m.foodType === "veg");
  const nonVegMeals = meals.filter((m) => m.foodType === "nonveg");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Meals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create MacroBox meals with full macros, description, Veg / Non-Veg
          category, and goal tags.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Meals</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="rounded-2xl border bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-700">Veg Meals</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{stats.veg}</p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-700">Non-Veg Meals</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {stats.nonveg}
          </p>
        </div>

        <div className="rounded-2xl border bg-yellow-50 p-4 shadow-sm">
          <p className="text-sm text-yellow-700">Without Goal Tags</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">
            {stats.withoutGoals}
          </p>
        </div>
      </div>

      {/* FORM */}
      <div className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Update meal" : "Create a new meal"}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <input
            placeholder="Price (₹)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <textarea
            placeholder="Meal description, ingredients, benefits, serving details..."
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            className="rounded-lg border px-3 py-2 md:col-span-3"
          />

          <input
            placeholder="Calories"
            type="number"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Protein (g)"
            type="number"
            value={form.protein}
            onChange={(e) => setForm({ ...form, protein: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Carbs (g)"
            type="number"
            value={form.carbs}
            onChange={(e) => setForm({ ...form, carbs: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Fat (g)"
            type="number"
            value={form.fat}
            onChange={(e) => setForm({ ...form, fat: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <select
            value={form.foodType}
            onChange={(e) =>
              setForm({ ...form, foodType: e.target.value as FoodType })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
          </select>

          <div className="md:col-span-3">
            <p className="mb-2 text-sm font-bold text-gray-700">Meal Goals</p>

            <div className="flex flex-wrap gap-2">
              {goalOptions.map((goal) => {
                const active = form.goalTypes.includes(goal.key);

                return (
                  <button
                    key={goal.key}
                    type="button"
                    onClick={() => toggleGoal(goal.key)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      active
                        ? "bg-green-600 text-white"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {goal.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Select where this meal should appear. Example: Banana oats can be
              Muscle Gain, Weight Gain, and Clean Eating.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="file"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />

          {editingId && (
            <p className="mt-2 text-xs text-gray-500">
              Leave image empty if you do not want to change it.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={saveMeal}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add meal"}
          </button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">
        Veg Meals {loading ? "(loading...)" : `(${vegMeals.length})`}
      </h2>

      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {vegMeals.map((meal) => (
          <MealRow
            key={meal._id}
            meal={meal}
            onEdit={() => handleEdit(meal)}
            onDelete={() => handleDelete(meal)}
          />
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">
        Non-Veg Meals ({nonVegMeals.length})
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {nonVegMeals.map((meal) => (
          <MealRow
            key={meal._id}
            meal={meal}
            onEdit={() => handleEdit(meal)}
            onDelete={() => handleDelete(meal)}
          />
        ))}
      </div>
    </div>
  );
}