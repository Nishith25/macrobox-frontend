// frontend/src/pages/Meals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { Meal } from "./Home";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Flame,
  Leaf,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Utensils,
  Zap,
} from "lucide-react";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";
type FilterType = "all" | "veg" | "nonveg";
type SortType = "default" | "calories_low" | "protein_high" | "price_low";

type MealWithGoals = Meal & {
  goalTypes?: GoalType[];
  isAvailable?: boolean;
};

const goalLabels: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const goalOptions: {
  key: GoalType | "";
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "", label: "All", icon: <Utensils size={15} /> },
  { key: "fat_loss", label: "Fat Loss", icon: <Flame size={15} /> },
  { key: "muscle_gain", label: "Muscle Gain", icon: <Zap size={15} /> },
  { key: "weight_gain", label: "Weight Gain", icon: <TrendingUp size={15} /> },
  { key: "clean_eating", label: "Clean Eating", icon: <Leaf size={15} /> },
];

const isValidGoal = (value: string | null | undefined): value is GoalType =>
  value === "fat_loss" ||
  value === "muscle_gain" ||
  value === "weight_gain" ||
  value === "clean_eating";

const getMealDietLabel = (foodType?: string) => {
  if (foodType === "veg") return "Veg";
  if (foodType === "nonveg") return "Non-Veg";
  return "Meal";
};

const getMealDescription = (meal: MealWithGoals) => {
  return (
    meal.description ||
    `${meal.protein || 0}g protein • ${meal.calories || 0} kcal • balanced MacroBox meal`
  );
};

