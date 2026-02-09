// frontend/src/pages/Orders.tsx (FRONTEND)
import { useEffect, useState } from "react";
import api from "../api/api";

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
  delivery: {
    address: {
      fullName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;

      // ✅ NEW
      locationMode?: "manual" | "current";
      locationText?: string;
      lat?: number | null;
      lng?: number | null;
      mapsUrl?: string;
    };
    slot: { date: string; time: string };
  };
  payment: { status: string };
};

const mapsLinkFromAddress = (addr?: Order["delivery"]["address"]) => {
  if (!addr) return null;

  // if current mode and mapsUrl exists
  if (addr.locationMode === "current" && addr.mapsUrl) return addr.mapsUrl;

  // manual: if user pasted a link, use it directly
  const t = String(addr.locationText || "").trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;

  // otherwise use google search query link
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/orders");
        setOrders(res.data);
      } finally {
        setLoading(false);
      }
    })();
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

          return (
            <div key={o._id} className="border rounded-xl p-4 bg-white">
              <div className="flex justify-between items-center">
                <p className="font-semibold">
                  {new Date(o.createdAt).toLocaleString()}
                </p>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    o.payment.status === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {o.payment.status.toUpperCase()}
                </span>
              </div>

              <div className="text-sm text-gray-600 mt-2">
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

                {/* ✅ NEW: Maps location */}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
