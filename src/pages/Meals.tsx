// frontend/src/pages/Meals.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Flame,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import type { Meal } from "./Home";

type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating";

type FilterType = "all" | "veg" | "nonveg";

type SortType =
  | "default"
  | "calories_low"
  | "protein_high"
  | "price_low";

type MealWithGoals = Meal & {
  goalTypes?: GoalType[];
  isAvailable?: boolean;
  isTopPick?: boolean;
  topPickOrder?: number;
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

const goalLabels: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const goalOptions: Array<{
  key: GoalType | "";
  label: string;
}> = [
  {
    key: "",
    label: "All Meals",
  },
  {
    key: "fat_loss",
    label: "Fat Loss",
  },
  {
    key: "muscle_gain",
    label: "Muscle Gain",
  },
  {
    key: "weight_gain",
    label: "Weight Gain",
  },
  {
    key: "clean_eating",
    label: "Clean Eating",
  },
];

const dietOptions: Array<{
  key: FilterType;
  label: string;
}> = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "veg",
    label: "Veg",
  },
  {
    key: "nonveg",
    label: "Non-Veg",
  },
];

const sortOptions: Array<{
  key: SortType;
  label: string;
}> = [
  {
    key: "default",
    label: "Recommended",
  },
  {
    key: "protein_high",
    label: "High Protein",
  },
  {
    key: "calories_low",
    label: "Low Calories",
  },
  {
    key: "price_low",
    label: "Lowest Price",
  },
];

const defaultOffers: OfferBanner[] = [
  {
    title: "Launch Day Offer",
    subtitle:
      "Try your first MacroBox meal from ₹99. Limited period only.",
    badge: "NEW",
    code: "LAUNCH99",
    ctaText: "Order Now",
    ctaLink: "/meals",
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "7-Day Meal Plans",
    subtitle:
      "Buy a plan and unlock 10% OFF your next eligible plan.",
    badge: "REWARD",
    code: "PLAN10",
    ctaText: "View Plans",
    ctaLink: "/plans",
    isActive: true,
    sortOrder: 2,
  },
  {
    title: "High Protein Picks",
    subtitle:
      "Fresh meals selected for gym, fat loss and clean eating.",
    badge: "POPULAR",
    ctaText: "Explore",
    ctaLink: "/meals?goal=muscle_gain",
    isActive: true,
    sortOrder: 3,
  },
];

const isValidGoal = (
  value: string | null | undefined
): value is GoalType =>
  value === "fat_loss" ||
  value === "muscle_gain" ||
  value === "weight_gain" ||
  value === "clean_eating";

const getMealDietLabel = (foodType?: string) => {
  if (foodType === "veg") return "Veg";
  if (foodType === "nonveg") return "Non-Veg";
  return "Meal";
};

const getMealDescription = (meal: MealWithGoals) =>
  meal.description ||
  `${meal.protein || 0}g protein · ${
    meal.calories || 0
  } kcal · balanced MacroBox meal`;

const getOfferLink = (offer: OfferBanner) => {
  const link = String(
    offer.ctaLink || offer.linkTo || ""
  ).trim();

  return link || "/meals";
};

const normalizeOffers = (items: OfferBanner[]) => {
  const activeOffers = items
    .filter((item) => item.isActive !== false)
    .sort(
      (a, b) =>
        Number(a.sortOrder || 0) -
        Number(b.sortOrder || 0)
    );

  return activeOffers.length > 0
    ? activeOffers
    : defaultOffers;
};

