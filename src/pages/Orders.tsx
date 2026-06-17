// frontend/src/pages/Orders.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";

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
  itemType?: "meal" | "plan" | "challenge_plan";
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
  preference?: "veg" | "nonveg" | "mixed" | "";
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
    applyOn?: "cart" | "plan" | "challenge_plan";
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
      locationMode?: "manual" | "current";
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

type RangeFilter = "all" | "30days" | "3months";
type SortType = "newest" | "oldest" | "amountHigh" | "amountLow";

const todayISO = () => new Date().toISOString().slice(0, 10);

const isPlanItem = (item?: OrderItem) => {
  return (
    item?.itemType === "plan" ||
    item?.itemType === "challenge_plan" ||
    Boolean(item?.planId) ||
    Boolean(item?.challengeId)
  );
};

const getPlanId = (item?: OrderItem) => {
  return String(item?.planId || item?.challengeId || "").trim();
};

const readableStatus = (status?: string) => {
  if (!status) return "Unassigned";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "N/A";

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSlot = (slot?: string) => {
  if (!slot) return "N/A";

  const hour = Number(slot.split(":")[0]);

  if (!Number.isFinite(hour)) return slot;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
};

const formatAddress = (addr?: Order["delivery"]["address"]) => {
  if (!addr) return "Address not available";
  if (addr.formattedAddress) return addr.formattedAddress;

  const parts = [
    addr.flatNo || addr.line1,
    addr.floor,
    addr.buildingName || addr.line2,
    addr.area,
    addr.landmark,
    addr.city,
    addr.state,
    addr.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address not available";
};

const mapsLinkFromAddress = (addr?: Order["delivery"]["address"]) => {
  if (!addr) return null;
  if (addr.mapsUrl) return addr.mapsUrl;

  const text = String(addr.locationText || addr.formattedAddress || "").trim();

  if (!text) return null;

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    text
  )}`;
};

const paymentBadgeClass = (status?: string) => {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50 text-green-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }
};

const deliveryTextClass = (status?: string) => {
  switch (status) {
    case "delivered":
      return "text-green-700";
    case "out_for_delivery":
      return "text-orange-700";
    case "picked_up":
      return "text-indigo-700";
    case "accepted":
      return "text-blue-700";
    case "cancelled":
      return "text-red-700";
    default:
      return "text-slate-600";
  }
};

const getOrderTime = (order: Order) => {
  const time = new Date(order.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getOrderYear = (order: Order) => {
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
};

const isSameInputDate = (order: Order, selectedDate: string) => {
  if (!selectedDate) return true;

  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return false;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}` === selectedDate;
};

const getOrderSplitTotals = (order: Order) => {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter((item) => isPlanItem(item))
    .reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

  const savedPlanSubtotal = Number(
    order.totals.planSubtotal || order.totals.challengePlanSubtotal || 0
  );

  const planSubtotal =
    savedPlanSubtotal > 0 ? savedPlanSubtotal : fallbackPlanSubtotal;

  const subtotal = Number(order.totals.subtotal || 0);

  const savedNormalMealsSubtotal = Number(order.totals.normalMealsSubtotal || 0);

  const normalMealsSubtotal =
    savedNormalMealsSubtotal > 0
      ? savedNormalMealsSubtotal
      : Math.max(subtotal - planSubtotal, 0);

  return {
    subtotal,
    normalMealsSubtotal,
    planSubtotal,
    discount: Number(order.totals.discount || 0),
    payable: Number(order.totals.payable || 0),
  };
};

const getNextPlanDay = (item: OrderItem) => {
  const planDays = item.planDays || [];
  const today = todayISO();

  return (
    planDays.find(
      (day) => day.date === today && day.deliveryStatus !== "delivered"
    ) ||
    planDays.find((day) => day.deliveryStatus !== "delivered") ||
    planDays[0] ||
    null
  );
};

const getOrderKitchenName = (order: Order) => {
  const hasPlan = (order.items || []).some((item) => isPlanItem(item));

  if (hasPlan) return "MacroBox Meal Plan";

  return "MacroBox Meals";
};

const getOrderImageText = (order: Order) => {
  const hasPlan = (order.items || []).some((item) => isPlanItem(item));
  return hasPlan ? "MB" : "M";
};

