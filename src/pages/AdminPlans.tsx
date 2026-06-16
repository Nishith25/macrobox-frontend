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
  trialPrice?: number | null;
  originalPrice?: number | null;
  imageUrl?: string;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
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
  { key: "both", label: "Veg + Non-Veg" },
  { key: "veg", label: "Veg Only" },
  { key: "nonveg", label: "Non-Veg Only" },
];

const mealModeLabelMap: Record<MealMode, string> = {
  both: "Veg + Non-Veg",
  veg: "Veg Only",
  nonveg: "Non-Veg Only",
};

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

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-green-50 md:w-32">
          {plan.imageUrl ? (
            <img
              src={plan.imageUrl}
              alt={plan.title}
              className="h-full w-full rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="text-3xl font-black text-green-200">MB</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {plan.title}
              </h3>

              <p className="mt-1 text-xs font-bold text-gray-400">
                Plan ID: {planId}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {goalLabelMap[plan.goal]}
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {mealModeLabelMap[plan.mealMode || "both"]}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  plan.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-600">
            {plan.subtitle || "No subtitle"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {plan.durationDays} days · ₹{plan.price}
            {plan.originalPrice ? ` · MRP ₹${plan.originalPrice}` : ""}
            {plan.trialPrice ? ` · Trial ₹${plan.trialPrice}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {plan.badge && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {plan.badge}
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Sort: {plan.sortOrder || 0}
            </span>

            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              Perks: {plan.perks?.length || 0}
            </span>

            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              Rewards: {plan.rewards?.length || 0}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                plan.rewardEligible !== false
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {plan.rewardEligible !== false
                ? "10% Next-Plan Reward"
                : "No Reward"}
            </span>
          </div>

          {plan.description && (
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="mt-3 text-sm font-semibold text-green-700 underline"
            >
              {showMore ? "Hide Details" : "View Details"}
            </button>
          )}

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
              className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showMore && (
        <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {plan.description && <p>{plan.description}</p>}

          {plan.perks && plan.perks.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Perks:</p>
              <ul className="list-inside list-disc">
                {plan.perks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.rewards && plan.rewards.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Rewards:</p>
              <ul className="list-inside list-disc">
                {plan.rewards.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.meals && plan.meals.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Suggested Meals:</p>
              <ul className="list-inside list-disc">
                {plan.meals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    planId: "",
    subtitle: "",
    description: "",
    goal: "fat_loss" as PlanGoal,
    mealMode: "both" as MealMode,
    badge: "",
    durationDays: "7",
    price: "",
    trialPrice: "",
    originalPrice: "",
    imageUrl: "",
    perksText: "",
    rewardsText: DEFAULT_PLAN_REWARD,
    mealsText: "",
    rewardEligible: true,
    isActive: true,
    sortOrder: "0",
  });

  const fetchPlans = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/plans");
      setPlans(res.data || []);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const resetForm = () => {
    setEditingId(null);

    setForm({
      title: "",
      planId: "",
      subtitle: "",
      description: "",
      goal: "fat_loss",
      mealMode: "both",
      badge: "",
      durationDays: "7",
      price: "",
      trialPrice: "",
      originalPrice: "",
      imageUrl: "",
      perksText: "",
      rewardsText: DEFAULT_PLAN_REWARD,
      mealsText: "",
      rewardEligible: true,
      isActive: true,
      sortOrder: "0",
    });
  };

  const updateTitle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      planId: editingId ? prev.planId : slugify(value),
    }));
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

    if (!form.price) {
      toast.error("Plan price is required");
      return;
    }

    const cleanPlanId = slugify(form.planId);

    const payload = {
      title: form.title.trim(),
      planId: cleanPlanId,
      challengeId: cleanPlanId,
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      goal: form.goal,
      mealMode: form.mealMode,
      badge: form.badge.trim(),
      durationDays: Number(form.durationDays || 7),
      price: Number(form.price || 0),
      trialPrice: form.trialPrice ? Number(form.trialPrice) : null,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      imageUrl: form.imageUrl.trim(),
      perks: textToArray(form.perksText),
      rewards:
        textToArray(form.rewardsText).length > 0
          ? textToArray(form.rewardsText)
          : [DEFAULT_PLAN_REWARD],
      meals: textToArray(form.mealsText),
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
    setEditingId(plan._id);

    setForm({
      title: plan.title,
      planId: getPlanId(plan),
      subtitle: plan.subtitle || "",
      description: plan.description || "",
      goal: plan.goal,
      mealMode: plan.mealMode || "both",
      badge: plan.badge || "",
      durationDays: String(plan.durationDays || 7),
      price: String(plan.price || ""),
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
      mealsText: arrayToText(plan.meals),
      rewardEligible: plan.rewardEligible !== false,
      isActive: plan.isActive !== false,
      sortOrder: String(plan.sortOrder || 0),
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
    const trial = plans.filter((item) => item.trialPrice).length;
    const rewardEligible = plans.filter(
      (item) => item.rewardEligible !== false
    ).length;
    const avgPrice =
      plans.length > 0
        ? Math.round(
            plans.reduce((sum, item) => sum + Number(item.price || 0), 0) /
              plans.length
          )
        : 0;

    return {
      total: plans.length,
      active,
      inactive,
      trial,
      rewardEligible,
      avgPrice,
    };
  }, [plans]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Plans</h1>

        <p className="mt-1 text-sm text-gray-500">
          Create and manage MacroBox meal plans, pricing, perks, rewards and
          suggested meals.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-6">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Plans</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="rounded-2xl border bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-700">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.active}
          </p>
        </div>

        <div className="rounded-2xl border bg-gray-50 p-4 shadow-sm">
          <p className="text-sm text-gray-700">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-gray-700">
            {stats.inactive}
          </p>
        </div>

        <div className="rounded-2xl border bg-orange-50 p-4 shadow-sm">
          <p className="text-sm text-orange-700">Trial Offers</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">
            {stats.trial}
          </p>
        </div>

        <div className="rounded-2xl border bg-purple-50 p-4 shadow-sm">
          <p className="text-sm text-purple-700">Reward Plans</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">
            {stats.rewardEligible}
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-700">Avg Price</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            ₹{stats.avgPrice}
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Update plan" : "Create a new plan"}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            placeholder="Plan title"
            value={form.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <input
            placeholder="Plan ID"
            value={form.planId}
            onChange={(e) =>
              setForm({ ...form, planId: slugify(e.target.value) })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Subtitle"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <select
            value={form.goal}
            onChange={(e) =>
              setForm({ ...form, goal: e.target.value as PlanGoal })
            }
            className="rounded-lg border px-3 py-2"
          >
            {goalOptions.map((goal) => (
              <option key={goal.key} value={goal.key}>
                {goal.label}
              </option>
            ))}
          </select>

          <select
            value={form.mealMode}
            onChange={(e) =>
              setForm({ ...form, mealMode: e.target.value as MealMode })
            }
            className="rounded-lg border px-3 py-2"
          >
            {mealModeOptions.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.label}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Plan description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            className="rounded-lg border px-3 py-2 md:col-span-3"
          />

          <input
            placeholder="Badge"
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Duration days"
            type="number"
            value={form.durationDays}
            onChange={(e) =>
              setForm({ ...form, durationDays: e.target.value })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Price ₹"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Trial price ₹"
            type="number"
            value={form.trialPrice}
            onChange={(e) => setForm({ ...form, trialPrice: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Original price ₹"
            type="number"
            value={form.originalPrice}
            onChange={(e) =>
              setForm({ ...form, originalPrice: e.target.value })
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Image URL"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <select
            value={form.isActive ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.value === "true" })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            value={form.rewardEligible ? "true" : "false"}
            onChange={(e) =>
              setForm({
                ...form,
                rewardEligible: e.target.value === "true",
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="true">Reward Eligible</option>
            <option value="false">No Reward</option>
          </select>

          <textarea
            placeholder="Perks - one per line"
            value={form.perksText}
            onChange={(e) => setForm({ ...form, perksText: e.target.value })}
            rows={5}
            className="rounded-lg border px-3 py-2"
          />

          <textarea
            placeholder="Rewards - one per line"
            value={form.rewardsText}
            onChange={(e) => setForm({ ...form, rewardsText: e.target.value })}
            rows={5}
            className="rounded-lg border px-3 py-2"
          />

          <textarea
            placeholder="Suggested meals - one per line"
            value={form.mealsText}
            onChange={(e) => setForm({ ...form, mealsText: e.target.value })}
            rows={5}
            className="rounded-lg border px-3 py-2"
          />
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
            onClick={savePlan}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add plan"}
          </button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">
        Plans {loading ? "(loading...)" : `(${plans.length})`}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanRow
            key={plan._id}
            plan={plan}
            onEdit={() => handleEdit(plan)}
            onToggle={() => handleToggle(plan)}
            onDelete={() => handleDelete(plan)}
          />
        ))}
      </div>
    </div>
  );
}