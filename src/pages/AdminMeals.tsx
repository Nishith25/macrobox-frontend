import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type Meal = {
  _id: string;
  title: string;
  protein: number;
  calories: number;
  price: number;
  imageUrl: string;
  isFeatured: boolean;
};

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    protein: "",
    calories: "",
    price: "",
    imageUrl: "",
    isFeatured: false,
  });

  // ---------------- FETCH MEALS ----------------
  const fetchMeals = async () => {
    try {
      const res = await api.get<Meal[]>("/admin/meals"); // ✅ NO /api
      setMeals(res.data);
    } catch {
      toast.error("Failed to fetch meals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  // ---------------- ADD MEAL ----------------
  const addMeal = async () => {
    const { title, protein, calories, price, imageUrl } = form;

    if (!title || !protein || !calories || !price || !imageUrl) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await api.post("/admin/meals", {
        title,
        protein: Number(protein),
        calories: Number(calories),
        price: Number(price),
        imageUrl,
        isFeatured: form.isFeatured,
      });

      toast.success("Meal added");
      setForm({
        title: "",
        protein: "",
        calories: "",
        price: "",
        imageUrl: "",
        isFeatured: false,
      });

      fetchMeals();
    } catch {
      toast.error("Failed to add meal");
    }
  };

  // ---------------- DELETE MEAL ----------------
  const deleteMeal = async (id: string) => {
    if (!confirm("Delete this meal?")) return;

    try {
      await api.delete(`/admin/meals/${id}`);
      toast.success("Meal deleted");
      setMeals((prev) => prev.filter((m) => m._id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  // ---------------- TOGGLE FEATURED ----------------
  const toggleFeatured = async (meal: Meal) => {
    try {
      await api.patch(`/admin/meals/${meal._id}/featured`, {
        isFeatured: !meal.isFeatured,
      });

      setMeals((prev) =>
        prev.map((m) =>
          m._id === meal._id
            ? { ...m, isFeatured: !m.isFeatured }
            : m
        )
      );
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">
        Admin – Manage Day Packs
      </h1>

      {/* ADD FORM */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <input
          placeholder="Meal title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Protein (g)"
          value={form.protein}
          onChange={(e) => setForm({ ...form, protein: e.target.value })}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Calories"
          value={form.calories}
          onChange={(e) => setForm({ ...form, calories: e.target.value })}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Price (₹)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="border p-2 rounded"
        />

        <input
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="border p-2 rounded"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) =>
              setForm({ ...form, isFeatured: e.target.checked })
            }
          />
          <span className="text-sm">Featured</span>
        </label>
      </div>

      <button
        onClick={addMeal}
        className="bg-green-600 text-white px-6 py-2 rounded mb-8"
      >
        Add Meal
      </button>

      {/* TABLE */}
      {loading ? (
        <p>Loading meals...</p>
      ) : (
        <table className="w-full border rounded overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Protein</th>
              <th className="p-3">Calories</th>
              <th className="p-3">Price</th>
              <th className="p-3">Featured</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {meals.map((meal) => (
              <tr key={meal._id} className="border-t">
                <td className="p-3 font-medium">{meal.title}</td>
                <td className="p-3">{meal.protein} g</td>
                <td className="p-3">{meal.calories}</td>
                <td className="p-3">₹{meal.price}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={meal.isFeatured}
                    onChange={() => toggleFeatured(meal)}
                  />
                </td>
                <td className="p-3">
                  <button
                    onClick={() => deleteMeal(meal._id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
