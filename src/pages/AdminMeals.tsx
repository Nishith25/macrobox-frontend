// frontend/src/pages/AdminMeals.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  BadgePercent,
  Check,
  ChevronRight,
  CirclePlus,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Leaf,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

/* ================= TYPES ================= */

type FoodType = "veg" | "nonveg";

type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating";

type MealCategory =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner"
  | "all_day";

type AdminSection = "meals" | "offers";
type MealFilter = "all" | "veg" | "nonveg" | "top_picks" | "unavailable";

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
  isTopPick?: boolean;
  topPickOrder?: number;
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

type MealForm = {
  title: string;
  description: string;
  protein: string;
  calories: string;
  carbs: string;
  fat: string;
  price: string;
  foodType: FoodType;
  goalTypes: GoalType[];
  mealCategory: MealCategory;
  isAvailable: boolean;
  isTopPick: boolean;
  topPickOrder: string;
};

type OfferForm = {
  title: string;
  subtitle: string;
  badge: string;
  code: string;
  imageUrl: string;
  linkTo: string;
  isActive: boolean;
  sortOrder: string;
};

/* ================= OPTIONS ================= */

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

const emptyMealForm = (): MealForm => ({
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
  isTopPick: false,
  topPickOrder: "0",
});

const emptyOfferForm = (): OfferForm => ({
  title: "",
  subtitle: "",
  badge: "Launch Offer",
  code: "",
  imageUrl: "",
  linkTo: "/meals",
  isActive: true,
  sortOrder: "0",
});

