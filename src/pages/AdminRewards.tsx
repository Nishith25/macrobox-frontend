// frontend/src/pages/AdminRewards.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BadgePercent,
  Check,
  CirclePlus,
  Edit3,
  Gift,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type RewardType =
  | "free_item"
  | "discount"
  | "free_meal"
  | "plan_box"
  | "challenge_box";

type RequiredAction =
  | "buy_7_day_plan"
  | "buy_plan"
  | "next_plan_reward"
  | "post_3_stories"
  | "refer_2_friends"
  | "join_challenge"
  | "complete_7_days";

type RewardFilter =
  | "all"
  | "active"
  | "inactive"
  | "discount"
  | "plan"
  | "free";

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

type RewardForm = {
  title: string;
  rewardId: string;
  description: string;
  type: RewardType;
  valueText: string;
  requiredAction: RequiredAction;
  couponCode: string;
  isActive: boolean;
  sortOrder: string;
};

const typeOptions: { key: RewardType; label: string }[] = [
  { key: "discount", label: "Discount" },
  { key: "plan_box", label: "Plan Box" },
  { key: "free_item", label: "Free Item" },
  { key: "free_meal", label: "Free Meal" },
];

const actionOptions: { key: RequiredAction; label: string }[] = [
  { key: "buy_7_day_plan", label: "Buy 7-Day Plan" },
  { key: "buy_plan", label: "Buy Any Plan" },
  { key: "next_plan_reward", label: "Next Plan Reward" },
  { key: "post_3_stories", label: "Post 3 Stories" },
  { key: "refer_2_friends", label: "Refer 2 Friends" },
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
  buy_plan: "Buy Any Plan",
  next_plan_reward: "Next Plan Reward",
  post_3_stories: "Post 3 Stories",
  refer_2_friends: "Refer 2 Friends",

  // Backward compatibility
  join_challenge: "Buy Any Plan",
  complete_7_days: "Buy 7-Day Plan",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/₹/g, "rs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeRewardForUI = (reward: Reward): Reward => ({
  ...reward,
  type:
    reward.type === "challenge_box"
      ? "plan_box"
      : reward.type,
  requiredAction:
    reward.requiredAction === "join_challenge"
      ? "buy_plan"
      : reward.requiredAction === "complete_7_days"
      ? "buy_7_day_plan"
      : reward.requiredAction,
});

const emptyRewardForm = (): RewardForm => ({
  title: "",
  rewardId: "",
  description: "",
  type: "discount",
  valueText: "",
  requiredAction: "buy_7_day_plan",
  couponCode: "",
  isActive: true,
  sortOrder: "1",
});

