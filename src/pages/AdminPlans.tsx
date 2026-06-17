// frontend/src/pages/AdminPlans.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type PlanGoal =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating"
  | "student_power"
  | "couple"
  | "office_fit";

type MealMode = "veg" | "nonveg" | "both";
type MealSetKey = "veg" | "nonveg" | "mixed";

type MealOption = {
  _id: string;
  title: string;
  imageUrl?: string;
  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  foodType?: "veg" | "nonveg";
};

type PlanMealDay = {
  day: number;
  title?: string;
  meal?: string | MealOption | null;
  isActive?: boolean;
};

type PlanMealSets = {
  veg: PlanMealDay[];
  nonveg: PlanMealDay[];
  mixed: PlanMealDay[];
};

type PlanPrices = {
  veg?: number;
  nonveg?: number;
  mixed?: number;
};

type Plan = {
  _id: string;
  planId?: string;
  challengeId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: PlanGoal;
  mealMode?: MealMode;
  badge?: string;
  durationDays: number;
  price: number;
  prices?: PlanPrices;
  trialPrice?: number | null;
  originalPrice?: number | null;
  imageUrl?: string;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  mealSets?: PlanMealSets;
  rewardEligible?: boolean;
  isActive: boolean;
  sortOrder?: number;
};

const goalOptions: { key: PlanGoal; label: string }[] = [
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "weight_gain", label: "Weight Gain" },
  { key: "clean_eating", label: "Clean Eating" },
  { key: "student_power", label: "Student Power" },
  { key: "couple", label: "Couple Plan" },
  { key: "office_fit", label: "Office Fit" },
];

const goalLabelMap: Record<PlanGoal, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
  student_power: "Student Power",
  couple: "Couple Plan",
  office_fit: "Office Fit",
};

const mealModeOptions: { key: MealMode; label: string }[] = [
  { key: "both", label: "Veg + Non-Veg + Mixed" },
  { key: "veg", label: "Veg Only" },
  { key: "nonveg", label: "Non-Veg Only" },
];

const mealModeLabelMap: Record<MealMode, string> = {
  both: "Veg + Non-Veg + Mixed",
  veg: "Veg Only",
  nonveg: "Non-Veg Only",
};

const mealSetTabs: { key: MealSetKey; label: string; short: string; hint: string }[] = [
  {
    key: "veg",
    label: "Veg Plan Meals",
    short: "Veg",
    hint: "Meals shown when customer selects Veg plan.",
  },
  {
    key: "nonveg",
    label: "Non-Veg Plan Meals",
    short: "Non-Veg",
    hint: "Meals shown when customer selects Non-Veg plan.",
  },
  {
    key: "mixed",
    label: "Mixed Plan Meals",
    short: "Mixed",
    hint: "Meals shown when customer selects Mixed plan.",
  },
];

const DEFAULT_PLAN_REWARD =
  "Buy this 7-day MacroBox plan and get 10% OFF your next eligible plan.";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/₹/g, "rs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const arrayToText = (items?: string[]) => (items || []).join("\n");

const textToArray = (text: string) =>
  text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getPlanId = (plan: Plan) => plan.planId || plan.challengeId || "";

const getMealId = (meal?: string | MealOption | null) => {
  if (!meal) return "";
  if (typeof meal === "string") return meal;
  return meal._id || "";
};

const getMealTitle = (meal?: string | MealOption | null) => {
  if (!meal) return "";
  if (typeof meal === "string") return "";
  return meal.title || "";
};

const getBasePlanPrice = (prices: PlanPrices = {}, fallback = 0) => {
  return Number(prices.mixed || prices.nonveg || prices.veg || fallback || 0);
};

const createMealSetDays = (durationDays: number): PlanMealDay[] =>
  Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    title: `Day ${index + 1}`,
    meal: null,
    isActive: true,
  }));

