// frontend/src/pages/Orders.tsx (FRONTEND)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  CalendarClock,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ReceiptText,
  Route,
  Truck,
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
    slot: { date: string; time: string };
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
  payment: { status: string };
};

const mapsLinkFromAddress = (addr?: Order["delivery"]["address"]) => {
  if (!addr) return null;

  if (addr.mapsUrl) return addr.mapsUrl;

  const t = String(addr.locationText || addr.formattedAddress || "").trim();

  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    t
  )}`;
};

const readableStatus = (status?: string) => {
  if (!status) return "Unassigned";
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const paymentBadgeClass = (status?: string) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-100";
    case "failed":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-yellow-50 text-yellow-800 border-yellow-100";
  }
};

const deliveryBadgeClass = (status?: string) => {
  switch (status) {
    case "accepted":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "picked_up":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    case "out_for_delivery":
      return "bg-orange-50 text-orange-700 border-orange-100";
    case "delivered":
      return "bg-green-50 text-green-700 border-green-100";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-gray-50 text-gray-700 border-gray-100";
  }
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-center text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">No orders yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Your paid orders and live tracking details will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          View order status, payment, delivery slot and live tracking.
        </p>
      </div>

      <div className="grid gap-4">
        {orders.map((o) => {
          const mapsUrl = mapsLinkFromAddress(o.delivery?.address);
          const deliveryStatus = o.delivery?.status || "unassigned";
          const eta = o.delivery?.tracking?.eta;
          const currentLocation = o.delivery?.tracking?.currentLocation;
          const agent = o.delivery?.agent;
          const totalCarbs = o.totals.totalCarbs ?? 0;
          const totalFat = o.totals.totalFat ?? 0;

          return (
            <div
              key={o._id}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md"
            >
              {/* TOP */}
              <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ReceiptText size={18} className="text-green-600" />
                    <p className="font-bold text-gray-900">
                      {formatDateTime(o.createdAt)}
                    </p>
                  </div>

                  <p className="mt-1 break-all text-xs text-gray-500">
                    Order ID: {o._id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${paymentBadgeClass(
                      o.payment?.status
                    )}`}
                  >
                    {(o.payment?.status || "created").toUpperCase()}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${deliveryBadgeClass(
                      deliveryStatus
                    )}`}
                  >
                    DELIVERY: {readableStatus(deliveryStatus)}
                  </span>
                </div>
              </div>

              {/* BODY */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                {/* LEFT */}
                <div className="space-y-4">
                  {/* MACROS + PRICE */}
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                    <MiniStat label="Calories" value={`${o.totals.totalCalories || 0}`} />
                    <MiniStat label="Protein" value={`${o.totals.totalProtein || 0}g`} />
                    <MiniStat label="Carbs" value={`${totalCarbs}g`} />
                    <MiniStat label="Fat" value={`${totalFat}g`} />
                    <MiniStat label="Discount" value={`₹${o.totals.discount || 0}`} />
                    <MiniStat label="Payable" value={`₹${o.totals.payable || 0}`} green />
                  </div>

                  {/* SLOT + ADDRESS */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <CalendarClock size={16} className="text-green-600" />
                        <p className="text-sm font-bold text-gray-900">
                          Delivery Slot
                        </p>
                      </div>

                      <p className="text-sm text-gray-700">
                        {o.delivery?.slot?.date || "N/A"} •{" "}
                        {o.delivery?.slot?.time || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <MapPin size={16} className="text-green-600" />
                        <p className="text-sm font-bold text-gray-900">
                          Delivery Address
                        </p>
                      </div>

                      <p className="line-clamp-2 text-sm text-gray-700">
                        {formatAddress(o.delivery?.address)}
                      </p>

                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-green-700 underline"
                        >
                          Open in Google Maps
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          No map location
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ITEMS */}
                  {o.items && o.items.length > 0 && (
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <PackageCheck size={16} className="text-green-600" />
                        <p className="text-sm font-bold text-gray-900">Items</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {o.items.map((item, index) => (
                          <span
                            key={`${o._id}-${index}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                          >
                            {item.title || "Meal"} × {item.qty || 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT LIVE TRACKING */}
                <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-green-700" />
                      <p className="font-bold text-gray-900">
                        Live Delivery
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                      {readableStatus(deliveryStatus)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">Agent:</span>{" "}
                      {agent?.name || "Not assigned yet"}
                    </p>

                    <p className="flex items-center gap-1">
                      <Phone size={14} className="text-green-700" />
                      <span className="font-semibold">Phone:</span>{" "}
                      {agent?.deliveryProfile?.phone ||
                        agent?.phone ||
                        "N/A"}
                    </p>

                    <p>
                      <span className="font-semibold">ETA:</span>{" "}
                      {eta?.text || "Not available yet"}
                      {eta?.distanceText ? ` (${eta.distanceText})` : ""}
                    </p>

                    <p>
                      <span className="font-semibold">Last update:</span>{" "}
                      {formatDateTime(currentLocation?.updatedAt || null)}
                    </p>
                  </div>

                  <Link
                    to={`/track/${o._id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <Navigation size={16} />
                    Track Live
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        green ? "bg-green-50 text-green-700" : "bg-gray-50"
      }`}
    >
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-sm font-extrabold ${
          green ? "text-green-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}