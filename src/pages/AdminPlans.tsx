// frontend/src/pages/AdminPlans.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Copy,
  Edit3,
  Eye,
  Gift,
  IndianRupee,
  Layers3,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

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
type PlanFilter = "all" | "active" | "inactive" | "reward";

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

type PlanForm = {
  title: string;
  planId: string;
  subtitle: string;
  description: string;
  goal: PlanGoal;
  mealMode: MealMode;
  badge: string;
  durationDays: string;
  vegPrice: string;
  nonVegPrice: string;
  mixedPrice: string;
  trialPrice: string;
  originalPrice: string;
  imageUrl: string;
  perksText: string;
  rewardsText: string;
  rewardEligible: boolean;
  isActive: boolean;
  sortOrder: string;
  mealSets: PlanMealSets;
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
  { key: "both", label: "Veg, Non-Veg and Mixed" },
  { key: "veg", label: "Veg Only" },
  { key: "nonveg", label: "Non-Veg Only" },
];

const mealModeLabelMap: Record<MealMode, string> = {
  both: "All Plan Types",
  veg: "Veg Only",
  nonveg: "Non-Veg Only",
};

const mealSetTabs: {
  key: MealSetKey;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    key: "veg",
    label: "Veg Plan Meals",
    short: "Veg",
    hint: "These meals appear when the customer selects Veg.",
  },
  {
    key: "nonveg",
    label: "Non-Veg Plan Meals",
    short: "Non-Veg",
    hint: "These meals appear when the customer selects Non-Veg.",
  },
  {
    key: "mixed",
    label: "Mixed Plan Meals",
    short: "Mixed",
    hint: "These meals appear when the customer selects Mixed.",
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

const getPlanId = (plan: Plan) =>
  plan.planId || plan.challengeId || plan._id;

const getMealId = (meal?: string | MealOption | null) => {
  if (!meal) return "";
  if (typeof meal === "string") return meal;
  return meal._id || "";
};

const getMealTitle = (meal?: string | MealOption | null) => {
  if (!meal || typeof meal === "string") return "";
  return meal.title || "";
};

const getBasePlanPrice = (prices: PlanPrices = {}, fallback = 0) =>
  Number(
    prices.mixed ||
      prices.nonveg ||
      prices.veg ||
      fallback ||
      0
  );

const createMealSetDays = (durationDays: number): PlanMealDay[] =>
  Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    title: `Day ${index + 1}`,
    meal: null,
    isActive: true,
  }));

const createEmptyMealSets = (durationDays: number): PlanMealSets => ({
  veg: createMealSetDays(durationDays),
  nonveg: createMealSetDays(durationDays),
  mixed: createMealSetDays(durationDays),
});

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

const normalizeMealSets = (
  mealSets: PlanMealSets | undefined,
  durationDays: number
): PlanMealSets => ({
  veg: normalizeMealSetDays(mealSets?.veg, durationDays),
  nonveg: normalizeMealSetDays(mealSets?.nonveg, durationDays),
  mixed: normalizeMealSetDays(mealSets?.mixed, durationDays),
});

const countSelectedMealsInSet = (
  mealSets: PlanMealSets | undefined,
  key: MealSetKey
) =>
  (mealSets?.[key] || []).filter((item) => getMealId(item.meal))
    .length;

const countSelectedMeals = (mealSets?: PlanMealSets) =>
  mealSetTabs.reduce(
    (total, tab) =>
      total + countSelectedMealsInSet(mealSets, tab.key),
    0
  );

