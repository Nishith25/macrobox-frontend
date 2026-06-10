// frontend/src/pages/Orders.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  ArrowDownUp,
  CalendarClock,
  CalendarDays,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ReceiptText,
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

type Order = {
  _id: string;
  createdAt: string;
  totals: {
    subtotal: number;
    discount: number;
    payable: number;
    totalProtein: number;
    totalCalories: number;
    totalCarbs?: number;
    totalFat?: number;
  };
  items?: Array<{
    meal?: string;
    title?: string;
    price?: number;
    protein?: number;
    calories?: number;
    carbs?: number;
    fat?: number;
    qty?: number;
  }>;
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

const deliveryBadgeClass = (status?: string) => {
  switch (status) {
    case "accepted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "picked_up":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "out_for_delivery":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "delivered":
      return "border-green-200 bg-green-50 text-green-700";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
    const years = orders
      .map((order) => getOrderYear(order))
      .filter(Boolean)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => Number(b) - Number(a));

    return years;
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
        order.items?.map((item) => item.title || "Meal").join(" ") || "";

      const searchableText = [
        order._id,
        formatDateTime(order.createdAt),
        address,
        deliveryStatus,
        paymentStatus,
        itemTitles,
        String(order.totals.payable || ""),
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
      if (sortType === "newest") {
        return getOrderTime(b) - getOrderTime(a);
      }

      if (sortType === "oldest") {
        return getOrderTime(a) - getOrderTime(b);
      }

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
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10 text-slate-950">
        <p className="text-center text-sm font-semibold text-slate-500">
          Loading orders...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">
              My Orders
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              View order status, payment, delivery slot and live tracking.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        <section className="mb-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
              <SlidersHorizontal size={18} />
            </span>

            <div>
              <h2 className="text-base font-black text-slate-950">
                Filter Your Orders
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Search by meal, order ID, payment, delivery status or address.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.9fr_0.9fr]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search orders, meals, address..."
                className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div className="relative">
              <CalendarDays
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-black text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
              onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}
              className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
            </select>

            <div className="relative">
              <ArrowDownUp
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={sortType}
                onChange={(event) => setSortType(event.target.value as SortType)}
                className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-black text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amountHigh">Amount High to Low</option>
                <option value="amountLow">Amount Low to High</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRangeFilter("30days")}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                rangeFilter === "30days"
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Last 30 Days
            </button>

            <button
              type="button"
              onClick={() => setRangeFilter("3months")}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                rangeFilter === "3months"
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Last 3 Months
            </button>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={14} />
              Clear Filters
            </button>
          </div>
        </section>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet."
            description="Your paid orders and live tracking details will appear here."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No matching orders."
            description="Try changing your search, date, year or range filters."
          />
        ) : (
          <div className="grid gap-5">
            {filteredOrders.map((order) => {
              const mapsUrl = mapsLinkFromAddress(order.delivery?.address);
              const deliveryStatus = order.delivery?.status || "unassigned";
              const eta = order.delivery?.tracking?.eta;
              const currentLocation = order.delivery?.tracking?.currentLocation;
              const agent = order.delivery?.agent;

              const totalCalories = order.totals.totalCalories || 0;
              const totalProtein = order.totals.totalProtein || 0;
              const totalCarbs = order.totals.totalCarbs || 0;
              const totalFat = order.totals.totalFat || 0;

              return (
                <article
                  key={order._id}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ReceiptText size={18} className="text-green-600" />

                        <p className="font-black text-slate-950">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                        Order ID: {order._id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${paymentBadgeClass(
                          order.payment?.status
                        )}`}
                      >
                        {(order.payment?.status || "created").toUpperCase()}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${deliveryBadgeClass(
                          deliveryStatus
                        )}`}
                      >
                        DELIVERY: {readableStatus(deliveryStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                        <MiniStat label="Calories" value={`${totalCalories}`} />
                        <MiniStat label="Protein" value={`${totalProtein}g`} />
                        <MiniStat label="Carbs" value={`${totalCarbs}g`} />
                        <MiniStat label="Fat" value={`${totalFat}g`} />
                        <MiniStat
                          label="Discount"
                          value={`₹${order.totals.discount || 0}`}
                        />
                        <MiniStat
                          label="Payable"
                          value={`₹${order.totals.payable || 0}`}
                          highlight
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <InfoCard>
                          <div className="mb-1 flex items-center gap-2">
                            <CalendarClock
                              size={16}
                              className="text-green-600"
                            />

                            <p className="text-sm font-black text-slate-950">
                              Delivery Slot
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-slate-600">
                            {order.delivery?.slot?.date || "N/A"} •{" "}
                            {order.delivery?.slot?.time || "N/A"}
                          </p>
                        </InfoCard>

                        <InfoCard>
                          <div className="mb-1 flex items-center gap-2">
                            <MapPin size={16} className="text-green-600" />

                            <p className="text-sm font-black text-slate-950">
                              Delivery Address
                            </p>
                          </div>

                          <p className="line-clamp-2 text-sm font-semibold text-slate-600">
                            {formatAddress(order.delivery?.address)}
                          </p>

                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs font-black text-green-600 hover:underline"
                            >
                              Open in Google Maps
                            </a>
                          ) : (
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              No map location
                            </p>
                          )}
                        </InfoCard>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <InfoCard>
                          <div className="mb-2 flex items-center gap-2">
                            <PackageCheck
                              size={16}
                              className="text-green-600"
                            />

                            <p className="text-sm font-black text-slate-950">
                              Items
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {order.items.map((item, index) => (
                              <span
                                key={`${order._id}-${index}`}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {item.title || "Meal"} × {item.qty || 1}
                              </span>
                            ))}
                          </div>
                        </InfoCard>
                      )}
                    </div>

                    <LiveDeliveryCard
                      orderId={order._id}
                      deliveryStatus={deliveryStatus}
                      agent={agent}
                      etaText={eta?.text}
                      distanceText={eta?.distanceText}
                      updatedAt={currentLocation?.updatedAt || null}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] border p-3 ${
        highlight
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-[11px] font-black uppercase tracking-wide ${
          highlight ? "text-green-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          highlight ? "text-green-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
      {children}
    </div>
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>
    </div>
  );
}

function LiveDeliveryCard({
  orderId,
  deliveryStatus,
  agent,
  etaText,
  distanceText,
  updatedAt,
}: {
  orderId: string;
  deliveryStatus: string;
  agent?: DeliveryAgent | null;
  etaText?: string;
  distanceText?: string;
  updatedAt?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-green-600" />

          <p className="font-black text-slate-950">Live Delivery</p>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
          {readableStatus(deliveryStatus)}
        </span>
      </div>

      <div className="space-y-2 text-sm font-semibold text-slate-600">
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
          {etaText || "Not available yet"}
          {distanceText ? ` (${distanceText})` : ""}
        </p>

        <p>
          <span className="font-black text-slate-950">Last update:</span>{" "}
          {formatDateTime(updatedAt || null)}
        </p>
      </div>

      <Link
        to={`/track/${orderId}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700"
      >
        <Navigation size={16} />
        Track Live
      </Link>
    </div>
  );
}