/* ================= MAIN ================= */

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [offers, setOffers] = useState<MealOffer[]>([]);

  const [activeSection, setActiveSection] =
    useState<AdminSection>("meals");

  const [mealFilter, setMealFilter] = useState<MealFilter>("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);

  const [showMealDrawer, setShowMealDrawer] = useState(false);
  const [showOfferDrawer, setShowOfferDrawer] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const [form, setForm] = useState<MealForm>(emptyMealForm());
  const [offerForm, setOfferForm] =
    useState<OfferForm>(emptyOfferForm());

  const [image, setImage] = useState<File | null>(null);

  const fetchMeals = async () => {
    try {
      const response = await api.get("/admin/meals");
      setMeals(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("Failed to load meals");
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await api.get("/admin/offers");
      setOffers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setOffers([]);
    }
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchMeals(), fetchOffers()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const stats = useMemo(() => {
    const veg = meals.filter((meal) => meal.foodType === "veg").length;

    const nonveg = meals.filter(
      (meal) => meal.foodType === "nonveg"
    ).length;

    const available = meals.filter(
      (meal) => meal.isAvailable !== false
    ).length;

    const topPicks = meals.filter((meal) => meal.isTopPick === true).length;

    const activeOffers = offers.filter(
      (offer) => offer.isActive !== false
    ).length;

    return {
      total: meals.length,
      veg,
      nonveg,
      available,
      unavailable: Math.max(meals.length - available, 0),
      topPicks,
      activeOffers,
    };
  }, [meals, offers]);

  const filteredMeals = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...meals]
      .filter((meal) => {
        const matchesSearch =
          !term ||
          [
            meal.title,
            meal.description,
            meal.foodType,
            meal.mealCategory,
            ...(meal.goalTypes || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term);

        if (!matchesSearch) return false;

        if (mealFilter === "veg") return meal.foodType === "veg";
        if (mealFilter === "nonveg") return meal.foodType === "nonveg";
        if (mealFilter === "top_picks") return meal.isTopPick === true;

        if (mealFilter === "unavailable") {
          return meal.isAvailable === false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.isTopPick && b.isTopPick) {
          return Number(a.topPickOrder || 0) - Number(b.topPickOrder || 0);
        }

        if (a.isTopPick) return -1;
        if (b.isTopPick) return 1;

        return a.title.localeCompare(b.title);
      });
  }, [meals, mealFilter, search]);

  const sortedOffers = useMemo(() => {
    return [...offers].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );
  }, [offers]);

  const openCreateMeal = () => {
    setEditingId(null);
    setForm(emptyMealForm());
    setImage(null);
    setShowMealDrawer(true);
  };

  const openEditMeal = (meal: Meal) => {
    setEditingId(meal._id);

    setForm({
      title: meal.title || "",
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
      isTopPick: meal.isTopPick === true,
      topPickOrder: String(meal.topPickOrder || 0),
    });

    setImage(null);
    setShowMealDrawer(true);
  };

  const closeMealDrawer = () => {
    if (saving) return;

    setShowMealDrawer(false);
    setEditingId(null);
    setForm(emptyMealForm());
    setImage(null);
  };

  const openCreateOffer = () => {
    setEditingOfferId(null);
    setOfferForm(emptyOfferForm());
    setShowOfferDrawer(true);
  };

  const openEditOffer = (offer: MealOffer) => {
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

    setShowOfferDrawer(true);
  };

  const closeOfferDrawer = () => {
    if (offerSaving) return;

    setShowOfferDrawer(false);
    setEditingOfferId(null);
    setOfferForm(emptyOfferForm());
  };

  const toggleGoal = (goal: GoalType) => {
    setForm((current) => ({
      ...current,
      goalTypes: current.goalTypes.includes(goal)
        ? current.goalTypes.filter((item) => item !== goal)
        : [...current.goalTypes, goal],
    }));
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
      toast.error("Fill all required meal fields");
      return;
    }

    if (form.goalTypes.length === 0) {
      toast.error("Select at least one meal goal");
      return;
    }

    if (!editingId && !image) {
      toast.error("Choose a meal image");
      return;
    }

    if (form.isTopPick && Number(form.topPickOrder) < 1) {
      toast.error("Top Pick order must be 1 or above");
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
    data.append("isTopPick", String(form.isTopPick));
    data.append(
      "topPickOrder",
      form.isTopPick ? form.topPickOrder : "0"
    );

    if (image) {
      data.append("image", image);
    }

    try {
      setSaving(true);

      if (editingId) {
        const response = await api.put(
          `/admin/meals/${editingId}`,
          data
        );

        setMeals((current) =>
          current.map((meal) =>
            meal._id === editingId ? response.data : meal
          )
        );

        toast.success("Meal updated");
      } else {
        const response = await api.post("/admin/meals", data);

        setMeals((current) => [response.data, ...current]);

        toast.success("Meal added");
      }

      closeMealDrawer();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Meal save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (meal: Meal) => {
    if (!window.confirm(`Delete "${meal.title}"?`)) return;

    try {
      await api.delete(`/admin/meals/${meal._id}`);

      setMeals((current) =>
        current.filter((item) => item._id !== meal._id)
      );

      toast.success("Meal deleted");
    } catch {
      toast.error("Meal delete failed");
    }
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
        const response = await api.put(
          `/admin/offers/${editingOfferId}`,
          payload
        );

        setOffers((current) =>
          current.map((offer) =>
            offer._id === editingOfferId ? response.data : offer
          )
        );

        toast.success("Offer updated");
      } else {
        const response = await api.post("/admin/offers", payload);

        setOffers((current) => [response.data, ...current]);

        toast.success("Offer added");
      }

      closeOfferDrawer();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Offer save failed");
    } finally {
      setOfferSaving(false);
    }
  };

  const toggleOffer = async (offer: MealOffer) => {
    try {
      const response = await api.patch(
        `/admin/offers/${offer._id}/toggle`
      );

      setOffers((current) =>
        current.map((item) =>
          item._id === offer._id ? response.data : item
        )
      );

      toast.success(
        response.data.isActive
          ? "Offer activated"
          : "Offer deactivated"
      );
    } catch {
      toast.error("Offer status update failed");
    }
  };

  const deleteOffer = async (offer: MealOffer) => {
    if (!window.confirm(`Delete offer "${offer.title}"?`)) return;

    try {
      await api.delete(`/admin/offers/${offer._id}`);

      setOffers((current) =>
        current.filter((item) => item._id !== offer._id)
      );

      toast.success("Offer deleted");
    } catch {
      toast.error("Offer delete failed");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading meals and offers...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      {/* HEADER */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                MacroBox Admin
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
                Meals & Offers
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Manage your menu, meal availability, Top Picks and promotional
                offers shown to customers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={loadPage}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={
                  activeSection === "meals"
                    ? openCreateMeal
                    : openCreateOffer
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_12px_25px_rgba(22,163,74,0.2)] transition hover:bg-green-700"
              >
                <CirclePlus size={17} />
                {activeSection === "meals" ? "Add Meal" : "Add Offer"}
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardStat
              label="Total Meals"
              value={stats.total}
              icon={<Utensils size={18} />}
            />

            <DashboardStat
              label="Available"
              value={stats.available}
              icon={<PackageCheck size={18} />}
              accent
            />

            <DashboardStat
              label="Veg"
              value={stats.veg}
              icon={<Leaf size={18} />}
            />

            <DashboardStat
              label="Non-Veg"
              value={stats.nonveg}
              icon={<Utensils size={18} />}
            />

            <DashboardStat
              label="Top Picks"
              value={stats.topPicks}
              icon={<Star size={18} />}
            />

            <DashboardStat
              label="Active Offers"
              value={stats.activeOffers}
              icon={<BadgePercent size={18} />}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        {/* SECTION SWITCHER */}

        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveSection("meals")}
              className={`border-r border-slate-200 px-4 py-4 text-sm font-black transition ${
                activeSection === "meals"
                  ? "bg-green-50 text-green-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Meals
              <span
                className={`ml-2 rounded-full px-2.5 py-1 text-xs ${
                  activeSection === "meals"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {meals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("offers")}
              className={`px-4 py-4 text-sm font-black transition ${
                activeSection === "offers"
                  ? "bg-green-50 text-green-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Offers & Updates
              <span
                className={`ml-2 rounded-full px-2.5 py-1 text-xs ${
                  activeSection === "offers"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {offers.length}
              </span>
            </button>
          </div>
        </section>

        {activeSection === "meals" ? (
          <>
            {/* SEARCH + FILTERS */}

            <section className="mt-5 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search meals, goals or categories..."
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                  <FilterButton
                    active={mealFilter === "all"}
                    onClick={() => setMealFilter("all")}
                  >
                    All
                  </FilterButton>

                  <FilterButton
                    active={mealFilter === "veg"}
                    onClick={() => setMealFilter("veg")}
                  >
                    Veg
                  </FilterButton>

                  <FilterButton
                    active={mealFilter === "nonveg"}
                    onClick={() => setMealFilter("nonveg")}
                  >
                    Non-Veg
                  </FilterButton>

                  <FilterButton
                    active={mealFilter === "top_picks"}
                    onClick={() => setMealFilter("top_picks")}
                  >
                    Top Picks
                  </FilterButton>

                  <FilterButton
                    active={mealFilter === "unavailable"}
                    onClick={() => setMealFilter("unavailable")}
                  >
                    Unavailable
                  </FilterButton>
                </div>
              </div>
            </section>

            {/* MEALS */}

            <section className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    Menu Items
                  </h2>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {filteredMeals.length} meal
                    {filteredMeals.length === 1 ? "" : "s"} shown
                  </p>
                </div>
              </div>

              {filteredMeals.length === 0 ? (
                <EmptyState
                  icon={<Utensils size={26} />}
                  title="No meals found"
                  text="Try another search or create a new meal."
                />
              ) : (
                <div className="grid gap-4">
                  {filteredMeals.map((meal) => (
                    <MealRow
                      key={meal._id}
                      meal={meal}
                      onEdit={() => openEditMeal(meal)}
                      onDelete={() => deleteMeal(meal)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em]">
                  Meals Page Offers
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Offers are displayed based on their sort order.
                </p>
              </div>
            </div>

            {sortedOffers.length === 0 ? (
              <EmptyState
                icon={<BadgePercent size={26} />}
                title="No offers created"
                text="Create an offer for the Meals page."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedOffers.map((offer) => (
                  <OfferCard
                    key={offer._id}
                    offer={offer}
                    onEdit={() => openEditOffer(offer)}
                    onToggle={() => toggleOffer(offer)}
                    onDelete={() => deleteOffer(offer)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* MEAL DRAWER */}

      {showMealDrawer && (
        <Drawer
          title={editingId ? "Edit Meal" : "Add New Meal"}
          subtitle={
            editingId
              ? "Update meal information and visibility."
              : "Create a new MacroBox menu item."
          }
          onClose={closeMealDrawer}
          wide
        >
          <div className="space-y-6">
            <DrawerSection
              number="01"
              title="Basic Information"
              description="Meal name, description, price and image."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Meal title" required className="sm:col-span-2">
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Example: Balanced Chicken Meal"
                    className="admin-input"
                  />
                </Field>

                <Field label="Price" required>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="₹0"
                    className="admin-input"
                  />
                </Field>

                <Field label="Meal category">
                  <select
                    value={form.mealCategory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mealCategory: event.target.value as MealCategory,
                      }))
                    }
                    className="admin-input"
                  >
                    {mealCategoryOptions.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Description"
                  className="sm:col-span-2"
                >
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Ingredients, serving details and meal benefits..."
                    className="admin-input min-h-[110px] resize-y py-3"
                  />
                </Field>

                <Field
                  label={
                    editingId ? "Replace meal image" : "Meal image"
                  }
                  required={!editingId}
                  className="sm:col-span-2"
                >
                  <label className="flex cursor-pointer items-center gap-3 border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-green-500 hover:bg-green-50">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
                      <ImagePlus size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">
                        {image ? image.name : "Choose an image"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {editingId
                          ? "Leave empty to keep the existing image."
                          : "Image is required for a new meal."}
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setImage(event.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="02"
              title="Nutrition"
              description="Add the macro values shown to customers."
            >
              <div className="grid grid-cols-2 gap-4">
                <Field label="Calories" required>
                  <input
                    type="number"
                    min="0"
                    value={form.calories}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        calories: event.target.value,
                      }))
                    }
                    className="admin-input"
                  />
                </Field>

                <Field label="Protein (g)" required>
                  <input
                    type="number"
                    min="0"
                    value={form.protein}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        protein: event.target.value,
                      }))
                    }
                    className="admin-input"
                  />
                </Field>

                <Field label="Carbs (g)" required>
                  <input
                    type="number"
                    min="0"
                    value={form.carbs}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        carbs: event.target.value,
                      }))
                    }
                    className="admin-input"
                  />
                </Field>

                <Field label="Fat (g)" required>
                  <input
                    type="number"
                    min="0"
                    value={form.fat}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fat: event.target.value,
                      }))
                    }
                    className="admin-input"
                  />
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="03"
              title="Meal Classification"
              description="Control diet type, goals and availability."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Food type">
                  <select
                    value={form.foodType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        foodType: event.target.value as FoodType,
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="veg">Veg</option>
                    <option value="nonveg">Non-Veg</option>
                  </select>
                </Field>

                <Field label="Availability">
                  <select
                    value={form.isAvailable ? "true" : "false"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isAvailable: event.target.value === "true",
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </Field>
              </div>

              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Meal goals
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {goalOptions.map((goal) => {
                    const active = form.goalTypes.includes(goal.key);

                    return (
                      <button
                        key={goal.key}
                        type="button"
                        onClick={() => toggleGoal(goal.key)}
                        className={`flex min-h-11 items-center justify-between border px-3 text-left text-xs font-black transition ${
                          active
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-green-300"
                        }`}
                      >
                        {goal.label}

                        {active && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </DrawerSection>

            <DrawerSection
              number="04"
              title="Top Picks"
              description="Only checked meals appear in the Top Picks section."
            >
              <label
                className={`flex cursor-pointer items-start gap-3 border p-4 ${
                  form.isTopPick
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.isTopPick}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isTopPick: event.target.checked,
                      topPickOrder: event.target.checked
                        ? current.topPickOrder === "0"
                          ? "1"
                          : current.topPickOrder
                        : "0",
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-orange-500"
                />

                <div>
                  <p className="text-sm font-black text-slate-950">
                    Show this meal in Top Picks
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    Top Picks will not automatically include other meals.
                  </p>
                </div>
              </label>

              {form.isTopPick && (
                <div className="mt-4">
                  <Field label="Top Pick display order" required>
                    <input
                      type="number"
                      min="1"
                      value={form.topPickOrder}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          topPickOrder: event.target.value,
                        }))
                      }
                      className="admin-input"
                    />
                  </Field>
                </div>
              )}
            </DrawerSection>

            <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={closeMealDrawer}
                disabled={saving}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveMeal}
                disabled={saving}
                className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Check size={17} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Add Meal"}
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* OFFER DRAWER */}

      {showOfferDrawer && (
        <Drawer
          title={editingOfferId ? "Edit Offer" : "Add New Offer"}
          subtitle="Manage promotional content shown on the Meals page."
          onClose={closeOfferDrawer}
        >
          <div className="space-y-5">
            <Field label="Offer title" required>
              <input
                value={offerForm.title}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Example: Launch Day 20% OFF"
                className="admin-input"
              />
            </Field>

            <Field label="Subtitle">
              <textarea
                rows={4}
                value={offerForm.subtitle}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    subtitle: event.target.value,
                  }))
                }
                placeholder="Description shown below the offer title"
                className="admin-input min-h-[105px] resize-y py-3"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Badge">
                <input
                  value={offerForm.badge}
                  onChange={(event) =>
                    setOfferForm((current) => ({
                      ...current,
                      badge: event.target.value,
                    }))
                  }
                  placeholder="Launch Offer"
                  className="admin-input"
                />
              </Field>

              <Field label="Coupon code">
                <input
                  value={offerForm.code}
                  onChange={(event) =>
                    setOfferForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="LAUNCH20"
                  className="admin-input"
                />
              </Field>
            </div>

            <Field label="Image URL">
              <input
                value={offerForm.imageUrl}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
                className="admin-input"
              />
            </Field>

            <Field label="Destination link">
              <input
                value={offerForm.linkTo}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    linkTo: event.target.value,
                  }))
                }
                placeholder="/meals or /plans"
                className="admin-input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sort order">
                <input
                  type="number"
                  min="0"
                  value={offerForm.sortOrder}
                  onChange={(event) =>
                    setOfferForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="admin-input"
                />
              </Field>

              <Field label="Status">
                <select
                  value={offerForm.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setOfferForm((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }))
                  }
                  className="admin-input"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>

            <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={closeOfferDrawer}
                disabled={offerSaving}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveOffer}
                disabled={offerSaving}
                className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
              >
                {offerSaving ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Check size={17} />
                )}

                {offerSaving
                  ? "Saving..."
                  : editingOfferId
                  ? "Save Changes"
                  : "Add Offer"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </main>
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
    <article className="border border-slate-200 bg-white shadow-sm transition hover:border-green-200">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-52 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-auto sm:w-[190px]">
          <img
            src={meal.imageUrl || "/placeholder-meal.png"}
            alt={meal.title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = "/placeholder-meal.png";
            }}
          />

          {meal.isTopPick && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black text-white shadow-sm">
              <Star size={12} fill="currentColor" />
              Top Pick #{meal.topPickOrder || 0}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    meal.foodType === "nonveg"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {meal.foodType === "nonveg" ? "Non-Veg" : "Veg"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                  {mealCategoryLabelMap[
                    meal.mealCategory || "all_day"
                  ]}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    meal.isAvailable === false
                      ? "bg-slate-100 text-slate-500"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {meal.isAvailable === false
                    ? "Unavailable"
                    : "Available"}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950">
                {meal.title}
              </h3>

              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                {meal.description || "No meal description added."}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Price
              </p>

              <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-slate-950">
                ₹{meal.price}
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MealMetric label="Calories" value={`${meal.calories} kcal`} />
            <MealMetric label="Protein" value={`${meal.protein}g`} />
            <MealMetric label="Carbs" value={`${meal.carbs}g`} />
            <MealMetric label="Fat" value={`${meal.fat}g`} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(meal.goalTypes || []).length > 0 ? (
              meal.goalTypes?.map((goal) => (
                <span
                  key={goal}
                  className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700"
                >
                  {goalLabelMap[goal]}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-[11px] font-black text-yellow-700">
                No goal tags
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Edit3 size={15} />
              Edit
            </button>

            <button
              type="button"
              onClick={() =>
                setShowDescription((current) => !current)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {showDescription ? <EyeOff size={15} /> : <Eye size={15} />}
              {showDescription ? "Hide Details" : "View Details"}
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 text-sm font-black text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>

          {showDescription && (
            <div className="mt-4 border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Full description
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {meal.description || "No description added."}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ================= OFFER CARD ================= */

function OfferCard({
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
    <article className="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:border-green-200">
      <div className="relative h-40 bg-gradient-to-br from-green-50 via-white to-slate-50">
        {offer.imageUrl ? (
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BadgePercent size={38} className="text-green-200" />
          </div>
        )}

        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-black ${
            offer.isActive === false
              ? "bg-slate-100 text-slate-600"
              : "bg-green-600 text-white"
          }`}
        >
          {offer.isActive === false ? "Inactive" : "Active"}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-orange-700">
              {offer.badge || "Launch Offer"}
            </span>

            <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">
              {offer.title}
            </h3>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            #{offer.sortOrder || 0}
          </span>
        </div>

        <p className="mt-3 min-h-[44px] text-sm font-semibold leading-6 text-slate-500">
          {offer.subtitle || "No subtitle added."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <OfferDetail label="Coupon" value={offer.code || "None"} />
          <OfferDetail label="Link" value={offer.linkTo || "/meals"} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            <Edit3 size={14} />
            Edit
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 items-center justify-center rounded-full border border-green-200 text-xs font-black text-green-700 hover:bg-green-50"
          >
            {offer.isActive === false ? "Activate" : "Pause"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-red-200 text-xs font-black text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================= SHARED COMPONENTS ================= */

function Drawer({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside
        className={`absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none ${
          wide ? "sm:w-[620px]" : "sm:w-[470px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex gap-3 border-b border-slate-200 bg-slate-50 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
          {number}
        </span>

        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-4 shadow-sm ${
        accent
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            accent
              ? "bg-green-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>

        <p className="text-2xl font-black tracking-[-0.05em]">{value}</p>
      </div>

      <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${
        active
          ? "bg-green-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function MealMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function OfferDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        {icon}
      </span>

      <h3 className="mt-4 text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm font-bold text-slate-500">{text}</p>
    </div>
  );
}