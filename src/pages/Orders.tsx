// frontend/src/pages/Orders.tsx (FRONTEND)

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
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
  const [showFilters, setShowFilters] = useState(false);

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

  const paidOrders = orders.filter((order) => order.payment?.status === "paid");
  const planOrders = orders.filter((order) =>
    (order.items || []).some((item) => isPlanItem(item))
  );

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
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          Loading orders...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-10 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.38em] text-slate-400 sm:tracking-[0.45em]">
                MacroBox Orders
              </p>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:mt-6 sm:text-6xl">
                Track your
                <br />
                meal orders
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">
                Track your MacroBox meals, plan schedules, bill details and live
                delivery status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <HeaderBox label="Orders" value={`${orders.length}`} />
              <HeaderBox label="Paid" value={`${paidOrders.length}`} />
              <HeaderBox label="Plans" value={`${planOrders.length}`} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                  Past Orders
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {filteredOrders.length} of {orders.length} orders
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700"
                >
                  <Filter size={16} />
                  Filters
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search orders, coupon, address, order id..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
              />
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                  Filters active
                </span>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
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
              <div className="grid gap-4">
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
      </div>

      {showFilters && (
        <Drawer
          title="Filter Orders"
          subtitle="Search, sort and filter your order history."
          onClose={() => setShowFilters(false)}
        >
          <div className="grid gap-4">
            <Field label="SEARCH">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search orders..."
                  className="input-clean pl-11"
                />
              </div>
            </Field>

            <Field label="ORDER DATE">
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="input-clean pl-11"
                />
              </div>
            </Field>

            <Field label="YEAR">
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="input-clean"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="RANGE">
              <select
                value={rangeFilter}
                onChange={(event) =>
                  setRangeFilter(event.target.value as RangeFilter)
                }
                className="input-clean"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
              </select>
            </Field>

            <Field label="SORT BY">
              <div className="relative">
                <ArrowDownUp
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={sortType}
                  onChange={(event) =>
                    setSortType(event.target.value as SortType)
                  }
                  className="input-clean pl-11"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="amountHigh">Amount High</option>
                  <option value="amountLow">Amount Low</option>
                </select>
              </div>
            </Field>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
              Clear
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
            >
              Apply
            </button>
          </div>
        </Drawer>
      )}

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
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-green-50 text-2xl font-black text-green-600 sm:h-24 sm:w-24">
          {getOrderImageText(order)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                  {getOrderKitchenName(order)}
                </h3>

                {hasPlan && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    Plan Order
                  </span>
                )}
              </div>

              <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
                {formatAddress(order.delivery?.address)}
              </p>

              <p className="mt-1 break-all text-xs font-bold text-slate-400">
                #{order._id} · {formatDateTime(order.createdAt)}
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

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">
                {getPrimaryOrderItemText(order)}
              </p>

              {nextPlanDay && (
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Next: Day {nextPlanDay.day} ·{" "}
                  {nextPlanDay.selectedMealTitle || "Meal"} ·{" "}
                  {formatDateOnly(nextPlanDay.date)} ·{" "}
                  {formatSlot(nextPlanDay.slot)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${paymentBadgeClass(
                    order.payment?.status
                  )}`}
                >
                  {(order.payment?.status || "created").toUpperCase()}
                </span>

                {order.coupon?.code && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Coupon: {order.coupon.code}
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  ₹{splitTotals.payable}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <Link
                to={`/track/${order._id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
              >
                <Navigation size={15} />
                Track
              </Link>

              <button
                type="button"
                onClick={onViewDetails}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Details
                <ChevronRight size={16} />
              </button>
            </div>
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
    <Drawer
      title="Order Details"
      subtitle={`#${order._id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <section className="border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Order Timeline
          </p>

          <div className="space-y-4">
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
                    Main slot: {formatDateOnly(order.delivery?.slot?.date)} ·{" "}
                    {formatSlot(order.delivery?.slot?.time)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Items
          </p>

          <div className="space-y-3">
            {(order.items || []).map((item, index) => (
              <DrawerOrderItem key={`${order._id}-${index}`} item={item} />
            ))}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-4">
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

        <section className="border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Live Delivery
          </p>

          <div className="bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-4 text-sm font-black text-white"
              >
                <Truck size={15} />
                Track Live
              </Link>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-4 text-sm font-black text-slate-700"
                >
                  <MapPin size={15} />
                  Open Maps
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </Drawer>
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

          <div className="mt-2 flex flex-wrap gap-2">
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
        <div className="mt-3 bg-green-50 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-green-700">
            Day-wise Plan Schedule
          </p>

          <div className="space-y-2">
            {planDays.map((day, index) => (
              <div
                key={`${day.day || index}-${day.date || ""}`}
                className="bg-white p-3"
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
                  {formatDateOnly(day.date)} · {formatSlot(day.slot)} ·{" "}
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
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
            >
              {planItem.title || "Meal Item"} × {planItem.qty || 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />

      <aside
        className={`absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none ${
          wide ? "sm:w-[560px]" : "sm:w-[430px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black tracking-[-0.04em] text-slate-950">
              {title}
            </h2>

            <p className="mt-1 break-all text-sm font-bold text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function HeaderBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm sm:min-w-[140px]">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
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
      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
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
    <div className="border border-slate-200 bg-slate-50 p-8 text-center">
      <PackageCheck className="mx-auto text-slate-300" size={46} />

      <p className="mt-4 text-lg font-black text-slate-950">{title}</p>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>
    </div>
  );
}