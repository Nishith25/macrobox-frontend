// frontend/src/pages/AdminRewards.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type RewardType = "free_item" | "discount" | "free_meal" | "challenge_box";

type RequiredAction =
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
  { key: "free_item", label: "Free Item" },
  { key: "discount", label: "Discount" },
  { key: "free_meal", label: "Free Meal" },
  { key: "challenge_box", label: "Challenge Box" },
];

const actionOptions: { key: RequiredAction; label: string }[] = [
  { key: "join_challenge", label: "Join Challenge" },
  { key: "post_3_stories", label: "Post 3 Stories" },
  { key: "complete_7_days", label: "Complete 7 Days" },
  { key: "refer_2_friends", label: "Refer 2 Friends" },
];

const typeLabelMap: Record<RewardType, string> = {
  free_item: "Free Item",
  discount: "Discount",
  free_meal: "Free Meal",
  challenge_box: "Challenge Box",
};

const actionLabelMap: Record<RequiredAction, string> = {
  join_challenge: "Join Challenge",
  post_3_stories: "Post 3 Stories",
  complete_7_days: "Complete 7 Days",
  refer_2_friends: "Refer 2 Friends",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/₹/g, "rs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{reward.title}</h3>

          <p className="mt-1 text-xs font-bold text-gray-400">
            ID: {reward.rewardId}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              reward.isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {reward.isActive ? "Active" : "Inactive"}
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {typeLabelMap[reward.type]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {reward.description || "No description"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
          {reward.valueText || "Reward"}
        </span>

        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          {actionLabelMap[reward.requiredAction]}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          Coupon: {reward.couponCode || "-"}
        </span>

        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
          Sort: {reward.sortOrder || 0}
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
            reward.isActive
              ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              : "border-green-300 text-green-700 hover:bg-green-50"
          }`}
        >
          {reward.isActive ? "Deactivate" : "Activate"}
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
    type: "free_item" as RewardType,
    valueText: "",
    requiredAction: "join_challenge" as RequiredAction,
    couponCode: "",
    isActive: true,
    sortOrder: "0",
  });

  const fetchRewards = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/rewards");
      setRewards(res.data || []);
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
      type: "free_item",
      valueText: "",
      requiredAction: "join_challenge",
      couponCode: "",
      isActive: true,
      sortOrder: "0",
    });
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

    const payload = {
      title: form.title.trim(),
      rewardId: slugify(form.rewardId),
      description: form.description.trim(),
      type: form.type,
      valueText: form.valueText.trim(),
      requiredAction: form.requiredAction,
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
    setEditingId(reward._id);

    setForm({
      title: reward.title,
      rewardId: reward.rewardId,
      description: reward.description || "",
      type: reward.type,
      valueText: reward.valueText || "",
      requiredAction: reward.requiredAction,
      couponCode: reward.couponCode || "",
      isActive: reward.isActive !== false,
      sortOrder: String(reward.sortOrder || 0),
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
    const freeMeals = rewards.filter((item) => item.type === "free_meal").length;

    return {
      total: rewards.length,
      active,
      inactive,
      discounts,
      freeMeals,
    };
  }, [rewards]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Rewards</h1>

        <p className="mt-1 text-sm text-gray-500">
          Create and manage reward cards used in the MacroBox rewards page.
        </p>
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
          <p className="text-sm text-orange-700">Free Meals</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">
            {stats.freeMeals}
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Update reward" : "Create a new reward"}
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
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
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
            placeholder="Value text e.g. 20% OFF"
            value={form.valueText}
            onChange={(e) => setForm({ ...form, valueText: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Coupon code e.g. GLOWUP20"
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