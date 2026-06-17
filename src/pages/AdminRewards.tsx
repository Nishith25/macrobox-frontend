// frontend/src/pages/AdminRewards.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type RewardType = "free_item" | "discount" | "free_meal" | "plan_box" | "challenge_box";

type RequiredAction =
  | "buy_7_day_plan"
  | "buy_plan"
  | "next_plan_reward"
  | "join_challenge"
  | "post_3_stories"
  | "complete_7_days"
  | "refer_2_friends";

type Reward = {
  _id: string;
  rewardId: string;
  title: string;
  description?: string;
  type: RewardType;
  valueText?: string;
  requiredAction: RequiredAction;
  couponCode?: string;
  isActive: boolean;
  sortOrder?: number;
};

const typeOptions: { key: RewardType; label: string }[] = [
  { key: "discount", label: "Discount" },
  { key: "plan_box", label: "Plan Box" },
  { key: "free_item", label: "Free Item" },
  { key: "free_meal", label: "Free Meal" },
];

const actionOptions: { key: RequiredAction; label: string }[] = [
  { key: "buy_7_day_plan", label: "Buy 7-Day Plan" },
  { key: "buy_plan", label: "Buy Plan" },
  { key: "next_plan_reward", label: "Next Plan Reward" },
];

const typeLabelMap: Record<RewardType, string> = {
  free_item: "Free Item",
  discount: "Discount",
  free_meal: "Free Meal",
  plan_box: "Plan Box",
  challenge_box: "Plan Box",
};

const actionLabelMap: Record<RequiredAction, string> = {
  buy_7_day_plan: "Buy 7-Day Plan",
  buy_plan: "Buy Plan",
  next_plan_reward: "Next Plan Reward",

  // Old compatibility labels
  join_challenge: "Buy Plan",
  post_3_stories: "Post 3 Stories",
  complete_7_days: "Buy 7-Day Plan",
  refer_2_friends: "Refer 2 Friends",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/₹/g, "rs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeRewardForUI = (reward: Reward): Reward => {
  return {
    ...reward,
    type: reward.type === "challenge_box" ? "plan_box" : reward.type,
    requiredAction:
      reward.requiredAction === "join_challenge" ||
      reward.requiredAction === "complete_7_days"
        ? "buy_7_day_plan"
        : reward.requiredAction,
  };
};

