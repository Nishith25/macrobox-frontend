import { useEffect, useRef, useState } from "react";
import api from "../api/api";

type OrderItem = {
  meal?: string;
  title?: string;
  price?: number;
  protein?: number;
  calories?: number;
  qty?: number;
};

type OrderUser = {
  _id?: string;
  name?: string;
  email?: string;
};

type DeliveryAddress = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  locationMode?: "manual" | "current";
  locationText?: string;
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
    };
  };
  payment?: {
    status?: string;
  };
  createdAt?: string;
};

const STATUS_OPTIONS = [
  { value: "accepted", label: "Accepted" },
  { value: "picked_up", label: "Picked Up" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
];

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

function formatAddress(address?: DeliveryAddress) {
  if (!address) return "N/A";

  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.join(", ") || "N/A";
}

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const watchIdsRef = useRef<Record<string, number>>({});

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const [availableRes, myOrdersRes] = await Promise.all([
        api.get("/delivery/available"),
        api.get("/delivery/my-orders"),
      ]);

      setAvailableOrders(Array.isArray(availableRes.data) ? availableRes.data : []);
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
    };
  }, []);

  const acceptOrder = async (orderId: string) => {
    try {
      setBusyOrderId(orderId);
      await api.post(`/delivery/${orderId}/accept`);
      await fetchOrders();
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
          await api.post(`/delivery/${orderId}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading:
              typeof position.coords.heading === "number"
                ? position.coords.heading
                : null,
            speed:
              typeof position.coords.speed === "number"
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
        setTrackingOrderId((current) => (current === orderId ? null : current));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdsRef.current[orderId] = watchId;
    alert("Live tracking started.");
  };

  const stopLiveTracking = (orderId: string) => {
    const watchId = watchIdsRef.current[orderId];
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      delete watchIdsRef.current[orderId];
    }

    if (trackingOrderId === orderId) {
      setTrackingOrderId(null);
    }

    alert("Live tracking stopped.");
  };

  const isTracking = (orderId: string) => Boolean(watchIdsRef.current[orderId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
        <p className="text-gray-600 mt-2">
          View available orders, accept deliveries, update status, and share live
          location.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Loading delivery dashboard...
        </div>
      ) : (
        <>
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Available Orders
              </h2>
              <button
                onClick={fetchOrders}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            {availableOrders.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm text-gray-600">
                No available orders right now.
              </div>
            ) : (
              <div className="grid gap-5">
                {availableOrders.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-2xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Order ID</p>
                          <p className="font-semibold break-all">{order._id}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-gray-500">Customer</p>
                            <p className="font-medium">
                              {order.user?.name || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {order.user?.email || "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Payment</p>
                            <p className="font-medium capitalize">
                              {order.payment?.status || "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Delivery Slot</p>
                            <p className="font-medium">
                              {order.delivery?.slot?.date || "N/A"} |{" "}
                              {order.delivery?.slot?.time || "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Amount</p>
                            <p className="font-medium">
                              {formatCurrency(order.totals?.payable)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">
                            {formatAddress(order.delivery?.address)}
                          </p>
                          {order.delivery?.address?.mapsUrl ? (
                            <a
                              href={order.delivery.address.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-1 text-sm text-green-700 hover:underline"
                            >
                              Open in Google Maps
                            </a>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 mb-1">Items</p>
                          <div className="flex flex-wrap gap-2">
                            {order.items?.map((item, index) => (
                              <span
                                key={`${order._id}-${index}`}
                                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                              >
                                {item.title || "Meal"} x{item.qty || 1}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:min-w-[180px]">
                        <button
                          onClick={() => acceptOrder(order._id)}
                          disabled={busyOrderId === order._id}
                          className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {busyOrderId === order._id
                            ? "Accepting..."
                            : "Accept Delivery"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              My Delivery Orders
            </h2>

            {myOrders.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm text-gray-600">
                No assigned delivery orders yet.
              </div>
            ) : (
              <div className="grid gap-5">
                {myOrders.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-2xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-500">Order ID</p>
                            <p className="font-semibold break-all">{order._id}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-gray-500">Customer</p>
                              <p className="font-medium">
                                {order.user?.name || "N/A"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {order.user?.email || "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">
                                Delivery Status
                              </p>
                              <p className="font-medium capitalize">
                                {(order.delivery?.status || "N/A").replaceAll(
                                  "_",
                                  " "
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">Slot</p>
                              <p className="font-medium">
                                {order.delivery?.slot?.date || "N/A"} |{" "}
                                {order.delivery?.slot?.time || "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-medium">
                                {formatCurrency(order.totals?.payable)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="font-medium">
                              {formatAddress(order.delivery?.address)}
                            </p>
                            {order.delivery?.address?.mapsUrl ? (
                              <a
                                href={order.delivery.address.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-1 text-sm text-green-700 hover:underline"
                              >
                                Open in Google Maps
                              </a>
                            ) : null}
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">Items</p>
                            <div className="flex flex-wrap gap-2">
                              {order.items?.map((item, index) => (
                                <span
                                  key={`${order._id}-my-${index}`}
                                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                                >
                                  {item.title || "Meal"} x{item.qty || 1}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-gray-500">Accepted At</p>
                              <p className="font-medium">
                                {formatDateTime(order.delivery?.acceptedAt)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-gray-500">
                                Last Location Update
                              </p>
                              <p className="font-medium">
                                {formatDateTime(
                                  order.delivery?.tracking?.currentLocation
                                    ?.updatedAt || null
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 lg:min-w-[220px]">
                          {STATUS_OPTIONS.map((statusOption) => (
                            <button
                              key={statusOption.value}
                              onClick={() =>
                                updateStatus(order._id, statusOption.value)
                              }
                              disabled={busyOrderId === order._id}
                              className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
                            >
                              Mark {statusOption.label}
                            </button>
                          ))}

                          {!isTracking(order._id) ? (
                            <button
                              onClick={() => startLiveTracking(order._id)}
                              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                            >
                              Start Live Tracking
                            </button>
                          ) : (
                            <button
                              onClick={() => stopLiveTracking(order._id)}
                              className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                            >
                              Stop Live Tracking
                            </button>
                          )}
                        </div>
                      </div>

                      {trackingOrderId === order._id || isTracking(order._id) ? (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                          Live tracking is active for this order. Keep this page open
                          and allow location access for updates.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}