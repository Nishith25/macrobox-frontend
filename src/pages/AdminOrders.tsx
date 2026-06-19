// frontend/src/pages/AdminOrders.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Filter,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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

const formatCurrency = (value?: number) =>
  `₹${Number(value || 0).toFixed(0)}`;

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

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
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const isPlanItem = (item?: OrderItem) =>
  item?.itemType === "plan" ||
  item?.itemType === "challenge_plan" ||
  Boolean(item?.planId) ||
  Boolean(item?.challengeId);

const getPlanId = (item?: OrderItem) =>
  String(item?.planId || item?.challengeId || "").trim();

const getNextPlanDay = (item: OrderItem) => {
  const planDays = item.planDays || [];
  const today = todayISO();

  return (
    planDays.find(
      (day) =>
        day.date === today &&
        day.deliveryStatus !== "delivered"
    ) ||
    planDays.find(
      (day) => day.deliveryStatus !== "delivered"
    ) ||
    planDays[0] ||
    null
  );
};

const getAddressText = (order: Order) => {
  const address = order.delivery?.address;

  if (!address) return "Address not available";
  if (address.formattedAddress) return address.formattedAddress;

  return (
    [
      address.flatNo || address.line1,
      address.floor,
      address.buildingName || address.line2,
      address.area,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ") || "Address not available"
  );
};

const getSplitTotals = (order: Order) => {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter(isPlanItem)
    .reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.qty || 1),
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

const getPaymentClass = (status?: string) => {
  if (status === "paid") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
};

const getDeliveryClass = (status?: string) => {
  if (status === "delivered") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "out_for_delivery") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [paymentStatus, setPaymentStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async (
    customFrom = from,
    customTo = to
  ) => {
    try {
      setLoading(true);

      const response = await api.get("/admin/orders", {
        params: {
          paymentStatus,
          deliveryStatus,
          search,
          from: customFrom,
          to: customTo,
        },
      });

      setOrders(response.data.orders || []);
      setSummary(response.data.summary || null);
    } catch {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await api.get(
        "/admin/orders/delivery-agents"
      );

      setAgents(
        Array.isArray(response.data) ? response.data : []
      );
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
    setShowFilters(false);
  };

  const clearFilters = () => {
    setPaymentStatus("all");
    setDeliveryStatus("all");
    setSearch("");
    setFrom("");
    setTo("");

    fetchOrders("", "");
    setShowFilters(false);
  };

  const applyFilters = () => {
    fetchOrders();
    setShowFilters(false);
  };

  const assignAgent = async (
    orderId: string,
    agentId: string
  ) => {
    if (!agentId) return;

    try {
      setBusyOrderId(orderId);

      await api.patch(
        `/admin/orders/${orderId}/assign-agent`,
        {
          agentId,
        }
      );

      toast.success("Delivery agent assigned");
      await fetchOrders();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to assign delivery agent"
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!window.confirm("Cancel this order?")) return;

    try {
      setBusyOrderId(order._id);

      await api.patch(`/admin/orders/${order._id}/cancel`);

      toast.success("Order cancelled");
      setSelectedOrder(null);
      await fetchOrders();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to cancel order"
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const exportCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders available to export");
      return;
    }

    const rows = orders.map((order) => {
      const totals = getSplitTotals(order);

      const planSchedule = (order.items || [])
        .filter(isPlanItem)
        .flatMap((item) =>
          (item.planDays || []).map(
            (day) =>
              `Day ${day.day}: ${
                day.selectedMealTitle || "Meal"
              } (${day.date || ""} ${day.slot || ""})`
          )
        )
        .join(" | ");

      return {
        orderId: order._id,
        customer: order.user?.name || "",
        email: order.user?.email || "",
        phone:
          order.user?.phone ||
          order.delivery?.address?.phone ||
          "",
        paymentStatus: order.payment?.status || "",
        razorpayPaymentId:
          order.payment?.razorpayPaymentId || "",
        deliveryStatus: order.delivery?.status || "",
        deliveryAgent:
          order.delivery?.agent?.name || "",
        mealsSubtotal: totals.normalMealsSubtotal,
        plansSubtotal: totals.planSubtotal,
        discount: totals.discount,
        payable: totals.payable,
        coupon: order.coupon?.code || "",
        planSchedule,
        date: order.createdAt || "",
      };
    });

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map(
            (value) =>
              `"${String(value).replaceAll('"', '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `macrobox-orders-${
      from || "all"
    }-to-${to || "all"}.csv`;

    anchor.click();
    URL.revokeObjectURL(url);
  };

  const cards = useMemo(
    () => [
      {
        label: "Total Orders",
        value: summary?.totalOrders || 0,
        icon: <ShoppingBag size={18} />,
      },
      {
        label: "Paid Orders",
        value: summary?.paidOrders || 0,
        icon: <CheckCircle2 size={18} />,
        accent: true,
      },
      {
        label: "Delivered",
        value: summary?.deliveredOrders || 0,
        icon: <PackageCheck size={18} />,
      },
      {
        label: "Revenue",
        value: formatCurrency(summary?.totalRevenue),
        icon: <CircleDollarSign size={18} />,
      },
    ],
    [summary]
  );

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                MacroBox Admin
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                Orders
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Review payments, assign delivery partners and track meal or
                plan orders.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => fetchOrders()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
              <DashboardStat
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                accent={card.accent}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    fetchOrders();
                  }
                }}
                placeholder="Search order, email or phone..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchOrders()}
              className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-black text-white hover:bg-green-700"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 px-6 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {from || "All dates"} → {to || "All dates"}
            </span>

            {paymentStatus !== "all" && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                Payment: {readableStatus(paymentStatus)}
              </span>
            )}

            {deliveryStatus !== "all" && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                Delivery: {readableStatus(deliveryStatus)}
              </span>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Order List
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {orders.length} order{orders.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 border border-slate-200 bg-white p-10 text-sm font-black text-slate-600">
              <Loader2 className="animate-spin text-green-600" size={19} />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  agents={agents}
                  busy={busyOrderId === order._id}
                  onAssign={(agentId) =>
                    assignAgent(order._id, agentId)
                  }
                  onView={() => setSelectedOrder(order)}
                  onCancel={() => cancelOrder(order)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showFilters && (
        <FilterDrawer
          paymentStatus={paymentStatus}
          deliveryStatus={deliveryStatus}
          from={from}
          to={to}
          onPaymentChange={setPaymentStatus}
          onDeliveryChange={setDeliveryStatus}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={applyFilters}
          onToday={setTodayFilter}
          onClear={clearFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          agents={agents}
          busy={busyOrderId === selectedOrder._id}
          onClose={() => setSelectedOrder(null)}
          onAssign={(agentId) =>
            assignAgent(selectedOrder._id, agentId)
          }
          onCancel={() => cancelOrder(selectedOrder)}
        />
      )}
    </main>
  );
}

function OrderCard({
  order,
  agents,
  busy,
  onAssign,
  onView,
  onCancel,
}: {
  order: Order;
  agents: Agent[];
  busy: boolean;
  onAssign: (agentId: string) => void;
  onView: () => void;
  onCancel: () => void;
}) {
  const totals = getSplitTotals(order);
  const hasPlan = (order.items || []).some(isPlanItem);

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-green-50 text-green-700">
          {hasPlan ? <PackageCheck size={27} /> : <ShoppingBag size={27} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black">
                  {order.user?.name || "Customer"}
                </h3>

                {hasPlan && (
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700">
                    Plan Order
                  </span>
                )}

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getPaymentClass(
                    order.payment?.status
                  )}`}
                >
                  {readableStatus(order.payment?.status || "created")}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getDeliveryClass(
                    order.delivery?.status
                  )}`}
                >
                  {readableStatus(order.delivery?.status)}
                </span>
              </div>

              <p className="mt-2 break-all text-xs font-bold text-slate-400">
                #{order._id}
              </p>

              <p className="mt-2 line-clamp-1 text-sm font-bold text-slate-500">
                {getAddressText(order)}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-3xl font-black tracking-[-0.05em]">
                {formatCurrency(totals.payable)}
              </p>

              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Total Payable
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-slate-200" />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <OrderMetric
              label="Items"
              value={`${order.items?.length || 0}`}
            />

            <OrderMetric
              label="Delivery"
              value={`${formatDateOnly(
                order.delivery?.slot?.date
              )} · ${formatSlot(order.delivery?.slot?.time)}`}
            />

            <OrderMetric
              label="Agent"
              value={order.delivery?.agent?.name || "Unassigned"}
            />

            <OrderMetric
              label="Created"
              value={formatDateTime(order.createdAt)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={order.delivery?.agent?._id || ""}
              onChange={(event) => onAssign(event.target.value)}
              disabled={busy}
              className="admin-input sm:max-w-[240px]"
            >
              <option value="">Assign Delivery Agent</option>

              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>
                  {agent.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={onView}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Details
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={
                  busy ||
                  order.delivery?.status === "delivered" ||
                  order.delivery?.status === "cancelled"
                }
                className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 px-5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderDrawer({
  order,
  agents,
  busy,
  onClose,
  onAssign,
  onCancel,
}: {
  order: Order;
  agents: Agent[];
  busy: boolean;
  onClose: () => void;
  onAssign: (agentId: string) => void;
  onCancel: () => void;
}) {
  const totals = getSplitTotals(order);

  return (
    <Drawer
      title="Order Details"
      subtitle={`Order #${order._id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <section className="border border-slate-200 p-4">
          <SectionLabel>Customer</SectionLabel>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
              <User size={20} />
            </span>

            <div>
              <p className="font-black">
                {order.user?.name || "Customer"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {order.user?.email || "N/A"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {order.user?.phone ||
                  order.delivery?.address?.phone ||
                  "N/A"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <DrawerStat
            label="Payment"
            value={readableStatus(
              order.payment?.status || "created"
            )}
          />

          <DrawerStat
            label="Delivery"
            value={readableStatus(order.delivery?.status)}
          />

          <DrawerStat
            label="Date"
            value={formatDateOnly(order.delivery?.slot?.date)}
          />

          <DrawerStat
            label="Time"
            value={formatSlot(order.delivery?.slot?.time)}
          />
        </section>

        <section className="border border-slate-200 p-4">
          <SectionLabel>Address</SectionLabel>

          <div className="flex gap-3">
            <MapPin
              size={18}
              className="mt-1 shrink-0 text-green-600"
            />

            <p className="text-sm font-bold leading-6 text-slate-600">
              {getAddressText(order)}
            </p>
          </div>
        </section>

        <section className="border border-slate-200 p-4">
          <SectionLabel>Assign Delivery Agent</SectionLabel>

          <select
            value={order.delivery?.agent?._id || ""}
            onChange={(event) => onAssign(event.target.value)}
            disabled={busy}
            className="admin-input"
          >
            <option value="">Select agent</option>

            {agents.map((agent) => (
              <option key={agent._id} value={agent._id}>
                {agent.name} · {agent.phone || agent.email}
              </option>
            ))}
          </select>
        </section>

        <section className="border border-slate-200 p-4">
          <SectionLabel>Billing</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <DrawerStat
              label="Meals"
              value={formatCurrency(totals.normalMealsSubtotal)}
            />

            <DrawerStat
              label="Plans"
              value={formatCurrency(totals.planSubtotal)}
            />

            <DrawerStat
              label="Discount"
              value={`-${formatCurrency(totals.discount)}`}
              accent={totals.discount > 0}
            />

            <DrawerStat
              label="Payable"
              value={formatCurrency(totals.payable)}
            />
          </div>
        </section>

        <section className="border border-slate-200 p-4">
          <SectionLabel>Items and Plan Schedule</SectionLabel>

          <div className="space-y-3">
            {(order.items || []).map((item, index) => (
              <AdminOrderItem
                key={`${order._id}-${index}`}
                item={item}
              />
            ))}
          </div>
        </section>

        {order.coupon?.code && (
          <section className="border border-green-200 bg-green-50 p-4">
            <SectionLabel>Coupon</SectionLabel>

            <p className="text-lg font-black text-green-800">
              {order.coupon.code}
            </p>

            <p className="mt-1 text-sm font-bold text-green-700">
              Discount: -
              {formatCurrency(
                order.coupon.discount ||
                  order.totals?.discount
              )}
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={onCancel}
          disabled={
            busy ||
            order.delivery?.status === "delivered" ||
            order.delivery?.status === "cancelled"
          }
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          <XCircle size={17} />
          Cancel Order
        </button>
      </div>
    </Drawer>
  );
}

function AdminOrderItem({ item }: { item: OrderItem }) {
  const isPlan = isPlanItem(item);
  const nextPlanDay = isPlan ? getNextPlanDay(item) : null;
  const planId = getPlanId(item);

  return (
    <div
      className={`border p-3 ${
        isPlan
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            {item.title || "Meal"} × {item.qty || 1}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {isPlan && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-green-700">
                Meal Plan
              </span>
            )}

            {planId && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                {planId}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm font-black">
          {formatCurrency(
            Number(item.price || 0) *
              Number(item.qty || 1)
          )}
        </p>
      </div>

      {isPlan && nextPlanDay && (
        <div className="mt-3 border border-orange-200 bg-orange-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">
            Next Meal
          </p>

          <p className="mt-1 text-xs font-black">
            Day {nextPlanDay.day}:{" "}
            {nextPlanDay.selectedMealTitle || "Meal"}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {formatDateOnly(nextPlanDay.date)} ·{" "}
            {formatSlot(nextPlanDay.slot)}
          </p>
        </div>
      )}

      {isPlan && item.planDays && item.planDays.length > 0 && (
        <div className="mt-3 space-y-2">
          {item.planDays.map((day, index) => (
            <div
              key={`${day.day || index}-${day.date || ""}`}
              className="border border-slate-200 bg-white p-3"
            >
              <p className="text-xs font-black">
                Day {day.day}: {day.selectedMealTitle || "Meal"}
              </p>

              <p className="mt-1 text-[11px] font-bold text-slate-500">
                {formatDateOnly(day.date)} · {formatSlot(day.slot)} ·{" "}
                {day.preference || "mixed"}
              </p>

              <p className="mt-1 text-[11px] font-bold text-slate-500">
                Delivery:{" "}
                {readableStatus(
                  day.deliveryStatus || "scheduled"
                )}{" "}
                · Kitchen:{" "}
                {readableStatus(day.kitchenStatus || "pending")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDrawer({
  paymentStatus,
  deliveryStatus,
  from,
  to,
  onPaymentChange,
  onDeliveryChange,
  onFromChange,
  onToChange,
  onApply,
  onToday,
  onClear,
  onClose,
}: {
  paymentStatus: string;
  deliveryStatus: string;
  from: string;
  to: string;
  onPaymentChange: (value: string) => void;
  onDeliveryChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onToday: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      title="Order Filters"
      subtitle="Filter orders by payment, delivery and date."
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Payment status">
          <select
            value={paymentStatus}
            onChange={(event) =>
              onPaymentChange(event.target.value)
            }
            className="admin-input"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="created">Created</option>
          </select>
        </Field>

        <Field label="Delivery status">
          <select
            value={deliveryStatus}
            onChange={(event) =>
              onDeliveryChange(event.target.value)
            }
            className="admin-input"
          >
            <option value="all">All Delivery Status</option>
            <option value="unassigned">Unassigned</option>
            <option value="accepted">Accepted</option>
            <option value="picked_up">Picked Up</option>
            <option value="out_for_delivery">
              Out for Delivery
            </option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <input
              type="date"
              value={from}
              onChange={(event) =>
                onFromChange(event.target.value)
              }
              className="admin-input"
            />
          </Field>

          <Field label="To">
            <input
              type="date"
              value={to}
              onChange={(event) =>
                onToChange(event.target.value)
              }
              className="admin-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToday}
            className="h-11 rounded-full border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>

          <button
            type="button"
            onClick={onClear}
            className="h-11 rounded-full border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Clear All
          </button>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="h-12 w-full rounded-full bg-green-600 text-sm font-black text-white hover:bg-green-700"
        >
          Apply Filters
        </button>
      </div>
    </Drawer>
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
        className="absolute inset-0 bg-black/45"
      />

      <aside
        className={`absolute bottom-0 right-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none ${
          wide ? "sm:w-[620px]" : "sm:w-[470px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mt-1 break-all text-sm font-bold text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-4 shadow-sm ${
        accent
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            accent
              ? "bg-green-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>

        <p className="text-xl font-black tracking-[-0.05em] sm:text-2xl">
          {value}
        </p>
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function OrderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-xs font-black text-slate-800">
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
          accent ? "text-green-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function EmptyOrders() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center">
      <ShoppingBag
        size={42}
        className="mx-auto text-slate-300"
      />

      <h3 className="mt-4 text-xl font-black">
        No orders found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Change the filters or select a different date range.
      </p>
    </div>
  );
}