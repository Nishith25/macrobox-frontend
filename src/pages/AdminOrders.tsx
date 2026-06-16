// frontend/src/pages/AdminOrders.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

type Agent = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
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
  title?: string;
  price?: number;
  qty?: number;
  itemType?: "meal" | "plan" | "challenge_plan";
  planId?: string;
  challengeId?: string;
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
};

type Order = {
  _id: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items?: OrderItem[];
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
    address?: {
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
      formattedAddress?: string;
      mapsUrl?: string;
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

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN");
};

const formatDateOnly = (value?: string) => {
  if (!value) return "-";

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
  if (!slot) return "-";

  const hour = Number(slot.split(":")[0]);

  if (!Number.isFinite(hour)) return slot;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
};

const readableStatus = (value?: string) => {
  if (!value) return "Unassigned";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

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

const getAddressText = (order: Order) => {
  const address = order.delivery?.address;

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

  return parts.length ? parts.join(", ") : "N/A";
};

const getSplitTotals = (order: Order) => {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter((item) => isPlanItem(item))
    .reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

  const subtotal = Number(order.totals?.subtotal || 0);

  const savedPlanSubtotal = Number(
    order.totals?.planSubtotal || order.totals?.challengePlanSubtotal || 0
  );

  const planSubtotal =
    savedPlanSubtotal > 0 ? savedPlanSubtotal : Math.round(fallbackPlanSubtotal);

  const normalMealsSubtotal =
    Number(order.totals?.normalMealsSubtotal || 0) > 0
      ? Number(order.totals?.normalMealsSubtotal || 0)
      : Math.max(subtotal - planSubtotal, 0);

  return {
    subtotal,
    normalMealsSubtotal,
    planSubtotal,
    discount: Number(order.totals?.discount || 0),
    payable: Number(order.totals?.payable || 0),
  };
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const fetchOrders = async (customFrom = from, customTo = to) => {
    setLoading(true);

    try {
      const res = await api.get("/admin/orders", {
        params: {
          paymentStatus,
          deliveryStatus,
          search,
          from: customFrom,
          to: customTo,
        },
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
    try {
      const res = await api.get("/admin/orders/delivery-agents");
      setAgents(res.data || []);
    } catch {
      setAgents([]);
    }
  };

  useEffect(() => {
    fetchOrders(todayISO(), todayISO());
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTodayFilter = () => {
    const today = todayISO();

    setFrom(today);
    setTo(today);
    fetchOrders(today, today);
  };

  const clearDateFilter = () => {
    setFrom("");
    setTo("");
    fetchOrders("", "");
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    if (!agentId) return;

    await api.patch(`/admin/orders/${orderId}/assign-agent`, {
      agentId,
    });

    fetchOrders();
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;

    await api.patch(`/admin/orders/${orderId}/cancel`);
    fetchOrders();
  };

  const exportCSV = () => {
    const rows = orders.map((order) => {
      const splitTotals = getSplitTotals(order);

      const planSchedule = (order.items || [])
        .filter((item) => isPlanItem(item))
        .flatMap((item) =>
          (item.planDays || []).map(
            (day) =>
              `Day ${day.day}: ${day.selectedMealTitle} (${day.date} ${day.slot})`
          )
        )
        .join(" | ");

      const itemTitles = (order.items || [])
        .map((item) => {
          const tag = isPlanItem(item) ? "Plan" : "Meal";
          return `${tag}: ${item.title || ""}`;
        })
        .join(" | ");

      return {
        orderId: order._id,
        customer: order.user?.name || "",
        email: order.user?.email || "",
        phone: order.user?.phone || order.delivery?.address?.phone || "",
        paymentStatus: order.payment?.status || "",
        razorpayPaymentId: order.payment?.razorpayPaymentId || "",
        deliveryStatus: order.delivery?.status || "",
        deliveryAgent: order.delivery?.agent?.name || "",
        mealsSubtotal: splitTotals.normalMealsSubtotal,
        plansSubtotal: splitTotals.planSubtotal,
        planDiscount: splitTotals.discount,
        totalPayable: splitTotals.payable,
        coupon: order.coupon?.code || "",
        items: itemTitles,
        planSchedule,
        date: order.createdAt || "",
      };
    });

    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `macrobox-orders-${from || "all"}-to-${to || "all"}.csv`;
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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold">Admin Orders</h1>

          <p className="mt-1 text-gray-600">
            View daily orders, payments, delivery status, agents, revenue, meals
            and plan schedules.
          </p>

          <p className="mt-2 text-sm font-medium text-green-700">
            Showing: {from || "All"} → {to || "All"}
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="h-fit rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border bg-white p-5 md:grid-cols-6">
        <input
          placeholder="Search email / phone / order ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-lg border px-3 py-2 md:col-span-2"
        />

        <select
          value={paymentStatus}
          onChange={(event) => setPaymentStatus(event.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="created">Created</option>
        </select>

        <select
          value={deliveryStatus}
          onChange={(event) => setDeliveryStatus(event.target.value)}
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

        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="rounded-lg border px-3 py-2"
        />

        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="rounded-lg border px-3 py-2"
        />

        <button
          type="button"
          onClick={() => fetchOrders()}
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white md:col-span-2"
        >
          Apply Filters
        </button>

        <button
          type="button"
          onClick={setTodayFilter}
          className="rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50"
        >
          Today
        </button>

        <button
          type="button"
          onClick={clearDateFilter}
          className="rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50"
        >
          All Dates
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[1450px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Delivery</th>
              <th className="p-4">Agent</th>
              <th className="p-4">Billing</th>
              <th className="p-4">Items / Plan Schedule</th>
              <th className="p-4">Coupon</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const splitTotals = getSplitTotals(order);
                const hasPlan = (order.items || []).some((item) =>
                  isPlanItem(item)
                );

                return (
                  <tr key={order._id} className="border-t align-top">
                    <td className="max-w-[190px] break-all p-4 font-semibold">
                      <p>{order._id}</p>

                      {hasPlan && (
                        <p className="mt-2 w-fit rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                          Plan Order
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-semibold">
                        {order.user?.name || "N/A"}
                      </p>
                      <p>{order.user?.email || "N/A"}</p>
                      <p>
                        {order.user?.phone ||
                          order.delivery?.address?.phone ||
                          "N/A"}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-semibold capitalize">
                        {order.payment?.status || "created"}
                      </p>

                      <p className="break-all text-xs text-gray-500">
                        {order.payment?.razorpayPaymentId || "No payment ID"}
                      </p>
                    </td>

                    <td className="max-w-[260px] p-4">
                      <p className="font-semibold capitalize">
                        {readableStatus(order.delivery?.status)}
                      </p>

                      <p>
                        {formatDateOnly(order.delivery?.slot?.date)} |{" "}
                        {formatSlot(order.delivery?.slot?.time)}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {getAddressText(order)}
                      </p>
                    </td>

                    <td className="p-4">
                      <select
                        value={order.delivery?.agent?._id || ""}
                        onChange={(event) =>
                          assignAgent(order._id, event.target.value)
                        }
                        className="rounded border px-2 py-2"
                      >
                        <option value="">Assign Agent</option>

                        {agents.map((agent) => (
                          <option key={agent._id} value={agent._id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="min-w-[190px] p-4">
                      <div className="space-y-1 rounded-lg bg-gray-50 p-3">
                        <BillingLine
                          label="Meals"
                          value={`₹${splitTotals.normalMealsSubtotal}`}
                        />

                        <BillingLine
                          label="Plans"
                          value={`₹${splitTotals.planSubtotal}`}
                        />

                        <BillingLine
                          label="Plan Discount"
                          value={`-₹${splitTotals.discount}`}
                          green
                        />

                        <div className="border-t pt-1">
                          <BillingLine
                            label="Payable"
                            value={`₹${splitTotals.payable}`}
                            bold
                          />
                        </div>
                      </div>
                    </td>

                    <td className="min-w-[360px] p-4">
                      <div className="grid max-w-[420px] gap-3">
                        {(order.items || []).map((item, index) => (
                          <AdminOrderItem
                            key={`${order._id}-${index}`}
                            item={item}
                          />
                        ))}
                      </div>
                    </td>

                    <td className="p-4">
                      {order.coupon?.code ? (
                        <div>
                          <p className="font-semibold text-green-700">
                            {order.coupon.code}
                          </p>

                          <p className="text-green-600">
                            -₹
                            {order.coupon.discount ||
                              order.totals?.discount ||
                              0}
                          </p>

                          <p className="text-xs text-gray-500">
                            {order.coupon.redeemed
                              ? "Redeemed"
                              : "Not redeemed"}
                          </p>

                          {order.coupon.applyOn && (
                            <p className="mt-1 text-xs text-gray-500">
                              Apply on:{" "}
                              {order.coupon.applyOn === "challenge_plan"
                                ? "plan"
                                : order.coupon.applyOn}
                            </p>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-4">{formatDateTime(order.createdAt)}</td>

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => cancelOrder(order._id)}
                        disabled={order.delivery?.status === "delivered"}
                        className="rounded-lg bg-red-600 px-3 py-2 text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrderItem({ item }: { item: OrderItem }) {
  const isPlan = isPlanItem(item);
  const nextPlanDay = isPlan ? getNextPlanDay(item) : null;
  const planId = getPlanId(item);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isPlan ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">
            {item.title || "Meal"} × {item.qty || 1}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {isPlan && (
              <p className="w-fit rounded-full bg-white px-2 py-1 text-[10px] font-bold text-green-700">
                Meal Plan
              </p>
            )}

            {isPlan && planId && (
              <p className="w-fit rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                {planId}
              </p>
            )}
          </div>
        </div>

        <p className="font-bold text-gray-900">
          ₹{Number(item.price || 0) * Number(item.qty || 1)}
        </p>
      </div>

      {isPlan && nextPlanDay && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-2">
          <p className="text-[11px] font-black uppercase text-orange-700">
            Next Scheduled Meal
          </p>

          <p className="mt-1 text-xs font-bold text-gray-900">
            Day {nextPlanDay.day}: {nextPlanDay.selectedMealTitle || "Meal"}
          </p>

          <p className="mt-1 text-xs font-semibold text-gray-500">
            {formatDateOnly(nextPlanDay.date)} • {formatSlot(nextPlanDay.slot)}
          </p>

          {nextPlanDay.alternativeMealTitle && (
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Alternative: {nextPlanDay.alternativeMealTitle}
            </p>
          )}
        </div>
      )}

      {isPlan && item.planDays && item.planDays.length > 0 && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-2">
          <p className="mb-2 text-[11px] font-black uppercase text-blue-700">
            Full Day-wise Plan Schedule
          </p>

          <div className="grid gap-2">
            {item.planDays.map((day, index) => (
              <div
                key={`${day.day || index}-${day.date || ""}`}
                className="rounded-lg bg-white px-2 py-2"
              >
                <p className="text-xs font-bold text-gray-900">
                  Day {day.day}: {day.selectedMealTitle || "Meal"}
                </p>

                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {formatDateOnly(day.date)} • {formatSlot(day.slot)} •{" "}
                  {day.preference || "mixed"}
                </p>

                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Delivery: {readableStatus(day.deliveryStatus || "scheduled")}{" "}
                  | Kitchen: {readableStatus(day.kitchenStatus || "pending")}
                </p>

                {day.alternativeMealTitle && (
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Alternative: {day.alternativeMealTitle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isPlan &&
        (!item.planDays || item.planDays.length === 0) &&
        item.planItems &&
        item.planItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.planItems.map((planItem, index) => (
              <span
                key={`${planItem._id || index}`}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
              >
                {planItem.title || "Meal"} × {planItem.qty || 1}
              </span>
            ))}
          </div>
        )}
    </div>
  );
}

function BillingLine({
  label,
  value,
  green,
  bold,
}: {
  label: string;
  value: string;
  green?: boolean;
  bold?: boolean;
}) {
  return (
    <p className="flex items-center justify-between gap-3 text-xs">
      <span className={bold ? "font-bold text-gray-900" : "text-gray-500"}>
        {label}
      </span>

      <span
        className={`${
          bold ? "font-bold" : "font-semibold"
        } ${green ? "text-green-600" : "text-gray-900"}`}
      >
        {value}
      </span>
    </p>
  );
}