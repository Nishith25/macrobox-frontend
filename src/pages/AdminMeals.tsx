// frontend/src/pages/AdminMeals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

/* ================= TYPES ================= */

type FoodType = "veg" | "nonveg";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";

type MealCategory = "breakfast" | "lunch" | "snack" | "dinner" | "all_day";

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
  mealCategory?: MealCategory;
  isAvailable?: boolean;
};

type MealOffer = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  code?: string;
  imageUrl?: string;
  linkTo?: string;
  isActive?: boolean;
  sortOrder?: number;
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

const mealCategoryOptions: { key: MealCategory; label: string }[] = [
  { key: "all_day", label: "All Day" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

const mealCategoryLabelMap: Record<MealCategory, string> = {
  all_day: "All Day",
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/* ================= OFFER ROW ================= */

function OfferRow({
  offer,
  onEdit,
  onToggle,
  onDelete,
}: {
  offer: MealOffer;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl bg-green-50 md:w-32">
          {offer.imageUrl ? (
            <img
              src={offer.imageUrl}
              alt={offer.title}
              className="h-full w-full rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="text-2xl font-black text-green-200">OFFER</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                {offer.title}
              </h3>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {offer.subtitle || "No subtitle"}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                offer.isActive === false
                  ? "bg-slate-100 text-slate-600"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {offer.isActive === false ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {offer.badge || "Launch Offer"}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Code: {offer.code || "-"}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              Link: {offer.linkTo || "/meals"}
            </span>

            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
              Sort: {offer.sortOrder || 0}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border px-3 py-1 text-sm font-medium hover:bg-gray-50"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={onToggle}
              className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                offer.isActive === false
                  ? "border-green-300 text-green-700 hover:bg-green-50"
                  : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              }`}
            >
              {offer.isActive === false ? "Activate" : "Deactivate"}
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
    </div>
  );
}

/* ================= MEAL ROW ================= */

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
          onError={(e) => {
            e.currentTarget.src = "/placeholder-meal.png";
          }}
          alt={meal.title}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="truncate font-bold text-gray-900">{meal.title}</h3>

            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  meal.foodType === "nonveg"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {meal.foodType === "nonveg" ? "Non-Veg" : "Veg"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  meal.isAvailable === false
                    ? "bg-gray-100 text-gray-600"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {meal.isAvailable === false ? "Unavailable" : "Available"}
              </span>
            </div>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g carbs ·{" "}
            {meal.fat}g fat · ₹{meal.price}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {mealCategoryLabelMap[meal.mealCategory || "all_day"]}
            </span>

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
  const [offers, setOffers] = useState<MealOffer[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [offerSaving, setOfferSaving] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const [offerForm, setOfferForm] = useState({
    title: "",
    subtitle: "",
    badge: "Launch Offer",
    code: "",
    imageUrl: "",
    linkTo: "/meals",
    isActive: true,
    sortOrder: "0",
  });

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
    mealCategory: "all_day" as MealCategory,
    isAvailable: true,
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

  const fetchOffers = async () => {
    try {
      const res = await api.get("/admin/offers");
      setOffers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOffers([]);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchOffers();
  }, []);

  const resetOfferForm = () => {
    setEditingOfferId(null);

    setOfferForm({
      title: "",
      subtitle: "",
      badge: "Launch Offer",
      code: "",
      imageUrl: "",
      linkTo: "/meals",
      isActive: true,
      sortOrder: "0",
    });
  };

  const saveOffer = async () => {
    if (!offerForm.title.trim()) {
      toast.error("Offer title is required");
      return;
    }

    const payload = {
      title: offerForm.title.trim(),
      subtitle: offerForm.subtitle.trim(),
      badge: offerForm.badge.trim(),
      code: offerForm.code.trim().toUpperCase(),
      imageUrl: offerForm.imageUrl.trim(),
      linkTo: offerForm.linkTo.trim() || "/meals",
      isActive: offerForm.isActive,
      sortOrder: Number(offerForm.sortOrder || 0),
    };

    try {
      setOfferSaving(true);

      if (editingOfferId) {
        const res = await api.put(`/admin/offers/${editingOfferId}`, payload);

        setOffers((prev) =>
          prev.map((item) => (item._id === editingOfferId ? res.data : item))
        );

        toast.success("Offer updated");
      } else {
        const res = await api.post("/admin/offers", payload);

        setOffers((prev) => [res.data, ...prev]);

        toast.success("Offer added");
      }

      resetOfferForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Offer save failed");
    } finally {
      setOfferSaving(false);
    }
  };

  const handleEditOffer = (offer: MealOffer) => {
    setEditingOfferId(offer._id);

    setOfferForm({
      title: offer.title || "",
      subtitle: offer.subtitle || "",
      badge: offer.badge || "Launch Offer",
      code: offer.code || "",
      imageUrl: offer.imageUrl || "",
      linkTo: offer.linkTo || "/meals",
      isActive: offer.isActive !== false,
      sortOrder: String(offer.sortOrder || 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleOffer = async (offer: MealOffer) => {
    try {
      const res = await api.patch(`/admin/offers/${offer._id}/toggle`);

      setOffers((prev) =>
        prev.map((item) => (item._id === offer._id ? res.data : item))
      );

      toast.success(res.data.isActive ? "Offer activated" : "Offer deactivated");
    } catch {
      toast.error("Offer status update failed");
    }
  };

  const handleDeleteOffer = async (offer: MealOffer) => {
    if (!window.confirm(`Delete offer "${offer.title}"?`)) return;

    try {
      await api.delete(`/admin/offers/${offer._id}`);

      setOffers((prev) => prev.filter((item) => item._id !== offer._id));

      toast.success("Offer deleted");
    } catch {
      toast.error("Offer delete failed");
    }
  };

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
      mealCategory: "all_day",
      isAvailable: true,
    });

    setImage(null);
    setEditingId(null);
  };

  const toggleGoal = (goal: GoalType) => {
    setForm((prev) => {
      const alreadySelected = prev.goalTypes.includes(goal);

      return {
        ...prev,
        goalTypes: alreadySelected
          ? prev.goalTypes.filter((item) => item !== goal)
          : [...prev.goalTypes, goal],
      };
    });
  };

  const saveMeal = async () => {
    if (
      !form.title.trim() ||
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

    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("protein", form.protein);
    data.append("calories", form.calories);
    data.append("carbs", form.carbs);
    data.append("fat", form.fat);
    data.append("price", form.price);
    data.append("foodType", form.foodType);
    data.append("goalTypes", JSON.stringify(form.goalTypes));
    data.append("mealCategory", form.mealCategory);
    data.append("isAvailable", String(form.isAvailable));

    if (image) {
      data.append("image", image);
    }

    try {
      setSaving(true);

      if (editingId) {
        const res = await api.put(`/admin/meals/${editingId}`, data);

        setMeals((prev) =>
          prev.map((meal) => (meal._id === editingId ? res.data : meal))
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
      setMeals((prev) => prev.filter((item) => item._id !== meal._id));
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
      mealCategory: meal.mealCategory || "all_day",
      isAvailable: meal.isAvailable !== false,
    });

    setImage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stats = useMemo(() => {
    const veg = meals.filter((meal) => meal.foodType === "veg").length;
    const nonveg = meals.filter((meal) => meal.foodType === "nonveg").length;
    const withoutGoals = meals.filter(
      (meal) => !meal.goalTypes || meal.goalTypes.length === 0
    ).length;
    const available = meals.filter((meal) => meal.isAvailable !== false).length;
    const activeOffers = offers.filter((offer) => offer.isActive !== false).length;

    return {
      total: meals.length,
      veg,
      nonveg,
      withoutGoals,
      available,
      activeOffers,
    };
  }, [meals, offers]);

  const vegMeals = meals.filter((meal) => meal.foodType === "veg");
  const nonVegMeals = meals.filter((meal) => meal.foodType === "nonveg");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Meals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create MacroBox meals and control the launch offer slider shown on the
          Meals page.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-6">
        <StatCard label="Total Meals" value={stats.total} />
        <StatCard label="Veg Meals" value={stats.veg} green />
        <StatCard label="Non-Veg Meals" value={stats.nonveg} red />
        <StatCard label="Available" value={stats.available} green />
        <StatCard label="Without Tags" value={stats.withoutGoals} yellow />
        <StatCard label="Active Offers" value={stats.activeOffers} blue />
      </div>

      <section className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Meals Page Offers
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              These offers appear in the scrolling offer section on the Meals page.
            </p>
          </div>

          {editingOfferId && (
            <button
              type="button"
              onClick={resetOfferForm}
              className="w-fit rounded-lg border px-4 py-2 text-sm font-bold hover:bg-gray-50"
            >
              Cancel Offer Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            placeholder="Offer title e.g. Launch Day 20% OFF"
            value={offerForm.title}
            onChange={(e) =>
              setOfferForm({ ...offerForm, title: e.target.value })
            }
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <input
            placeholder="Badge e.g. Launch Offer"
            value={offerForm.badge}
            onChange={(e) =>
              setOfferForm({ ...offerForm, badge: e.target.value })
            }
            className="rounded-lg border px-3 py-2"
          />

          <textarea
            placeholder="Subtitle shown below title"
            value={offerForm.subtitle}
            onChange={(e) =>
              setOfferForm({ ...offerForm, subtitle: e.target.value })
            }
            rows={3}
            className="rounded-lg border px-3 py-2 md:col-span-3"
          />

          <input
            placeholder="Coupon code e.g. LAUNCH20"
            value={offerForm.code}
            onChange={(e) =>
              setOfferForm({
                ...offerForm,
                code: e.target.value.toUpperCase(),
              })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Link e.g. /meals or /plans"
            value={offerForm.linkTo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, linkTo: e.target.value })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Sort order"
            type="number"
            value={offerForm.sortOrder}
            onChange={(e) =>
              setOfferForm({ ...offerForm, sortOrder: e.target.value })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Image URL optional"
            value={offerForm.imageUrl}
            onChange={(e) =>
              setOfferForm({ ...offerForm, imageUrl: e.target.value })
            }
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <select
            value={offerForm.isActive ? "true" : "false"}
            onChange={(e) =>
              setOfferForm({
                ...offerForm,
                isActive: e.target.value === "true",
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={saveOffer}
            disabled={offerSaving}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
          >
            {offerSaving
              ? "Saving..."
              : editingOfferId
              ? "Save offer changes"
              : "Add offer"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {offers.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 md:col-span-2">
              No offers added yet.
            </div>
          ) : (
            offers.map((offer) => (
              <OfferRow
                key={offer._id}
                offer={offer}
                onEdit={() => handleEditOffer(offer)}
                onToggle={() => handleToggleOffer(offer)}
                onDelete={() => handleDeleteOffer(offer)}
              />
            ))
          )}
        </div>
      </section>

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

          <select
            value={form.mealCategory}
            onChange={(e) =>
              setForm({
                ...form,
                mealCategory: e.target.value as MealCategory,
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            {mealCategoryOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={form.isAvailable ? "true" : "false"}
            onChange={(e) =>
              setForm({
                ...form,
                isAvailable: e.target.value === "true",
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="true">Available</option>
            <option value="false">Not Available</option>
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
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-green-600 text-white shadow"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {goal.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              You can select multiple goals for one dish. Example: Banana Oats
              can be Muscle Gain, Weight Gain, and Clean Eating.
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

function StatCard({
  label,
  value,
  green,
  red,
  yellow,
  blue,
}: {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
  yellow?: boolean;
  blue?: boolean;
}) {
  const colorClass = green
    ? "bg-green-50 text-green-700"
    : red
    ? "bg-red-50 text-red-700"
    : yellow
    ? "bg-yellow-50 text-yellow-700"
    : blue
    ? "bg-blue-50 text-blue-700"
    : "bg-white text-gray-900";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${colorClass}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}