export default function Meals() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const { user } = useAuth();

  const {
    cart,
    addToCart,
    increaseQty,
    decreaseQty,
  } = useCart();

  const urlGoal = searchParams.get("goal");
  const userGoal = user?.onboarding?.goal;

  const initialGoal: GoalType | "" =
    isValidGoal(urlGoal)
      ? urlGoal
      : isValidGoal(userGoal)
      ? userGoal
      : "";

  const [meals, setMeals] = useState<
    MealWithGoals[]
  >([]);

  const [offers, setOffers] =
    useState<OfferBanner[]>(defaultOffers);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [goal, setGoal] =
    useState<GoalType | "">(initialGoal);

  const [sortBy, setSortBy] =
    useState<SortType>("default");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [offersLoading, setOffersLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const welcome =
    searchParams.get("welcome") === "true";

  useEffect(() => {
    let mounted = true;

    const fetchMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get<
          MealWithGoals[]
        >("/meals", {
          params: {
            all: "true",
          },
        });

        if (!mounted) return;

        setMeals(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch {
        if (!mounted) return;

        setMeals([]);
        setError(
          "Failed to load meals. Please try again."
        );
      } finally {
        if (!mounted) return;

        setLoading(false);
      }
    };

    void fetchMeals();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchOffers = async () => {
      try {
        setOffersLoading(true);

        const response = await api.get(
          "/offers/public"
        );

        const data = Array.isArray(response.data)
          ? response.data
          : [];

        if (!mounted) return;

        setOffers(normalizeOffers(data));
      } catch {
        if (!mounted) return;

        setOffers(defaultOffers);
      } finally {
        if (!mounted) return;

        setOffersLoading(false);
      }
    };

    void fetchOffers();

    return () => {
      mounted = false;
    };
  }, []);

  const cartCount = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + Number(item.qty || 0),
        0
      ),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            Number(item.qty || 0),
        0
      ),
    [cart]
  );

  const filteredMeals = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    const result = meals.filter((meal) => {
      if (meal.isAvailable === false) {
        return false;
      }

      if (goal) {
        if (
          !meal.goalTypes ||
          meal.goalTypes.length === 0
        ) {
          return false;
        }

        if (!meal.goalTypes.includes(goal)) {
          return false;
        }
      }

      if (
        filter !== "all" &&
        meal.foodType !== filter
      ) {
        return false;
      }

      if (query) {
        const searchable = [
          meal.title,
          meal.description,
          meal.foodType,
          ...(meal.goalTypes || []).map(
            (item) => goalLabels[item]
          ),
          String(meal.price || ""),
          String(meal.calories || ""),
          String(meal.protein || ""),
          String(meal.carbs || ""),
          String(meal.fat || ""),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "calories_low") {
        return (
          Number(a.calories || 0) -
          Number(b.calories || 0)
        );
      }

      if (sortBy === "protein_high") {
        return (
          Number(b.protein || 0) -
          Number(a.protein || 0)
        );
      }

      if (sortBy === "price_low") {
        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );
      }

      return 0;
    });
  }, [
    meals,
    goal,
    filter,
    sortBy,
    searchQuery,
  ]);

  const topPicks = useMemo(() => {
    return meals
      .filter(
        (meal) =>
          meal.isAvailable !== false &&
          meal.isTopPick === true
      )
      .sort(
        (a, b) =>
          Number(a.topPickOrder || 0) -
            Number(b.topPickOrder || 0) ||
          String(a.title || "").localeCompare(
            String(b.title || "")
          )
      );
  }, [meals]);

  const scrollingOffers = useMemo(() => {
    const base =
      offers.length > 0
        ? offers
        : defaultOffers;

    return [...base, ...base, ...base];
  }, [offers]);

  const getCartQty = (mealId: string) =>
    cart.find((item) => item._id === mealId)
      ?.qty || 0;

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
        <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-28px)] rounded-2xl border border-white/15 bg-[#211f1d]/95 px-4 py-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
              <CheckCircle2 size={18} />
            </span>

            <div>
              <p className="font-semibold">
                {meal.title} added
              </p>

              <p className="mt-1 text-xs text-white/50">
                ₹{meal.price} ·{" "}
                {meal.calories || 0} kcal
              </p>
            </div>
          </div>
        </div>
      ),
      {
        duration: 1800,
        position: "bottom-right",
      }
    );
  };

  const handleIncrease = (
    meal: MealWithGoals
  ) => {
    const existing = cart.find(
      (item) => item._id === meal._id
    );

    if (existing) {
      increaseQty(meal._id);
    } else {
      handleAdd(meal);
    }
  };

  const changeGoal = (
    nextGoal: GoalType | ""
  ) => {
    setGoal(nextGoal);

    const params: Record<string, string> =
      {};

    if (nextGoal) {
      params.goal = nextGoal;
    }

    if (welcome) {
      params.welcome = "true";
    }

    setSearchParams(params);
  };

  const resetFilters = () => {
    setGoal("");
    setFilter("all");
    setSortBy("default");
    setSearchQuery("");

    setSearchParams(
      welcome
        ? {
            welcome: "true",
          }
        : {}
    );
  };

  const hasActiveFilters = Boolean(
    goal !== "" ||
      filter !== "all" ||
      sortBy !== "default" ||
      searchQuery.trim()
  );

  const activeTitle = goal
    ? `${goalLabels[goal]} Meals`
    : "All Meals";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#171614] pb-32 text-white">
      <BackgroundDecoration />

      <style>
        {`
          @keyframes macrobox-offer-scroll {
            0% {
              transform: translate3d(0, 0, 0);
            }

            100% {
              transform: translate3d(-33.333%, 0, 0);
            }
          }

          .macrobox-offer-track {
            animation: macrobox-offer-scroll 22s linear infinite;
            will-change: transform;
          }

          .macrobox-offer-viewport {
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }

          .macrobox-offer-viewport::-webkit-scrollbar {
            display: none;
          }

          .macrobox-hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .macrobox-hide-scrollbar::-webkit-scrollbar {
            display: none;
          }

          @media (max-width: 640px) {
            .macrobox-offer-track {
              animation-duration: 17s;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .macrobox-offer-track {
              animation: none;
            }
          }
        `}
      </style>

      <div className="relative z-10">
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-[1240px] px-4 pb-7 pt-7 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8 lg:pb-14 lg:pt-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40 sm:text-xs">
                  MacroBox Meals
                </p>

                <h1 className="mt-4 max-w-3xl text-[39px] font-light leading-[1.05] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[72px]">
                  Healthy meals,
                  <br />
                  made simple.
                </h1>

                <p className="mt-5 max-w-xl text-sm font-normal leading-6 text-white/50 sm:text-base sm:leading-7">
                  Fresh macro-counted meals with
                  calories, protein, carbs and fat
                  shown clearly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/plans")}
                className="hidden h-13 items-center gap-2 rounded-full border border-white/20 bg-white px-6 text-sm font-medium text-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition hover:bg-white/90 lg:inline-flex"
              >
                Explore meal plans
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search meals, protein, calories..."
                  className="h-14 w-full rounded-full border border-white/20 bg-white/[0.07] pl-12 pr-5 text-sm font-medium text-white outline-none backdrop-blur-xl transition placeholder:text-white/30 focus:border-white/60 focus:bg-white/[0.1]"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen(true)
                }
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-6 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/[0.12] lg:hidden"
              >
                <SlidersHorizontal size={17} />
                Filters
              </button>

              <div className="hidden items-center gap-3 lg:flex">
                <div className="relative">
                  <ArrowUpDown
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />

                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(
                        event.target
                          .value as SortType
                      )
                    }
                    className="h-14 appearance-none rounded-full border border-white/20 bg-[#2a2826] pl-11 pr-12 text-sm font-medium text-white outline-none transition focus:border-white/60"
                  >
                    {sortOptions.map((option) => (
                      <option
                        key={option.key}
                        value={option.key}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35"
                  />
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.07] text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="mb-8 overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.06] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950">
                  <Sparkles size={18} />
                </span>

                <div>
                  <h2 className="text-base font-medium text-white sm:text-lg">
                    Offers & updates
                  </h2>

                  <p className="mt-0.5 text-xs text-white/40">
                    Latest MacroBox offers
                  </p>
                </div>
              </div>

              {offersLoading && (
                <span className="text-xs text-white/35">
                  Updating
                </span>
              )}
            </div>

            <div className="macrobox-offer-viewport p-4 sm:p-5">
              <div className="macrobox-offer-track flex w-max gap-4">
                {scrollingOffers.map(
                  (offer, index) => (
                    <button
                      key={`${
                        offer._id ||
                        offer.title
                      }-${index}`}
                      type="button"
                      onClick={() =>
                        navigate(
                          getOfferLink(offer)
                        )
                      }
                      className="relative min-h-[180px] min-w-[280px] overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.08] p-5 text-left backdrop-blur-2xl transition hover:border-white/35 hover:bg-white/[0.12] sm:min-w-[390px]"
                    >
                      {offer.imageUrl && (
                        <>
                          <img
                            src={offer.imageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-25"
                          />

                          <div className="absolute inset-0 bg-gradient-to-r from-[#171614] via-[#171614]/80 to-transparent" />
                        </>
                      )}

                      <div className="relative z-10 flex h-full flex-col justify-between">
                        <div>
                          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                            {offer.badge || "Offer"}
                          </span>

                          <h3 className="mt-4 line-clamp-1 text-xl font-medium tracking-[-0.03em] text-white sm:text-2xl">
                            {offer.title}
                          </h3>

                          <p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-white/50">
                            {offer.subtitle ||
                              "Special MacroBox offer available now."}
                          </p>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                            {offer.ctaText ||
                              "Explore"}
                            <ArrowRight size={15} />
                          </span>

                          {offer.code && (
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-950">
                              {offer.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          </section>

          {topPicks.length > 0 && (
            <section className="mb-10">
              <SectionHeading
                eyebrow="Selected by MacroBox"
                title="Top picks"
                count={topPicks.length}
              />

              <div className="macrobox-hide-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {topPicks.map((meal) => {
                  const qty = getCartQty(
                    meal._id
                  );

                  return (
                    <article
                      key={`top-${meal._id}`}
                      className="group relative h-[310px] min-w-[245px] overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.06] shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:h-[365px] sm:min-w-[310px]"
                    >
                      <img
                        src={
                          meal.imageUrl ||
                          "/placeholder-meal.png"
                        }
                        alt={meal.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.src =
                            "/placeholder-meal.png";
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-xl">
                          <Star
                            size={12}
                            className="fill-white"
                          />
                          Top pick
                        </span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <div className="flex flex-wrap gap-2">
                          <DietBadge
                            type={meal.foodType}
                          />

                          <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur-xl">
                            {meal.protein || 0}g
                            protein
                          </span>
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-[22px] font-medium leading-tight tracking-[-0.04em] text-white sm:text-[28px]">
                          {meal.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/55 sm:text-sm">
                          {getMealDescription(meal)}
                        </p>

                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-white/35">
                              Price
                            </p>

                            <p className="mt-1 text-2xl font-medium text-white">
                              ₹{meal.price || 0}
                            </p>
                          </div>

                          {qty > 0 ? (
                            <DarkQtyControl
                              qty={qty}
                              onMinus={() =>
                                decreaseQty(
                                  meal._id
                                )
                              }
                              onPlus={() =>
                                handleIncrease(meal)
                              }
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdd(meal)
                              }
                              className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-slate-950 shadow-[0_14px_35px_rgba(0,0,0,0.25)] transition hover:bg-white/90"
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
            </section>
          )}

          <section>
            <div className="flex flex-col gap-5">
              <SectionHeading
                eyebrow={
                  goal
                    ? "Personalized selection"
                    : "Explore the menu"
                }
                title={activeTitle}
                count={filteredMeals.length}
              />

              <div className="macrobox-hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {goalOptions.map((item) => (
                  <FilterPill
                    key={item.key || "all"}
                    active={goal === item.key}
                    onClick={() =>
                      changeGoal(item.key)
                    }
                  >
                    {item.label}
                  </FilterPill>
                ))}
              </div>

              <div className="hidden items-center justify-between gap-4 lg:flex">
                <div className="flex flex-wrap gap-2">
                  {dietOptions.map((item) => (
                    <FilterPill
                      key={item.key}
                      active={
                        filter === item.key
                      }
                      onClick={() =>
                        setFilter(item.key)
                      }
                    >
                      {item.label}
                    </FilterPill>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {sortOptions
                    .filter(
                      (item) =>
                        item.key !== "default"
                    )
                    .map((item) => (
                      <FilterPill
                        key={item.key}
                        active={
                          sortBy === item.key
                        }
                        onClick={() =>
                          setSortBy(item.key)
                        }
                      >
                        {item.label}
                      </FilterPill>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : filteredMeals.length === 0 ? (
                <EmptyState
                  hasActiveFilters={
                    hasActiveFilters
                  }
                  onReset={resetFilters}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredMeals.map((meal) => {
                    const qty = getCartQty(
                      meal._id
                    );

                    return (
                      <MealCard
                        key={meal._id}
                        meal={meal}
                        qty={qty}
                        onAdd={() =>
                          handleAdd(meal)
                        }
                        onIncrease={() =>
                          handleIncrease(meal)
                        }
                        onDecrease={() =>
                          decreaseQty(meal._id)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {cartCount > 0 && (
        <CartBar
          count={cartCount}
          total={cartTotal}
          onOpen={() => navigate("/cart")}
        />
      )}

      {mobileFiltersOpen && (
        <MobileFilters
          filter={filter}
          goal={goal}
          sortBy={sortBy}
          onFilterChange={setFilter}
          onGoalChange={changeGoal}
          onSortChange={setSortBy}
          onReset={resetFilters}
          onClose={() =>
            setMobileFiltersOpen(false)
          }
        />
      )}
    </main>
  );
}

function BackgroundDecoration() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(118,91,72,0.44),transparent_32%),radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_72%_82%,rgba(22,163,74,0.12),transparent_32%)]" />

      <div className="pointer-events-none absolute -left-20 top-44 h-80 w-80 rounded-full bg-[#725946]/25 blur-[120px]" />

      <div className="pointer-events-none absolute -right-20 bottom-48 h-96 w-96 rounded-full bg-green-950/25 blur-[130px]" />

      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-[30px] font-light tracking-[-0.045em] text-white sm:text-[40px]">
          {title}
        </h2>
      </div>

      <p className="shrink-0 text-xs font-medium text-white/40">
        {count} {count === 1 ? "meal" : "meals"}
      </p>
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-xs font-medium transition sm:text-sm ${
        active
          ? "border-white bg-white text-slate-950"
          : "border-white/15 bg-white/[0.05] text-white/55 hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function MealCard({
  meal,
  qty,
  onAdd,
  onIncrease,
  onDecrease,
}: {
  meal: MealWithGoals;
  qty: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.07] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.1] hover:shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
      <div className="relative h-[210px] overflow-hidden bg-white/5 sm:h-[230px]">
        <img
          src={
            meal.imageUrl ||
            "/placeholder-meal.png"
          }
          alt={meal.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src =
              "/placeholder-meal.png";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <DietBadge type={meal.foodType} />

          {meal.isTopPick === true && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-xl">
              <Star
                size={11}
                className="fill-white"
              />
              Top pick
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
          ₹{meal.price || 0}
        </div>
      </div>

      <div className="p-5">
        <div className="min-h-[112px]">
          <h3 className="line-clamp-2 text-[21px] font-medium leading-tight tracking-[-0.035em] text-white">
            {meal.title || "Untitled Meal"}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">
            {getMealDescription(meal)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 border-y border-white/10 py-4">
          <MacroValue
            label="Calories"
            value={`${meal.calories || 0}`}
          />

          <MacroValue
            label="Protein"
            value={`${meal.protein || 0}g`}
          />

          <MacroValue
            label="Carbs"
            value={`${meal.carbs || 0}g`}
          />

          <MacroValue
            label="Fat"
            value={`${meal.fat || 0}g`}
          />
        </div>

        {meal.goalTypes &&
          meal.goalTypes.length > 0 && (
            <div className="macrobox-hide-scrollbar mt-4 flex gap-2 overflow-x-auto">
              {meal.goalTypes
                .slice(0, 3)
                .map((item) => (
                  <span
                    key={item}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium text-white/45"
                  >
                    {goalLabels[item]}
                  </span>
                ))}
            </div>
          )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">
              Price
            </p>

            <p className="mt-1 text-xl font-medium text-white">
              ₹{meal.price || 0}
            </p>
          </div>

          {qty > 0 ? (
            <DarkQtyControl
              qty={qty}
              onMinus={onDecrease}
              onPlus={onIncrease}
            />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-slate-950 shadow-[0_14px_35px_rgba(0,0,0,0.22)] transition hover:bg-white/90"
            >
              Add meal
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function DietBadge({
  type,
}: {
  type?: string;
}) {
  const veg = type === "veg";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium backdrop-blur-xl ${
        veg
          ? "border-green-300/30 bg-green-500/20 text-green-100"
          : "border-red-300/30 bg-red-500/20 text-red-100"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          veg ? "bg-green-300" : "bg-red-300"
        }`}
      />

      {getMealDietLabel(type)}
    </span>
  );
}

function MacroValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-white/30">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-white/80 sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function DarkQtyControl({
  qty,
  onMinus,
  onPlus,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="inline-flex h-12 items-center overflow-hidden rounded-full border border-white/20 bg-white/[0.07] backdrop-blur-xl">
      <button
        type="button"
        onClick={onMinus}
        className="flex h-full w-12 items-center justify-center text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Minus size={16} />
      </button>

      <span className="flex w-9 items-center justify-center text-sm font-medium text-white">
        {qty}
      </span>

      <button
        type="button"
        onClick={onPlus}
        className="flex h-full w-12 items-center justify-center bg-white text-slate-950 transition hover:bg-white/90"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05]"
        >
          <div className="h-[220px] animate-pulse bg-white/[0.07]" />

          <div className="space-y-4 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-white/[0.08]" />

            <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />

            <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.06]" />

            <div className="h-12 animate-pulse rounded-full bg-white/[0.08]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-[30px] border border-red-400/20 bg-red-500/10 p-8 text-center backdrop-blur-xl">
      <p className="text-lg font-medium text-red-100">
        {message}
      </p>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onReset,
}: {
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/15 bg-white/[0.06] p-10 text-center backdrop-blur-2xl">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-950">
        <ShoppingBag size={23} />
      </span>

      <h3 className="mt-5 text-2xl font-light text-white">
        No meals found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
        Try changing your goal, diet preference,
        search or sorting option.
      </p>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-slate-950"
        >
          <RotateCcw size={16} />
          Reset filters
        </button>
      )}
    </div>
  );
}

function CartBar({
  count,
  total,
  onOpen,
}: {
  count: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#171614]/90 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
            <ShoppingCart size={18} />
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {count}{" "}
              {count === 1 ? "meal" : "meals"} added
            </p>

            <p className="mt-0.5 text-xs text-white/40">
              Total ₹{Math.round(total)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
        >
          View cart
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function MobileFilters({
  filter,
  goal,
  sortBy,
  onFilterChange,
  onGoalChange,
  onSortChange,
  onReset,
  onClose,
}: {
  filter: FilterType;
  goal: GoalType | "";
  sortBy: SortType;
  onFilterChange: (value: FilterType) => void;
  onGoalChange: (value: GoalType | "") => void;
  onSortChange: (value: SortType) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <aside className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] border-t border-white/15 bg-[#211f1d] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-24px_70px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/35">
              Refine results
            </p>

            <h2 className="mt-1 text-2xl font-light text-white">
              Filters
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <FilterGroup title="Goal">
            {goalOptions.map((item) => (
              <MobileFilterOption
                key={item.key || "all"}
                label={item.label}
                active={goal === item.key}
                onClick={() =>
                  onGoalChange(item.key)
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Diet">
            {dietOptions.map((item) => (
              <MobileFilterOption
                key={item.key}
                label={item.label}
                active={filter === item.key}
                onClick={() =>
                  onFilterChange(item.key)
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Sort">
            {sortOptions.map((item) => (
              <MobileFilterOption
                key={item.key}
                label={item.label}
                active={sortBy === item.key}
                onClick={() =>
                  onSortChange(item.key)
                }
              />
            ))}
          </FilterGroup>
        </div>

        <div className="mt-7 grid grid-cols-[0.7fr_1.3fr] gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] text-sm font-medium text-white"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-13 items-center justify-center rounded-full bg-white text-sm font-medium text-slate-950"
          >
            Show meals
          </button>
        </div>
      </aside>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {title}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {children}
      </div>
    </section>
  );
}

function MobileFilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm font-medium transition ${
        active
          ? "border-white bg-white text-slate-950"
          : "border-white/15 bg-white/[0.05] text-white/60"
      }`}
    >
      {label}

      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          active
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-white/20 text-transparent"
        }`}
      >
        <Check size={12} />
      </span>
    </button>
  );
}