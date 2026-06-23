// frontend/src/pages/Orders.tsx (FRONTEND)

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type DeliveryAgent = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;

  deliveryProfile?: {
    phone?: string;
  };
};

type PlanIncludedItem = {
  _id?: string;
  title?: string;
  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  qty?: number;
};

type PlanDay = {
  day?: number;
  date?: string;
  slot?: string;
  preference?: "veg" | "nonveg" | "mixed";

  selectedMeal?: string;
  selectedMealTitle?: string;
  selectedMealPrice?: number;
  selectedMealProtein?: number;
  selectedMealCalories?: number;
  selectedMealCarbs?: number;
  selectedMealFat?: number;

  alternativeMeal?: string;
  alternativeMealTitle?: string;

  deliveryStatus?: string;
  kitchenStatus?: string;
};

type OrderItem = {
  meal?: string;

  itemType?:
    | "meal"
    | "plan"
    | "challenge_plan";

  planId?: string;
  challengeId?: string;

  title?: string;
  description?: string;

  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  qty?: number;

  preference?:
    | "veg"
    | "nonveg"
    | "mixed"
    | "";

  rewardEligible?: boolean;

  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
};

type Order = {
  _id: string;
  createdAt: string;

  totals: {
    subtotal: number;
    discount: number;
    payable: number;

    planSubtotal?: number;
    challengePlanSubtotal?: number;
    normalMealsSubtotal?: number;

    totalProtein: number;
    totalCalories: number;
    totalCarbs?: number;
    totalFat?: number;
  };

  coupon?: {
    code?: string;
    discount?: number;
    redeemed?: boolean;

    applyOn?:
      | "cart"
      | "plan"
      | "challenge_plan";
  };

  items?: OrderItem[];

  delivery: {
    address: {
      fullName?: string;
      phone?: string;

      flatNo?: string;
      floor?: string;
      buildingName?: string;
      area?: string;
      landmark?: string;

      line1?: string;
      line2?: string;

      city?: string;
      state?: string;
      pincode?: string;

      locationMode?:
        | "manual"
        | "current";

      locationText?: string;
      formattedAddress?: string;

      lat?: number | null;
      lng?: number | null;

      mapsUrl?: string;
    };

    slot: {
      date: string;
      time: string;
    };

    status?: string;
    agent?: DeliveryAgent | null;

    tracking?: {
      currentLocation?: {
        lat?: number | null;
        lng?: number | null;
        updatedAt?: string | null;
      };

      eta?: {
        text?: string;
        distanceText?: string;
      };
    };
  };

  payment: {
    status: string;
  };
};

type RangeFilter =
  | "all"
  | "30days"
  | "3months";

type SortType =
  | "newest"
  | "oldest"
  | "amountHigh"
  | "amountLow";

type OrderSplitTotals = {
  subtotal: number;
  normalMealsSubtotal: number;
  planSubtotal: number;
  discount: number;
  payable: number;
};

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const isPlanItem = (
  item?: OrderItem
) =>
  item?.itemType === "plan" ||
  item?.itemType ===
    "challenge_plan" ||
  Boolean(item?.planId) ||
  Boolean(item?.challengeId);

const getPlanId = (
  item?: OrderItem
) =>
  String(
    item?.planId ||
      item?.challengeId ||
      ""
  ).trim();

