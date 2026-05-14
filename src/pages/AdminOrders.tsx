import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

type Agent = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
};

type Order = {
  _id: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  totals?: {
    subtotal?: number;
    discount?: number;
    payable?: number;
  };
  coupon?: {
    code?: string;
    discount?: number;
  };
  delivery?: {
    address?: {
      fullName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    slot?: {
      date?: string;
      time?: string;
    };
    agent?: Agent | null;
    status?: string;
  };
  payment?: {
    status?: "created" | "paid" | "failed";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  createdAt?: string;
};

type Summary = {
  totalOrders: number;
  paidOrders: number;
  failedOrders: number;
  createdOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders", {
        params: { paymentStatus, deliveryStatus, search },
      });
      setOrders(res.data.orders || []);
      setSummary(res.data.summary || null);
    } catch {
      alert("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    const res = await api.get("/admin/orders/delivery-agents");
    setAgents(res.data || []);
  };

  useEffect(() => {
    fetchOrders();
    fetchAgents();
  }, []);

  const assignAgent = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    await api.patch(`/admin/orders/${orderId}/assign-agent`, { agentId });
    fetchOrders();
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;
    await api.patch(`/admin/orders/${orderId}/cancel`);
    fetchOrders();
  };

  const exportCSV = () => {
    const rows = orders.map((o) => ({
      orderId: o._id,
      customer: o.user?.name || "",
      email: o.user?.email || "",
      phone: o.user?.phone || o.delivery?.address?.phone || "",
      paymentStatus: o.payment?.status || "",
      razorpayPaymentId: o.payment?.razorpayPaymentId || "",
      deliveryStatus: o.delivery?.status || "",
      deliveryAgent: o.delivery?.agent?.name || "",
      total: o.totals?.payable || 0,
      coupon: o.coupon?.code || "",
      date: o.createdAt || "",
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "macrobox-orders.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const cards = useMemo(
    () => [
      ["Total Orders", summary?.totalOrders || 0],
      ["Paid Orders", summary?.paidOrders || 0],
      ["Failed Orders", summary?.failedOrders || 0],
      ["Revenue", `₹${summary?.totalRevenue || 0}`],
    ],
    [summary]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Orders</h1>
          <p className="text-gray-600 mt-1">
            View orders, payments, delivery status, agents, and revenue.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="h-fit rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          placeholder="Search email / phone / order ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="created">Created</option>
        </select>

        <select
          value={deliveryStatus}
          onChange={(e) => setDeliveryStatus(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Delivery Status</option>
          <option value="unassigned">Unassigned</option>
          <option value="accepted">Accepted</option>
          <option value="picked_up">Picked Up</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={fetchOrders}
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white"
        >
          Apply Filters
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Delivery</th>
              <th className="p-4">Agent</th>
              <th className="p-4">Total</th>
              <th className="p-4">Coupon</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="border-t align-top">
                  <td className="p-4 font-semibold break-all">{order._id}</td>

                  <td className="p-4">
                    <p className="font-semibold">{order.user?.name || "N/A"}</p>
                    <p>{order.user?.email || "N/A"}</p>
                    <p>{order.user?.phone || order.delivery?.address?.phone || "N/A"}</p>
                  </td>

                  <td className="p-4">
                    <p className="capitalize font-semibold">{order.payment?.status}</p>
                    <p className="break-all text-xs text-gray-500">
                      {order.payment?.razorpayPaymentId || "No payment ID"}
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="capitalize font-semibold">
                      {(order.delivery?.status || "").replaceAll("_", " ")}
                    </p>
                    <p>
                      {order.delivery?.slot?.date} | {order.delivery?.slot?.time}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.delivery?.address?.line1}, {order.delivery?.address?.city}
                    </p>
                  </td>

                  <td className="p-4">
                    <select
                      value={order.delivery?.agent?._id || ""}
                      onChange={(e) => assignAgent(order._id, e.target.value)}
                      className="rounded border px-2 py-2"
                    >
                      <option value="">Assign Agent</option>
                      {agents.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-4 font-bold">₹{order.totals?.payable || 0}</td>

                  <td className="p-4">
                    {order.coupon?.code || "-"}
                    {order.coupon?.discount ? (
                      <p className="text-green-600">-₹{order.coupon.discount}</p>
                    ) : null}
                  </td>

                  <td className="p-4">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString("en-IN")
                      : "-"}
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => cancelOrder(order._id)}
                      disabled={order.delivery?.status === "delivered"}
                      className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}