// frontend/src/pages/DeliveryDashboard.tsx (FRONTEND)
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  CalendarClock,
  IndianRupee,
  MapPin,
  Navigation,
  PackageCheck,
  RefreshCw,
  Route,
  Search,
  User,
} from "lucide-react";

type OrderItem = {
  meal?: string;
  title?: string;
  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  qty?: number;
};

type OrderUser = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type DeliveryAddress = {
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

type DeliverySlot = {
  date?: string;
  time?: string;
};

type TrackingLocation = {
  lat?: number | null;
  lng?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string | null;
};

type TrackingEta = {
  text?: string;
  distanceText?: string;
  durationValue?: number | null;
  distanceValue?: number | null;
  lastCalculatedAt?: string | null;
};

type Order = {
  _id: string;
  user?: OrderUser;
  items: OrderItem[];
  totals?: {
    subtotal?: number;
    discount?: number;
    payable?: number;
    totalProtein?: number;
    totalCalories?: number;
    totalCarbs?: number;
    totalFat?: number;
  };
  delivery?: {
    address?: DeliveryAddress;
    slot?: DeliverySlot;
    status?: string;
    acceptedAt?: string | null;
    pickedUpAt?: string | null;
    outForDeliveryAt?: string | null;
    deliveredAt?: string | null;
    tracking?: {
      isLive?: boolean;
      currentLocation?: TrackingLocation;
      eta?: TrackingEta | null;
      route?: {
        encodedPolyline?: string;
        updatedAt?: string | null;
      } | null;
    };
  };
  payment?: {
    status?: string;
  };
  createdAt?: string;
};

type ActiveTab = "available" | "my";

const STATUS_OPTIONS = [
  { value: "accepted", label: "Accepted" },
  { value: "picked_up", label: "Picked Up" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
];

const LOCATION_SEND_THROTTLE_MS = 10000;

function formatCurrency(amount?: number) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readableStatus(status?: string) {
  if (!status) return "N/A";
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadgeClass(status?: string) {
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
}

function getPaymentBadgeClass(status?: string) {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-100";
    case "failed":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }
}

function formatAddress(address?: DeliveryAddress) {
  if (!address) return "N/A";

  if (address.formattedAddress) return address.formattedAddress;

  const parts = [
    address.flatNo || address.line1,
    address.floor,
    address.buildingName || address.line2,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.join(", ") || "N/A";
}

function getMapsUrl(address?: DeliveryAddress) {
  if (!address) return "";

  if (address.mapsUrl) return address.mapsUrl;

  const query = address.formattedAddress || address.locationText;
  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function matchesSearch(order: Order, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const address = formatAddress(order.delivery?.address);
  const items = order.items?.map((item) => item.title || "").join(" ") || "";

  const haystack = [
    order._id,
    order.user?.name,
    order.user?.email,
    order.user?.phone,
    order.payment?.status,
    order.delivery?.status,
    order.delivery?.slot?.date,
    order.delivery?.slot?.time,
    address,
    items,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("available");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  const watchIdsRef = useRef<Record<string, number>>({});
  const lastSentRef = useRef<Record<string, number>>({});

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const [availableRes, myOrdersRes] = await Promise.all([
        api.get("/delivery/available"),
        api.get("/delivery/my-orders"),
      ]);

      setAvailableOrders(
        Array.isArray(availableRes.data) ? availableRes.data : []
      );
      setMyOrders(Array.isArray(myOrdersRes.data) ? myOrdersRes.data : []);
    } catch (error) {
      console.error("Failed to fetch delivery orders:", error);
      alert("Failed to load delivery dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    return () => {
      Object.values(watchIdsRef.current).forEach((watchId) => {
        navigator.geolocation.clearWatch(watchId);
      });

      watchIdsRef.current = {};
      lastSentRef.current = {};
    };
  }, []);

  const filteredAvailableOrders = useMemo(() => {
    return availableOrders.filter((order) => matchesSearch(order, search));
  }, [availableOrders, search]);

  const filteredMyOrders = useMemo(() => {
    return myOrders.filter((order) => matchesSearch(order, search));
  }, [myOrders, search]);

  const activeOrders =
    activeTab === "available" ? filteredAvailableOrders : filteredMyOrders;

  const acceptOrder = async (orderId: string) => {
    try {
      setBusyOrderId(orderId);
      await api.post(`/delivery/${orderId}/accept`);
      await fetchOrders();
      setActiveTab("my");
      alert("Order accepted successfully.");
    } catch (error: any) {
      console.error("Accept order error:", error);
      alert(error?.response?.data?.message || "Failed to accept order.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      setBusyOrderId(orderId);
      await api.post(`/delivery/${orderId}/status`, { status });

      if (status === "delivered" || status === "cancelled") {
        const watchId = watchIdsRef.current[orderId];

        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          delete watchIdsRef.current[orderId];
          delete lastSentRef.current[orderId];
        }

        setTrackingOrderId((current) =>
          current === orderId ? null : current
        );
      }

      await fetchOrders();
    } catch (error: any) {
      console.error("Update status error:", error);
      alert(error?.response?.data?.message || "Failed to update status.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const startLiveTracking = async (orderId: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported on this device/browser.");
      return;
    }

    if (watchIdsRef.current[orderId]) {
      alert("Live tracking is already running for this order.");
      return;
    }

    setTrackingOrderId(orderId);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const now = Date.now();
          const lastSentAt = lastSentRef.current[orderId] || 0;

          if (now - lastSentAt < LOCATION_SEND_THROTTLE_MS) {
            return;
          }

          lastSentRef.current[orderId] = now;

          await api.post(`/delivery/${orderId}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading:
              typeof position.coords.heading === "number" &&
              !Number.isNaN(position.coords.heading)
                ? position.coords.heading
                : null,
            speed:
              typeof position.coords.speed === "number" &&
              !Number.isNaN(position.coords.speed)
                ? position.coords.speed
                : null,
          });
        } catch (error) {
          console.error("Location update failed:", error);
        }
      },
      (error) => {
        console.error("Geolocation watch error:", error);
        alert("Unable to get live location. Please allow location access.");

        if (watchIdsRef.current[orderId]) {
          navigator.geolocation.clearWatch(watchIdsRef.current[orderId]);
          delete watchIdsRef.current[orderId];
        }

        delete lastSentRef.current[orderId];
        setTrackingOrderId((current) =>
          current === orderId ? null : current
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdsRef.current[orderId] = watchId;
    lastSentRef.current[orderId] = 0;

    alert("Live tracking started.");
  };

  const stopLiveTracking = (orderId: string) => {
    const watchId = watchIdsRef.current[orderId];

    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      delete watchIdsRef.current[orderId];
    }

    delete lastSentRef.current[orderId];

    if (trackingOrderId === orderId) {
      setTrackingOrderId(null);
    }

    alert("Live tracking stopped.");
  };

  const isTracking = (orderId: string) => Boolean(watchIdsRef.current[orderId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Delivery Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Accept orders, manage assigned deliveries and update live tracking.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* TABS + SEARCH */}
      <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("available")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === "available"
                  ? "bg-white text-green-700 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Available Orders ({availableOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === "my"
                  ? "bg-white text-green-700 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Delivery Orders ({myOrders.length})
            </button>
          </div>

          <div className="relative w-full lg:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer, email, address, item..."
              className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Loading delivery dashboard...
        </div>
      ) : activeTab === "available" ? (
        <section>
          <SectionHeader
            title="Available Orders"
            subtitle="Orders ready for delivery assignment."
            count={`${filteredAvailableOrders.length} shown`}
          />

          {filteredAvailableOrders.length === 0 ? (
            <EmptyCard text="No available orders found." />
          ) : (
            <div className="grid gap-4">
              {filteredAvailableOrders.map((order) => (
                <AvailableOrderCard
                  key={order._id}
                  order={order}
                  busy={busyOrderId === order._id}
                  onAccept={() => acceptOrder(order._id)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <SectionHeader
            title="My Delivery Orders"
            subtitle="Your assigned orders with delivery controls."
            count={`${filteredMyOrders.length} shown`}
          />

          {filteredMyOrders.length === 0 ? (
            <EmptyCard text="No assigned delivery orders found." />
          ) : (
            <div className="grid gap-4">
              {filteredMyOrders.map((order) => {
                const currentStatus = order.delivery?.status || "";
                const currentLocation =
                  order.delivery?.tracking?.currentLocation;

                const canStartTracking =
                  currentStatus === "picked_up" ||
                  currentStatus === "out_for_delivery";

                return (
                  <MyDeliveryOrderCard
                    key={order._id}
                    order={order}
                    currentStatus={currentStatus}
                    currentLocation={currentLocation}
                    busy={busyOrderId === order._id}
                    isLiveTracking={isTracking(order._id)}
                    trackingOrderId={trackingOrderId}
                    canStartTracking={canStartTracking}
                    onStatusChange={(status) => updateStatus(order._id, status)}
                    onStartTracking={() => startLiveTracking(order._id)}
                    onStopTracking={() => stopLiveTracking(order._id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <span className="w-fit rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
        {count}
      </span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-gray-600 shadow-sm">
      {text}
    </div>
  );
}

function AvailableOrderCard({
  order,
  busy,
  onAccept,
}: {
  order: Order;
  busy: boolean;
  onAccept: () => void;
}) {
  const address = order.delivery?.address;
  const mapsUrl = getMapsUrl(address);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Order ID</p>
              <p className="break-all text-sm font-bold text-gray-900">
                {order._id}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                className={getPaymentBadgeClass(order.payment?.status)}
                text={(order.payment?.status || "created").toUpperCase()}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <InfoBlock
              icon={<User size={15} />}
              label="Customer"
              value={order.user?.name || "N/A"}
              subValue={order.user?.email || "N/A"}
            />

            <InfoBlock
              icon={<CalendarClock size={15} />}
              label="Slot"
              value={`${order.delivery?.slot?.date || "N/A"} | ${
                order.delivery?.slot?.time || "N/A"
              }`}
            />

            <InfoBlock
              icon={<IndianRupee size={15} />}
              label="Amount"
              value={formatCurrency(order.totals?.payable)}
            />

            <InfoBlock
              icon={<PackageCheck size={15} />}
              label="Items"
              value={`${order.items?.length || 0} item(s)`}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={15} className="text-green-700" />
              <p className="text-sm font-bold text-gray-900">Address</p>
            </div>

            <p className="line-clamp-2 text-sm text-gray-700">
              {formatAddress(address)}
            </p>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-green-700 underline"
              >
                Open in Google Maps
              </a>
            )}
          </div>

          <ItemChips order={order} />
        </div>

        <div className="flex items-start lg:min-w-[190px]">
          <button
            onClick={onAccept}
            disabled={busy}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {busy ? "Accepting..." : "Accept Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MyDeliveryOrderCard({
  order,
  currentStatus,
  currentLocation,
  busy,
  isLiveTracking,
  trackingOrderId,
  canStartTracking,
  onStatusChange,
  onStartTracking,
  onStopTracking,
}: {
  order: Order;
  currentStatus: string;
  currentLocation?: TrackingLocation;
  busy: boolean;
  isLiveTracking: boolean;
  trackingOrderId: string | null;
  canStartTracking: boolean;
  onStatusChange: (status: string) => void;
  onStartTracking: () => void;
  onStopTracking: () => void;
}) {
  const address = order.delivery?.address;
  const mapsUrl = getMapsUrl(address);
  const eta = order.delivery?.tracking?.eta;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-200 hover:shadow-md">
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Order ID</p>
              <p className="break-all text-sm font-bold text-gray-900">
                {order._id}
              </p>
            </div>

            <Badge
              text={readableStatus(currentStatus)}
              className={getStatusBadgeClass(currentStatus)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <InfoBlock
              icon={<User size={15} />}
              label="Customer"
              value={order.user?.name || "N/A"}
              subValue={order.user?.email || "N/A"}
            />

            <InfoBlock
              icon={<CalendarClock size={15} />}
              label="Slot"
              value={`${order.delivery?.slot?.date || "N/A"} | ${
                order.delivery?.slot?.time || "N/A"
              }`}
            />

            <InfoBlock
              icon={<IndianRupee size={15} />}
              label="Amount"
              value={formatCurrency(order.totals?.payable)}
            />

            <InfoBlock
              icon={<Route size={15} />}
              label="Tracking"
              value={order.delivery?.tracking?.isLive ? "Active" : "Not active"}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MiniPanel
              label="ETA"
              value={eta?.text || "Calculating..."}
              tone="blue"
            />

            <MiniPanel
              label="Distance Left"
              value={eta?.distanceText || "Calculating..."}
              tone="green"
            />

            <MiniPanel
              label="Last Location"
              value={formatDateTime(currentLocation?.updatedAt || null)}
              tone="gray"
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={15} className="text-green-700" />
              <p className="text-sm font-bold text-gray-900">Address</p>
            </div>

            <p className="line-clamp-2 text-sm text-gray-700">
              {formatAddress(address)}
            </p>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-green-700 underline"
              >
                Open in Google Maps
              </a>
            )}
          </div>

          <ItemChips order={order} />

          <div className="grid gap-2 text-xs md:grid-cols-4">
            <TimeBlock
              label="Accepted"
              value={formatDateTime(order.delivery?.acceptedAt)}
            />
            <TimeBlock
              label="Picked Up"
              value={formatDateTime(order.delivery?.pickedUpAt)}
            />
            <TimeBlock
              label="Out for Delivery"
              value={formatDateTime(order.delivery?.outForDeliveryAt)}
            />
            <TimeBlock
              label="Delivered"
              value={formatDateTime(order.delivery?.deliveredAt)}
            />
          </div>

          {!canStartTracking && currentStatus !== "delivered" && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Set status to <b>Picked Up</b> or <b>Out for Delivery</b> before
              starting live tracking.
            </div>
          )}

          {(trackingOrderId === order._id || isLiveTracking) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Live tracking is active. Keep this page open and allow location
              access for continuous updates.
            </div>
          )}

          {currentStatus === "delivered" && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              This order is marked as delivered.
            </div>
          )}
        </div>

        <div className="space-y-2">
          {STATUS_OPTIONS.map((statusOption) => (
            <button
              key={statusOption.value}
              onClick={() => onStatusChange(statusOption.value)}
              disabled={busy}
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              Mark {statusOption.label}
            </button>
          ))}

          {!isLiveTracking ? (
            <button
              onClick={onStartTracking}
              disabled={!canStartTracking}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start Live Tracking
            </button>
          ) : (
            <button
              onClick={onStopTracking}
              className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Stop Live Tracking
            </button>
          )}

          <Link
            to={`/track/${order._id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            <Navigation size={15} />
            Open Tracking
          </Link>
        </div>
      </div>
    </div>
  );
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {text}
    </span>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="mb-1 flex items-center gap-1 text-gray-500">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="truncate text-sm font-bold text-gray-900">{value}</p>
      {subValue && <p className="truncate text-xs text-gray-500">{subValue}</p>}
    </div>
  );
}

function MiniPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "gray";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "green"
      ? "bg-green-50 text-green-700"
      : "bg-gray-50 text-gray-700";

  return (
    <div className={`rounded-xl p-3 ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function ItemChips({ order }: { order: Order }) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold text-gray-900">Items</p>
      <div className="flex flex-wrap gap-2">
        {order.items?.map((item, index) => (
          <span
            key={`${order._id}-${index}`}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
          >
            {item.title || "Meal"} × {item.qty || 1}
          </span>
        ))}
      </div>
    </div>
  );
}