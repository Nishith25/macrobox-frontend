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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    protein: "",
    calories: "",
    price: "",
    isFeatured: false,
  });

  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---------------- FETCH MEALS ---------------- */
  const fetchMeals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/meals");
      setMeals(res.data);
    } catch {
      toast.error("Failed to load meals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  /* ---------------- RESET FORM ---------------- */
  const resetForm = () => {
    setForm({
      title: "",
      protein: "",
      calories: "",
      price: "",
      isFeatured: false,
    });
    setImage(null);
    setEditingId(null);
  };

  /* ---------------- SAVE MEAL ---------------- */
  const saveMeal = async () => {
    if (!form.title || !form.protein || !form.calories || !form.price) {
      toast.error("Fill all fields");
      return;
    }

    if (!editingId && !image) {
      toast.error("Please choose an image");
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("protein", form.protein);
    data.append("calories", form.calories);
    data.append("price", form.price);
    data.append("isFeatured", String(form.isFeatured));
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
      toast.error(err?.response?.data?.message || "Failed to save meal");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- TOGGLE FEATURED (FIXED) ---------------- */
  const toggleFeatured = async (mealId: string, value: boolean) => {
    setTogglingId(mealId);
    try {
      const res = await api.put(`/admin/meals/${mealId}/featured`, {
        isFeatured: value,
      });

      setMeals((prev) =>
        prev.map((m) =>
          m._id === mealId ? { ...m, isFeatured: res.data.isFeatured } : m
        )
      );

      toast.success(
        value ? "Featured on homepage" : "Removed from homepage"
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Could not update featured status"
      );
    } finally {
      setTogglingId(null);
    }
  };

  /* ---------------- DELETE ---------------- */
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

  /* ---------------- EDIT ---------------- */
  const handleEdit = (meal: Meal) => {
    setEditingId(meal._id);
    setForm({
      title: meal.title,
      protein: String(meal.protein),
      calories: String(meal.calories),
      price: String(meal.price),
      isFeatured: meal.isFeatured,
    });
    setImage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ======================= UI ======================= */
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Manage Day Packs</h1>

      {/* ---------- FORM ---------- */}
      <div className="bg-white border rounded-2xl p-6 mb-10">
        <h2 className="font-semibold mb-4">
          {editingId ? "Update meal" : "Create a new meal"}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="Price (₹)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="Protein (g)"
            type="number"
            value={form.protein}
            onChange={(e) => setForm({ ...form, protein: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="Calories"
            type="number"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-4 mt-4">
          <input
            type="file"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm({ ...form, isFeatured: e.target.checked })
              }
            />
            Feature on homepage
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          {editingId && (
            <button
              onClick={resetForm}
              className="border px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            onClick={saveMeal}
            disabled={saving}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg"
          >
            {editingId ? "Save changes" : "Add meal"}
          </button>
        </div>
      </div>

      {/* ---------- LIST ---------- */}
      <h2 className="text-lg font-semibold mb-4">
        All meals ({meals.length})
      </h2>

      {loading ? (
        <p>Loading meals…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {meals.map((meal) => (
            <div
              key={meal._id}
              className="border rounded-2xl p-4 bg-white flex gap-4"
            >
              <img
                src={meal.imageUrl}
                alt={meal.title}
                className="w-24 h-24 rounded-xl object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold">{meal.title}</h3>
                <p className="text-sm text-slate-500">
                  {meal.protein}g protein · {meal.calories} kcal · ₹{meal.price}
                </p>

                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={meal.isFeatured}
                    disabled={togglingId === meal._id}
                    onChange={(e) =>
                      toggleFeatured(meal._id, e.target.checked)
                    }
                  />
                  Feature on homepage
                </label>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleEdit(meal)}
                    className="text-sm border px-3 py-1 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(meal)}
                    className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