const normalizeMealSetDays = (
  days: PlanMealDay[] | undefined,
  durationDays: number
): PlanMealDay[] => {
  const existing = Array.isArray(days) ? days : [];

  return Array.from({ length: durationDays }, (_, index) => {
    const current = existing[index];

    return {
      day: index + 1,
      title: current?.title || `Day ${index + 1}`,
      meal: current?.meal || null,
      isActive: current?.isActive !== false,
    };
  });
};

const createEmptyMealSets = (durationDays: number): PlanMealSets => ({
  veg: createMealSetDays(durationDays),
  nonveg: createMealSetDays(durationDays),
  mixed: createMealSetDays(durationDays),
});

const normalizeMealSets = (
  mealSets: PlanMealSets | undefined,
  durationDays: number
): PlanMealSets => ({
  veg: normalizeMealSetDays(mealSets?.veg, durationDays),
  nonveg: normalizeMealSetDays(mealSets?.nonveg, durationDays),
  mixed: normalizeMealSetDays(mealSets?.mixed, durationDays),
});

const countSelectedMeals = (mealSets?: PlanMealSets) => {
  if (!mealSets) return 0;

  return ["veg", "nonveg", "mixed"].reduce((total, key) => {
    const set = mealSets[key as MealSetKey] || [];
    return total + set.filter((item) => getMealId(item.meal)).length;
  }, 0);
};

const countSelectedMealsInSet = (mealSets: PlanMealSets | undefined, key: MealSetKey) => {
  if (!mealSets) return 0;
  return (mealSets[key] || []).filter((item) => getMealId(item.meal)).length;
};