const emptyPlanForm = (): PlanForm => ({
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

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeMealSetTab, setActiveMealSetTab] =
    useState<MealSetKey>("mixed");

  const [form, setForm] = useState<PlanForm>(emptyPlanForm());

  const fetchPlans = async () => {
    try {
      const response = await api.get("/admin/plans");
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("Failed to load plans");
    }
  };

  const fetchMealOptions = async () => {
    try {
      setLoadingMeals(true);

      const response = await api.get(
        "/admin/plans/meal-options"
      );

      setMealOptions(
        Array.isArray(response.data) ? response.data : []
      );
    } catch {
      toast.error("Failed to load meal options");
    } finally {
      setLoadingMeals(false);
    }
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchMealOptions()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const stats = useMemo(() => {
    const active = plans.filter((plan) => plan.isActive).length;

    const rewardEligible = plans.filter(
      (plan) => plan.rewardEligible !== false
    ).length;

    const avgPrice =
      plans.length > 0
        ? Math.round(
            plans.reduce(
              (sum, plan) =>
                sum +
                getBasePlanPrice(plan.prices, plan.price),
              0
            ) / plans.length
          )
        : 0;

    return {
      total: plans.length,
      active,
      inactive: plans.length - active,
      rewardEligible,
      avgPrice,
    };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...plans]
      .filter((plan) => {
        const searchableText = [
          plan.title,
          plan.subtitle,
          plan.description,
          getPlanId(plan),
          goalLabelMap[plan.goal],
          mealModeLabelMap[plan.mealMode || "both"],
          plan.badge,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !term || searchableText.includes(term);

        if (!matchesSearch) return false;

        if (filter === "active") return plan.isActive;
        if (filter === "inactive") return !plan.isActive;

        if (filter === "reward") {
          return plan.rewardEligible !== false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          Number(a.sortOrder || 0) -
          Number(b.sortOrder || 0)
      );
  }, [plans, search, filter]);

  const availableMealSets = useMemo<MealSetKey[]>(() => {
    if (form.mealMode === "veg") return ["veg"];
    if (form.mealMode === "nonveg") return ["nonveg"];

    return ["veg", "nonveg", "mixed"];
  }, [form.mealMode]);

  const mealOptionsByTab = useMemo(() => {
    if (activeMealSetTab === "veg") {
      return mealOptions.filter(
        (meal) => meal.foodType === "veg"
      );
    }

    if (activeMealSetTab === "nonveg") {
      return mealOptions.filter(
        (meal) => meal.foodType === "nonveg"
      );
    }

    return mealOptions;
  }, [mealOptions, activeMealSetTab]);

  const activeMealSetDays =
    form.mealSets[activeMealSetTab] || [];

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm(emptyPlanForm());
    setActiveMealSetTab("mixed");
    setShowDrawer(true);
  };

  const openEditDrawer = (plan: Plan) => {
    const durationDays = Math.max(
      1,
      Number(plan.durationDays || 7)
    );

    const mealMode = plan.mealMode || "both";

    setEditingId(plan._id);
    setActiveMealSetTab(
      mealMode === "veg"
        ? "veg"
        : mealMode === "nonveg"
        ? "nonveg"
        : "mixed"
    );

    setForm({
      title: plan.title || "",
      planId: getPlanId(plan),
      subtitle: plan.subtitle || "",
      description: plan.description || "",
      goal: plan.goal,
      mealMode,
      badge: plan.badge || "",
      durationDays: String(durationDays),
      vegPrice: String(
        plan.prices?.veg || plan.price || ""
      ),
      nonVegPrice: String(
        plan.prices?.nonveg || plan.price || ""
      ),
      mixedPrice: String(
        plan.prices?.mixed || plan.price || ""
      ),
      trialPrice:
        plan.trialPrice === null ||
        plan.trialPrice === undefined
          ? ""
          : String(plan.trialPrice),
      originalPrice:
        plan.originalPrice === null ||
        plan.originalPrice === undefined
          ? ""
          : String(plan.originalPrice),
      imageUrl: plan.imageUrl || "",
      perksText: arrayToText(plan.perks),
      rewardsText:
        arrayToText(plan.rewards) || DEFAULT_PLAN_REWARD,
      rewardEligible: plan.rewardEligible !== false,
      isActive: plan.isActive !== false,
      sortOrder: String(plan.sortOrder || 0),
      mealSets: normalizeMealSets(
        plan.mealSets,
        durationDays
      ),
    });

    setShowDrawer(true);
  };

  const closeDrawer = () => {
    if (saving) return;

    setShowDrawer(false);
    setEditingId(null);
    setActiveMealSetTab("mixed");
    setForm(emptyPlanForm());
  };

  const updateTitle = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      planId: editingId
        ? current.planId
        : slugify(value),
    }));
  };

  const updateMealMode = (mealMode: MealMode) => {
    setForm((current) => ({
      ...current,
      mealMode,
    }));

    if (mealMode === "veg") {
      setActiveMealSetTab("veg");
    } else if (mealMode === "nonveg") {
      setActiveMealSetTab("nonveg");
    } else {
      setActiveMealSetTab("mixed");
    }
  };

  const updateDurationDays = (value: string) => {
    const duration = Math.max(1, Number(value || 1));

    setForm((current) => ({
      ...current,
      durationDays: value,
      mealSets: normalizeMealSets(
        current.mealSets,
        duration
      ),
    }));
  };

  const updateMealForDay = (
    setKey: MealSetKey,
    dayIndex: number,
    mealId: string
  ) => {
    setForm((current) => {
      const duration = Math.max(
        1,
        Number(current.durationDays || 7)
      );

      const mealSets = normalizeMealSets(
        current.mealSets,
        duration
      );

      return {
        ...current,
        mealSets: {
          ...mealSets,
          [setKey]: mealSets[setKey].map(
            (item, index) =>
              index === dayIndex
                ? {
                    ...item,
                    meal: mealId || null,
                  }
                : item
          ),
        },
      };
    });
  };

  const copyMealSet = (
    from: MealSetKey,
    to: MealSetKey
  ) => {
    setForm((current) => {
      const duration = Math.max(
        1,
        Number(current.durationDays || 7)
      );

      const mealSets = normalizeMealSets(
        current.mealSets,
        duration
      );

      return {
        ...current,
        mealSets: {
          ...mealSets,
          [to]: mealSets[from].map((item) => ({
            ...item,
          })),
        },
      };
    });

    toast.success(
      `${mealSetTabs.find((tab) => tab.key === from)?.short} meals copied`
    );
  };

  const validatePrices = () => {
    const veg = Number(form.vegPrice || 0);
    const nonveg = Number(form.nonVegPrice || 0);
    const mixed = Number(form.mixedPrice || 0);

    if (
      (form.mealMode === "veg" ||
        form.mealMode === "both") &&
      veg <= 0
    ) {
      toast.error("Enter a valid Veg price");
      return false;
    }

    if (
      (form.mealMode === "nonveg" ||
        form.mealMode === "both") &&
      nonveg <= 0
    ) {
      toast.error("Enter a valid Non-Veg price");
      return false;
    }

    if (form.mealMode === "both" && mixed <= 0) {
      toast.error("Enter a valid Mixed price");
      return false;
    }

    return true;
  };

  const validateMealSets = () => {
    const duration = Math.max(
      1,
      Number(form.durationDays || 7)
    );

    const mealSets = normalizeMealSets(
      form.mealSets,
      duration
    );

    const requiredSets: MealSetKey[] =
      form.mealMode === "veg"
        ? ["veg"]
        : form.mealMode === "nonveg"
        ? ["nonveg"]
        : ["veg", "nonveg", "mixed"];

    for (const key of requiredSets) {
      const missingDay = mealSets[key].find(
        (item) => !getMealId(item.meal)
      );

      if (missingDay) {
        setActiveMealSetTab(key);

        toast.error(
          `Select a ${mealSetTabs.find(
            (tab) => tab.key === key
          )?.short} meal for Day ${missingDay.day}`
        );

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

    if (!validatePrices() || !validateMealSets()) {
      return;
    }

    const durationDays = Math.max(
      1,
      Number(form.durationDays || 7)
    );

    const mealSets = normalizeMealSets(
      form.mealSets,
      durationDays
    );

    const prices = {
      veg: Number(form.vegPrice || 0),
      nonveg: Number(form.nonVegPrice || 0),
      mixed: Number(form.mixedPrice || 0),
    };

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
      durationDays,
      price: getBasePlanPrice(prices),
      prices,
      trialPrice: form.trialPrice
        ? Number(form.trialPrice)
        : null,
      originalPrice: form.originalPrice
        ? Number(form.originalPrice)
        : null,
      imageUrl: form.imageUrl.trim(),
      perks: textToArray(form.perksText),
      rewards:
        textToArray(form.rewardsText).length > 0
          ? textToArray(form.rewardsText)
          : [DEFAULT_PLAN_REWARD],
      rewardEligible: form.rewardEligible,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0),
      meals: [],
      mealSets: {
        veg: mealSets.veg.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
        nonveg: mealSets.nonveg.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
        mixed: mealSets.mixed.map((item) => ({
          day: item.day,
          title: item.title || `Day ${item.day}`,
          meal: getMealId(item.meal) || null,
          isActive: item.isActive !== false,
        })),
      },
    };

    try {
      setSaving(true);

      if (editingId) {
        const response = await api.put(
          `/admin/plans/${editingId}`,
          payload
        );

        setPlans((current) =>
          current.map((plan) =>
            plan._id === editingId
              ? response.data
              : plan
          )
        );

        toast.success("Plan updated");
      } else {
        const response = await api.post(
          "/admin/plans",
          payload
        );

        setPlans((current) => [
          response.data,
          ...current,
        ]);

        toast.success("Plan created");
      }

      closeDrawer();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save plan"
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = async (plan: Plan) => {
    try {
      const response = await api.patch(
        `/admin/plans/${plan._id}/toggle`
      );

      setPlans((current) =>
        current.map((item) =>
          item._id === plan._id
            ? response.data
            : item
        )
      );

      toast.success(
        response.data.isActive
          ? "Plan activated"
          : "Plan deactivated"
      );
    } catch {
      toast.error("Failed to update plan status");
    }
  };

  const deletePlan = async (plan: Plan) => {
    if (!window.confirm(`Delete "${plan.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/plans/${plan._id}`);

      setPlans((current) =>
        current.filter(
          (item) => item._id !== plan._id
        )
      );

      toast.success("Plan deleted");
    } catch {
      toast.error("Failed to delete plan");
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
          Loading plans...
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
                Meal Plans
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Create plan variants, set individual prices and assign
                meals for every delivery day.
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
                Add Plan
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardStat
              label="Total Plans"
              value={stats.total}
              icon={<Layers3 size={18} />}
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
              icon={<Eye size={18} />}
            />

            <DashboardStat
              label="Reward Plans"
              value={stats.rewardEligible}
              icon={<Gift size={18} />}
            />

            <DashboardStat
              label="Average Price"
              value={`₹${stats.avgPrice}`}
              icon={<IndianRupee size={18} />}
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
                placeholder="Search plans, goals or plan IDs..."
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
                onClick={() => setFilter("active")}
              >
                Active
              </FilterButton>

              <FilterButton
                active={filter === "inactive"}
                onClick={() => setFilter("inactive")}
              >
                Inactive
              </FilterButton>

              <FilterButton
                active={filter === "reward"}
                onClick={() => setFilter("reward")}
              >
                Rewards
              </FilterButton>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Available Plans
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {filteredPlans.length} plan
              {filteredPlans.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {filteredPlans.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  onEdit={() => openEditDrawer(plan)}
                  onToggle={() => togglePlan(plan)}
                  onDelete={() => deletePlan(plan)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showDrawer && (
        <PlanDrawer
          title={editingId ? "Edit Plan" : "Add New Plan"}
          subtitle={
            editingId
              ? "Update prices, settings and day-wise meals."
              : "Create a new MacroBox meal plan."
          }
          onClose={closeDrawer}
        >
          <div className="space-y-6">
            <DrawerSection
              number="01"
              title="Basic Information"
              description="Plan identity, goal and availability."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Plan title"
                  required
                  className="sm:col-span-2"
                >
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateTitle(event.target.value)
                    }
                    placeholder="Example: 7-Day Lean Meal Plan"
                    className="admin-input"
                  />
                </Field>

                <Field label="Plan ID" required>
                  <input
                    value={form.planId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        planId: slugify(
                          event.target.value
                        ),
                      }))
                    }
                    placeholder="7-day-lean-plan"
                    className="admin-input"
                  />
                </Field>

                <Field label="Duration days" required>
                  <input
                    type="number"
                    min="1"
                    value={form.durationDays}
                    onChange={(event) =>
                      updateDurationDays(
                        event.target.value
                      )
                    }
                    className="admin-input"
                  />
                </Field>

                <Field
                  label="Subtitle"
                  className="sm:col-span-2"
                >
                  <input
                    value={form.subtitle}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subtitle: event.target.value,
                      }))
                    }
                    placeholder="Short customer-facing subtitle"
                    className="admin-input"
                  />
                </Field>

                <Field label="Goal">
                  <select
                    value={form.goal}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        goal: event.target
                          .value as PlanGoal,
                      }))
                    }
                    className="admin-input"
                  >
                    {goalOptions.map((goal) => (
                      <option
                        key={goal.key}
                        value={goal.key}
                      >
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Plan types">
                  <select
                    value={form.mealMode}
                    onChange={(event) =>
                      updateMealMode(
                        event.target.value as MealMode
                      )
                    }
                    className="admin-input"
                  >
                    {mealModeOptions.map((mode) => (
                      <option
                        key={mode.key}
                        value={mode.key}
                      >
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Badge">
                  <input
                    value={form.badge}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        badge: event.target.value,
                      }))
                    }
                    placeholder="Best Seller"
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
                        sortOrder: event.target.value,
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
                    placeholder="Explain who this plan is for and what it includes."
                    className="admin-input min-h-[110px] resize-y py-3"
                  />
                </Field>

                <Field
                  label="Image URL"
                  className="sm:col-span-2"
                >
                  <input
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        imageUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className="admin-input"
                  />
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="02"
              title="Plan Prices"
              description="Set individual prices for each customer selection."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <PriceInput
                  label="Veg"
                  value={form.vegPrice}
                  disabled={form.mealMode === "nonveg"}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      vegPrice: value,
                    }))
                  }
                />

                <PriceInput
                  label="Non-Veg"
                  value={form.nonVegPrice}
                  disabled={form.mealMode === "veg"}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      nonVegPrice: value,
                    }))
                  }
                />

                <PriceInput
                  label="Mixed"
                  value={form.mixedPrice}
                  disabled={form.mealMode !== "both"}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      mixedPrice: value,
                    }))
                  }
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Original price">
                  <input
                    type="number"
                    min="0"
                    value={form.originalPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        originalPrice:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional MRP"
                    className="admin-input"
                  />
                </Field>

                <Field label="Trial price">
                  <input
                    type="number"
                    min="0"
                    value={form.trialPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        trialPrice:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional trial price"
                    className="admin-input"
                  />
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="03"
              title="Benefits and Settings"
              description="Configure visibility, rewards and customer benefits."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Plan status">
                  <select
                    value={
                      form.isActive ? "true" : "false"
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive:
                          event.target.value === "true",
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="true">Active</option>
                    <option value="false">
                      Inactive
                    </option>
                  </select>
                </Field>

                <Field label="Reward eligibility">
                  <select
                    value={
                      form.rewardEligible
                        ? "true"
                        : "false"
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardEligible:
                          event.target.value === "true",
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="true">
                      Reward Eligible
                    </option>

                    <option value="false">
                      No Reward
                    </option>
                  </select>
                </Field>

                <Field label="Perks — one per line">
                  <textarea
                    rows={5}
                    value={form.perksText}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        perksText:
                          event.target.value,
                      }))
                    }
                    placeholder={"High-protein meals\nDaily delivery"}
                    className="admin-input min-h-[130px] resize-y py-3"
                  />
                </Field>

                <Field label="Rewards — one per line">
                  <textarea
                    rows={5}
                    value={form.rewardsText}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardsText:
                          event.target.value,
                      }))
                    }
                    className="admin-input min-h-[130px] resize-y py-3"
                  />
                </Field>
              </div>
            </DrawerSection>

            <DrawerSection
              number="04"
              title="Day-wise Meals"
              description="Select the exact meal delivered on every plan day."
            >
              <div className="grid grid-cols-3 gap-2">
                {mealSetTabs
                  .filter((tab) =>
                    availableMealSets.includes(tab.key)
                  )
                  .map((tab) => {
                    const active =
                      activeMealSetTab === tab.key;

                    const selected =
                      countSelectedMealsInSet(
                        form.mealSets,
                        tab.key
                      );

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          setActiveMealSetTab(tab.key)
                        }
                        className={`min-w-0 border p-3 text-left transition ${
                          active
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-green-300"
                        }`}
                      >
                        <p className="truncate text-xs font-black sm:text-sm">
                          {tab.short}
                        </p>

                        <p className="mt-1 truncate text-[10px] font-bold opacity-80 sm:text-xs">
                          {selected}/
                          {form.durationDays || 7}
                        </p>
                      </button>
                    );
                  })}
              </div>

              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                {
                  mealSetTabs.find(
                    (tab) =>
                      tab.key === activeMealSetTab
                  )?.hint
                }
              </p>

              {form.mealMode === "both" && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {mealSetTabs
                    .filter(
                      (tab) =>
                        tab.key !== activeMealSetTab
                    )
                    .map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          copyMealSet(
                            tab.key,
                            activeMealSetTab
                          )
                        }
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 hover:bg-slate-50"
                      >
                        <Copy size={13} />
                        Copy {tab.short}
                      </button>
                    ))}
                </div>
              )}

              {loadingMeals ? (
                <div className="mt-5 flex items-center gap-2 border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-600">
                  <Loader2
                    size={17}
                    className="animate-spin text-green-600"
                  />
                  Loading meals...
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {activeMealSetDays.map(
                    (item, index) => {
                      const selectedMealId =
                        getMealId(item.meal);

                      const selectedMeal =
                        mealOptions.find(
                          (meal) =>
                            meal._id === selectedMealId
                        );

                      return (
                        <MealDaySelector
                          key={`${activeMealSetTab}-${item.day}`}
                          item={item}
                          mealOptions={mealOptionsByTab}
                          selectedMeal={selectedMeal}
                          selectedMealId={
                            selectedMealId
                          }
                          onChange={(mealId) =>
                            updateMealForDay(
                              activeMealSetTab,
                              index,
                              mealId
                            )
                          }
                        />
                      );
                    }
                  )}
                </div>
              )}
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
                onClick={savePlan}
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
                  : "Add Plan"}
              </button>
            </div>
          </div>
        </PlanDrawer>
      )}
    </main>
  );
}

