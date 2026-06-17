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
  CheckCircle2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
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
  code?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  linkTo?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type QuickFilter =
  | "all"
  | "veg"
  | "nonveg"
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating"
  | "protein_high"
  | "calories_low"
  | "price_low";

const goalLabels: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const defaultOffers: OfferBanner[] = [
  {
    title: "Launch Day Offer",
    subtitle: "Try your first MacroBox meal from ₹99. Limited period only.",
    badge: "NEW",
    code: "LAUNCH99",
    ctaText: "Order Now",
    ctaLink: "/meals",
  },
  {
    title: "7-Day Meal Plans",
    subtitle: "Buy a plan and unlock 10% OFF your next eligible plan.",
    badge: "REWARD",
    code: "PLAN10",
    ctaText: "View Plans",
    ctaLink: "/plans",
  },
  {
    title: "High Protein Picks",
    subtitle: "Fresh meals for gym, fat loss and clean eating goals.",
    badge: "POPULAR",
    ctaText: "Explore",
    ctaLink: "/meals?goal=muscle_gain",
  },
  {
    title: "Clean Eating Meals",
    subtitle: "Light, fresh and macro-counted meals for daily routine.",
    badge: "HEALTHY",
    ctaText: "Explore",
    ctaLink: "/meals?goal=clean_eating",
  },
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

const getOfferLink = (offer: OfferBanner) => {
  return offer.ctaLink || offer.linkTo || "/meals";
};

const normalizeOffers = (items: OfferBanner[]) => {
  const clean = items.filter((item) => item.isActive !== false);

  if (clean.length === 0) return defaultOffers;

  return clean.sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
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
  const [offers, setOffers] = useState<OfferBanner[]>(defaultOffers);

  const [filter, setFilter] = useState<FilterType>("all");
  const [goal, setGoal] = useState<GoalType | "">(initialGoal);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    let mounted = true;

    const fetchOffers = async () => {
      try {
        const res = await api.get("/offers/public");
        if (!mounted) return;

        const data = Array.isArray(res.data) ? res.data : [];
        setOffers(normalizeOffers(data));
      } catch {
        if (!mounted) return;
        setOffers(defaultOffers);
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

  const topPicks = useMemo(() => {
    return [...filteredMeals]
      .sort((a, b) => Number(b.protein || 0) - Number(a.protein || 0))
      .slice(0, 6);
  }, [filteredMeals]);

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

  const handleQuickFilter = (value: QuickFilter) => {
    if (value === "all") {
      changeGoal("");
      setFilter("all");
      setSortBy("default");
      return;
    }

    if (value === "veg" || value === "nonveg") {
      setFilter(value);
      return;
    }

    if (
      value === "fat_loss" ||
      value === "muscle_gain" ||
      value === "weight_gain" ||
      value === "clean_eating"
    ) {
      changeGoal(value);
      return;
    }

    if (
      value === "protein_high" ||
      value === "calories_low" ||
      value === "price_low"
    ) {
      setSortBy(value);
    }
  };

  const resetFilters = () => {
    setGoal("");
    setFilter("all");
    setSortBy("default");
    setSearchQuery("");
    setSearchParams(welcome ? { welcome: "true" } : {});
  };

  const activeTitle = goal ? `${goalLabels[goal]} Meals` : "All Meals";

  const firstOffer = offers[0] || defaultOffers[0];
  const scrollingOffers = offers.length >= 3 ? offers : [...offers, ...defaultOffers];

  return (
    <main className="min-h-screen bg-white pb-28 text-slate-950">
      <section className="bg-white">
        <div className="mx-auto max-w-[1220px] px-4 pt-5 sm:px-6 lg:pt-8">
          <div className="relative overflow-hidden rounded-b-[34px] bg-slate-950 px-5 pb-6 pt-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.25)] sm:rounded-[34px] sm:px-8 sm:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.35),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-300">
                    <Sparkles size={13} />
                    MacroBox
                  </p>

                  <h1 className="mt-4 text-[30px] font-black leading-[0.98] tracking-[-0.06em] sm:text-[48px]">
                    Order healthy meals
                  </h1>

                  <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                    Macro-counted meals with protein, calories, carbs and fat
                    shown clearly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/plans")}
                  className="hidden h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-950 sm:inline-flex"
                >
                  Plans
                  <ArrowRight size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate(getOfferLink(firstOffer))}
                className="mt-6 w-full rounded-[24px] bg-white p-4 text-left text-slate-950 shadow-xl sm:max-w-[560px] sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-green-700">
                      {firstOffer.badge || "Offer"}
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-3xl">
                      {firstOffer.title}
                    </h2>

                    <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                      {firstOffer.subtitle ||
                        "Special MacroBox offer available now."}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-600 px-3 py-2 text-sm font-black text-white">
                    {firstOffer.code || "NEW"}
                  </span>
                </div>

                <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                  <p className="text-sm font-black text-green-700">
                    {firstOffer.ctaText || "Explore"} →
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="sticky top-[76px] z-30 -mx-4 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:border-b-0 lg:bg-transparent lg:px-0">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for meals"
                className="h-13 w-full rounded-[18px] border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip
                label="All"
                active={!goal && filter === "all" && sortBy === "default"}
                onClick={() => handleQuickFilter("all")}
              />

              <FilterChip
                label="Veg"
                active={filter === "veg"}
                dot="veg"
                onClick={() => handleQuickFilter("veg")}
              />

              <FilterChip
                label="Non-Veg"
                active={filter === "nonveg"}
                dot="nonveg"
                onClick={() => handleQuickFilter("nonveg")}
              />

              <FilterChip
                label="Fat Loss"
                active={goal === "fat_loss"}
                onClick={() => handleQuickFilter("fat_loss")}
              />

              <FilterChip
                label="Muscle Gain"
                active={goal === "muscle_gain"}
                onClick={() => handleQuickFilter("muscle_gain")}
              />

              <FilterChip
                label="Clean Eating"
                active={goal === "clean_eating"}
                onClick={() => handleQuickFilter("clean_eating")}
              />

              <FilterChip
                label="Protein High"
                active={sortBy === "protein_high"}
                onClick={() => handleQuickFilter("protein_high")}
              />

              <FilterChip
                label="Low Calorie"
                active={sortBy === "calories_low"}
                onClick={() => handleQuickFilter("calories_low")}
              />

              <FilterChip
                label="Price Low"
                active={sortBy === "price_low"}
                onClick={() => handleQuickFilter("price_low")}
              />

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6">
        <section className="mb-7 overflow-hidden border-y border-slate-100 bg-white py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Offers & Updates
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                Scroll anytime. Auto-scroll continues without stopping.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/meals")}
              className="hidden text-xs font-black text-green-700 sm:block"
            >
              Manage offers
            </button>
          </div>

          <div className="offer-marquee-wrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="offer-marquee-track flex w-max gap-3 sm:gap-4">
              {[...scrollingOffers, ...scrollingOffers].map((offer, index) => (
                <button
                  key={`${offer._id || offer.title}-${index}`}
                  type="button"
                  onClick={() => navigate(getOfferLink(offer))}
                  className="min-w-[280px] rounded-[22px] border border-green-100 bg-gradient-to-br from-green-50 via-white to-white p-4 text-left shadow-sm transition hover:border-green-300 hover:shadow-md sm:min-w-[360px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-green-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                        {offer.badge || "Offer"}
                      </span>

                      <h3 className="mt-3 line-clamp-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                        {offer.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                        {offer.subtitle ||
                          "Special MacroBox offer available now."}
                      </p>
                    </div>

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                      <ArrowRight size={18} />
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-green-700">
                      {offer.ctaText || "Explore"}
                    </p>

                    {offer.code && (
                      <p className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                        {offer.code}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {topPicks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              Top Picks
            </h2>

            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {topPicks.map((meal) => {
                const qty = getCartQty(meal._id);

                return (
                  <article
                    key={`top-${meal._id}`}
                    className="relative h-[245px] min-w-[230px] overflow-hidden rounded-[26px] bg-slate-200 shadow-sm sm:h-[280px] sm:min-w-[270px]"
                  >
                    <img
                      src={meal.imageUrl || "/placeholder-meal.png"}
                      alt={meal.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-meal.png";
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          meal.foodType === "veg"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {getMealDietLabel(meal.foodType)}
                      </span>

                      <h3 className="mt-2 line-clamp-2 text-lg font-black leading-5 text-white">
                        {meal.title}
                      </h3>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xl font-black text-white">
                          ₹{meal.price || 0}
                        </p>

                        {qty > 0 ? (
                          <QtyControl
                            qty={qty}
                            onMinus={() => decreaseQty(meal._id)}
                            onPlus={() => handleIncrease(meal)}
                            light
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAdd(meal)}
                            className="h-11 rounded-[14px] bg-white px-6 text-sm font-black text-green-700 shadow-lg"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
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
              onClick={() => setSortBy("default")}
              className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-black text-slate-600 sm:inline-flex"
            >
              <SlidersHorizontal size={14} />
              Sort:{" "}
              {sortBy === "protein_high"
                ? "Protein High"
                : sortBy === "calories_low"
                ? "Low Calorie"
                : sortBy === "price_low"
                ? "Price Low"
                : "Default"}
            </button>
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
                Try changing the filter or search.
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
        </section>

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

      <style>{`
        .offer-marquee-wrap {
          cursor: grab;
        }

        .offer-marquee-wrap:active {
          cursor: grabbing;
        }

        .offer-marquee-track {
          animation: macroboxOfferMarquee 28s linear infinite;
          will-change: transform;
        }

        @keyframes macroboxOfferMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 640px) {
          .offer-marquee-track {
            animation-duration: 20s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .offer-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  dot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: "veg" | "nonveg";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black shadow-sm transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {dot && (
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-[5px] border ${
            dot === "veg" ? "border-green-600" : "border-red-500"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              dot === "veg" ? "bg-green-600" : "bg-red-500"
            }`}
          />
        </span>
      )}

      {label}
    </button>
  );
}

function QtyControl({
  qty,
  onMinus,
  onPlus,
  light,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  light?: boolean;
}) {
  return (
    <div
      className={`inline-flex h-10 overflow-hidden rounded-[14px] border sm:h-11 ${
        light ? "border-white bg-white" : "border-green-600 bg-white"
      }`}
    >
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