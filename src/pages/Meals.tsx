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
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";
type FilterType = "all" | "veg" | "nonveg";
type SortType = "default" | "calories_low" | "protein_high" | "price_low";

type MealWithGoals = Meal & {
  goalTypes?: GoalType[];
  isAvailable?: boolean;
};

type OfferBanner = {
  _id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive?: boolean;
};

const goalLabels: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const goalOptions: { key: GoalType | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "weight_gain", label: "Weight Gain" },
  { key: "clean_eating", label: "Clean Eating" },
];

const dietOptions: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "veg", label: "Veg" },
  { key: "nonveg", label: "Non-Veg" },
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

const getOfferLink = (link?: string) => {
  const clean = String(link || "").trim();
  return clean || "/meals";
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
  const [offers, setOffers] = useState<OfferBanner[]>([]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [goal, setGoal] = useState<GoalType | "">(initialGoal);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(false);
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

  useEffect(() => {
    let mounted = true;

    const fetchOffers = async () => {
      try {
        setOffersLoading(true);

        const res = await api.get("/offers/public");
        const data = Array.isArray(res.data) ? res.data : [];

        if (!mounted) return;

        setOffers(data.filter((item: OfferBanner) => item.isActive !== false));
      } catch {
        if (!mounted) return;
        setOffers([]);
      } finally {
        if (!mounted) return;
        setOffersLoading(false);
      }
    };

    fetchOffers();

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

  const filteredMeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = meals.filter((meal) => {
      if (meal.isAvailable === false) return false;

      if (goal) {
        if (!meal.goalTypes || meal.goalTypes.length === 0) return false;
        if (!meal.goalTypes.includes(goal)) return false;
      }

      if (filter !== "all" && meal.foodType !== filter) return false;

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
  }, [meals, goal, filter, sortBy, searchQuery]);

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
    setSearchParams(welcome ? { welcome: "true" } : {});
  };

  const activeTitle = goal ? `${goalLabels[goal]} Meals` : "All Meals";

  const hasActiveFilters =
    goal !== "" || filter !== "all" || sortBy !== "default" || searchQuery.trim();

  const scrollingOffers =
    offers.length > 1 ? [...offers, ...offers] : offers;

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-950">
      <style>
        {`
          @keyframes macrobox-offer-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .macrobox-offer-track {
            animation: macrobox-offer-scroll 24s linear infinite;
          }

          .macrobox-offer-track:hover {
            animation-play-state: paused;
          }

          @media (max-width: 640px) {
            .macrobox-offer-track {
              animation-duration: 18s;
            }
          }
        `}
      </style>

      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 pb-5 pt-5 sm:px-6 lg:pb-7 lg:pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                MacroBox Meals
              </p>

              <h1 className="mt-2 text-[34px] font-black tracking-[-0.06em] text-slate-950 sm:text-[46px]">
                Order healthy meals
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Choose macro-counted meals with protein, calories, carbs and fat
                shown clearly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/plans")}
              className="hidden h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white lg:inline-flex"
            >
              View Plans
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6">
        {offers.length > 0 && (
          <section className="mb-6 overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-green-600" />

                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                    Offers & Updates
                  </h2>

                  <p className="text-xs font-semibold text-slate-500">
                    Latest MacroBox offers selected by admin.
                  </p>
                </div>
              </div>

              {offersLoading && (
                <span className="text-xs font-black text-slate-400">
                  Loading
                </span>
              )}
            </div>

            <div className="relative overflow-hidden p-4 sm:p-5">
              <div
                className={`flex w-max gap-4 ${
                  offers.length > 1 ? "macrobox-offer-track" : ""
                }`}
              >
                {scrollingOffers.map((offer, index) => (
                  <button
                    key={`${offer._id || offer.title}-${index}`}
                    type="button"
                    onClick={() => navigate(getOfferLink(offer.ctaLink))}
                    className="min-w-[260px] border border-green-100 bg-gradient-to-br from-green-50 via-white to-white p-4 text-left transition hover:border-green-300 hover:shadow-md sm:min-w-[360px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                          {offer.badge || "Offer"}
                        </span>

                        <h3 className="mt-3 line-clamp-1 text-lg font-black tracking-[-0.04em] text-slate-950 sm:text-xl">
                          {offer.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                          {offer.subtitle ||
                            "Special MacroBox offer available now."}
                        </p>
                      </div>

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white sm:h-11 sm:w-11">
                        <ArrowRight size={18} />
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-black text-green-700">
                      {offer.ctaText || "Explore"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mb-5">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {activeTitle}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {filteredMeals.length} meals available
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {goalOptions.map((item) => (
                <button
                  key={item.key || "all"}
                  type="button"
                  onClick={() => changeGoal(item.key)}
                  className={`h-10 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                    goal === item.key
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {dietOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`h-10 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                    filter === item.key
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSortBy("protein_high")}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                  sortBy === "protein_high"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Protein High
              </button>

              <button
                type="button"
                onClick={() => setSortBy("calories_low")}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                  sortBy === "calories_low"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Low Calorie
              </button>

              <button
                type="button"
                onClick={() => setSortBy("price_low")}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                  sortBy === "price_low"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Price Low
              </button>
            </div>

            <div className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_230px]">
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

              <div className="relative hidden lg:block">
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
            </div>
          </div>
        </section>

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
              Try changing the goal, diet type, search or sort filter.
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