function PlanCard({
  plan,
  onEdit,
  onToggle,
  onDelete,
}: {
  plan: Plan;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const prices = {
    veg: Number(
      plan.prices?.veg || plan.price || 0
    ),
    nonveg: Number(
      plan.prices?.nonveg || plan.price || 0
    ),
    mixed: Number(
      plan.prices?.mixed || plan.price || 0
    ),
  };

  return (
    <article className="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:border-green-200">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-gradient-to-br from-green-50 via-white to-slate-50 sm:h-auto sm:w-[210px]">
          {plan.imageUrl ? (
            <img
              src={plan.imageUrl}
              alt={plan.title}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center">
              <Layers3
                size={42}
                className="text-green-200"
              />
            </div>
          )}

          {plan.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black text-white">
              {plan.badge}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    plan.isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {plan.isActive
                    ? "Active"
                    : "Inactive"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                  {goalLabelMap[plan.goal]}
                </span>

                {plan.rewardEligible !== false && (
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700">
                    Reward
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">
                {plan.title}
              </h3>

              <p className="mt-1 text-xs font-bold text-slate-400">
                ID: {getPlanId(plan)}
              </p>

              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                {plan.subtitle ||
                  plan.description ||
                  "No plan description added."}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Starting From
              </p>

              <p className="mt-1 text-3xl font-black tracking-[-0.05em]">
                ₹
                {Math.min(
                  ...[
                    prices.veg,
                    prices.nonveg,
                    prices.mixed,
                  ].filter((price) => price > 0)
                ) || plan.price}
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-3 gap-2">
            <PlanPriceTile
              label="Veg"
              price={prices.veg}
              enabled={
                plan.mealMode !== "nonveg"
              }
            />

            <PlanPriceTile
              label="Non-Veg"
              price={prices.nonveg}
              enabled={plan.mealMode !== "veg"}
            />

            <PlanPriceTile
              label="Mixed"
              price={prices.mixed}
              enabled={
                (plan.mealMode || "both") === "both"
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PlanMetric
              label="Duration"
              value={`${plan.durationDays} days`}
            />

            <PlanMetric
              label="Meal Slots"
              value={`${countSelectedMeals(
                plan.mealSets
              )}`}
            />

            <PlanMetric
              label="Plan Types"
              value={
                mealModeLabelMap[
                  plan.mealMode || "both"
                ]
              }
            />

            <PlanMetric
              label="Sort Order"
              value={`${plan.sortOrder || 0}`}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Edit3 size={15} />
              Edit
            </button>

            <button
              type="button"
              onClick={onToggle}
              className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-black ${
                plan.isActive
                  ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                  : "border-green-200 text-green-700 hover:bg-green-50"
              }`}
            >
              {plan.isActive
                ? "Deactivate"
                : "Activate"}
            </button>

            <button
              type="button"
              onClick={() =>
                setExpanded((current) => !current)
              }
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              {expanded ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}

              Details
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm font-black text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <DetailPanel title="Description">
              <p className="text-sm font-semibold leading-6 text-slate-600">
                {plan.description ||
                  "No description added."}
              </p>
            </DetailPanel>

            <DetailPanel title="Benefits">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextList
                  title="Perks"
                  items={plan.perks || []}
                />

                <TextList
                  title="Rewards"
                  items={plan.rewards || []}
                />
              </div>
            </DetailPanel>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {mealSetTabs.map((tab) => (
              <div
                key={tab.key}
                className="border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black">
                    {tab.short}
                  </p>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    {countSelectedMealsInSet(
                      plan.mealSets,
                      tab.key
                    )}
                    /{plan.durationDays}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {(plan.mealSets?.[tab.key] || []).map(
                    (item) => (
                      <div
                        key={`${tab.key}-${item.day}`}
                        className="flex gap-2 text-xs font-bold"
                      >
                        <span className="shrink-0 text-slate-400">
                          Day {item.day}
                        </span>

                        <span className="truncate text-slate-700">
                          {getMealTitle(item.meal) ||
                            "No meal"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function MealDaySelector({
  item,
  mealOptions,
  selectedMeal,
  selectedMealId,
  onChange,
}: {
  item: PlanMealDay;
  mealOptions: MealOption[];
  selectedMeal?: MealOption;
  selectedMealId: string;
  onChange: (mealId: string) => void;
}) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            Day {item.day}
          </p>

          <p className="text-[11px] font-bold text-slate-400">
            Select delivery meal
          </p>
        </div>

        {selectedMeal?.foodType && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              selectedMeal.foodType === "veg"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {selectedMeal.foodType === "veg"
              ? "Veg"
              : "Non-Veg"}
          </span>
        )}
      </div>

      <select
        value={selectedMealId}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="admin-input mt-3"
      >
        <option value="">Select meal</option>

        {mealOptions.map((meal) => (
          <option
            key={meal._id}
            value={meal._id}
          >
            {meal.title} · ₹{meal.price || 0}
          </option>
        ))}
      </select>

      {selectedMeal && (
        <div className="mt-3 flex gap-3 bg-slate-50 p-3">
          {selectedMeal.imageUrl && (
            <img
              src={selectedMeal.imageUrl}
              alt={selectedMeal.title}
              className="h-14 w-14 shrink-0 object-cover"
            />
          )}

          <div className="min-w-0">
            <p className="truncate text-xs font-black">
              {selectedMeal.title}
            </p>

            <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
              {selectedMeal.calories || 0} kcal ·{" "}
              {selectedMeal.protein || 0}g protein
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanDrawer({
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
        aria-label="Close plan editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[680px] sm:rounded-none">
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
          <h3 className="text-base font-black">
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

function PriceInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`border p-3 ${
        disabled
          ? "border-slate-200 bg-slate-100 opacity-60"
          : "border-green-100 bg-green-50"
      }`}
    >
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <div className="mt-2 flex items-center border border-slate-200 bg-white">
        <span className="px-3 font-black text-slate-500">
          ₹
        </span>

        <input
          type="number"
          min="0"
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="0"
          className="h-11 min-w-0 flex-1 bg-transparent pr-3 text-base font-black outline-none"
        />
      </div>
    </label>
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

function PlanPriceTile({
  label,
  price,
  enabled,
}: {
  label: string;
  price: number;
  enabled: boolean;
}) {
  return (
    <div
      className={`p-3 ${
        enabled
          ? "bg-green-50"
          : "bg-slate-100 opacity-50"
      }`}
    >
      <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black sm:text-base">
        {enabled ? `₹${price || 0}` : "N/A"}
      </p>
    </div>
  );
}

function PlanMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DetailPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-sm font-black">
        {title}
      </p>

      <div className="mt-3">{children}</div>
    </div>
  );
}

function TextList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-2 text-xs font-bold text-slate-400">
          No items
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2"
            >
              <span className="text-green-600">
                •
              </span>

              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        <Utensils size={25} />
      </span>

      <h3 className="mt-4 text-xl font-black">
        No plans found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Change the filters or create a new meal plan.
      </p>
    </div>
  );
}