export default function Meals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  const urlGoal = searchParams.get("goal");
  const userGoal = user?.onboarding?.goal;

  const initialGoal: GoalType | "" = isValidGoal(urlGoal)
    ? urlGoal
    : isValidGoal(userGoal)
    ? userGoal
    : "";

  const [meals, setMeals] = useState<MealWithGoals[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [goal, setGoal] = useState<GoalType | "">(initialGoal);
  const [maxCalories, setMaxCalories] = useState(1000);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const welcome = searchParams.get("welcome") === "true";

  useEffect(() => {
    let mounted = true;

    const fetchMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<MealWithGoals[]>("/meals", {
          params: { all: "true" },
        });

        if (!mounted) return;
        setMeals(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!mounted) return;
        setMeals([]);
        setError("Failed to load meals. Please try again.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchMeals();

    return () => {
      mounted = false;
    };
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.qty || 0), 0),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0),
    [cart]
  );

  const maxMealCalories = useMemo(() => {
    if (meals.length === 0) return 1000;

    const highest = Math.max(...meals.map((meal) => Number(meal.calories || 0)));

    return Math.max(300, Math.ceil(highest / 100) * 100);
  }, [meals]);

  useEffect(() => {
    if (meals.length > 0) {
      setMaxCalories(maxMealCalories);
    }
  }, [maxMealCalories, meals.length]);

  const filteredMeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = meals.filter((meal) => {
      if (meal.isAvailable === false) return false;

      if (goal) {
        if (!meal.goalTypes || meal.goalTypes.length === 0) return false;
        if (!meal.goalTypes.includes(goal)) return false;
      }

      if (filter !== "all" && meal.foodType !== filter) return false;

      if (Number(meal.calories || 0) > maxCalories) return false;

      if (query) {
        const searchable = [
          meal.title,
          meal.description,
          meal.foodType,
          ...(meal.goalTypes || []).map((item) => goalLabels[item]),
          String(meal.price || ""),
          String(meal.calories || ""),
          String(meal.protein || ""),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "calories_low") {
        return Number(a.calories || 0) - Number(b.calories || 0);
      }

      if (sortBy === "protein_high") {
        return Number(b.protein || 0) - Number(a.protein || 0);
      }

      if (sortBy === "price_low") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      return 0;
    });
  }, [meals, goal, filter, maxCalories, sortBy, searchQuery]);

  const featuredMeals = useMemo(() => {
    return meals
      .filter((meal) => meal.isAvailable !== false)
      .slice(0, 8);
  }, [meals]);

  const getCartQty = (mealId: string) =>
    cart.find((item) => item._id === mealId)?.qty || 0;

  const handleAdd = (meal: MealWithGoals) => {
    addToCart({
      _id: meal._id,
      title: meal.title,
      price: meal.price,
      protein: meal.protein,
      calories: meal.calories,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      imageUrl: meal.imageUrl,
    });

    toast.custom(
      () => (
        <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-32px)] rounded-[18px] border border-green-100 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 text-green-700" />

            <div>
              <p className="font-extrabold text-slate-950">
                {meal.title} added
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                ₹{meal.price} • {meal.calories} kcal
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 1800, position: "bottom-right" }
    );
  };

  const handleIncrease = (meal: MealWithGoals) => {
    const existing = cart.find((item) => item._id === meal._id);

    if (existing) {
      increaseQty(meal._id);
    } else {
      handleAdd(meal);
    }
  };

  const changeGoal = (nextGoal: GoalType | "") => {
    setGoal(nextGoal);

    const params: Record<string, string> = {};
    if (nextGoal) params.goal = nextGoal;
    if (welcome) params.welcome = "true";

    setSearchParams(params);
  };

  const resetFilters = () => {
    setGoal("");
    setFilter("all");
    setSortBy("default");
    setSearchQuery("");
    setMaxCalories(maxMealCalories);
    setSearchParams(welcome ? { welcome: "true" } : {});
  };

  const activeGoalLabel = goal ? goalLabels[goal] : "All Meals";

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-950">
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 pb-4 pt-5 sm:px-6 lg:pb-6 lg:pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                MacroBox Meals
              </p>

              <h1 className="mt-2 text-[34px] font-black tracking-[-0.06em] text-slate-950 sm:text-[46px]">
                {goal ? `${goalLabels[goal]} Meals` : "Order healthy meals"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Choose macro-counted meals with protein, calories, carbs and fat
                shown clearly.
              </p>
            </div>

            <div className="flex w-full rounded-[18px] border border-slate-200 bg-white p-1 shadow-sm lg:w-fit">
              {(["all", "veg", "nonveg"] as FilterType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  className={`flex h-12 flex-1 items-center justify-center rounded-[14px] px-5 text-sm font-black transition lg:min-w-[86px] ${
                    filter === type
                      ? "bg-green-600 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-Veg"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {goalOptions.map((item) => (
              <button
                key={item.key || "all"}
                type="button"
                onClick={() => changeGoal(item.key)}
                className={`flex min-w-[112px] flex-col items-center justify-center gap-2 rounded-[22px] border px-4 py-4 text-center transition ${
                  goal === item.key
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-slate-100 bg-white text-slate-700 hover:border-green-200"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    goal === item.key
                      ? "bg-green-600 text-white"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="text-xs font-black">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6">
        {featuredMeals.length > 0 && (
          <div className="mb-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  What’s on your mind?
                </h2>

                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  Quick picks from MacroBox meals.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/plans")}
                className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white sm:inline-flex"
              >
                Plans
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featuredMeals.map((meal) => (
                <button
                  key={meal._id}
                  type="button"
                  onClick={() => setSearchQuery(meal.title)}
                  className="group min-w-[116px] text-center sm:min-w-[138px]"
                >
                  <div className="mx-auto h-[96px] w-[96px] overflow-hidden rounded-full bg-slate-100 shadow-sm transition group-hover:scale-105 sm:h-[118px] sm:w-[118px]">
                    <img
                      src={meal.imageUrl || "/placeholder-meal.png"}
                      alt={meal.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-meal.png";
                      }}
                    />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-black leading-5 text-slate-700">
                    {meal.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                {activeGoalLabel}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {filteredMeals.length} meals available
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          <div
            className={`mb-5 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm ${
              showMobileFilters ? "block" : "hidden lg:block"
            }`}
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_230px_240px_auto] lg:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search meals..."
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <SlidersHorizontal size={13} />
                    Calories ≤
                  </span>

                  <span className="text-green-700">{maxCalories} kcal</span>
                </div>

                <input
                  type="range"
                  min={100}
                  max={maxMealCalories}
                  step={50}
                  value={maxCalories}
                  onChange={(e) => setMaxCalories(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-green-600"
                />
              </div>

              <div className="relative">
                <ArrowUpDown
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="h-12 w-full appearance-none rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                >
                  <option value="default">Sort: Default</option>
                  <option value="calories_low">Calories: Low to High</option>
                  <option value="protein_high">Protein: High to Low</option>
                  <option value="price_low">Price: Low to High</option>
                </select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500 shadow-sm">
            Loading meals...
          </div>
        ) : error ? (
          <div className="border border-red-100 bg-red-50 p-10 text-center text-sm font-black text-red-600">
            {error}
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">
              No meals available
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Try changing the goal, diet type, search or calories filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMeals.map((meal, index) => {
              const qty = getCartQty(meal._id);
              const isPopular = index < 2;

              return (
                <article
                  key={meal._id}
                  className="group border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-4"
                >
                  <div className="grid grid-cols-[116px_1fr] gap-3 sm:grid-cols-[160px_1fr_auto] sm:gap-5">
                    <div className="relative h-[112px] overflow-hidden bg-slate-100 sm:h-[144px]">
                      <img
                        src={meal.imageUrl || "/placeholder-meal.png"}
                        alt={meal.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-meal.png";
                        }}
                      />

                      {isPopular && (
                        <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black text-white">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                            meal.foodType === "veg"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {getMealDietLabel(meal.foodType)}
                        </span>

                        {meal.goalTypes?.slice(0, 2).map((item) => (
                          <span
                            key={item}
                            className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 sm:inline-flex"
                          >
                            {goalLabels[item]}
                          </span>
                        ))}
                      </div>

                      <h3 className="mt-2 line-clamp-2 text-base font-black leading-5 tracking-[-0.03em] text-slate-950 sm:text-xl sm:leading-6">
                        {meal.title || "Untitled Meal"}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 sm:mt-2 sm:text-sm">
                        {getMealDescription(meal)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black text-slate-500 sm:text-xs">
                        <span>{meal.calories || 0} kcal</span>
                        <span>•</span>
                        <span>{meal.protein || 0}g protein</span>
                        <span>•</span>
                        <span>{meal.carbs || 0}g carbs</span>
                        <span>•</span>
                        <span>{meal.fat || 0}g fat</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between sm:hidden">
                        <p className="text-lg font-black text-slate-950">
                          ₹{meal.price || 0}
                        </p>

                        {qty > 0 ? (
                          <QtyControl
                            qty={qty}
                            onMinus={() => decreaseQty(meal._id)}
                            onPlus={() => handleIncrease(meal)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAdd(meal)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border border-green-600 bg-white px-4 text-xs font-black text-green-700 shadow-sm"
                          >
                            Add
                            <Plus size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="hidden min-w-[150px] flex-col items-end justify-between sm:flex">
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Price
                        </p>

                        <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                          ₹{meal.price || 0}
                        </p>
                      </div>

                      {qty > 0 ? (
                        <QtyControl
                          qty={qty}
                          onMinus={() => decreaseQty(meal._id)}
                          onPlus={() => handleIncrease(meal)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(meal)}
                          className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-green-600 bg-white px-5 text-sm font-black text-green-700 shadow-sm transition hover:bg-green-50"
                        >
                          Add
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {cartCount > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-[9999] border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.12)]">
            <div className="mx-auto flex max-w-[1220px] items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  {cartCount} item{cartCount > 1 ? "s" : ""} added
                </p>

                <p className="text-xs font-bold text-slate-500">
                  Total ₹{cartTotal}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[14px] bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
              >
                <ShoppingCart size={17} />
                View Cart
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function QtyControl({
  qty,
  onMinus,
  onPlus,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="inline-flex h-10 overflow-hidden rounded-[14px] border border-green-600 bg-white sm:h-11">
      <button
        type="button"
        onClick={onMinus}
        className="flex w-10 items-center justify-center text-green-700 transition hover:bg-green-50 sm:w-11"
      >
        <Minus size={16} />
      </button>

      <span className="flex w-9 items-center justify-center text-sm font-black text-green-700 sm:w-10">
        {qty}
      </span>

      <button
        type="button"
        onClick={onPlus}
        className="flex w-10 items-center justify-center bg-green-50 text-green-700 transition hover:bg-green-100 sm:w-11"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}