const getPrimaryOrderItemText = (order: Order) => {
  const items = order.items || [];

  if (!items.length) return "No items";

  const first = items[0];
  const isPlan = isPlanItem(first);

  if (isPlan) {
    const planDays = first.planDays || [];
    const count = planDays.length || first.planItems?.length || first.qty || 1;

    return `${first.title || "Meal Plan"} × ${
      first.qty || 1
    } • ${count} day schedule`;
  }

  const remaining = items.length - 1;

  return `${first.title || "Meal"} × ${first.qty || 1}${
    remaining > 0 ? ` + ${remaining} more` : ""
  }`;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [sortType, setSortType] = useState<SortType>("newest");

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 10000);

    return () => clearInterval(interval);
  }, []);

  const availableYears = useMemo(() => {
    return orders
      .map((order) => getOrderYear(order))
      .filter(Boolean)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const now = Date.now();
    const last30Days = now - 30 * 24 * 60 * 60 * 1000;
    const last3Months = now - 90 * 24 * 60 * 60 * 1000;

    const filtered = orders.filter((order) => {
      const orderTime = getOrderTime(order);
      const year = getOrderYear(order);
      const address = formatAddress(order.delivery?.address);
      const deliveryStatus = readableStatus(order.delivery?.status);
      const paymentStatus = order.payment?.status || "";

      const itemTitles =
        order.items
          ?.map((item) => {
            const planItems =
              item.planItems?.map((p) => p.title || "").join(" ") || "";

            const planDays =
              item.planDays
                ?.map(
                  (day) =>
                    `${day.selectedMealTitle || ""} ${
                      day.alternativeMealTitle || ""
                    } ${day.date || ""} ${day.slot || ""}`
                )
                .join(" ") || "";

            return `${
              item.title || "Meal"
            } ${getPlanId(item)} ${planItems} ${planDays}`;
          })
          .join(" ") || "";

      const splitTotals = getOrderSplitTotals(order);

      const searchableText = [
        order._id,
        formatDateTime(order.createdAt),
        address,
        deliveryStatus,
        paymentStatus,
        itemTitles,
        order.coupon?.code || "",
        String(splitTotals.payable || ""),
        String(splitTotals.discount || ""),
        String(splitTotals.planSubtotal || ""),
        String(splitTotals.normalMealsSubtotal || ""),
        String(order.totals.totalCalories || ""),
        String(order.totals.totalProtein || ""),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesDate = isSameInputDate(order, selectedDate);
      const matchesYear = selectedYear === "all" || year === selectedYear;

      const matchesRange =
        rangeFilter === "all" ||
        (rangeFilter === "30days" && orderTime >= last30Days) ||
        (rangeFilter === "3months" && orderTime >= last3Months);

      return matchesSearch && matchesDate && matchesYear && matchesRange;
    });

    filtered.sort((a, b) => {
      if (sortType === "newest") return getOrderTime(b) - getOrderTime(a);
      if (sortType === "oldest") return getOrderTime(a) - getOrderTime(b);
      if (sortType === "amountHigh") {
        return (b.totals.payable || 0) - (a.totals.payable || 0);
      }
      if (sortType === "amountLow") {
        return (a.totals.payable || 0) - (b.totals.payable || 0);
      }

      return 0;
    });

    return filtered;
  }, [orders, searchQuery, selectedDate, selectedYear, rangeFilter, sortType]);

  const hasActiveFilters =
    searchQuery.trim() ||
    selectedDate ||
    selectedYear !== "all" ||
    rangeFilter !== "all" ||
    sortType !== "newest";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setSelectedYear("all");
    setRangeFilter("all");
    setSortType("newest");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-10 text-slate-950">
        <p className="text-center text-sm font-semibold text-slate-500">
          Loading orders...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-950">
      <section className="bg-[#0f7586] px-4 pb-16 pt-10 text-white sm:px-6 lg:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">
              Orders
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              My Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:text-base">
              Track your MacroBox meals, plan schedules, bill details and live
              delivery status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex h-12 w-fit items-center justify-center gap-2 border border-white/50 px-5 text-sm font-black text-white transition hover:bg-white/10"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-6xl px-4 pb-10 sm:px-6">
        <div className="bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                Past Orders
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {filteredOrders.length} of {orders.length} orders
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
              <PackageCheck size={15} />
              Order history
            </div>
          </div>

          <section className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 lg:hidden">
              <SlidersHorizontal size={16} />
              Filters
            </div>

            <div className="grid gap-2 lg:grid-cols-[1.3fr_0.8fr_0.7fr_0.8fr_0.8fr_auto]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search orders..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-black text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={rangeFilter}
                onChange={(event) =>
                  setRangeFilter(event.target.value as RangeFilter)
                }
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
              </select>

              <div className="relative">
                <ArrowDownUp
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={sortType}
                  onChange={(event) =>
                    setSortType(event.target.value as SortType)
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-black text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="amountHigh">Amount High</option>
                  <option value="amountLow">Amount Low</option>
                </select>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={15} />
                Clear
              </button>
            </div>
          </section>

          {orders.length === 0 ? (
            <EmptyState
              title="No orders yet."
              description="Your paid meals, plans and live tracking details will appear here."
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No matching orders."
              description="Try changing your search, date, year or range filters."
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onViewDetails={() => setSelectedOrder(order)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </main>
  );
}

function OrderCard({
  order,
  onViewDetails,
}: {
  order: Order;
  onViewDetails: () => void;
}) {
  const splitTotals = getOrderSplitTotals(order);
  const deliveryStatus = order.delivery?.status || "unassigned";
  const hasPlan = (order.items || []).some((item) => isPlanItem(item));
  const firstPlanItem = (order.items || []).find((item) => isPlanItem(item));
  const nextPlanDay = firstPlanItem ? getNextPlanDay(firstPlanItem) : null;

  return (
    <article className="border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
      <div className="flex gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-green-50 text-2xl font-black text-green-200 sm:h-24 sm:w-24">
          {getOrderImageText(order)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-slate-950">
                {getOrderKitchenName(order)}
              </h3>

              <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">
                {formatAddress(order.delivery?.address)}
              </p>

              <p className="mt-1 break-all text-xs font-bold text-slate-400">
                ORDER #{order._id} | {formatDateTime(order.createdAt)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {deliveryStatus === "delivered" ? (
                <CheckCircle2 size={18} className="text-green-600" />
              ) : (
                <Clock size={18} className={deliveryTextClass(deliveryStatus)} />
              )}

              <p
                className={`text-xs font-black uppercase ${deliveryTextClass(
                  deliveryStatus
                )}`}
              >
                {readableStatus(deliveryStatus)}
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {getPrimaryOrderItemText(order)}
              </p>

              {nextPlanDay && (
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Next: Day {nextPlanDay.day} •{" "}
                  {nextPlanDay.selectedMealTitle || "Meal"} •{" "}
                  {formatDateOnly(nextPlanDay.date)} •{" "}
                  {formatSlot(nextPlanDay.slot)}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {hasPlan && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    Plan Order
                  </span>
                )}

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${paymentBadgeClass(
                    order.payment?.status
                  )}`}
                >
                  {(order.payment?.status || "created").toUpperCase()}
                </span>

                {order.coupon?.code && (
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                    Coupon: {order.coupon.code}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <p className="text-sm font-black text-slate-950">
                Total Paid: ₹{splitTotals.payable}
              </p>

              <button
                type="button"
                onClick={onViewDetails}
                className="inline-flex items-center gap-1 text-sm font-black uppercase text-orange-600 hover:underline"
              >
                View Details
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/track/${order._id}`}
              className="inline-flex h-11 items-center justify-center gap-2 bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
            >
              <Navigation size={15} />
              Track
            </Link>

            <button
              type="button"
              onClick={onViewDetails}
              className="inline-flex h-11 items-center justify-center border border-orange-500 px-5 text-sm font-black text-orange-600 transition hover:bg-orange-50"
            >
              Help / Details
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderDetailsDrawer({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const splitTotals = getOrderSplitTotals(order);
  const mapsUrl = mapsLinkFromAddress(order.delivery?.address);
  const deliveryStatus = order.delivery?.status || "unassigned";
  const agent = order.delivery?.agent;
  const eta = order.delivery?.tracking?.eta;
  const currentLocation = order.delivery?.tracking?.currentLocation;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55">
      <button
        type="button"
        aria-label="Close order details"
        className="hidden flex-1 cursor-default md:block"
        onClick={onClose}
      />

      <aside className="h-full w-full overflow-y-auto bg-white shadow-2xl md:max-w-[520px]">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X size={22} />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-slate-950">
              Order #{order._id}
            </h2>

            <p className="text-xs font-bold text-slate-500">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section className="space-y-4">
            <TimelinePoint
              icon={<MapPin size={20} />}
              title={getOrderKitchenName(order)}
              subtitle="MacroBox Kitchen"
            />

            <TimelinePoint
              icon={<MapPin size={20} />}
              title="Delivery Address"
              subtitle={formatAddress(order.delivery?.address)}
            />

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={22}
                  className={
                    deliveryStatus === "delivered"
                      ? "text-green-600"
                      : "text-slate-400"
                  }
                />

                <div>
                  <p
                    className={`text-sm font-black ${deliveryTextClass(
                      deliveryStatus
                    )}`}
                  >
                    {readableStatus(deliveryStatus)}
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Main slot: {formatDateOnly(order.delivery?.slot?.date)} •{" "}
                    {formatSlot(order.delivery?.slot?.time)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Items
            </p>

            <div className="space-y-3">
              {(order.items || []).map((item, index) => (
                <DrawerOrderItem key={`${order._id}-${index}`} item={item} />
              ))}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Bill Details
            </p>

            <div className="space-y-3 text-sm font-semibold">
              <BillingRow
                label="Meals Subtotal"
                value={`₹${splitTotals.normalMealsSubtotal}`}
              />

              <BillingRow
                label="Plans Subtotal"
                value={`₹${splitTotals.planSubtotal}`}
              />

              <BillingRow
                label="Discount Applied"
                value={`-₹${splitTotals.discount}`}
                discount
              />

              <BillingRow
                label="Total Protein"
                value={`${order.totals.totalProtein || 0}g`}
              />

              <BillingRow
                label="Total Calories"
                value={`${order.totals.totalCalories || 0}`}
              />

              {order.coupon?.code && (
                <BillingRow label="Coupon" value={order.coupon.code} />
              )}

              <div className="border-t border-slate-200 pt-3">
                <BillingRow
                  label="Bill Total"
                  value={`₹${splitTotals.payable}`}
                  highlight
                />
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Live Delivery
            </p>

            <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
              <p>
                <span className="font-black text-slate-950">Agent:</span>{" "}
                {agent?.name || "Not assigned yet"}
              </p>

              <p className="flex items-center gap-1">
                <Phone size={14} className="text-green-600" />
                <span className="font-black text-slate-950">Phone:</span>{" "}
                {agent?.deliveryProfile?.phone || agent?.phone || "N/A"}
              </p>

              <p>
                <span className="font-black text-slate-950">ETA:</span>{" "}
                {eta?.text || "Not available yet"}
                {eta?.distanceText ? ` (${eta.distanceText})` : ""}
              </p>

              <p>
                <span className="font-black text-slate-950">Last update:</span>{" "}
                {formatDateTime(currentLocation?.updatedAt || null)}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  to={`/track/${order._id}`}
                  className="inline-flex h-11 items-center justify-center gap-2 bg-green-600 px-4 text-sm font-black text-white"
                >
                  <Truck size={15} />
                  Track Live
                </Link>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 px-4 text-sm font-black text-slate-700"
                  >
                    <MapPin size={15} />
                    Open Maps
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DrawerOrderItem({ item }: { item: OrderItem }) {
  const isPlan = isPlanItem(item);
  const planDays = item.planDays || [];
  const planItems = item.planItems || [];
  const planId = getPlanId(item);

  return (
    <div className="border-b border-dashed border-slate-200 pb-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">
            {item.title || "Meal"} × {item.qty || 1}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            {isPlan && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">
                Meal Plan
              </span>
            )}

            {planId && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                {planId}
              </span>
            )}
          </div>
        </div>

        <p className="shrink-0 text-sm font-black text-slate-950">
          ₹{Number(item.price || 0) * Number(item.qty || 1)}
        </p>
      </div>

      {isPlan && planDays.length > 0 && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">
            Day-wise Plan Schedule
          </p>

          <div className="space-y-2">
            {planDays.map((day, index) => (
              <div
                key={`${day.day || index}-${day.date || ""}`}
                className="rounded-lg bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black text-slate-950">
                    Day {day.day}: {day.selectedMealTitle || "Meal"}
                  </p>

                  <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">
                    {readableStatus(day.deliveryStatus || "scheduled")}
                  </span>
                </div>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {formatDateOnly(day.date)} • {formatSlot(day.slot)} •{" "}
                  {day.preference || "mixed"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPlan && planDays.length === 0 && planItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {planItems.map((planItem, index) => (
            <span
              key={`${planItem._id || index}`}
              className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
            >
              {planItem.title || "Meal Item"} × {planItem.qty || 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelinePoint({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-950">
        {icon}
      </span>

      <div>
        <p className="text-base font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function BillingRow({
  label,
  value,
  highlight,
  discount,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  discount?: boolean;
}) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span
        className={`${
          highlight
            ? "text-sm font-black uppercase text-slate-950"
            : "text-slate-500"
        }`}
      >
        {label}
      </span>

      <span
        className={`font-black ${
          highlight
            ? "text-slate-950"
            : discount
            ? "text-green-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </p>
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
    <div className="border border-slate-200 bg-white p-8 text-center">
      <PackageCheck className="mx-auto text-slate-300" size={46} />

      <p className="mt-4 text-lg font-black text-slate-950">{title}</p>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>
    </div>
  );
}