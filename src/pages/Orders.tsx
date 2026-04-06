import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

type DeliveryAgent = {
  _id?: string;
  name?: string;
  email?: string;
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
  };
  items?: Array<{
    meal?: string;
    title?: string;
    price?: number;
    protein?: number;
    calories?: number;
    qty?: number;
  }>;
  delivery: {
    address: {
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

  if (addr.locationMode === "current" && addr.mapsUrl) return addr.mapsUrl;

  const t = String(addr.locationText || "").trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
};

const readableStatus = (status?: string) => {
  if (!status) return "unassigned";
  return status.replaceAll("_", " ");
};

const paymentBadgeClass = (status?: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const deliveryBadgeClass = (status?: string) => {
  switch (status) {
    case "accepted":
      return "bg-blue-100 text-blue-700";
    case "picked_up":
      return "bg-indigo-100 text-indigo-700";
    case "out_for_delivery":
      return "bg-orange-100 text-orange-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
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

  if (loading) return <p className="text-center mt-10">Loading orders…</p>;

  if (orders.length === 0) {
    return <p className="text-center mt-10 text-gray-500">No orders yet.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((o) => {
          const mapsUrl = mapsLinkFromAddress(o.delivery?.address);
          const deliveryStatus = o.delivery?.status || "unassigned";
          const eta = o.delivery?.tracking?.eta;
          const currentLocation = o.delivery?.tracking?.currentLocation;
          const agent = o.delivery?.agent;

          return (
            <div key={o._id} className="border rounded-xl p-4 bg-white">
              <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                <div>
                  <p className="font-semibold">
                    {new Date(o.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 break-all">
                    Order ID: {o._id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`text-sm px-2 py-1 rounded font-medium ${paymentBadgeClass(
                      o.payment?.status
                    )}`}
                  >
                    {(o.payment?.status || "created").toUpperCase()}
                  </span>

                  <span
                    className={`text-sm px-2 py-1 rounded font-medium ${deliveryBadgeClass(
                      deliveryStatus
                    )}`}
                  >
                    DELIVERY: {readableStatus(deliveryStatus).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600 mt-3 space-y-2">
                <p>
                  Protein: <b>{o.totals.totalProtein}g</b> • Calories:{" "}
                  <b>{o.totals.totalCalories}</b>
                </p>

                <p>
                  Subtotal: ₹{o.totals.subtotal} • Discount: ₹{o.totals.discount} •
                  Payable: <b>₹{o.totals.payable}</b>
                </p>

                <p className="mt-2">
                  Slot: <b>{o.delivery?.slot?.date}</b> •{" "}
                  <b>{o.delivery?.slot?.time}</b>
                </p>

                {o.items && o.items.length > 0 ? (
                  <div className="pt-1">
                    <p className="font-semibold text-gray-700">Items</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {o.items.map((item, index) => (
                        <span
                          key={`${o._id}-${index}`}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                        >
                          {item.title || "Meal"} x{item.qty || 1}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <p className="font-semibold text-gray-700">Delivery Location</p>

                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-700 underline"
                    >
                      Open in Google Maps
                    </a>
                  ) : (
                    <p className="text-gray-500">No location provided</p>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-800 mb-2">
                    Live Delivery Updates
                  </p>

                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {readableStatus(deliveryStatus)}
                    </p>

                    <p>
                      <span className="font-medium">Delivery Agent:</span>{" "}
                      {agent?.name || "Not assigned yet"}
                    </p>

                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {agent?.deliveryProfile?.phone || "N/A"}
                    </p>

                    <p>
                      <span className="font-medium">ETA:</span>{" "}
                      {eta?.text || "Not available yet"}
                      {eta?.distanceText ? ` (${eta.distanceText})` : ""}
                    </p>

                    <p>
                      <span className="font-medium">Last Location Update:</span>{" "}
                      {formatDateTime(currentLocation?.updatedAt || null)}
                    </p>
                  </div>

                  <div className="mt-3">
                    <Link
                      to={`/track/${o._id}`}
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                    >
                      Track Live
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}