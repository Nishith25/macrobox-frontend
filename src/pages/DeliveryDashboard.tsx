// frontend/src/pages/DeliveryDashboard.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Route,
  Search,
  Truck,
  User,
  X,
} from "lucide-react";

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

type OrderItem = {
  meal?: string;
  itemType?: "meal" | "plan" | "challenge_plan";
  title?: string;
  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  qty?: number;
  planId?: string;
  challengeId?: string;
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
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
    planSubtotal?: number;
    challengePlanSubtotal?: number;
    normalMealsSubtotal?: number;
    totalProtein?: number;
    totalCalories?: number;
    totalCarbs?: number;
    totalFat?: number;
  };
  coupon?: {
    code?: string;
    discount?: number;
    redeemed?: boolean;
    applyOn?: "cart" | "plan" | "challenge_plan";
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

const todayISO = () => new Date().toISOString().slice(0, 10);

const todayText = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

function formatDateOnly(value?: string) {
  if (!value) return "N/A";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSlot(slot?: string) {
  if (!slot) return "N/A";

  const hour = Number(slot.split(":")[0]);

  if (!Number.isFinite(hour)) return slot;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
}

function readableStatus(status?: string) {
  if (!status) return "Unassigned";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status?: string) {
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
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getPaymentBadgeClass(status?: string) {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50 text-green-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
}

function formatAddress(address?: DeliveryAddress) {
  if (!address) return "Address not available";

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

  return parts.join(", ") || "Address not available";
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

function isPlanItem(item?: OrderItem) {
  return (
    item?.itemType === "plan" ||
    item?.itemType === "challenge_plan" ||
    Boolean(item?.planId) ||
    Boolean(item?.challengeId)
  );
}

function getPlanId(item?: OrderItem) {
  return String(item?.planId || item?.challengeId || "").trim();
}

function getNextPlanDay(item: OrderItem) {
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
}

function getSplitTotals(order: Order) {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter((item) => isPlanItem(item))
    .reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

  const subtotal = Number(order.totals?.subtotal || 0);

  const savedPlanSubtotal = Number(
    order.totals?.planSubtotal ||
      order.totals?.challengePlanSubtotal ||
      0
  );

  const planSubtotal =
    savedPlanSubtotal > 0
      ? savedPlanSubtotal
      : Math.round(fallbackPlanSubtotal);

  const savedNormalMealsSubtotal = Number(
    order.totals?.normalMealsSubtotal || 0
  );

  const normalMealsSubtotal =
    savedNormalMealsSubtotal > 0
      ? savedNormalMealsSubtotal
      : Math.max(subtotal - planSubtotal, 0);

  return {
    subtotal,
    normalMealsSubtotal,
    planSubtotal,
    discount: Number(order.totals?.discount || 0),
    payable: Number(order.totals?.payable || 0),
  };
}

function matchesSearch(order: Order, query: string) {
  const q = query.trim().toLowerCase();

  if (!q) return true;

  const address = formatAddress(order.delivery?.address);

  const items =
    order.items
      ?.map((item) => {
        const title = item.title || "";
        const planId = getPlanId(item);

        const planItems =
          item.planItems?.map((planItem) => planItem.title || "").join(" ") ||
          "";

        const planDays =
          item.planDays
            ?.map(
              (day) =>
                `${day.selectedMealTitle || ""} ${
                  day.alternativeMealTitle || ""
                } ${day.date || ""} ${day.slot || ""}`
            )
            .join(" ") || "";

        return `${title} ${planId} ${planItems} ${planDays}`;
      })
      .join(" ") || "";

  const haystack = [
    order._id,
    order.user?.name,
    order.user?.email,
    order.user?.phone,
    order.payment?.status,
    order.delivery?.status,
    order.delivery?.slot?.date,
    order.delivery?.slot?.time,
    order.coupon?.code,
    address,
    items,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function getOrderItemCount(order: Order) {
  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );
}

function getNextDeliveryText(order: Order) {
  const planItem = (order.items || []).find((item) => isPlanItem(item));
  const planDay = planItem ? getNextPlanDay(planItem) : null;

  if (planDay) {
    return `Day ${planDay.day || 1} · ${
      planDay.selectedMealTitle || "Plan Meal"
    }`;
  }

  const firstItem = order.items?.[0];

  return firstItem?.title || "Meal Delivery";
}

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("available");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  const [selectedAvailableOrder, setSelectedAvailableOrder] =
    useState<Order | null>(null);

  const [selectedMyOrder, setSelectedMyOrder] = useState<Order | null>(null);

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

  const activeDeliveries = useMemo(() => {
    return myOrders.filter(
      (order) =>
        order.delivery?.status !== "delivered" &&
        order.delivery?.status !== "cancelled"
    ).length;
  }, [myOrders]);

  const completedDeliveries = useMemo(() => {
    return myOrders.filter(
      (order) => order.delivery?.status === "delivered"
    ).length;
  }, [myOrders]);

  const acceptOrder = async (orderId: string) => {
    try {
      setBusyOrderId(orderId);

      await api.post(`/delivery/${orderId}/accept`);
      await fetchOrders();

      setSelectedAvailableOrder(null);
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

      setSelectedMyOrder((current) =>
        current?._id === orderId
          ? {
              ...current,
              delivery: {
                ...current.delivery,
                status,
              },
            }
          : current
      );
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

          if (now - lastSentAt < LOCATION_SEND_THROTTLE_MS) return;

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
          navigator.geolocation.clearWatch(
            watchIdsRef.current[orderId]
          );

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

  const isTracking = (orderId: string) =>
    Boolean(watchIdsRef.current[orderId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={19} />
          Loading delivery dashboard...
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
                MacroBox Delivery
              </p>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:mt-6 sm:text-6xl">
                Manage your
                <br />
                deliveries
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">
                Accept available orders, update delivery progress and share
                live location with customers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <HeaderStat
                label="Available"
                value={`${availableOrders.length}`}
              />

              <HeaderStat
                label="Active"
                value={`${activeDeliveries}`}
                accent
              />

              <HeaderStat
                label="Delivered"
                value={`${completedDeliveries}`}
              />

              <HeaderStat label="Today" value={todayText()} />
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
                  Delivery Orders
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Switch between available and assigned deliveries.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchOrders}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("available")}
              className={`border-r border-slate-200 px-3 py-4 text-center text-sm font-black transition sm:px-5 ${
                activeTab === "available"
                  ? "bg-green-50 text-green-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Available
              <span
                className={`ml-2 rounded-full px-2.5 py-1 text-xs ${
                  activeTab === "available"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {availableOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`px-3 py-4 text-center text-sm font-black transition sm:px-5 ${
                activeTab === "my"
                  ? "bg-green-50 text-green-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              My Deliveries
              <span
                className={`ml-2 rounded-full px-2.5 py-1 text-xs ${
                  activeTab === "my"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {myOrders.length}
              </span>
            </button>
          </div>

          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, customer, address or meal..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
              />
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                {activeTab === "available"
                  ? "Available Orders"
                  : "My Delivery Orders"}
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {activeTab === "available"
                  ? `${filteredAvailableOrders.length} order${
                      filteredAvailableOrders.length === 1 ? "" : "s"
                    } ready to accept`
                  : `${filteredMyOrders.length} assigned order${
                      filteredMyOrders.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>

          {activeTab === "available" ? (
            filteredAvailableOrders.length === 0 ? (
              <EmptyCard
                title="No available orders"
                text="New orders ready for delivery will appear here."
              />
            ) : (
              <div className="grid gap-4">
                {filteredAvailableOrders.map((order) => (
                  <AvailableOrderCard
                    key={order._id}
                    order={order}
                    busy={busyOrderId === order._id}
                    onAccept={() => acceptOrder(order._id)}
                    onView={() => setSelectedAvailableOrder(order)}
                  />
                ))}
              </div>
            )
          ) : filteredMyOrders.length === 0 ? (
            <EmptyCard
              title="No assigned orders"
              text="Accept an available order to start managing its delivery."
            />
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
                    canStartTracking={canStartTracking}
                    onView={() => setSelectedMyOrder(order)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedAvailableOrder && (
        <AvailableOrderDrawer
          order={selectedAvailableOrder}
          busy={busyOrderId === selectedAvailableOrder._id}
          onAccept={() => acceptOrder(selectedAvailableOrder._id)}
          onClose={() => setSelectedAvailableOrder(null)}
        />
      )}

      {selectedMyOrder && (
        <MyOrderDrawer
          order={selectedMyOrder}
          busy={busyOrderId === selectedMyOrder._id}
          isLiveTracking={isTracking(selectedMyOrder._id)}
          onStatusChange={(status) =>
            updateStatus(selectedMyOrder._id, status)
          }
          onStartTracking={() =>
            startLiveTracking(selectedMyOrder._id)
          }
          onStopTracking={() =>
            stopLiveTracking(selectedMyOrder._id)
          }
          onClose={() => setSelectedMyOrder(null)}
        />
      )}
    </main>
  );
}

function AvailableOrderCard({
  order,
  busy,
  onAccept,
  onView,
}: {
  order: Order;
  busy: boolean;
  onAccept: () => void;
  onView: () => void;
}) {
  const splitTotals = getSplitTotals(order);
  const address = order.delivery?.address;
  const hasPlan = order.items?.some((item) => isPlanItem(item));

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-green-50 text-green-700 sm:h-24 sm:w-24">
          <PackageCheck size={30} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
                  {order.user?.name || address?.fullName || "Customer"}
                </h3>

                {hasPlan && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    Plan Delivery
                  </span>
                )}

                <Badge
                  text={(order.payment?.status || "created").toUpperCase()}
                  className={getPaymentBadgeClass(order.payment?.status)}
                />
              </div>

              <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
                {formatAddress(address)}
              </p>

              <p className="mt-1 break-all text-xs font-bold text-slate-400">
                #{order._id}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                {formatCurrency(splitTotals.payable)}
              </p>

              <p className="mt-1 text-xs font-black text-slate-400">
                TOTAL PAYABLE
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CompactDetail
              label="Delivery"
              value={`${formatDateOnly(order.delivery?.slot?.date)} · ${formatSlot(
                order.delivery?.slot?.time
              )}`}
            />

            <CompactDetail
              label="Items"
              value={`${getOrderItemCount(order)} item(s)`}
            />

            <CompactDetail
              label="Order"
              value={getNextDeliveryText(order)}
            />

            <CompactDetail
              label="Created"
              value={formatDateTime(order.createdAt)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Check size={16} />
              )}

              {busy ? "Accepting..." : "Accept"}
            </button>

            <button
              type="button"
              onClick={onView}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Details
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MyDeliveryOrderCard({
  order,
  currentStatus,
  currentLocation,
  busy,
  isLiveTracking,
  canStartTracking,
  onView,
}: {
  order: Order;
  currentStatus: string;
  currentLocation?: TrackingLocation;
  busy: boolean;
  isLiveTracking: boolean;
  canStartTracking: boolean;
  onView: () => void;
}) {
  const splitTotals = getSplitTotals(order);
  const eta = order.delivery?.tracking?.eta;
  const address = order.delivery?.address;

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-green-50 text-green-700 sm:h-24 sm:w-24">
          <Truck size={30} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
                  {order.user?.name || address?.fullName || "Customer"}
                </h3>

                <Badge
                  text={readableStatus(currentStatus)}
                  className={getStatusBadgeClass(currentStatus)}
                />

                {isLiveTracking && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                    <CircleDot size={12} />
                    Live
                  </span>
                )}
              </div>

              <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
                {formatAddress(address)}
              </p>

              <p className="mt-1 break-all text-xs font-bold text-slate-400">
                #{order._id}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                {formatCurrency(splitTotals.payable)}
              </p>

              <p className="mt-1 text-xs font-black text-slate-400">
                TOTAL PAYABLE
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CompactDetail
              label="Delivery"
              value={`${formatDateOnly(order.delivery?.slot?.date)} · ${formatSlot(
                order.delivery?.slot?.time
              )}`}
            />

            <CompactDetail
              label="Order"
              value={getNextDeliveryText(order)}
            />

            <CompactDetail
              label="ETA"
              value={eta?.text || "Not available"}
            />

            <CompactDetail
              label="Last Update"
              value={formatDateTime(currentLocation?.updatedAt)}
            />
          </div>

          {!canStartTracking &&
            currentStatus !== "delivered" &&
            currentStatus !== "cancelled" && (
              <p className="mt-3 text-xs font-bold text-yellow-700">
                Mark the order as Picked Up before starting tracking.
              </p>
            )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={onView}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              Manage
              <ChevronRight size={16} />
            </button>

            <Link
              to={`/track/${order._id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Navigation size={15} />
              Tracking
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function AvailableOrderDrawer({
  order,
  busy,
  onAccept,
  onClose,
}: {
  order: Order;
  busy: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const splitTotals = getSplitTotals(order);
  const address = order.delivery?.address;
  const mapsUrl = getMapsUrl(address);

  return (
    <Drawer
      title="Available Delivery"
      subtitle={`Order #${order._id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <CustomerSection order={order} />

        <section className="border border-slate-200 bg-white p-4">
          <SectionLabel>Delivery Information</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <DrawerStat
              label="Date"
              value={formatDateOnly(order.delivery?.slot?.date)}
            />

            <DrawerStat
              label="Time"
              value={formatSlot(order.delivery?.slot?.time)}
            />

            <DrawerStat
              label="Items"
              value={`${getOrderItemCount(order)} item(s)`}
            />

            <DrawerStat
              label="Payable"
              value={formatCurrency(splitTotals.payable)}
            />
          </div>
        </section>

        <AddressSection address={address} mapsUrl={mapsUrl} />

        <BillingBreakdown order={order} />

        <DeliveryItems order={order} />

        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Check size={18} />
          )}

          {busy ? "Accepting Delivery..." : "Accept Delivery"}
        </button>
      </div>
    </Drawer>
  );
}

function MyOrderDrawer({
  order,
  busy,
  isLiveTracking,
  onStatusChange,
  onStartTracking,
  onStopTracking,
  onClose,
}: {
  order: Order;
  busy: boolean;
  isLiveTracking: boolean;
  onStatusChange: (status: string) => void;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onClose: () => void;
}) {
  const currentStatus = order.delivery?.status || "";
  const currentLocation = order.delivery?.tracking?.currentLocation;
  const eta = order.delivery?.tracking?.eta;
  const address = order.delivery?.address;
  const mapsUrl = getMapsUrl(address);

  const canStartTracking =
    currentStatus === "picked_up" ||
    currentStatus === "out_for_delivery";

  return (
    <Drawer
      title="Manage Delivery"
      subtitle={`Order #${order._id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            text={readableStatus(currentStatus)}
            className={getStatusBadgeClass(currentStatus)}
          />

          {isLiveTracking && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
              <CircleDot size={12} />
              Live Tracking
            </span>
          )}
        </div>

        <CustomerSection order={order} />

        <section className="border border-slate-200 bg-white p-4">
          <SectionLabel>Delivery Progress</SectionLabel>

          <div className="space-y-3">
            {STATUS_OPTIONS.map((statusOption, index) => {
              const currentIndex = STATUS_OPTIONS.findIndex(
                (item) => item.value === currentStatus
              );

              const completed = index <= currentIndex;
              const active = statusOption.value === currentStatus;

              return (
                <div
                  key={statusOption.value}
                  className={`flex items-center justify-between gap-3 border p-3 ${
                    active
                      ? "border-green-300 bg-green-50"
                      : completed
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        completed
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {completed ? (
                        <Check size={15} />
                      ) : (
                        <span className="text-xs font-black">
                          {index + 1}
                        </span>
                      )}
                    </span>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {statusOption.label}
                      </p>

                      {active && (
                        <p className="text-xs font-bold text-green-700">
                          Current status
                        </p>
                      )}
                    </div>
                  </div>

                  {!active && currentStatus !== "delivered" && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(statusOption.value)}
                      disabled={busy}
                      className="rounded-full border border-green-600 px-3 py-1.5 text-xs font-black text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                    >
                      Mark
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-4">
          <SectionLabel>Live Tracking</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <DrawerStat
              label="ETA"
              value={eta?.text || "Not available"}
            />

            <DrawerStat
              label="Distance"
              value={eta?.distanceText || "Not available"}
            />

            <DrawerStat
              label="Last Updated"
              value={formatDateTime(currentLocation?.updatedAt)}
            />

            <DrawerStat
              label="Tracking"
              value={isLiveTracking ? "Live" : "Stopped"}
              accent={isLiveTracking}
            />
          </div>

          {!canStartTracking &&
            currentStatus !== "delivered" &&
            currentStatus !== "cancelled" && (
              <div className="mt-4 border border-yellow-200 bg-yellow-50 p-3 text-sm font-bold text-yellow-800">
                Mark the order as Picked Up or Out for Delivery before starting
                live tracking.
              </div>
            )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {!isLiveTracking ? (
              <button
                type="button"
                onClick={onStartTracking}
                disabled={!canStartTracking}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Navigation size={16} />
                Start Tracking
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopTracking}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700"
              >
                <X size={16} />
                Stop Tracking
              </button>
            )}

            <Link
              to={`/track/${order._id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Route size={16} />
              Open Tracking
            </Link>
          </div>
        </section>

        <AddressSection address={address} mapsUrl={mapsUrl} />

        <DeliveryItems order={order} />

        <section className="border border-slate-200 bg-white p-4">
          <SectionLabel>Delivery Times</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <DrawerStat
              label="Accepted"
              value={formatDateTime(order.delivery?.acceptedAt)}
            />

            <DrawerStat
              label="Picked Up"
              value={formatDateTime(order.delivery?.pickedUpAt)}
            />

            <DrawerStat
              label="Out for Delivery"
              value={formatDateTime(order.delivery?.outForDeliveryAt)}
            />

            <DrawerStat
              label="Delivered"
              value={formatDateTime(order.delivery?.deliveredAt)}
            />
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function CustomerSection({ order }: { order: Order }) {
  const address = order.delivery?.address;
  const phone =
    order.user?.phone ||
    address?.phone ||
    "Phone not available";

  return (
    <section className="border border-slate-200 bg-white p-4">
      <SectionLabel>Customer</SectionLabel>

      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
          <User size={20} />
        </span>

        <div className="min-w-0">
          <p className="text-base font-black text-slate-950">
            {order.user?.name || address?.fullName || "Customer"}
          </p>

          <p className="mt-1 break-all text-sm font-bold text-slate-500">
            {order.user?.email || "Email not available"}
          </p>

          <p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-500">
            <Phone size={14} className="text-green-600" />
            {phone}
          </p>
        </div>
      </div>
    </section>
  );
}

function AddressSection({
  address,
  mapsUrl,
}: {
  address?: DeliveryAddress;
  mapsUrl: string;
}) {
  return (
    <section className="border border-slate-200 bg-white p-4">
      <SectionLabel>Delivery Address</SectionLabel>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
          <MapPin size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-6 text-slate-700">
            {formatAddress(address)}
          </p>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-600 px-4 py-2 text-xs font-black text-green-700 transition hover:bg-green-50"
            >
              <Navigation size={14} />
              Open Google Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function BillingBreakdown({ order }: { order: Order }) {
  const splitTotals = getSplitTotals(order);

  return (
    <section className="border border-slate-200 bg-white p-4">
      <SectionLabel>Billing Breakdown</SectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <DrawerStat
          label="Meals"
          value={formatCurrency(splitTotals.normalMealsSubtotal)}
        />

        <DrawerStat
          label="Plans"
          value={formatCurrency(splitTotals.planSubtotal)}
        />

        <DrawerStat
          label="Discount"
          value={`-₹${splitTotals.discount}`}
          accent={splitTotals.discount > 0}
        />

        <DrawerStat
          label="Payable"
          value={formatCurrency(splitTotals.payable)}
        />
      </div>
    </section>
  );
}

function DeliveryItems({ order }: { order: Order }) {
  return (
    <section className="border border-slate-200 bg-white p-4">
      <SectionLabel>Delivery Items</SectionLabel>

      <div className="space-y-3">
        {(order.items || []).map((item, index) => (
          <DeliveryItemCard
            key={`${order._id}-${item.meal || item.planId || index}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

function DeliveryItemCard({ item }: { item: OrderItem }) {
  const isPlan = isPlanItem(item);
  const nextPlanDay = isPlan ? getNextPlanDay(item) : null;
  const planId = getPlanId(item);

  if (isPlan && nextPlanDay) {
    return (
      <div className="border border-green-200 bg-green-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-black text-white">
                Day {nextPlanDay.day || 1}
              </span>

              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-green-700">
                {nextPlanDay.preference || item.preference || "mixed"}
              </span>
            </div>

            <p className="mt-2 text-sm font-black text-slate-950">
              {nextPlanDay.selectedMealTitle ||
                item.title ||
                "Plan Meal"}
            </p>

            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              {formatDateOnly(nextPlanDay.date)} ·{" "}
              {formatSlot(nextPlanDay.slot)}
            </p>

            {planId && (
              <p className="mt-1 text-[11px] font-black text-green-700">
                Plan: {planId}
              </p>
            )}

            {nextPlanDay.alternativeMealTitle && (
              <p className="mt-1 text-xs font-bold text-slate-500">
                Alternative: {nextPlanDay.alternativeMealTitle}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-slate-950">
              {formatCurrency(nextPlanDay.selectedMealPrice)}
            </p>

            <p className="mt-1 text-[11px] font-bold text-slate-500">
              {nextPlanDay.selectedMealCalories || 0} kcal
            </p>

            <p className="text-[11px] font-bold text-slate-500">
              {nextPlanDay.selectedMealProtein || 0}g protein
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">
            {item.title || "Meal"}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            Quantity: {item.qty || 1}
            {isPlan ? " · Meal Plan" : ""}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {Number(item.calories || 0)} kcal ·{" "}
            {Number(item.protein || 0)}g protein
          </p>
        </div>

        <p className="shrink-0 text-sm font-black text-slate-950">
          {formatCurrency(
            Number(item.price || 0) * Number(item.qty || 1)
          )}
        </p>
      </div>
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
        className={`absolute bottom-0 right-0 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none ${
          wide ? "sm:w-[560px]" : "sm:w-[430px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              {title}
            </h2>

            <p className="mt-1 break-all text-sm font-bold text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border px-4 py-3 shadow-sm sm:min-w-[135px] ${
        accent
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          accent ? "text-green-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CompactDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-xs font-black leading-5 text-slate-800 sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function DrawerStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-3 ${
        accent
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          accent ? "text-green-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function Badge({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {text}
    </span>
  );
}

function EmptyCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-8 text-center">
      <PackageCheck className="mx-auto text-slate-300" size={44} />

      <h3 className="mt-4 text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm font-bold text-slate-500">
        {text}
      </p>
    </div>
  );
}