function PlanRow({
  plan,
  onEdit,
  onDelete,
  onToggle,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const planId = getPlanId(plan);
  const selectedMealsCount = countSelectedMeals(plan.mealSets);
  const prices = {
    veg: Number(plan.prices?.veg || plan.price || 0),
    nonveg: Number(plan.prices?.nonveg || plan.price || 0),
    mixed: Number(plan.prices?.mixed || plan.price || 0),
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-white lg:w-36">
            {plan.imageUrl ? (
              <img
                src={plan.imageUrl}
                alt={plan.title}
                className="h-full w-full rounded-2xl object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="text-3xl font-black text-green-200">MB</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                    {plan.title}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      plan.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  Plan ID: {planId || "N/A"}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {plan.subtitle || "No subtitle added"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  {goalLabelMap[plan.goal]}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {mealModeLabelMap[plan.mealMode || "both"]}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <PriceBadge label="Veg" price={prices.veg} />
              <PriceBadge label="Non-Veg" price={prices.nonveg} />
              <PriceBadge label="Mixed" price={prices.mixed} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <MiniBadge>Duration: {plan.durationDays} days</MiniBadge>
              <MiniBadge>Sort: {plan.sortOrder || 0}</MiniBadge>
              <MiniBadge>Selected Meals: {selectedMealsCount}</MiniBadge>
              <MiniBadge>Perks: {plan.perks?.length || 0}</MiniBadge>
              <MiniBadge>Rewards: {plan.rewards?.length || 0}</MiniBadge>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  plan.rewardEligible !== false
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {plan.rewardEligible !== false ? "Reward Eligible" : "No Reward"}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={onToggle}
                className={`rounded-xl border px-4 py-2 text-sm font-black ${
                  plan.isActive
                    ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    : "border-green-300 text-green-700 hover:bg-green-50"
                }`}
              >
                {plan.isActive ? "Deactivate" : "Activate"}
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50"
              >
                Delete
              </button>

              <button
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
                className="rounded-xl border border-green-200 px-4 py-2 text-sm font-black text-green-700 hover:bg-green-50"
              >
                {showMore ? "Hide Details" : "View Details"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMore && (
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <p className="font-black text-slate-950">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {plan.description || "No description added."}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <p className="font-black text-slate-950">Plan Benefits</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextList title="Perks" items={plan.perks || []} />
                <TextList title="Rewards" items={plan.rewards || []} />
              </div>
            </div>
          </div>

          {plan.mealSets && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {mealSetTabs.map((tab) => (
                <div key={tab.key} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{tab.short}</p>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      {countSelectedMealsInSet(plan.mealSets, tab.key)}/
                      {plan.durationDays}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
                    {(plan.mealSets?.[tab.key] || []).map((item) => (
                      <li key={`${tab.key}-${item.day}`}>
                        Day {item.day}: {getMealTitle(item.meal) || "No meal selected"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMealSetTab, setActiveMealSetTab] =
    useState<MealSetKey>("mixed");

  const [form, setForm] = useState({
    title: "",
    planId: "",
    subtitle: "",
    description: "",
    goal: "fat_loss" as PlanGoal,
    mealMode: "both" as MealMode,
    badge: "",
    durationDays: "7",
    vegPrice: "",
    nonVegPrice: "",
    mixedPrice: "",
    trialPrice: "",
    originalPrice: "",
    imageUrl: "",
    perksText: "",
    rewardsText: DEFAULT_PLAN_REWARD,
    rewardEligible: true,
    isActive: true,
    sortOrder: "0",
    mealSets: createEmptyMealSets(7),
  });

  const fetchPlans = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/plans");
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchMealOptions = async () => {
    setLoadingMeals(true);

    try {
      const res = await api.get("/admin/plans/meal-options");
      setMealOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load meal options");
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchMealOptions();
  }, []);

  const mealOptionsByTab = useMemo(() => {
    if (activeMealSetTab === "veg") {
      return mealOptions.filter((meal) => meal.foodType === "veg");
    }

    if (activeMealSetTab === "nonveg") {
      return mealOptions.filter((meal) => meal.foodType === "nonveg");
    }

    return mealOptions;
  }, [mealOptions, activeMealSetTab]);

  const resetForm = () => {
    setEditingId(null);
    setActiveMealSetTab("mixed");

    setForm({
      title: "",
      planId: "",
      subtitle: "",
      description: "",
      goal: "fat_loss",
      mealMode: "both",
      badge: "",
      durationDays: "7",
      vegPrice: "",
      nonVegPrice: "",
      mixedPrice: "",
      trialPrice: "",
      originalPrice: "",
      imageUrl: "",
      perksText: "",
      rewardsText: DEFAULT_PLAN_REWARD,
      rewardEligible: true,
      isActive: true,
      sortOrder: "0",
      mealSets: createEmptyMealSets(7),
    });
  };

  const updateTitle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      planId: editingId ? prev.planId : slugify(value),
    }));
  };

  const updateDurationDays = (value: string) => {
    const nextDuration = Math.max(1, Number(value || 7));

    setForm((prev) => ({
      ...prev,
      durationDays: value,
      mealSets: normalizeMealSets(prev.mealSets, nextDuration),
    }));
  };

  const updateMealForDay = (
    setKey: MealSetKey,
    dayIndex: number,
    mealId: string
  ) => {
    setForm((prev) => {
      const durationDays = Math.max(1, Number(prev.durationDays || 7));
      const normalizedSets = normalizeMealSets(prev.mealSets, durationDays);

      normalizedSets[setKey] = normalizedSets[setKey].map((item, index) =>
        index === dayIndex
          ? {
              ...item,
              meal: mealId || null,
            }
          : item
      );

      return {
        ...prev,
        mealSets: normalizedSets,
      };
    });
  };

  const copyMealSet = (from: MealSetKey, to: MealSetKey) => {
    setForm((prev) => {
      const durationDays = Math.max(1, Number(prev.durationDays || 7));
      const normalizedSets = normalizeMealSets(prev.mealSets, durationDays);

      return {
        ...prev,
        mealSets: {
          ...normalizedSets,
          [to]: normalizedSets[from].map((item) => ({ ...item })),
        },
      };
    });

    toast.success(`Copied ${from} meals to ${to}`);
  };

  const validatePrices = () => {
    const vegPrice = Number(form.vegPrice || 0);
    const nonVegPrice = Number(form.nonVegPrice || 0);
    const mixedPrice = Number(form.mixedPrice || 0);

    if (form.mealMode === "veg" && vegPrice <= 0) {
      toast.error("Veg price is required");
      return false;
    }

    if (form.mealMode === "nonveg" && nonVegPrice <= 0) {
      toast.error("Non-Veg price is required");
      return false;
    }

    if (form.mealMode === "both") {
      if (vegPrice <= 0) {
        toast.error("Veg price is required");
        return false;
      }

      if (nonVegPrice <= 0) {
        toast.error("Non-Veg price is required");
        return false;
      }

      if (mixedPrice <= 0) {
        toast.error("Mixed price is required");
        return false;
      }
    }

    return true;
  };

  const validateMealSets = () => {
    const durationDays = Math.max(1, Number(form.durationDays || 7));
    const sets = normalizeMealSets(form.mealSets, durationDays);

    const requiredTabs: MealSetKey[] =
      form.mealMode === "veg"
        ? ["veg"]
        : form.mealMode === "nonveg"
        ? ["nonveg"]
        : ["veg", "nonveg", "mixed"];

    for (const key of requiredTabs) {
      const missingDay = sets[key].find((item) => !getMealId(item.meal));

      if (missingDay) {
        toast.error(
          `Select ${mealSetTabs.find((tab) => tab.key === key)?.label} for Day ${
            missingDay.day
          }`
        );
        setActiveMealSetTab(key);
        return false;
      }
    }

    return true;
  };

  const savePlan = async () => {
    if (!form.title.trim()) {
      toast.error("Plan title is required");
      return;
    }

    if (!form.planId.trim()) {
      toast.error("Plan ID is required");
      return;
    }

    if (!validatePrices()) {
      return;
    }

    if (!validateMealSets()) {
      return;
    }

    const cleanPlanId = slugify(form.planId);
    const durationDays = Math.max(1, Number(form.durationDays || 7));
    const normalizedMealSets = normalizeMealSets(form.mealSets, durationDays);

    const prices = {
      veg: Number(form.vegPrice || 0),
      nonveg: Number(form.nonVegPrice || 0),
      mixed: Number(form.mixedPrice || 0),
    };

    const basePrice = getBasePlanPrice(prices);

    const payload = {
      title: form.title.trim(),
      planId: cleanPlanId,
      challengeId: cleanPlanId,
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      goal: form.goal,
      mealMode: form.mealMode,
      badge: form.badge.trim(),
      durationDays,
      price: basePrice,
      prices,
      trialPrice: form.trialPrice ? Number(form.trialPrice) : null,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      imageUrl: form.imageUrl.trim(),
      perks: textToArray(form.perksText),
      rewards:
        textToArray(form.rewardsText).length > 0
          ? textToArray(form.rewardsText)
          : [DEFAULT_PLAN_REWARD],
      mealSets: {
        veg: normalizedMealSets.veg.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
        nonveg: normalizedMealSets.nonveg.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
        mixed: normalizedMealSets.mixed.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
      },
      meals: [],
      rewardEligible: form.rewardEligible,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSaving(true);

      if (editingId) {
        const res = await api.put(`/admin/plans/${editingId}`, payload);

        setPlans((prev) =>
          prev.map((item) => (item._id === editingId ? res.data : item))
        );

        toast.success("Plan updated");
      } else {
        const res = await api.post("/admin/plans", payload);

        setPlans((prev) => [res.data, ...prev]);

        toast.success("Plan added");
      }

      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    const durationDays = Math.max(1, Number(plan.durationDays || 7));

    setEditingId(plan._id);
    setActiveMealSetTab("mixed");

    setForm({
      title: plan.title,
      planId: getPlanId(plan),
      subtitle: plan.subtitle || "",
      description: plan.description || "",
      goal: plan.goal,
      mealMode: plan.mealMode || "both",
      badge: plan.badge || "",
      durationDays: String(durationDays),
      vegPrice: String(plan.prices?.veg || plan.price || ""),
      nonVegPrice: String(plan.prices?.nonveg || plan.price || ""),
      mixedPrice: String(plan.prices?.mixed || plan.price || ""),
      trialPrice:
        plan.trialPrice === null || plan.trialPrice === undefined
          ? ""
          : String(plan.trialPrice),
      originalPrice:
        plan.originalPrice === null || plan.originalPrice === undefined
          ? ""
          : String(plan.originalPrice),
      imageUrl: plan.imageUrl || "",
      perksText: arrayToText(plan.perks),
      rewardsText: arrayToText(plan.rewards) || DEFAULT_PLAN_REWARD,
      rewardEligible: plan.rewardEligible !== false,
      isActive: plan.isActive !== false,
      sortOrder: String(plan.sortOrder || 0),
      mealSets: normalizeMealSets(plan.mealSets, durationDays),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = async (plan: Plan) => {
    try {
      const res = await api.patch(`/admin/plans/${plan._id}/toggle`);

      setPlans((prev) =>
        prev.map((item) => (item._id === plan._id ? res.data : item))
      );

      toast.success(res.data.isActive ? "Plan activated" : "Plan deactivated");
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`Delete "${plan.title}"?`)) return;

    try {
      await api.delete(`/admin/plans/${plan._id}`);

      setPlans((prev) => prev.filter((item) => item._id !== plan._id));

      toast.success("Plan deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const stats = useMemo(() => {
    const active = plans.filter((item) => item.isActive).length;
    const inactive = plans.filter((item) => !item.isActive).length;
    const rewardEligible = plans.filter(
      (item) => item.rewardEligible !== false
    ).length;

    const avgPrice =
      plans.length > 0
        ? Math.round(
            plans.reduce(
              (sum, item) =>
                sum +
                getBasePlanPrice(
                  {
                    veg: item.prices?.veg,
                    nonveg: item.prices?.nonveg,
                    mixed: item.prices?.mixed,
                  },
                  item.price
                ),
              0
            ) / plans.length
          )
        : 0;

    return {
      total: plans.length,
      active,
      inactive,
      rewardEligible,
      avgPrice,
    };
  }, [plans]);

  const activeMealSetDays = form.mealSets[activeMealSetTab] || [];

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-600">
                Admin Panel
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                Manage Meal Plans
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Create MacroBox plans with separate Veg, Non-Veg, and Mixed
                prices. Assign actual meals day-wise for each version.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchPlans();
                fetchMealOptions();
              }}
              className="inline-flex h-11 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <StatCard label="Total Plans" value={stats.total} />
          <StatCard label="Active" value={stats.active} tone="green" />
          <StatCard label="Inactive" value={stats.inactive} />
          <StatCard label="Reward Plans" value={stats.rewardEligible} tone="green" />
          <StatCard label="Avg Price" value={`₹${stats.avgPrice}`} />
        </div>

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {editingId ? "Update Plan" : "Create New Plan"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Fill basic details, prices, and day-wise meals.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancel Editing
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <SectionTitle number="1" title="Basic Plan Details" />

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Plan Title" className="md:col-span-2">
                <input
                  placeholder="Example: 7-Day Lean Box"
                  value={form.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Plan ID">
                <input
                  placeholder="lean-box"
                  value={form.planId}
                  onChange={(e) =>
                    setForm({ ...form, planId: slugify(e.target.value) })
                  }
                  className="input"
                />
              </Field>

              <Field label="Subtitle" className="md:col-span-2">
                <input
                  placeholder="Example: Fat loss plan"
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm({ ...form, subtitle: e.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Goal">
                <select
                  value={form.goal}
                  onChange={(e) =>
                    setForm({ ...form, goal: e.target.value as PlanGoal })
                  }
                  className="input"
                >
                  {goalOptions.map((goal) => (
                    <option key={goal.key} value={goal.key}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Available Plan Types">
                <select
                  value={form.mealMode}
                  onChange={(e) =>
                    setForm({ ...form, mealMode: e.target.value as MealMode })
                  }
                  className="input"
                >
                  {mealModeOptions.map((mode) => (
                    <option key={mode.key} value={mode.key}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Badge">
                <input
                  placeholder="Example: Best Seller"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Duration Days">
                <input
                  placeholder="7"
                  type="number"
                  min={1}
                  value={form.durationDays}
                  onChange={(e) => updateDurationDays(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Sort Order">
                <input
                  placeholder="0"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Description" className="md:col-span-3">
                <textarea
                  placeholder="Explain what this plan is for..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="input min-h-[96px]"
                />
              </Field>
            </div>

            <div className="mt-8">
              <SectionTitle number="2" title="Plan Prices" />

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Veg Price ₹">
                  <input
                    placeholder="Example: 1199"
                    type="number"
                    value={form.vegPrice}
                    onChange={(e) =>
                      setForm({ ...form, vegPrice: e.target.value })
                    }
                    className="input"
                  />
                </Field>

                <Field label="Non-Veg Price ₹">
                  <input
                    placeholder="Example: 1399"
                    type="number"
                    value={form.nonVegPrice}
                    onChange={(e) =>
                      setForm({ ...form, nonVegPrice: e.target.value })
                    }
                    className="input"
                  />
                </Field>

                <Field label="Mixed Price ₹">
                  <input
                    placeholder="Example: 1299"
                    type="number"
                    value={form.mixedPrice}
                    onChange={(e) =>
                      setForm({ ...form, mixedPrice: e.target.value })
                    }
                    className="input"
                  />
                </Field>

                <Field label="Original Price ₹">
                  <input
                    placeholder="Optional MRP"
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) =>
                      setForm({ ...form, originalPrice: e.target.value })
                    }
                    className="input"
                  />
                </Field>

                <Field label="Trial Price ₹">
                  <input
                    placeholder="Optional trial price"
                    type="number"
                    value={form.trialPrice}
                    onChange={(e) =>
                      setForm({ ...form, trialPrice: e.target.value })
                    }
                    className="input"
                  />
                </Field>

                <Field label="Image URL">
                  <input
                    placeholder="Optional image URL"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-8">
              <SectionTitle number="3" title="Settings and Benefits" />

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Plan Status">
                  <select
                    value={form.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.value === "true" })
                    }
                    className="input"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>

                <Field label="Reward Eligibility">
                  <select
                    value={form.rewardEligible ? "true" : "false"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rewardEligible: e.target.value === "true",
                      })
                    }
                    className="input"
                  >
                    <option value="true">Reward Eligible</option>
                    <option value="false">No Reward</option>
                  </select>
                </Field>

                <div className="hidden md:block" />

                <Field label="Perks - one per line">
                  <textarea
                    placeholder="Example: High protein meals"
                    value={form.perksText}
                    onChange={(e) =>
                      setForm({ ...form, perksText: e.target.value })
                    }
                    rows={5}
                    className="input min-h-[130px]"
                  />
                </Field>

                <Field label="Rewards - one per line" className="md:col-span-2">
                  <textarea
                    placeholder="Reward text"
                    value={form.rewardsText}
                    onChange={(e) =>
                      setForm({ ...form, rewardsText: e.target.value })
                    }
                    rows={5}
                    className="input min-h-[130px]"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-green-100 bg-green-50/40 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <SectionTitle number="4" title="Meals Included in This Plan" />

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Select actual meals from your Meals collection for each day.
                  </p>
                </div>

                <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
                  {loadingMeals
                    ? "Loading meals..."
                    : `${mealOptions.length} meals available`}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {mealSetTabs.map((tab) => {
                  const selectedCount = countSelectedMealsInSet(
                    form.mealSets,
                    tab.key
                  );

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveMealSetTab(tab.key)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        activeMealSetTab === tab.key
                          ? "border-green-600 bg-green-600 text-white shadow-[0_10px_22px_rgba(22,163,74,0.18)]"
                          : "border-green-100 bg-white text-green-800 hover:bg-green-50"
                      }`}
                    >
                      <p className="text-sm font-black">{tab.short}</p>
                      <p className="mt-1 text-xs font-bold opacity-80">
                        {selectedCount}/{form.durationDays || 7} meals selected
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs font-bold text-slate-500">
                {mealSetTabs.find((tab) => tab.key === activeMealSetTab)?.hint}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeMealSetTab !== "veg" && (
                  <CopyButton onClick={() => copyMealSet("veg", activeMealSetTab)}>
                    Copy Veg meals here
                  </CopyButton>
                )}

                {activeMealSetTab !== "nonveg" && (
                  <CopyButton
                    onClick={() => copyMealSet("nonveg", activeMealSetTab)}
                  >
                    Copy Non-Veg meals here
                  </CopyButton>
                )}

                {activeMealSetTab !== "mixed" && (
                  <CopyButton
                    onClick={() => copyMealSet("mixed", activeMealSetTab)}
                  >
                    Copy Mixed meals here
                  </CopyButton>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {activeMealSetDays.map((item, index) => {
                  const selectedMealId = getMealId(item.meal);
                  const selectedMeal = mealOptions.find(
                    (meal) => meal._id === selectedMealId
                  );

                  return (
                    <div
                      key={`${activeMealSetTab}-${item.day}`}
                      className="rounded-2xl border bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-900">
                            Day {item.day}
                          </p>

                          <p className="text-xs font-bold text-slate-400">
                            Choose meal for this day
                          </p>
                        </div>

                        {selectedMeal?.foodType && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              selectedMeal.foodType === "veg"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {selectedMeal.foodType === "veg" ? "Veg" : "Non-Veg"}
                          </span>
                        )}
                      </div>

                      <select
                        value={selectedMealId}
                        onChange={(e) =>
                          updateMealForDay(
                            activeMealSetTab,
                            index,
                            e.target.value
                          )
                        }
                        className="h-12 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                      >
                        <option value="">Select meal</option>

                        {mealOptionsByTab.map((meal) => (
                          <option key={meal._id} value={meal._id}>
                            {meal.title} · ₹{meal.price || 0} ·{" "}
                            {meal.foodType === "veg" ? "Veg" : "Non-Veg"}
                          </option>
                        ))}
                      </select>

                      {selectedMeal && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-sm font-black text-slate-900">
                            {selectedMeal.title}
                          </p>

                          <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-black text-slate-600">
                            <span>₹{selectedMeal.price || 0}</span>
                            <span>{selectedMeal.protein || 0}g P</span>
                            <span>{selectedMeal.calories || 0} Cal</span>
                            <span>{selectedMeal.carbs || 0}g C</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={savePlan}
                disabled={saving}
                className="rounded-xl bg-green-600 px-6 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(22,163,74,0.22)] transition hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Plan"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">
            Plans {loading ? "(loading...)" : `(${plans.length})`}
          </h2>
        </div>

        <div className="grid gap-4">
          {plans.length === 0 && !loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-950">No plans yet</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Create your first MacroBox meal plan above.
              </p>
            </div>
          ) : (
            plans.map((plan) => (
              <PlanRow
                key={plan._id}
                plan={plan}
                onEdit={() => handleEdit(plan)}
                onToggle={() => handleToggle(plan)}
                onDelete={() => handleDelete(plan)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
        {number}
      </span>
      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
        {title}
      </h3>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tone === "green"
          ? "border-green-100 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          tone === "green" ? "text-green-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black ${
          tone === "green" ? "text-green-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PriceBadge({ label, price }: { label: string; price: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">₹{price || 0}</p>
    </div>
  );
}

function MiniBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {children}
    </span>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-black text-slate-900">{title}</p>

      {items.length === 0 ? (
        <p className="mt-1 text-xs font-semibold text-slate-400">No items</p>
      ) : (
        <ul className="mt-1 list-inside list-disc text-xs font-semibold text-slate-600">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}