const readableStatus = (
  status?: string
) => {
  if (!status) {
    return "Unassigned";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

const formatDateOnly = (
  value?: string | null
) => {
  if (!value) return "N/A";

  const text = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    const [year, month, day] =
      text.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatSlot = (
  slot?: string
) => {
  if (!slot) return "N/A";

  const [hourText, minuteText] =
    slot.split(":");

  const hour = Number(hourText);
  const minute = Number(
    minuteText || 0
  );

  if (!Number.isFinite(hour)) {
    return slot;
  }

  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
};

const formatAddress = (
  address?: Order["delivery"]["address"]
) => {
  if (!address) {
    return "Address not available";
  }

  if (address.formattedAddress) {
    return address.formattedAddress;
  }

  const parts = [
    address.flatNo ||
      address.line1,
    address.floor,
    address.buildingName ||
      address.line2,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.length
    ? parts.join(", ")
    : "Address not available";
};

const mapsLinkFromAddress = (
  address?: Order["delivery"]["address"]
) => {
  if (!address) return null;

  if (address.mapsUrl) {
    return address.mapsUrl;
  }

  if (
    Number.isFinite(
      Number(address.lat)
    ) &&
    Number.isFinite(
      Number(address.lng)
    )
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${address.lat},${address.lng}`
    )}`;
  }

  const text = String(
    address.locationText ||
      address.formattedAddress ||
      ""
  ).trim();

  if (!text) return null;

  if (
    text.startsWith("http://") ||
    text.startsWith("https://")
  ) {
    return text;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    text
  )}`;
};

const getOrderTime = (
  order: Order
) => {
  const time = new Date(
    order.createdAt
  ).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
};

const getOrderYear = (
  order: Order
) => {
  const date = new Date(
    order.createdAt
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return String(
    date.getFullYear()
  );
};

const isSameInputDate = (
  order: Order,
  selectedDate: string
) => {
  if (!selectedDate) {
    return true;
  }

  const date = new Date(
    order.createdAt
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return false;
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return (
    `${year}-${month}-${day}` ===
    selectedDate
  );
};

const getOrderSplitTotals = (
  order: Order
): OrderSplitTotals => {
  const items = order.items || [];

  const fallbackPlanSubtotal =
    items
      .filter((item) =>
        isPlanItem(item)
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            Number(item.qty || 1),
        0
      );

  const savedPlanSubtotal =
    Number(
      order.totals
        .planSubtotal ||
        order.totals
          .challengePlanSubtotal ||
        0
    );

  const planSubtotal =
    savedPlanSubtotal > 0
      ? savedPlanSubtotal
      : fallbackPlanSubtotal;

  const subtotal = Number(
    order.totals.subtotal || 0
  );

  const savedNormalSubtotal =
    Number(
      order.totals
        .normalMealsSubtotal || 0
    );

  const normalMealsSubtotal =
    savedNormalSubtotal > 0
      ? savedNormalSubtotal
      : Math.max(
          subtotal - planSubtotal,
          0
        );

  return {
    subtotal,
    normalMealsSubtotal,
    planSubtotal,

    discount: Number(
      order.totals.discount || 0
    ),

    payable: Number(
      order.totals.payable || 0
    ),
  };
};

const getNextPlanDay = (
  item: OrderItem
) => {
  const planDays =
    item.planDays || [];

  const today = todayISO();

  return (
    planDays.find(
      (day) =>
        day.date === today &&
        day.deliveryStatus !==
          "delivered"
    ) ||
    planDays.find(
      (day) =>
        day.deliveryStatus !==
        "delivered"
    ) ||
    planDays[0] ||
    null
  );
};

const getOrderKitchenName = (
  order: Order
) => {
  const hasPlan = (
    order.items || []
  ).some((item) =>
    isPlanItem(item)
  );

  return hasPlan
    ? "MacroBox Meal Plan"
    : "MacroBox Meals";
};

const getOrderImageText = (
  order: Order
) => {
  const hasPlan = (
    order.items || []
  ).some((item) =>
    isPlanItem(item)
  );

  return hasPlan ? "MB" : "M";
};

const getPrimaryOrderItemText = (
  order: Order
) => {
  const items =
    order.items || [];

  if (!items.length) {
    return "No items";
  }

  const first = items[0];

  if (isPlanItem(first)) {
    const planDays =
      first.planDays || [];

    const count =
      planDays.length ||
      first.planItems?.length ||
      first.qty ||
      1;

    return `${
      first.title || "Meal Plan"
    } × ${
      first.qty || 1
    } • ${count} day schedule`;
  }

  const remaining =
    items.length - 1;

  return `${
    first.title || "Meal"
  } × ${first.qty || 1}${
    remaining > 0
      ? ` + ${remaining} more`
      : ""
  }`;
};

const getPaymentStyle = (
  status?: string
) => {
  if (status === "paid") {
    return "mb-success-message";
  }

  if (status === "failed") {
    return "mb-danger-message";
  }

  return "mb-warning-badge";
};

const getDeliveryStyle = (
  status?: string
) => {
  if (status === "delivered") {
    return "mb-success-message";
  }

  if (
    status ===
      "out_for_delivery" ||
    status === "picked_up"
  ) {
    return "mb-highlight-badge";
  }

  if (
    status === "cancelled"
  ) {
    return "mb-danger-message";
  }

  if (
    status === "accepted"
  ) {
    return "mb-info-message";
  }

  return "mb-outline-button";
};

const getDeliveryIcon = (
  status?: string
) => {
  if (status === "delivered") {
    return (
      <CheckCircle2 size={14} />
    );
  }

  if (
    status ===
      "out_for_delivery" ||
    status === "picked_up"
  ) {
    return <Truck size={14} />;
  }

  return <Clock size={14} />;
};

export default function Orders() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<Order | null>(
    null
  );

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedYear,
    setSelectedYear,
  ] = useState("all");

  const [
    rangeFilter,
    setRangeFilter,
  ] =
    useState<RangeFilter>("all");

  const [
    sortType,
    setSortType,
  ] =
    useState<SortType>("newest");

  const fetchOrders = useCallback(
    async (
      showFeedback = false
    ) => {
      try {
        if (showFeedback) {
          setRefreshing(true);
        }

        const response =
          await api.get("/orders");

        setOrders(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );

        if (showFeedback) {
          toast.success(
            "Orders refreshed."
          );
        }
      } catch (error: any) {
        console.error(
          "Failed to fetch orders:",
          error
        );

        if (showFeedback) {
          toast.error(
            error?.response?.data
              ?.message ||
              "Failed to refresh orders."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchOrders();

    const interval = window.setInterval(
      () => {
        void fetchOrders();
      },
      10000
    );

    return () =>
      window.clearInterval(
        interval
      );
  }, [fetchOrders]);

  const availableYears =
    useMemo(() => {
      return orders
        .map((order) =>
          getOrderYear(order)
        )
        .filter(Boolean)
        .filter(
          (
            year,
            index,
            years
          ) =>
            years.indexOf(
              year
            ) === index
        )
        .sort(
          (a, b) =>
            Number(b) -
            Number(a)
        );
    }, [orders]);

  const filteredOrders =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      const now = Date.now();

      const last30Days =
        now -
        30 *
          24 *
          60 *
          60 *
          1000;

      const last3Months =
        now -
        90 *
          24 *
          60 *
          60 *
          1000;

      const filtered =
        orders.filter((order) => {
          const orderTime =
            getOrderTime(order);

          const year =
            getOrderYear(order);

          const address =
            formatAddress(
              order.delivery
                ?.address
            );

          const deliveryStatus =
            readableStatus(
              order.delivery
                ?.status
            );

          const paymentStatus =
            order.payment
              ?.status || "";

          const itemTitles =
            order.items
              ?.map((item) => {
                const planItems =
                  item.planItems
                    ?.map(
                      (
                        planItem
                      ) =>
                        planItem.title ||
                        ""
                    )
                    .join(" ") ||
                  "";

                const planDays =
                  item.planDays
                    ?.map(
                      (day) =>
                        `${
                          day.selectedMealTitle ||
                          ""
                        } ${
                          day.alternativeMealTitle ||
                          ""
                        } ${
                          day.date ||
                          ""
                        } ${
                          day.slot ||
                          ""
                        }`
                    )
                    .join(" ") ||
                  "";

                return `${
                  item.title ||
                  "Meal"
                } ${getPlanId(
                  item
                )} ${planItems} ${planDays}`;
              })
              .join(" ") || "";

          const splitTotals =
            getOrderSplitTotals(
              order
            );

          const searchable =
            [
              order._id,
              formatDateTime(
                order.createdAt
              ),
              address,
              deliveryStatus,
              paymentStatus,
              itemTitles,
              order.coupon
                ?.code || "",
              String(
                splitTotals.payable
              ),
              String(
                splitTotals.discount
              ),
              String(
                splitTotals.planSubtotal
              ),
              String(
                splitTotals.normalMealsSubtotal
              ),
              String(
                order.totals
                  .totalCalories ||
                  ""
              ),
              String(
                order.totals
                  .totalProtein ||
                  ""
              ),
            ]
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesDate =
            isSameInputDate(
              order,
              selectedDate
            );

          const matchesYear =
            selectedYear ===
              "all" ||
            year ===
              selectedYear;

          const matchesRange =
            rangeFilter ===
              "all" ||
            (rangeFilter ===
              "30days" &&
              orderTime >=
                last30Days) ||
            (rangeFilter ===
              "3months" &&
              orderTime >=
                last3Months);

          return (
            matchesSearch &&
            matchesDate &&
            matchesYear &&
            matchesRange
          );
        });

      filtered.sort((a, b) => {
        if (
          sortType === "newest"
        ) {
          return (
            getOrderTime(b) -
            getOrderTime(a)
          );
        }

        if (
          sortType === "oldest"
        ) {
          return (
            getOrderTime(a) -
            getOrderTime(b)
          );
        }

        if (
          sortType ===
          "amountHigh"
        ) {
          return (
            Number(
              b.totals
                .payable || 0
            ) -
            Number(
              a.totals
                .payable || 0
            )
          );
        }

        if (
          sortType ===
          "amountLow"
        ) {
          return (
            Number(
              a.totals
                .payable || 0
            ) -
            Number(
              b.totals
                .payable || 0
            )
          );
        }

        return 0;
      });

      return filtered;
    }, [
      orders,
      searchQuery,
      selectedDate,
      selectedYear,
      rangeFilter,
      sortType,
    ]);

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.payment
            ?.status === "paid"
      ),
    [orders]
  );

  const planOrders = useMemo(
    () =>
      orders.filter((order) =>
        (
          order.items || []
        ).some((item) =>
          isPlanItem(item)
        )
      ),
    [orders]
  );

  const activeDeliveries =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            ![
              "delivered",
              "cancelled",
            ].includes(
              order.delivery
                ?.status || ""
            )
        ).length,
      [orders]
    );

  const hasActiveFilters =
    Boolean(
      searchQuery.trim() ||
        selectedDate ||
        selectedYear !==
          "all" ||
        rangeFilter !==
          "all" ||
        sortType !== "newest"
    );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setSelectedYear("all");
    setRangeFilter("all");
    setSortType("newest");
  };

  if (loading) {
    return <OrdersLoading />;
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-9 pt-9 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                  MacroBox Orders
                </p>

                <h1 className="mb-text mt-4 max-w-4xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[76px]">
                  Follow every meal,
                  <br />
                  from kitchen to door.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Review payments,
                  meal-plan schedules,
                  delivery information and
                  live tracking for every
                  MacroBox order.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <HeaderSummary
                  label="Orders"
                  value={String(
                    orders.length
                  )}
                  icon={
                    <ShoppingBag
                      size={17}
                    />
                  }
                />

                <HeaderSummary
                  label="Paid"
                  value={String(
                    paidOrders.length
                  )}
                  icon={
                    <CheckCircle2
                      size={17}
                    />
                  }
                  accent
                />

                <HeaderSummary
                  label="Plans"
                  value={String(
                    planOrders.length
                  )}
                  icon={
                    <Utensils
                      size={17}
                    />
                  }
                />

                <HeaderSummary
                  label="In progress"
                  value={String(
                    activeDeliveries
                  )}
                  icon={
                    <Truck size={17} />
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="mb-glass overflow-hidden rounded-[30px]">
            <div className="mb-divider flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Order history
                </p>

                <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
                  Past orders
                </h2>

                <p className="mb-text-muted mt-2 text-sm">
                  Showing{" "}
                  {filteredOrders.length}{" "}
                  of {orders.length} orders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() =>
                    void fetchOrders(
                      true
                    )
                  }
                  disabled={refreshing}
                  className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowFilters(
                      true
                    )
                  }
                  className="mb-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <Filter size={16} />
                  Filters
                </button>
              </div>
            </div>

            <div className="mb-divider border-b p-4 sm:p-5">
              <div className="relative">
                <Search
                  size={17}
                  className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search order ID, meal, coupon, address or status..."
                  className="mb-input h-[52px] w-full rounded-full pl-11 pr-5 text-sm font-medium"
                />
              </div>

              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mb-accent-surface inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold">
                    <Check size={12} />
                    Filters active
                  </span>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              {orders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Your paid meals, plans and delivery information will appear here."
                />
              ) : filteredOrders.length ===
                0 ? (
                <EmptyState
                  title="No matching orders"
                  description="Try changing the search, date, year, range or sorting filters."
                />
              ) : (
                <div className="grid gap-4">
                  {filteredOrders.map(
                    (order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onViewDetails={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {showFilters && (
        <FilterDrawer
          searchQuery={searchQuery}
          selectedDate={
            selectedDate
          }
          selectedYear={
            selectedYear
          }
          rangeFilter={
            rangeFilter
          }
          sortType={sortType}
          availableYears={
            availableYears
          }
          hasActiveFilters={
            hasActiveFilters
          }
          setSearchQuery={
            setSearchQuery
          }
          setSelectedDate={
            setSelectedDate
          }
          setSelectedYear={
            setSelectedYear
          }
          setRangeFilter={
            setRangeFilter
          }
          setSortType={
            setSortType
          }
          onClear={clearFilters}
          onClose={() =>
            setShowFilters(false)
          }
        />
      )}

      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() =>
            setSelectedOrder(null)
          }
        />
      )}
    </main>
  );
}

function OrdersLoading() {
  return (
    <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
      <div className="mb-glass rounded-[28px] px-8 py-7 text-center">
        <Loader2
          size={30}
          className="mb-text mx-auto animate-spin"
        />

        <p className="mb-text mt-4 text-sm font-medium">
          Loading orders
        </p>

        <p className="mb-text-faint mt-1 text-xs">
          Preparing your order history.
        </p>
      </div>
    </main>
  );
}

function HeaderSummary({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-glass min-w-0 rounded-[22px] p-4 sm:min-w-[145px]">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent
            ? "mb-accent-surface"
            : "mb-outline-button"
        }`}
      >
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-base font-medium sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function OrderCard({
  order,
  onViewDetails,
}: {
  order: Order;
  onViewDetails: () => void;
}) {
  const splitTotals =
    getOrderSplitTotals(order);

  const deliveryStatus =
    order.delivery?.status ||
    "unassigned";

  const hasPlan = (
    order.items || []
  ).some((item) =>
    isPlanItem(item)
  );

  const firstPlanItem = (
    order.items || []
  ).find((item) =>
    isPlanItem(item)
  );

  const nextPlanDay =
    firstPlanItem
      ? getNextPlanDay(
          firstPlanItem
        )
      : null;

  return (
    <article className="mb-glass-subtle mb-glass-hover overflow-hidden rounded-[26px] p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)]">
        <div className="relative">
          <div className="mb-primary-button flex h-[88px] w-[88px] items-center justify-center rounded-[24px] text-2xl font-light tracking-[-0.05em] lg:h-24 lg:w-24">
            {getOrderImageText(
              order
            )}
          </div>

          {hasPlan && (
            <span className="mb-accent-surface absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-wide">
              Plan
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="mb-text text-xl font-light tracking-[-0.035em] sm:text-2xl">
                  {getOrderKitchenName(
                    order
                  )}
                </h3>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-semibold ${getDeliveryStyle(
                    deliveryStatus
                  )}`}
                >
                  {getDeliveryIcon(
                    deliveryStatus
                  )}

                  {readableStatus(
                    deliveryStatus
                  )}
                </span>
              </div>

              <p className="mb-text-muted mt-2 line-clamp-1 text-xs leading-5 sm:text-sm">
                {formatAddress(
                  order.delivery
                    ?.address
                )}
              </p>

              <p className="mb-text-extra-faint mt-1 break-all text-[10px] leading-5">
                #
                {order._id} ·{" "}
                {formatDateTime(
                  order.createdAt
                )}
              </p>
            </div>

            <p className="mb-text shrink-0 text-2xl font-light tracking-[-0.04em]">
              ₹{splitTotals.payable}
            </p>
          </div>

          <div className="mb-divider my-4 border-t border-dashed" />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <p className="mb-text text-sm font-medium leading-6">
                {getPrimaryOrderItemText(
                  order
                )}
              </p>

              {nextPlanDay && (
                <div className="mb-accent-surface mt-3 rounded-[17px] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                    Next plan delivery
                  </p>

                  <p className="mt-1 line-clamp-1 text-xs font-medium">
                    Day{" "}
                    {nextPlanDay.day} ·{" "}
                    {nextPlanDay.selectedMealTitle ||
                      "Meal"}
                  </p>

                  <p className="mt-1 text-[10px] opacity-80">
                    {formatDateOnly(
                      nextPlanDay.date
                    )}{" "}
                    ·{" "}
                    {formatSlot(
                      nextPlanDay.slot
                    )}
                  </p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-semibold uppercase ${getPaymentStyle(
                    order.payment
                      ?.status
                  )}`}
                >
                  {order.payment
                    ?.status ||
                    "created"}
                </span>

                {order.coupon
                  ?.code && (
                  <span className="mb-outline-button rounded-full px-3 py-1 text-[9px] font-medium">
                    Coupon{" "}
                    {
                      order.coupon
                        .code
                    }
                  </span>
                )}

                <span className="mb-outline-button rounded-full px-3 py-1 text-[9px] font-medium">
                  {
                    order.items
                      ?.length || 0
                  }{" "}
                  items
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                to={`/track/${order._id}`}
                className="mb-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                <Navigation
                  size={15}
                />
                Track
              </Link>

              <button
                type="button"
                onClick={
                  onViewDetails
                }
                className="mb-outline-button inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium"
              >
                Details
                <ChevronRight
                  size={16}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterDrawer({
  searchQuery,
  selectedDate,
  selectedYear,
  rangeFilter,
  sortType,
  availableYears,
  hasActiveFilters,
  setSearchQuery,
  setSelectedDate,
  setSelectedYear,
  setRangeFilter,
  setSortType,
  onClear,
  onClose,
}: {
  searchQuery: string;
  selectedDate: string;
  selectedYear: string;
  rangeFilter: RangeFilter;
  sortType: SortType;
  availableYears: string[];
  hasActiveFilters: boolean;
  setSearchQuery: (
    value: string
  ) => void;
  setSelectedDate: (
    value: string
  ) => void;
  setSelectedYear: (
    value: string
  ) => void;
  setRangeFilter: (
    value: RangeFilter
  ) => void;
  setSortType: (
    value: SortType
  ) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      title="Filter orders"
      subtitle="Search, sort and narrow your order history."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <ThemeField label="Search">
          <div className="relative">
            <Search
              size={16}
              className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            />

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search orders..."
              className="mb-input h-12 w-full rounded-2xl pl-11 pr-4 text-sm font-medium"
            />
          </div>
        </ThemeField>

        <ThemeField label="Order date">
          <div className="relative">
            <CalendarDays
              size={16}
              className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            />

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
              className="mb-input h-12 w-full rounded-2xl pl-11 pr-4 text-sm font-medium"
            />
          </div>
        </ThemeField>

        <ThemeField label="Year">
          <select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(
                event.target.value
              )
            }
            className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
          >
            <option value="all">
              All years
            </option>

            {availableYears.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              )
            )}
          </select>
        </ThemeField>

        <ThemeField label="Time range">
          <select
            value={rangeFilter}
            onChange={(event) =>
              setRangeFilter(
                event.target
                  .value as RangeFilter
              )
            }
            className="mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium"
          >
            <option value="all">
              All time
            </option>

            <option value="30days">
              Last 30 days
            </option>

            <option value="3months">
              Last 3 months
            </option>
          </select>
        </ThemeField>

        <ThemeField label="Sort by">
          <div className="relative">
            <ArrowDownUp
              size={16}
              className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            />

            <select
              value={sortType}
              onChange={(event) =>
                setSortType(
                  event.target
                    .value as SortType
                )
              }
              className="mb-input h-12 w-full rounded-2xl pl-11 pr-4 text-sm font-medium"
            >
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="amountHigh">
                Amount: high to low
              </option>

              <option value="amountLow">
                Amount: low to high
              </option>
            </select>
          </div>
        </ThemeField>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={
            !hasActiveFilters
          }
          className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
        >
          <X size={16} />
          Clear
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mb-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
        >
          <Check size={16} />
          Apply
        </button>
      </div>
    </Drawer>
  );
}

function OrderDetailsDrawer({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const splitTotals =
    getOrderSplitTotals(order);

  const mapsUrl =
    mapsLinkFromAddress(
      order.delivery?.address
    );

  const deliveryStatus =
    order.delivery?.status ||
    "unassigned";

  const agent =
    order.delivery?.agent;

  const eta =
    order.delivery?.tracking
      ?.eta;

  const currentLocation =
    order.delivery?.tracking
      ?.currentLocation;

  return (
    <Drawer
      title="Order details"
      subtitle={`#${order._id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <DrawerSection
          eyebrow="Delivery journey"
          title="Order timeline"
          icon={
            <Navigation size={18} />
          }
        >
          <div className="space-y-5">
            <TimelinePoint
              icon={
                <Utensils size={18} />
              }
              title={
                getOrderKitchenName(
                  order
                )
              }
              subtitle="MacroBox Kitchen"
            />

            <TimelinePoint
              icon={
                <MapPin size={18} />
              }
              title="Delivery address"
              subtitle={formatAddress(
                order.delivery
                  ?.address
              )}
            />

            <div className="mb-divider border-t pt-5">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${getDeliveryStyle(
                    deliveryStatus
                  )}`}
                >
                  {getDeliveryIcon(
                    deliveryStatus
                  )}
                </span>

                <div>
                  <p className="mb-text text-sm font-medium">
                    {readableStatus(
                      deliveryStatus
                    )}
                  </p>

                  <p className="mb-text-muted mt-1 text-xs leading-5">
                    Main slot:{" "}
                    {formatDateOnly(
                      order.delivery
                        ?.slot?.date
                    )}{" "}
                    ·{" "}
                    {formatSlot(
                      order.delivery
                        ?.slot?.time
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          eyebrow="Order contents"
          title="Items"
          icon={
            <ShoppingBag
              size={18}
            />
          }
        >
          {(order.items || [])
            .length === 0 ? (
            <p className="mb-text-muted text-sm">
              No order items are
              available.
            </p>
          ) : (
            <div className="space-y-3">
              {(order.items || []).map(
                (item, index) => (
                  <DrawerOrderItem
                    key={`${order._id}-${index}`}
                    item={item}
                  />
                )
              )}
            </div>
          )}
        </DrawerSection>

        <DrawerSection
          eyebrow="Payment summary"
          title="Bill details"
          icon={
            <PackageCheck
              size={18}
            />
          }
        >
          <div className="space-y-3">
            <BillingRow
              label="Meals subtotal"
              value={`₹${splitTotals.normalMealsSubtotal}`}
            />

            <BillingRow
              label="Plans subtotal"
              value={`₹${splitTotals.planSubtotal}`}
            />

            <BillingRow
              label="Discount applied"
              value={`-₹${splitTotals.discount}`}
              discount
            />

            <BillingRow
              label="Total protein"
              value={`${order.totals.totalProtein || 0}g`}
            />

            <BillingRow
              label="Total calories"
              value={`${order.totals.totalCalories || 0}`}
            />

            {order.coupon
              ?.code && (
              <BillingRow
                label="Coupon"
                value={
                  order.coupon.code
                }
              />
            )}

            <div className="mb-divider border-t pt-4">
              <BillingRow
                label="Bill total"
                value={`₹${splitTotals.payable}`}
                highlight
              />
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          eyebrow="Delivery partner"
          title="Live delivery"
          icon={<Truck size={18} />}
        >
          <div className="mb-glass-subtle rounded-[22px] p-4">
            <DeliveryDetail
              label="Agent"
              value={
                agent?.name ||
                "Not assigned yet"
              }
            />

            <DeliveryDetail
              label="Phone"
              value={
                agent
                  ?.deliveryProfile
                  ?.phone ||
                agent?.phone ||
                "N/A"
              }
              icon={
                <Phone size={14} />
              }
            />

            <DeliveryDetail
              label="ETA"
              value={`${eta?.text || "Not available yet"}${
                eta?.distanceText
                  ? ` (${eta.distanceText})`
                  : ""
              }`}
            />

            <DeliveryDetail
              label="Last update"
              value={formatDateTime(
                currentLocation?.updatedAt ||
                  null
              )}
            />

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                to={`/track/${order._id}`}
                className="mb-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
              >
                <Truck size={15} />
                Track live
              </Link>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
                >
                  <MapPin size={15} />
                  Open maps
                </a>
              )}
            </div>
          </div>
        </DrawerSection>
      </div>
    </Drawer>
  );
}

function DrawerSection({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-glass rounded-[26px] p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full">
          {icon}
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
            {eyebrow}
          </p>

          <h3 className="mb-text mt-1 text-xl font-light tracking-[-0.03em]">
            {title}
          </h3>
        </div>
      </div>

      {children}
    </section>
  );
}

function DrawerOrderItem({
  item,
}: {
  item: OrderItem;
}) {
  const plan =
    isPlanItem(item);

  const planDays =
    item.planDays || [];

  const planItems =
    item.planItems || [];

  const planId =
    getPlanId(item);

  return (
    <article className="mb-glass-subtle rounded-[20px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-text text-sm font-medium leading-5">
            {item.title ||
              "Meal"}{" "}
            × {item.qty || 1}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {plan && (
              <span className="mb-accent-surface rounded-full px-2.5 py-1 text-[9px] font-semibold">
                Meal plan
              </span>
            )}

            {planId && (
              <span className="mb-outline-button max-w-full truncate rounded-full px-2.5 py-1 text-[9px] font-medium">
                {planId}
              </span>
            )}

            {item.preference && (
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${
                  item.preference ===
                  "veg"
                    ? "mb-veg-badge"
                    : item.preference ===
                      "nonveg"
                    ? "mb-nonveg-badge"
                    : "mb-outline-button"
                }`}
              >
                {readableStatus(
                  item.preference
                )}
              </span>
            )}
          </div>
        </div>

        <p className="mb-text shrink-0 text-sm font-medium">
          ₹
          {Number(
            item.price || 0
          ) *
            Number(
              item.qty || 1
            )}
        </p>
      </div>

      {plan &&
        planDays.length >
          0 && (
          <div className="mt-4">
            <p className="mb-text-faint mb-3 text-[9px] font-semibold uppercase tracking-[0.15em]">
              Day-wise schedule
            </p>

            <div className="space-y-2">
              {planDays.map(
                (day, index) => (
                  <div
                    key={`${day.day || index}-${day.date || ""}`}
                    className="mb-glass rounded-[17px] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="mb-text line-clamp-2 text-xs font-medium">
                        Day{" "}
                        {day.day ||
                          index +
                            1}
                        :{" "}
                        {day.selectedMealTitle ||
                          "Meal"}
                      </p>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-semibold ${getDeliveryStyle(
                          day.deliveryStatus ||
                            "scheduled"
                        )}`}
                      >
                        {readableStatus(
                          day.deliveryStatus ||
                            "scheduled"
                        )}
                      </span>
                    </div>

                    <p className="mb-text-faint mt-2 text-[10px] leading-4">
                      {formatDateOnly(
                        day.date
                      )}{" "}
                      ·{" "}
                      {formatSlot(
                        day.slot
                      )}{" "}
                      ·{" "}
                      {readableStatus(
                        day.preference ||
                          "mixed"
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {plan &&
        planDays.length ===
          0 &&
        planItems.length >
          0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {planItems.map(
              (
                planItem,
                index
              ) => (
                <span
                  key={
                    planItem._id ||
                    index
                  }
                  className="mb-outline-button rounded-full px-3 py-1 text-[9px] font-medium"
                >
                  {planItem.title ||
                    "Meal item"}{" "}
                  ×{" "}
                  {planItem.qty ||
                    1}
                </span>
              )
            )}
          </div>
        )}
    </article>
  );
}

function TimelinePoint({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mb-outline-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>

      <div>
        <p className="mb-text text-sm font-medium">
          {title}
        </p>

        <p className="mb-text-muted mt-1 text-xs leading-5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function BillingRow({
  label,
  value,
  highlight = false,
  discount = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  discount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          highlight
            ? "mb-text text-sm font-medium"
            : "mb-text-muted text-sm"
        }
      >
        {label}
      </span>

      <span
        className={`text-sm font-medium ${
          highlight
            ? "mb-text text-base"
            : discount
            ? "mb-accent"
            : "mb-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DeliveryDetail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-divider flex items-start justify-between gap-4 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <p className="mb-text-faint flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em]">
        {icon}
        {label}
      </p>

      <p className="mb-text max-w-[65%] text-right text-xs font-medium leading-5">
        {value}
      </p>
    </div>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      <aside
        className={`mb-divider absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[32px] border-t bg-[var(--mb-bg-secondary)] shadow-[var(--mb-shadow-large)] sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none sm:border-l sm:border-t-0 ${
          wide
            ? "sm:w-[600px]"
            : "sm:w-[460px]"
        }`}
      >
        <div className="mb-divider flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <div className="min-w-0">
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
              MacroBox Orders
            </p>

            <h2 className="mb-text mt-2 truncate text-2xl font-light tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mb-text-muted mt-2 break-all text-xs leading-5">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mb-outline-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-themed-scrollbar flex-1 overflow-y-auto p-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}

function ThemeField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-text-faint mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>

      {children}
    </label>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[28px] p-9 text-center sm:p-12">
      <span className="mb-primary-button mx-auto flex h-16 w-16 items-center justify-center rounded-full">
        <PackageCheck
          size={25}
        />
      </span>

      <h2 className="mb-text mt-6 text-2xl font-light tracking-[-0.04em]">
        {title}
      </h2>

      <p className="mb-text-muted mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>

      <div className="mb-accent-surface mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
        <Sparkles size={14} />
        MacroBox
      </div>
    </div>
  );
}