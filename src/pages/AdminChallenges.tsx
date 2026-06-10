// frontend/src/pages/AdminChallenges.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type ChallengeGoal =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating"
  | "student_power"
  | "couple"
  | "office_fit";

type Challenge = {
  _id: string;
  challengeId: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: ChallengeGoal;
  badge?: string;
  durationDays: number;
  price: number;
  trialPrice?: number | null;
  originalPrice?: number | null;
  imageUrl?: string;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  isActive: boolean;
  sortOrder?: number;
};

const goalOptions: { key: ChallengeGoal; label: string }[] = [
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "weight_gain", label: "Weight Gain" },
  { key: "clean_eating", label: "Clean Eating" },
  { key: "student_power", label: "Student Power" },
  { key: "couple", label: "Couple Challenge" },
  { key: "office_fit", label: "Office Fit" },
];

const goalLabelMap: Record<ChallengeGoal, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
  student_power: "Student Power",
  couple: "Couple Challenge",
  office_fit: "Office Fit",
};

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

function ChallengeRow({
  challenge,
  onEdit,
  onDelete,
  onToggle,
}: {
  challenge: Challenge;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-green-50 md:w-32">
          {challenge.imageUrl ? (
            <img
              src={challenge.imageUrl}
              alt={challenge.title}
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
                {challenge.title}
              </h3>

              <p className="mt-1 text-xs font-bold text-gray-400">
                ID: {challenge.challengeId}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {goalLabelMap[challenge.goal]}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  challenge.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {challenge.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-600">
            {challenge.subtitle || "No subtitle"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {challenge.durationDays} days · ₹{challenge.price}
            {challenge.originalPrice ? ` · MRP ₹${challenge.originalPrice}` : ""}
            {challenge.trialPrice ? ` · Trial ₹${challenge.trialPrice}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {challenge.badge && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {challenge.badge}
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Sort: {challenge.sortOrder || 0}
            </span>

            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              Perks: {challenge.perks?.length || 0}
            </span>

            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              Rewards: {challenge.rewards?.length || 0}
            </span>
          </div>

          {challenge.description && (
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
                challenge.isActive
                  ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  : "border-green-300 text-green-700 hover:bg-green-50"
              }`}
            >
              {challenge.isActive ? "Deactivate" : "Activate"}
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
          {challenge.description && <p>{challenge.description}</p>}

          {challenge.perks && challenge.perks.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Perks:</p>
              <ul className="list-inside list-disc">
                {challenge.perks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {challenge.rewards && challenge.rewards.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Rewards:</p>
              <ul className="list-inside list-disc">
                {challenge.rewards.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {challenge.meals && challenge.meals.length > 0 && (
            <div>
              <p className="font-bold text-gray-900">Suggested Meals:</p>
              <ul className="list-inside list-disc">
                {challenge.meals.map((item) => (
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

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    challengeId: "",
    subtitle: "",
    description: "",
    goal: "fat_loss" as ChallengeGoal,
    badge: "",
    durationDays: "7",
    price: "",
    trialPrice: "",
    originalPrice: "",
    imageUrl: "",
    perksText: "",
    rewardsText: "",
    mealsText: "",
    isActive: true,
    sortOrder: "0",
  });

  const fetchChallenges = async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/challenges");
      setChallenges(res.data || []);
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const resetForm = () => {
    setEditingId(null);

    setForm({
      title: "",
      challengeId: "",
      subtitle: "",
      description: "",
      goal: "fat_loss",
      badge: "",
      durationDays: "7",
      price: "",
      trialPrice: "",
      originalPrice: "",
      imageUrl: "",
      perksText: "",
      rewardsText: "",
      mealsText: "",
      isActive: true,
      sortOrder: "0",
    });
  };

  const updateTitle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      challengeId: editingId ? prev.challengeId : slugify(value),
    }));
  };

  const saveChallenge = async () => {
    if (!form.title.trim()) {
      toast.error("Challenge title is required");
      return;
    }

    if (!form.challengeId.trim()) {
      toast.error("Challenge ID is required");
      return;
    }

    if (!form.price) {
      toast.error("Challenge price is required");
      return;
    }

    const payload = {
      title: form.title.trim(),
      challengeId: slugify(form.challengeId),
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      goal: form.goal,
      badge: form.badge.trim(),
      durationDays: Number(form.durationDays || 7),
      price: Number(form.price || 0),
      trialPrice: form.trialPrice ? Number(form.trialPrice) : null,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      imageUrl: form.imageUrl.trim(),
      perks: textToArray(form.perksText),
      rewards: textToArray(form.rewardsText),
      meals: textToArray(form.mealsText),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSaving(true);

      if (editingId) {
        const res = await api.put(`/admin/challenges/${editingId}`, payload);

        setChallenges((prev) =>
          prev.map((item) => (item._id === editingId ? res.data : item))
        );

        toast.success("Challenge updated");
      } else {
        const res = await api.post("/admin/challenges", payload);

        setChallenges((prev) => [res.data, ...prev]);

        toast.success("Challenge added");
      }

      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingId(challenge._id);

    setForm({
      title: challenge.title,
      challengeId: challenge.challengeId,
      subtitle: challenge.subtitle || "",
      description: challenge.description || "",
      goal: challenge.goal,
      badge: challenge.badge || "",
      durationDays: String(challenge.durationDays || 7),
      price: String(challenge.price || ""),
      trialPrice:
        challenge.trialPrice === null || challenge.trialPrice === undefined
          ? ""
          : String(challenge.trialPrice),
      originalPrice:
        challenge.originalPrice === null ||
        challenge.originalPrice === undefined
          ? ""
          : String(challenge.originalPrice),
      imageUrl: challenge.imageUrl || "",
      perksText: arrayToText(challenge.perks),
      rewardsText: arrayToText(challenge.rewards),
      mealsText: arrayToText(challenge.meals),
      isActive: challenge.isActive !== false,
      sortOrder: String(challenge.sortOrder || 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = async (challenge: Challenge) => {
    try {
      const res = await api.patch(`/admin/challenges/${challenge._id}/toggle`);

      setChallenges((prev) =>
        prev.map((item) => (item._id === challenge._id ? res.data : item))
      );

      toast.success(res.data.isActive ? "Challenge activated" : "Challenge deactivated");
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (!window.confirm(`Delete "${challenge.title}"?`)) return;

    try {
      await api.delete(`/admin/challenges/${challenge._id}`);

      setChallenges((prev) =>
        prev.filter((item) => item._id !== challenge._id)
      );

      toast.success("Challenge deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const stats = useMemo(() => {
    const active = challenges.filter((item) => item.isActive).length;
    const inactive = challenges.filter((item) => !item.isActive).length;
    const trial = challenges.filter((item) => item.trialPrice).length;
    const avgPrice =
      challenges.length > 0
        ? Math.round(
            challenges.reduce((sum, item) => sum + Number(item.price || 0), 0) /
              challenges.length
          )
        : 0;

    return {
      total: challenges.length,
      active,
      inactive,
      trial,
      avgPrice,
    };
  }, [challenges]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Manage Challenges
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create and manage MacroBox challenge plans, trial bowls, perks,
          rewards and suggested meals.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Challenges</p>
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

        <div className="rounded-2xl border bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-700">Avg Price</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            ₹{stats.avgPrice}
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">
          {editingId ? "Update challenge" : "Create a new challenge"}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            placeholder="Challenge title"
            value={form.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="rounded-lg border px-3 py-2 md:col-span-2"
          />

          <input
            placeholder="Challenge ID"
            value={form.challengeId}
            onChange={(e) =>
              setForm({ ...form, challengeId: slugify(e.target.value) })
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
              setForm({ ...form, goal: e.target.value as ChallengeGoal })
            }
            className="rounded-lg border px-3 py-2"
          >
            {goalOptions.map((goal) => (
              <option key={goal.key} value={goal.key}>
                {goal.label}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Challenge description"
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
            onClick={saveChallenge}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Save changes"
              : "Add challenge"}
          </button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">
        Challenges {loading ? "(loading...)" : `(${challenges.length})`}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {challenges.map((challenge) => (
          <ChallengeRow
            key={challenge._id}
            challenge={challenge}
            onEdit={() => handleEdit(challenge)}
            onToggle={() => handleToggle(challenge)}
            onDelete={() => handleDelete(challenge)}
          />
        ))}
      </div>
    </div>
  );
}