const getRewardIcon = (type: RewardType) => {
  if (type === "discount") return <BadgePercent size={26} />;
  if (type === "free_meal") return <Gift size={26} />;
  if (type === "free_item") return <Sparkles size={26} />;

  return <Trophy size={26} />;
};

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<RewardFilter>("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<RewardForm>(emptyRewardForm());

  const fetchRewards = async () => {
    try {
      const response = await api.get("/admin/rewards");

      setRewards(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch {
      toast.error("Failed to load rewards");
    }
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      await fetchRewards();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const normalizedRewards = useMemo(
    () => rewards.map(normalizeRewardForUI),
    [rewards]
  );

  const stats = useMemo(() => {
    const active = normalizedRewards.filter(
      (reward) => reward.isActive
    ).length;

    const discounts = normalizedRewards.filter(
      (reward) => reward.type === "discount"
    ).length;

    const freeRewards = normalizedRewards.filter(
      (reward) =>
        reward.type === "free_item" ||
        reward.type === "free_meal"
    ).length;

    const planRewards = normalizedRewards.filter(
      (reward) =>
        reward.type === "plan_box" ||
        [
          "buy_7_day_plan",
          "buy_plan",
          "next_plan_reward",
        ].includes(reward.requiredAction)
    ).length;

    return {
      total: normalizedRewards.length,
      active,
      inactive: normalizedRewards.length - active,
      discounts,
      planRewards,
      freeRewards,
    };
  }, [normalizedRewards]);

  const filteredRewards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...normalizedRewards]
      .filter((reward) => {
        const searchableText = [
          reward.title,
          reward.rewardId,
          reward.description,
          reward.valueText,
          reward.couponCode,
          typeLabelMap[reward.type],
          actionLabelMap[reward.requiredAction],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          query &&
          !searchableText.includes(query)
        ) {
          return false;
        }

        if (filter === "active") {
          return reward.isActive;
        }

        if (filter === "inactive") {
          return !reward.isActive;
        }

        if (filter === "discount") {
          return reward.type === "discount";
        }

        if (filter === "plan") {
          return (
            reward.type === "plan_box" ||
            [
              "buy_7_day_plan",
              "buy_plan",
              "next_plan_reward",
            ].includes(reward.requiredAction)
          );
        }

        if (filter === "free") {
          return (
            reward.type === "free_item" ||
            reward.type === "free_meal"
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          Number(a.sortOrder || 0) -
          Number(b.sortOrder || 0)
      );
  }, [normalizedRewards, search, filter]);

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm(emptyRewardForm());
    setShowDrawer(true);
  };

  const openEditDrawer = (reward: Reward) => {
    const normalizedReward =
      normalizeRewardForUI(reward);

    setEditingId(reward._id);

    setForm({
      title: normalizedReward.title || "",
      rewardId: normalizedReward.rewardId || "",
      description:
        normalizedReward.description || "",
      type: normalizedReward.type,
      valueText:
        normalizedReward.valueText || "",
      requiredAction:
        normalizedReward.requiredAction,
      couponCode:
        normalizedReward.couponCode || "",
      isActive:
        normalizedReward.isActive !== false,
      sortOrder: String(
        normalizedReward.sortOrder || 0
      ),
    });

    setShowDrawer(true);
  };

  const closeDrawer = () => {
    if (saving) return;

    setShowDrawer(false);
    setEditingId(null);
    setForm(emptyRewardForm());
  };

  const updateTitle = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      rewardId: editingId
        ? current.rewardId
        : slugify(value),
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
      toast.error("Reward value is required");
      return;
    }

    if (Number(form.sortOrder || 0) < 0) {
      toast.error("Sort order cannot be negative");
      return;
    }

    const normalizedType =
      form.type === "challenge_box"
        ? "plan_box"
        : form.type;

    const normalizedAction =
      form.requiredAction === "join_challenge"
        ? "buy_plan"
        : form.requiredAction ===
          "complete_7_days"
        ? "buy_7_day_plan"
        : form.requiredAction;

    const payload = {
      title: form.title.trim(),
      rewardId: slugify(form.rewardId),
      description: form.description.trim(),
      type: normalizedType,
      valueText: form.valueText.trim(),
      requiredAction: normalizedAction,
      couponCode: form.couponCode
        .trim()
        .toUpperCase(),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSaving(true);

      if (editingId) {
        const response = await api.put(
          `/admin/rewards/${editingId}`,
          payload
        );

        setRewards((current) =>
          current.map((reward) =>
            reward._id === editingId
              ? response.data
              : reward
          )
        );

        toast.success("Reward updated");
      } else {
        const response = await api.post(
          "/admin/rewards",
          payload
        );

        setRewards((current) => [
          response.data,
          ...current,
        ]);

        toast.success("Reward created");
      }

      closeDrawer();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save reward"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleReward = async (
    reward: Reward
  ) => {
    try {
      const response = await api.patch(
        `/admin/rewards/${reward._id}/toggle`
      );

      setRewards((current) =>
        current.map((item) =>
          item._id === reward._id
            ? response.data
            : item
        )
      );

      toast.success(
        response.data.isActive
          ? "Reward activated"
          : "Reward deactivated"
      );
    } catch {
      toast.error("Failed to update reward status");
    }
  };

  const deleteReward = async (
    reward: Reward
  ) => {
    if (
      !window.confirm(
        `Delete "${reward.title}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/admin/rewards/${reward._id}`
      );

      setRewards((current) =>
        current.filter(
          (item) => item._id !== reward._id
        )
      );

      toast.success("Reward deleted");
    } catch {
      toast.error("Failed to delete reward");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2
            className="animate-spin text-green-600"
            size={20}
          />
          Loading rewards...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                MacroBox Admin
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                Rewards
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Manage plan rewards, discount
                coupons, referral benefits and
                future customer campaigns.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
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
                onClick={openCreateDrawer}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white shadow-[0_12px_25px_rgba(22,163,74,0.2)] transition hover:bg-green-700"
              >
                <CirclePlus size={17} />
                Add Reward
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardStat
              label="Total Rewards"
              value={stats.total}
              icon={<Gift size={18} />}
            />

            <DashboardStat
              label="Active"
              value={stats.active}
              icon={<PackageCheck size={18} />}
              accent
            />

            <DashboardStat
              label="Inactive"
              value={stats.inactive}
              icon={<Tag size={18} />}
            />

            <DashboardStat
              label="Discounts"
              value={stats.discounts}
              icon={<BadgePercent size={18} />}
            />

            <DashboardStat
              label="Plan Rewards"
              value={stats.planRewards}
              icon={<Trophy size={18} />}
            />

            <DashboardStat
              label="Free Rewards"
              value={stats.freeRewards}
              icon={<Sparkles size={18} />}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search rewards, coupon codes or actions..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterButton>

              <FilterButton
                active={filter === "active"}
                onClick={() =>
                  setFilter("active")
                }
              >
                Active
              </FilterButton>

              <FilterButton
                active={filter === "inactive"}
                onClick={() =>
                  setFilter("inactive")
                }
              >
                Inactive
              </FilterButton>

              <FilterButton
                active={filter === "discount"}
                onClick={() =>
                  setFilter("discount")
                }
              >
                Discounts
              </FilterButton>

              <FilterButton
                active={filter === "plan"}
                onClick={() =>
                  setFilter("plan")
                }
              >
                Plan
              </FilterButton>

              <FilterButton
                active={filter === "free"}
                onClick={() =>
                  setFilter("free")
                }
              >
                Free
              </FilterButton>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Available Rewards
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {filteredRewards.length} reward
              {filteredRewards.length === 1
                ? ""
                : "s"}{" "}
              shown
            </p>
          </div>

          {filteredRewards.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward._id}
                  reward={reward}
                  onEdit={() =>
                    openEditDrawer(reward)
                  }
                  onToggle={() =>
                    toggleReward(reward)
                  }
                  onDelete={() =>
                    deleteReward(reward)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showDrawer && (
        <RewardDrawer
          title={
            editingId
              ? "Edit Reward"
              : "Add New Reward"
          }
          subtitle={
            editingId
              ? "Update reward details, coupon and availability."
              : "Create a new customer reward or campaign."
          }
          onClose={closeDrawer}
        >
          <div className="space-y-6">
            <DrawerSection
              number="01"
              title="Reward Information"
              description="Enter the customer-facing reward details."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Reward title"
                  required
                  className="sm:col-span-2"
                >
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateTitle(
                        event.target.value
                      )
                    }
                    placeholder="Example: 10% OFF Next Plan"
                    className="admin-input"
                  />
                </Field>

                <Field
                  label="Reward ID"
                  required
                >
                  <input
                    value={form.rewardId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardId: slugify(
                          event.target.value
                        ),
                      }))
                    }
                    placeholder="next-plan-10-off"
                    className="admin-input"
                  />
                </Field>

                <Field label="Sort order">
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder:
                          event.target.value,
                      }))
                    }
                    className="admin-input"
                  />
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
                        description:
                          event.target.value,
                      }))
                    }
                    placeholder="Explain how the reward works and when it can be used."
                    className="admin-input min-h-[110px] resize-y py-3"
                  />
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="02"
              title="Reward Rules"
              description="Choose the reward type and unlock requirement."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reward type">
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target
                          .value as RewardType,
                      }))
                    }
                    className="admin-input"
                  >
                    {typeOptions.map((item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Unlock action">
                  <select
                    value={form.requiredAction}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        requiredAction:
                          event.target
                            .value as RequiredAction,
                      }))
                    }
                    className="admin-input"
                  >
                    {actionOptions.map((item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Reward value"
                  required
                >
                  <input
                    value={form.valueText}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        valueText:
                          event.target.value,
                      }))
                    }
                    placeholder="10% OFF"
                    className="admin-input"
                  />
                </Field>

                <Field label="Base coupon code">
                  <input
                    value={form.couponCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        couponCode:
                          event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="PLAN10"
                    className="admin-input uppercase"
                  />
                </Field>
              </div>

              <div className="mt-4 border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-green-700">
                  Reward Preview
                </p>

                <p className="mt-2 text-lg font-black text-slate-950">
                  {form.title ||
                    "Reward title"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-green-700">
                    {form.valueText ||
                      "Reward value"}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700">
                    {actionLabelMap[
                      form.requiredAction
                    ]}
                  </span>
                </div>
              </div>
            </DrawerSection>

            <DrawerSection
              number="03"
              title="Availability"
              description="Control whether customers can see and unlock this reward."
            >
              <Field label="Reward status">
                <select
                  value={
                    form.isActive
                      ? "true"
                      : "false"
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive:
                        event.target.value ===
                        "true",
                    }))
                  }
                  className="admin-input"
                >
                  <option value="true">
                    Active
                  </option>

                  <option value="false">
                    Inactive
                  </option>
                </select>
              </Field>

              <div
                className={`mt-4 flex items-start gap-3 border p-4 ${
                  form.isActive
                    ? "border-green-200 bg-green-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <PackageCheck
                  size={18}
                  className={
                    form.isActive
                      ? "mt-0.5 shrink-0 text-green-600"
                      : "mt-0.5 shrink-0 text-slate-400"
                  }
                />

                <div>
                  <p className="text-sm font-black text-slate-950">
                    {form.isActive
                      ? "Reward is active"
                      : "Reward is inactive"}
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    {form.isActive
                      ? "Eligible customers can see and unlock this reward."
                      : "Customers will not be able to unlock this reward."}
                  </p>
                </div>
              </div>
            </DrawerSection>

            <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveReward}
                disabled={saving}
                className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Check size={17} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Add Reward"}
              </button>
            </div>
          </div>
        </RewardDrawer>
      )}
    </main>
  );
}

function RewardCard({
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
  const normalizedReward =
    normalizeRewardForUI(reward);

  return (
    <article className="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="h-2 bg-green-600" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
              normalizedReward.isActive
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {getRewardIcon(
              normalizedReward.type
            )}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              normalizedReward.isActive
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {normalizedReward.isActive
              ? "Active"
              : "Inactive"}
          </span>
        </div>

        <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-slate-950">
          {normalizedReward.title}
        </h3>

        <p className="mt-1 break-all text-xs font-bold text-slate-400">
          ID: {normalizedReward.rewardId}
        </p>

        <p className="mt-3 min-h-[48px] text-sm font-semibold leading-6 text-slate-500">
          {normalizedReward.description ||
            "No description added."}
        </p>

        <div className="mt-4 border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-green-700">
            Reward Value
          </p>

          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            {normalizedReward.valueText ||
              "Reward"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <RewardDetail
            label="Type"
            value={
              typeLabelMap[
                normalizedReward.type
              ]
            }
          />

          <RewardDetail
            label="Unlock"
            value={
              actionLabelMap[
                normalizedReward.requiredAction
              ] ||
              normalizedReward.requiredAction
            }
          />

          <RewardDetail
            label="Coupon"
            value={
              normalizedReward.couponCode ||
              "Generated"
            }
          />

          <RewardDetail
            label="Sort"
            value={String(
              normalizedReward.sortOrder || 0
            )}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-200 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 size={14} />
            Edit
          </button>

          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex h-10 items-center justify-center rounded-full border text-xs font-black transition ${
              normalizedReward.isActive
                ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {normalizedReward.isActive
              ? "Pause"
              : "Activate"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-red-200 text-xs font-black text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function RewardDrawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close reward editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[580px] sm:rounded-none">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
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
          <h3 className="text-base font-black text-slate-950">
            {title}
          </h3>

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

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
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
  value: string | number;
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

        <p className="text-xl font-black tracking-[-0.05em] sm:text-2xl">
          {value}
        </p>
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
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

function RewardDetail({
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

function EmptyState() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center shadow-sm md:col-span-2">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        <Gift size={25} />
      </span>

      <h3 className="mt-4 text-xl font-black">
        No rewards found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Change the filters or create a new customer reward.
      </p>
    </div>
  );
}