import { useEffect, useState } from "react";
import api from "../api/api";

type Order = {
  _id: string;
  createdAt: string;
  totals: { subtotal: number; discount: number; payable: number; totalProtein: number; totalCalories: number };
  delivery: { address: any; slot: any };
  payment: { status: string };
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
        {orders.map((o) => (
          <div key={o._id} className="border rounded-xl p-4 bg-white">
            <div className="flex justify-between items-center">
              <p className="font-semibold">
                {new Date(o.createdAt).toLocaleString()}
              </p>
              <span className={`text-sm px-2 py-1 rounded ${
                o.payment.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
              }`}>
                {o.payment.status.toUpperCase()}
              </span>
            </div>

            <div className="text-sm text-gray-600 mt-2">
              <p>Protein: <b>{o.totals.totalProtein}g</b> • Calories: <b>{o.totals.totalCalories}</b></p>
              <p>Subtotal: ₹{o.totals.subtotal} • Discount: ₹{o.totals.discount} • Payable: <b>₹{o.totals.payable}</b></p>
              <p className="mt-2">
                Slot: <b>{o.delivery?.slot?.date}</b> • <b>{o.delivery?.slot?.time}</b>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