function RewardRow({
  reward,
  onEdit,
  onToggle,
  onDelete,
}: {
  reward: Reward;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const normalizedReward = normalizeRewardForUI(reward);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {normalizedReward.title}
          </h3>

          <p className="mt-1 text-xs font-bold text-gray-400">
            ID: {normalizedReward.rewardId}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              normalizedReward.isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {normalizedReward.isActive ? "Active" : "Inactive"}
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {typeLabelMap[normalizedReward.type]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {normalizedReward.description || "No description"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
          {normalizedReward.valueText || "Reward"}
        </span>

        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          {actionLabelMap[normalizedReward.requiredAction]}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          Coupon: {normalizedReward.couponCode || "-"}
        </span>

        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
          Sort: {normalizedReward.sortOrder || 0}
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
            normalizedReward.isActive
              ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              : "border-green-300 text-green-700 hover:bg-green-50"
          }`}
        >
          {normalizedReward.isActive ? "Deactivate" : "Activate"}
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
  );
}

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    rewardId: "",
    description: "",
    type: "discount" as RewardType,
    valueText: "10% OFF",
    requiredAction: "buy_7_day_plan" as RequiredAction,
    couponCode: "PLAN10",
    isActive: true,
    sortOrder: "1",
  });

  const fetchRewards = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/rewards");
      setRewards(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const resetForm = () => {
    setEditingId(null);

    setForm({
      title: "",
      rewardId: "",
      description: "",
      type: "discount",
      valueText: "10% OFF",
      requiredAction: "buy_7_day_plan",
      couponCode: "PLAN10",
      isActive: true,
      sortOrder: "1",
    });
  };

  const fillDefaultPlanReward = () => {
    setEditingId(null);

    setForm({
      title: "10% OFF Next Plan",
      rewardId: "next-plan-10",
      description:
        "Buy any eligible 7-day MacroBox plan and get 10% OFF your next eligible plan.",
      type: "discount",
      valueText: "10% OFF",
      requiredAction: "buy_7_day_plan",
      couponCode: "PLAN10",
      isActive: true,
      sortOrder: "1",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateTitle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      rewardId: editingId ? prev.rewardId : slugify(value),
    }));
  };

  const saveReward = async () => {
    if (!form.title.trim()) {
      toast.error("Reward title is required");
      return;
    }

    if (!form.rewardId.trim()) {
      toast.error("Reward ID is required");
      return;
    }

    if (!form.valueText.trim()) {
      toast.error("Reward value text is required");
      return;
    }

    const normalizedType =
      form.type === "challenge_box" ? "plan_box" : form.type;

    const normalizedAction =
      form.requiredAction === "join_challenge" ||
      form.requiredAction === "complete_7_days"
        ? "buy_7_day_plan"
        : form.requiredAction;

    const payload = {
      title: form.title.trim(),
      rewardId: slugify(form.rewardId),
      description: form.description.trim(),
      type: normalizedType,
      valueText: form.valueText.trim(),
      requiredAction: normalizedAction,
      couponCode: form.couponCode.trim().toUpperCase(),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSaving(true);

      if (editingId) {
        const res = await api.put(`/admin/rewards/${editingId}`, payload);

        setRewards((prev) =>
          prev.map((item) => (item._id === editingId ? res.data : item))
        );

        toast.success("Reward updated");
      } else {
        const res = await api.post("/admin/rewards", payload);

        setRewards((prev) => [res.data, ...prev]);

        toast.success("Reward added");
      }

      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (reward: Reward) => {
    const normalizedReward = normalizeRewardForUI(reward);

    setEditingId(reward._id);

    setForm({
      title: normalizedReward.title,
      rewardId: normalizedReward.rewardId,
      description: normalizedReward.description || "",
      type: normalizedReward.type,
      valueText: normalizedReward.valueText || "",
      requiredAction: normalizedReward.requiredAction,
      couponCode: normalizedReward.couponCode || "",
      isActive: normalizedReward.isActive !== false,
      sortOrder: String(normalizedReward.sortOrder || 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = async (reward: Reward) => {
    try {
      const res = await api.patch(`/admin/rewards/${reward._id}/toggle`);

      setRewards((prev) =>
        prev.map((item) => (item._id === reward._id ? res.data : item))
      );

      toast.success(res.data.isActive ? "Reward activated" : "Reward deactivated");
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (reward: Reward) => {
    if (!window.confirm(`Delete "${reward.title}"?`)) return;

    try {
      await api.delete(`/admin/rewards/${reward._id}`);

      setRewards((prev) => prev.filter((item) => item._id !== reward._id));

      toast.success("Reward deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const stats = useMemo(() => {
    const active = rewards.filter((item) => item.isActive).length;
    const inactive = rewards.filter((item) => !item.isActive).length;
    const discounts = rewards.filter((item) => item.type === "discount").length;
    const planRewards = rewards.filter((item) =>
      ["buy_7_day_plan", "buy_plan", "next_plan_reward"].includes(
        item.requiredAction
      )
    ).length;

    return {
      total: rewards.length,
      active,
      inactive,
      discounts,
      planRewards,
    };
  }, [rewards]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Plan Rewards
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage the 10% next-plan reward used on the MacroBox
            rewards page.
          </p>
        </div>

        <button
          type="button"
          onClick={fillDefaultPlanReward}
          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
        >
          Fill 10% Plan Reward
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Rewards</p>
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

        <div className="rounded-2xl border bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-700">Discounts</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {stats.discounts}
          </p>
        </div>

        <div className="rounded-2xl border bg-orange-50 p-4 shadow-sm">
          <p className="text-sm text-orange-700">Plan Rewards</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">
            {stats.planRewards}
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Update reward" : "Create a new plan reward"}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            placeholder="Reward title"
            value={form.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <input
            placeholder="Reward ID"
            value={form.rewardId}
            onChange={(e) =>
              setForm({ ...form, rewardId: slugify(e.target.value) })
            }
            className="rounded-lg border px-3 py-2"
          />

          <textarea
            placeholder="Reward description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="rounded-lg border px-3 py-2 md:col-span-3"
          />

          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as RewardType })
            }
            className="rounded-lg border px-3 py-2"
          >
            {typeOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={form.requiredAction}
            onChange={(e) =>
              setForm({
                ...form,
                requiredAction: e.target.value as RequiredAction,
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            {actionOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Value text e.g. 10% OFF"
            value={form.valueText}
            onChange={(e) => setForm({ ...form, valueText: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Coupon code e.g. PLAN10"
            value={form.couponCode}
            onChange={(e) =>
              setForm({ ...form, couponCode: e.target.value.toUpperCase() })
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
            onClick={saveReward}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Save changes"
              : "Add reward"}
          </button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">
        Rewards {loading ? "(loading...)" : `(${rewards.length})`}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {rewards.map((reward) => (
          <RewardRow
            key={reward._id}
            reward={reward}
            onEdit={() => handleEdit(reward)}
            onToggle={() => handleToggle(reward)}
            onDelete={() => handleDelete(reward)}
          />
        ))}
      </div>
    </div>
  );
}