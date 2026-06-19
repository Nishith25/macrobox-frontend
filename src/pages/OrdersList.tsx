// frontend/src/pages/OrdersList.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type KitchenStatus = "pending" | "started_preparing" | "prepared";

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
  kitchenStatus?: KitchenStatus;
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
  _id?: string;
  itemType?: "meal" | "plan" | "challenge_plan";
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  planId?: string;
  challengeId?: string;
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
  meal?: {
    _id?: string;
    title?: string;
    name?: string;
  };
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
  kitchenStatus?: KitchenStatus;
  payment?: {
    status?: string;
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
      city?: string;
      state?: string;
      pincode?: string;
      formattedAddress?: string;
      locationText?: string;
      mapsUrl?: string;
    };
    slot?: {
      date?: string;
      time?: string;
    };
    status?: string;
  };
  createdAt?: string;
};

type StatusOption = {
  value: KitchenStatus;
  label: string;
  icon: LucideIcon;
};
const kitchenStatuses: StatusOption[] = [
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
  },
  {
    value: "started_preparing",
    label: "Preparing",
    icon: ChefHat,
  },
  {
    value: "prepared",
    label: "Prepared",
    icon: PackageCheck,
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value?: number) =>
  `₹${Number(value || 0).toFixed(0)}`;

const readableStatus = (value?: string) => {
  if (!value) return "N/A";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDateOnly = (value?: string) => {
  if (!value) return "N/A";

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

const formatDateTime = (value?: string) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatSlot = (slot?: string) => {
  if (!slot) return "N/A";

  const hour = Number(slot.split(":")[0]);

  if (!Number.isFinite(hour)) return slot;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
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

const getSplitTotals = (order: Order) => {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter(isPlanItem)
    .reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.qty || item.quantity || 1),
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

const getAddressText = (order: Order) => {
  const address = order.delivery?.address;

  if (!address) return "Address not available";
  if (address.formattedAddress) return address.formattedAddress;
  if (address.locationText) return address.locationText;

  return (
    [
      address.flatNo,
      address.floor,
      address.buildingName,
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

const getStatusClass = (status: KitchenStatus) => {
  if (status === "prepared") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "started_preparing") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | KitchenStatus>("all");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const response = await api.get("/orderslist");

      setOrders(
        Array.isArray(response.data?.orders)
          ? response.data.orders
          : []
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load kitchen orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const stats = useMemo(() => {
    const pending = orders.filter(
      (order) => (order.kitchenStatus || "pending") === "pending"
    ).length;

    const preparing = orders.filter(
      (order) =>
        order.kitchenStatus === "started_preparing"
    ).length;

    const prepared = orders.filter(
      (order) => order.kitchenStatus === "prepared"
    ).length;

    const planOrders = orders.filter((order) =>
      (order.items || []).some(isPlanItem)
    ).length;

    return {
      total: orders.length,
      pending,
      preparing,
      prepared,
      planOrders,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const itemText = (order.items || [])
        .map((item) => {
          const title =
            item.title ||
            item.meal?.title ||
            item.meal?.name ||
            "";

          const planItems = (item.planItems || [])
            .map((planItem) => planItem.title || "")
            .join(" ");

          const planDays = (item.planDays || [])
            .map(
              (day) =>
                `${day.selectedMealTitle || ""} ${
                  day.date || ""
                } ${day.slot || ""}`
            )
            .join(" ");

          return `${title} ${getPlanId(
            item
          )} ${planItems} ${planDays}`;
        })
        .join(" ");

      const matchesSearch =
        !query ||
        [
          order._id,
          order.user?.name,
          order.user?.email,
          order.user?.phone,
          order.delivery?.address?.phone,
          order.coupon?.code,
          itemText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const status = order.kitchenStatus || "pending";

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const updateKitchenStatus = async (
    orderId: string,
    kitchenStatus: KitchenStatus
  ) => {
    try {
      setUpdatingId(orderId);

      const response = await api.patch(
        `/orderslist/${orderId}/kitchen-status`,
        { kitchenStatus }
      );

      toast.success(
        response.data?.message || "Kitchen status updated."
      );

      setOrders((current) =>
        current.map((order) =>
          order._id === orderId
            ? {
                ...order,
                kitchenStatus,
                items: (order.items || []).map((item) =>
                  !isPlanItem(item)
                    ? item
                    : {
                        ...item,
                        planDays: (item.planDays || []).map(
                          (day) =>
                            day.date === todayISO()
                              ? {
                                  ...day,
                                  kitchenStatus,
                                }
                              : day
                        ),
                      }
                ),
              }
            : order
        )
      );

      setSelectedOrder((current) =>
        current?._id === orderId
          ? {
              ...current,
              kitchenStatus,
            }
          : current
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update kitchen status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading kitchen orders...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
                MacroBox Kitchen
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                Kitchen Orders
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                View today&apos;s meal requirements and update preparation
                progress before pickup.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchOrders}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700"
            >
              <RefreshCw size={16} />
              Refresh Orders
            </button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardStat
              label="Total Orders"
              value={stats.total}
              icon={<ShoppingBag size={18} />}
            />

            <DashboardStat
              label="Pending"
              value={stats.pending}
              icon={<Clock size={18} />}
            />

            <DashboardStat
              label="Preparing"
              value={stats.preparing}
              icon={<Flame size={18} />}
            />

            <DashboardStat
              label="Prepared"
              value={stats.prepared}
              icon={<PackageCheck size={18} />}
              accent
            />

            <DashboardStat
              label="Plan Orders"
              value={stats.planOrders}
              icon={<ChefHat size={18} />}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, customer, coupon or meal..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | KitchenStatus
                )
              }
              className="admin-input"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="started_preparing">
                Started Preparing
              </option>
              <option value="prepared">Prepared</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Preparation Queue
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {filteredOrders.length} order
              {filteredOrders.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyKitchen />
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => (
                <KitchenOrderCard
                  key={order._id}
                  order={order}
                  updating={updatingId === order._id}
                  onView={() => setSelectedOrder(order)}
                  onUpdate={(status) =>
                    updateKitchenStatus(order._id, status)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedOrder && (
        <KitchenOrderDrawer
          order={selectedOrder}
          updating={updatingId === selectedOrder._id}
          onClose={() => setSelectedOrder(null)}
          onUpdate={(status) =>
            updateKitchenStatus(selectedOrder._id, status)
          }
        />
      )}
    </main>
  );
}

function KitchenOrderCard({
  order,
  updating,
  onView,
  onUpdate,
}: {
  order: Order;
  updating: boolean;
  onView: () => void;
  onUpdate: (status: KitchenStatus) => void;
}) {
  const status = order.kitchenStatus || "pending";
  const totals = getSplitTotals(order);
  const items = order.items || [];

  const customerName =
    order.user?.name ||
    order.delivery?.address?.fullName ||
    "Customer";

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-orange-50 text-orange-600">
          <ChefHat size={28} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black">
                  {customerName}
                </h3>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClass(
                    status
                  )}`}
                >
                  {readableStatus(status)}
                </span>

                {order.payment?.status && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                    Payment: {readableStatus(order.payment.status)}
                  </span>
                )}
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
            <Metric
              label="Kitchen Items"
              value={String(items.length)}
            />

            <Metric
              label="Delivery Date"
              value={formatDateOnly(
                order.delivery?.slot?.date
              )}
            />

            <Metric
              label="Delivery Time"
              value={formatSlot(order.delivery?.slot?.time)}
            />

            <Metric
              label="Ordered"
              value={formatDateTime(order.createdAt)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {kitchenStatuses.map((option) => {
                const Icon = option.icon;
                const active = status === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onUpdate(option.value)}
                    disabled={updating || active}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-black transition disabled:opacity-60 ${
                      active
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-green-300"
                    }`}
                  >
                    {updating ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : active ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Icon size={15} />
                    )}

                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onView}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-5 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              View Items
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function KitchenOrderDrawer({
  order,
  updating,
  onClose,
  onUpdate,
}: {
  order: Order;
  updating: boolean;
  onClose: () => void;
  onUpdate: (status: KitchenStatus) => void;
}) {
  const totals = getSplitTotals(order);
  const status = order.kitchenStatus || "pending";

  const customerName =
    order.user?.name ||
    order.delivery?.address?.fullName ||
    "Customer";

  const phone =
    order.user?.phone ||
    order.delivery?.address?.phone ||
    "No phone";

  return (
    <Drawer
      title="Kitchen Order"
      subtitle={`Order #${order._id}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <User size={20} />
            </span>

            <div>
              <p className="font-black">{customerName}</p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {phone}
              </p>

              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                {getAddressText(order)}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <DetailBox
            label="Status"
            value={readableStatus(status)}
          />

          <DetailBox
            label="Payable"
            value={formatCurrency(totals.payable)}
          />

          <DetailBox
            label="Delivery Date"
            value={formatDateOnly(order.delivery?.slot?.date)}
          />

          <DetailBox
            label="Delivery Time"
            value={formatSlot(order.delivery?.slot?.time)}
          />
        </div>

        <section className="border border-slate-200 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Billing
          </p>

          <div className="grid grid-cols-2 gap-3">
            <DetailBox
              label="Meals"
              value={formatCurrency(
                totals.normalMealsSubtotal
              )}
            />

            <DetailBox
              label="Plans"
              value={formatCurrency(totals.planSubtotal)}
            />

            <DetailBox
              label="Discount"
              value={`-${formatCurrency(totals.discount)}`}
            />

            <DetailBox
              label="Payable"
              value={formatCurrency(totals.payable)}
            />
          </div>
        </section>

        <section className="border border-slate-200 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Today&apos;s Kitchen Items
          </p>

          <div className="space-y-3">
            {(order.items || []).map((item, index) => (
              <KitchenItemCard
                key={item._id || index}
                item={item}
              />
            ))}
          </div>
        </section>

        <section className="border border-slate-200 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Preparation Status
          </p>

          <div className="grid gap-2">
            {kitchenStatuses.map((option) => {
              const Icon = option.icon;
              const active = status === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdate(option.value)}
                  disabled={updating || active}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-black ${
                    active
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {updating ? (
                    <Loader2
                      className="animate-spin"
                      size={16}
                    />
                  ) : active ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Icon size={16} />
                  )}

                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function KitchenItemCard({ item }: { item: OrderItem }) {
  const plan = isPlanItem(item);
  const nextPlanDay = plan ? getNextPlanDay(item) : null;
  const planId = getPlanId(item);

  if (plan && nextPlanDay) {
    return (
      <div className="border border-green-200 bg-green-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black">
              Day {nextPlanDay.day}:{" "}
              {nextPlanDay.selectedMealTitle || "Plan Meal"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-green-700">
                Meal Plan
              </span>

              {planId && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                  {planId}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-black">
            {formatCurrency(
              nextPlanDay.selectedMealPrice
            )}
          </p>
        </div>

        <p className="mt-3 text-xs font-bold text-slate-500">
          {formatDateOnly(nextPlanDay.date)} ·{" "}
          {formatSlot(nextPlanDay.slot)} ·{" "}
          {nextPlanDay.preference || "mixed"}
        </p>

        <p className="mt-1 text-xs font-bold text-slate-500">
          {nextPlanDay.selectedMealCalories || 0} kcal ·{" "}
          {nextPlanDay.selectedMealProtein || 0}g protein
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            {item.title ||
              item.meal?.title ||
              item.meal?.name ||
              "Meal Item"}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            Quantity: {item.qty || item.quantity || 1}
          </p>
        </div>

        <p className="text-sm font-black">
          {formatCurrency(item.price)}
        </p>
      </div>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {item.calories || 0} kcal · {item.protein || 0}g protein
      </p>
    </div>
  );
}

/* Shared components */

function DashboardStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
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

        <p className="text-2xl font-black tracking-[-0.05em]">
          {value}
        </p>
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Metric({
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

      <p className="mt-1 line-clamp-2 text-xs font-black">
        {value}
      </p>
    </div>
  );
}

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[620px] sm:rounded-none">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </aside>
    </div>
  );
}

function EmptyKitchen() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center">
      <ChefHat
        className="mx-auto text-orange-500"
        size={42}
      />

      <h3 className="mt-4 text-xl font-black">
        No kitchen orders found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Paid meal and plan orders will appear here.
      </p>
    </div>
  );
}