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
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    protein: "",
    calories: "",
    price: "",
    isFeatured: false,
  });

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

  const saveMeal = async () => {
    if (!form.title || !form.protein || !form.calories || !form.price) {
      toast.error("Fill all fields before saving");
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
        if (!image) {
          toast.error("Please choose an image");
          setSaving(false);
          return;
        }
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

  const toggleFeatured = async (mealId: string, value: boolean) => {
    setTogglingId(mealId);

    try {
      const formData = new FormData();
      formData.append("isFeatured", String(value));

      const res = await api.put(`/admin/meals/${mealId}`, formData);
      setMeals((prev) =>
        prev.map((m) => (m._id === mealId ? { ...m, isFeatured: res.data.isFeatured } : m))
      );
      // Re-fetch to ensure we stay in sync with server (avoids stale state if backend mutates more fields)
      fetchMeals();
      toast.success(value ? "Featured on homepage" : "Removed from homepage");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update featured status");
    } finally {
      setTogglingId(null);
    }
  };

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

  const handleDelete = async (meal: Meal) => {
    const ok = window.confirm(`Delete "${meal.title}"?`);
    if (!ok) return;
    try {
      await api.delete(`/admin/meals/${meal._id}`);
      setMeals((prev) => prev.filter((m) => m._id !== meal._id));
      toast.success("Meal deleted");
      if (editingId === meal._id) resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">
          Admin
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Manage Day Packs
        </h1>
        <p className="text-slate-500 text-sm">
          Add new meals, set pricing, and feature them on the home page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Update meal" : "Create a new meal"}
              </h2>
              <p className="text-sm text-slate-500">
                Upload an image and set macros to publish.
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full ${
                form.isFeatured
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {form.isFeatured ? "Will show as Featured" : "Regular"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Title (e.g., Muscle Gain Pack)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Price (₹)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Protein (g)"
              type="number"
              value={form.protein}
              onChange={(e) => setForm({ ...form, protein: e.target.value })}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Calories"
              type="number"
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
            <label className="flex items-center justify-between border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50/40">
              <div className="flex flex-col">
                <span className="font-medium text-slate-800">
                  Upload meal image
                </span>
                <span className="text-xs text-slate-500">
                  PNG/JPG under 5MB
                </span>
              </div>
              <input
                type="file"
                className="text-sm"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
            <label className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={form.isFeatured}
                onChange={(e) =>
                  setForm({ ...form, isFeatured: e.target.checked })
                }
              />
              <div>
                <p className="font-medium text-slate-800">Feature on homepage</p>
                <p className="text-xs text-slate-500">
                  Appears in “Featured Day Packs”
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end mt-5 gap-2">
            {editingId && (
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={saveMeal}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-70"
            >
              <span>{editingId ? "Save changes" : "＋ Add meal"}</span>
            </button>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-emerald-800 mb-3">
            Tips for best results
          </h3>
          <ul className="space-y-2 text-sm text-emerald-900">
            <li>Use clear photos (1:1 works best).</li>
            <li>Set protein and calories to help users plan.</li>
            <li>Toggle “Feature” for homepage spotlight.</li>
            <li>Prices display with the ₹ symbol automatically.</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          All meals ({meals.length})
        </h2>
        {loading && (
          <span className="text-sm text-slate-500">Loading meals…</span>
        )}
      </div>

      {meals.length === 0 && !loading ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-500">
          No meals yet. Add your first one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meals.map((meal) => (
            <div
              key={meal._id}
              className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex gap-4"
            >
              <img
                src={meal.imageUrl}
                alt={meal.title}
                className="h-24 w-24 rounded-xl object-cover border border-slate-200"
              />
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">#{meal._id.slice(0, 6)}</p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {meal.title}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      meal.isFeatured
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {meal.isFeatured ? "Featured" : "Regular"}
                  </span>
                </div>

                <div className="flex gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-emerald-700">
                    {meal.protein}g protein
                  </span>
                  <span>· {meal.calories} kcal</span>
                  <span className="font-semibold text-slate-900">
                    ₹{meal.price}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={meal.isFeatured}
                      disabled={togglingId === meal._id}
                      onChange={(e) => toggleFeatured(meal._id, e.target.checked)}
                    />
                    <span>
                      {meal.isFeatured ? "Featured on homepage" : "Feature on homepage"}
                      {togglingId === meal._id ? "..." : ""}
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(meal)}
                      className="text-xs rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(meal)}
                      className="text-xs rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
