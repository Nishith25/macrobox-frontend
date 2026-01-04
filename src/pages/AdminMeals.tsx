import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================= TYPES ================= */
type Meal = {
  _id: string;
  title: string;
  protein: number;
  calories: number;
  price: number;
  imageUrl: string;
  isFeatured: boolean;
};

/* ================= SORTABLE CARD ================= */
function SortableMeal({
  meal,
  onEdit,
  onDelete,
  onToggleFeatured,
  toggling,
}: {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: (val: boolean) => void;
  toggling: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meal._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-2xl p-4 bg-white flex gap-4"
    >
      {/* 🔹 DRAG HANDLE (ONLY THIS DRAGS) */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center text-xl select-none"
        title="Drag to reorder"
      >
        ☰
      </div>

      {/* IMAGE */}
      <img
        src={meal.imageUrl || "/placeholder-meal.png"}
        className="w-24 h-24 rounded-xl object-cover"
        onError={(e) =>
          (e.currentTarget.src = "/placeholder-meal.png")
        }
      />

      {/* CONTENT */}
      <div className="flex-1">
        <h3 className="font-semibold">{meal.title}</h3>
        <p className="text-sm text-slate-500">
          {meal.protein}g protein · {meal.calories} kcal · ₹{meal.price}
        </p>

        <label className="flex items-center gap-2 mt-2 text-sm">
          <input
            type="checkbox"
            checked={meal.isFeatured}
            disabled={toggling}
            onChange={(e) => onToggleFeatured(e.target.checked)}
          />
          Feature on homepage
        </label>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={onEdit}
            className="text-sm border px-3 py-1 rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


/* ================= MAIN ================= */
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

  /* -------- FETCH -------- */
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

  /* -------- FORM -------- */
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
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* -------- FEATURE TOGGLE -------- */
  const toggleFeatured = async (mealId: string, value: boolean) => {
    setTogglingId(mealId);
    try {
      const res = await api.patch(`/admin/meals/${mealId}/featured`, {
        isFeatured: value,
      });
      setMeals((prev) =>
        prev.map((m) =>
          m._id === mealId ? { ...m, isFeatured: res.data.isFeatured } : m
        )
      );
    } catch {
      toast.error("Failed to update featured");
    } finally {
      setTogglingId(null);
    }
  };

  /* -------- DELETE -------- */
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

  /* -------- EDIT -------- */
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

  /* -------- DRAG END -------- */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const featured = meals.filter((m) => m.isFeatured);
    const oldIndex = featured.findIndex((m) => m._id === active.id);
    const newIndex = featured.findIndex((m) => m._id === over.id);

    const reordered = arrayMove(featured, oldIndex, newIndex);
    const orderedIds = reordered.map((m) => m._id);

    setMeals((prev) => {
      const nonFeatured = prev.filter((m) => !m.isFeatured);
      return [...reordered, ...nonFeatured];
    });

    await api.patch("/admin/meals/reorder", { orderedIds });
    toast.success("Featured order updated");
  };

  const featuredMeals = meals.filter((m) => m.isFeatured);
  const otherMeals = meals.filter((m) => !m.isFeatured);

  /* ================= UI ================= */
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
          <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />
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
            <button onClick={resetForm} className="border px-4 py-2 rounded-lg">
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

      {/* ---------- FEATURED ---------- */}
      <h2 className="text-lg font-semibold mb-4">
        Featured meals (drag to reorder)
      </h2>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={featuredMeals.map((m) => m._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {featuredMeals.map((meal) => (
              <SortableMeal
                key={meal._id}
                meal={meal}
                toggling={togglingId === meal._id}
                onEdit={() => handleEdit(meal)}
                onDelete={() => handleDelete(meal)}
                onToggleFeatured={(val) =>
                  toggleFeatured(meal._id, val)
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* ---------- OTHER ---------- */}
      <h2 className="text-lg font-semibold mb-4">
        Other meals ({otherMeals.length})
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {otherMeals.map((meal) => (
          <div
            key={meal._id}
            className="border rounded-2xl p-4 bg-white flex gap-4"
          >
            <img
              src={meal.imageUrl || "/placeholder-meal.png"}
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
    </div>
  );
}
