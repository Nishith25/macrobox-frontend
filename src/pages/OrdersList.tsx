// frontend/src/pages/OrdersList.tsx (FRONTEND)

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/api";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Search,
  RefreshCcw,
} from "lucide-react";

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

const kitchenStatuses: {
  value: KitchenStatus;
  label: string;
  icon: any;
}[] = [
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
  },
  {
    value: "started_preparing",
    label: "Started Preparing",
    icon: ChefHat,
  },
  {
    value: "prepared",
    label: "Prepared",
    icon: PackageCheck,
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value?: number) => `₹${Number(value || 0).toFixed(0)}`;

const readableStatus = (value?: string) => {
  if (!value) return "N/A";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateOnly = (value?: string) => {
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
};

const formatSlot = (slot?: string) => {
  if (!slot) return "N/A";

  const hour = Number(slot.split(":")[0]);

  if (!Number.isFinite(hour)) return slot;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
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

const getSplitTotals = (order: Order) => {
  const items = order.items || [];

  const fallbackPlanSubtotal = items
    .filter((item) => isPlanItem(item))
    .reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.qty || item.quantity || 1),
      0
    );

  const subtotal = Number(order.totals?.subtotal || 0);

  const planSubtotal =
    Number(order.totals?.planSubtotal || order.totals?.challengePlanSubtotal || 0) >
    0
      ? Number(
          order.totals?.planSubtotal || order.totals?.challengePlanSubtotal || 0
        )
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

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await api.get("/orderslist");

      const list = res.data?.orders || [];

      setOrders(list);
      setFilteredOrders(list);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load kitchen orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let list = [...orders];

    if (search.trim()) {
      const query = search.toLowerCase();

      list = list.filter((order) => {
        const customerName = order.user?.name || "";
        const phone = order.user?.phone || order.delivery?.address?.phone || "";
        const email = order.user?.email || "";
        const id = order._id || "";
        const coupon = order.coupon?.code || "";

        const itemTitles =
          order.items
            ?.map((item) => {
              const title =
                item.title || item.meal?.title || item.meal?.name || "";
              const planId = getPlanId(item);

              const planItems =
                item.planItems
                  ?.map((planItem) => planItem.title || "")
                  .join(" ") || "";

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

        return (
          customerName.toLowerCase().includes(query) ||
          phone.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query) ||
          id.toLowerCase().includes(query) ||
          coupon.toLowerCase().includes(query) ||
          itemTitles.toLowerCase().includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      list = list.filter(
        (order) => (order.kitchenStatus || "pending") === statusFilter
      );
    }

    setFilteredOrders(list);
  }, [search, statusFilter, orders]);

  const updateKitchenStatus = async (
    orderId: string,
    kitchenStatus: KitchenStatus
  ) => {
    try {
      setUpdatingId(orderId);

      const res = await api.patch(`/orderslist/${orderId}/kitchen-status`, {
        kitchenStatus,
      });

      toast.success(res.data?.message || "Kitchen status updated.");

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                kitchenStatus,
                items: (order.items || []).map((item) => {
                  if (!isPlanItem(item)) return item;

                  return {
                    ...item,
                    planDays: (item.planDays || []).map((day) =>
                      day.date === todayISO()
                        ? {
                            ...day,
                            kitchenStatus,
                          }
                        : day
                    ),
                  };
                }),
              }
            : order
        )
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update kitchen status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const getAddressText = (order: Order) => {
    const address = order.delivery?.address;

    if (!address) return "No address available";

    if (address.formattedAddress) return address.formattedAddress;
    if (address.locationText) return address.locationText;

    const parts = [
      address.flatNo,
      address.floor,
      address.buildingName,
      address.area,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean);

    return parts.length ? parts.join(", ") : "Address available";
  };

  const getStatusLabel = (status?: KitchenStatus) => {
    if (status === "started_preparing") return "Started Preparing";
    if (status === "prepared") return "Prepared";
    return "Pending";
  };

  const getStatusClass = (status?: KitchenStatus) => {
    if (status === "prepared") {
      return "border-green-200 bg-green-100 text-green-700";
    }

    if (status === "started_preparing") {
      return "border-orange-200 bg-orange-100 text-orange-700";
    }

    return "border-gray-200 bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow">
          <Loader2 className="animate-spin text-green-600" />
          <span className="font-semibold text-gray-700">
            Loading kitchen orders...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                Kitchen Dashboard
              </p>

              <h1 className="text-3xl font-extrabold text-gray-900">
                Kitchen Orders
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Chef and admin can view today&apos;s meals, plan meals and
                update preparation status.
              </p>
            </div>

            <button
              onClick={fetchOrders}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
            >
              <RefreshCcw size={17} />
              Refresh Orders
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by customer, phone, email, coupon, item, plan or order ID"
                className="h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-xl border bg-white px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="started_preparing">Started Preparing</option>
              <option value="prepared">Prepared</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
            <ChefHat className="mx-auto mb-4 text-orange-600" size={42} />

            <h2 className="text-xl font-bold text-gray-900">
              No kitchen orders found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Paid customer orders and plan meals will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredOrders.map((order) => {
              const currentKitchenStatus = order.kitchenStatus || "pending";
              const items = order.items || [];
              const splitTotals = getSplitTotals(order);
              const customerName =
                order.user?.name ||
                order.delivery?.address?.fullName ||
                "Customer";
              const phone =
                order.user?.phone ||
                order.delivery?.address?.phone ||
                "No phone";

              return (
                <div
                  key={order._id}
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-extrabold text-gray-900">
                          #{order._id.slice(-8).toUpperCase()}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                            currentKitchenStatus
                          )}`}
                        >
                          {getStatusLabel(currentKitchenStatus)}
                        </span>

                        {order.payment?.status && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            Payment: {order.payment.status}
                          </span>
                        )}

                        {order.delivery?.status && (
                          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                            Delivery: {readableStatus(order.delivery.status)}
                          </span>
                        )}

                        {order.coupon?.code && (
                          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Coupon: {order.coupon.code}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-1 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold text-gray-900">
                            Customer:
                          </span>{" "}
                          {customerName}
                        </p>

                        <p>
                          <span className="font-semibold text-gray-900">
                            Phone:
                          </span>{" "}
                          {phone}
                        </p>

                        <p>
                          <span className="font-semibold text-gray-900">
                            Address:
                          </span>{" "}
                          {getAddressText(order)}
                        </p>

                        <p>
                          <span className="font-semibold text-gray-900">
                            Main Slot:
                          </span>{" "}
                          {order.delivery?.slot?.date || "N/A"}{" "}
                          {order.delivery?.slot?.time || ""}
                        </p>

                        <p>
                          <span className="font-semibold text-gray-900">
                            Ordered:
                          </span>{" "}
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-green-50 px-5 py-4 text-right">
                      <p className="text-xs font-semibold text-gray-500">
                        Total Payable
                      </p>

                      <p className="text-2xl font-extrabold text-green-700">
                        {formatCurrency(splitTotals.payable)}
                      </p>

                      {splitTotals.discount > 0 && (
                        <p className="mt-1 text-xs font-bold text-green-700">
                          Plan discount -₹{splitTotals.discount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border bg-gray-50 p-4">
                    <h3 className="mb-3 font-bold text-gray-900">
                      Billing Breakdown
                    </h3>

                    <div className="grid gap-3 md:grid-cols-4">
                      <BillingBox
                        label="Meals"
                        value={formatCurrency(splitTotals.normalMealsSubtotal)}
                      />

                      <BillingBox
                        label="Plans"
                        value={formatCurrency(splitTotals.planSubtotal)}
                      />

                      <BillingBox
                        label="Plan Discount"
                        value={`-₹${splitTotals.discount}`}
                        green
                      />

                      <BillingBox
                        label="Payable"
                        value={formatCurrency(splitTotals.payable)}
                        bold
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border bg-gray-50 p-4">
                    <h3 className="mb-3 font-bold text-gray-900">
                      Today&apos;s Kitchen Items
                    </h3>

                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items found.</p>
                    ) : (
                      <div className="grid gap-3">
                        {items.map((item, index) => (
                          <KitchenItemCard key={item._id || index} item={item} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {kitchenStatuses.map((status) => {
                      const Icon = status.icon;
                      const isActive = currentKitchenStatus === status.value;

                      return (
                        <button
                          key={status.value}
                          onClick={() =>
                            updateKitchenStatus(order._id, status.value)
                          }
                          disabled={updatingId === order._id || isActive}
                          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                            isActive
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-green-500 hover:text-green-700"
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          {updatingId === order._id ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : isActive ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <Icon size={17} />
                          )}

                          {status.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KitchenItemCard({ item }: { item: OrderItem }) {
  const isPlan = isPlanItem(item);
  const nextPlanDay = isPlan ? getNextPlanDay(item) : null;
  const planId = getPlanId(item);

  if (isPlan && nextPlanDay) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-gray-900">
                Day {nextPlanDay.day}:{" "}
                {nextPlanDay.selectedMealTitle || "Plan Meal"}
              </p>

              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-green-700">
                Meal Plan
              </span>

              {planId && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                  {planId}
                </span>
              )}

              <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-700">
                {readableStatus(nextPlanDay.kitchenStatus || "pending")}
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Delivery: {formatDateOnly(nextPlanDay.date)} •{" "}
              {formatSlot(nextPlanDay.slot)}
            </p>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Preference: {nextPlanDay.preference || "mixed"}
            </p>

            {nextPlanDay.alternativeMealTitle && (
              <p className="mt-1 text-xs font-semibold text-gray-500">
                Alternative: {nextPlanDay.alternativeMealTitle}
              </p>
            )}
          </div>

          <div className="text-left md:text-right">
            <p className="font-bold text-gray-900">
              {formatCurrency(nextPlanDay.selectedMealPrice)}
            </p>

            <p className="text-xs text-gray-500">
              {nextPlanDay.selectedMealCalories || 0} kcal |{" "}
              {nextPlanDay.selectedMealProtein || 0}g protein
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-gray-800">
            {item.title || item.meal?.title || item.meal?.name || "Meal Item"}
          </p>

          {isPlan && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold text-green-700">
              Meal Plan
            </span>
          )}

          {isPlan && planId && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              {planId}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500">
          Qty: {item.qty || item.quantity || 1}
        </p>
      </div>

      <div className="text-left md:text-right">
        <p className="font-bold text-gray-900">
          ₹{Number(item.price || 0).toFixed(2)}
        </p>

        <p className="text-xs text-gray-500">
          {item.calories || 0} kcal | {item.protein || 0}g protein
        </p>
      </div>
    </div>
  );
}

function BillingBox({
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
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>

      <p
        className={`mt-1 text-base ${
          bold ? "font-extrabold" : "font-bold"
        } ${green ? "text-green-700" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}