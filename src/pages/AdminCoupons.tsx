// frontend/src/pages/AdminCoupons.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BadgePercent,
  Check,
  CirclePlus,
  Copy,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type Coupon = {
  _id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  minCartTotal: number;
  maxDiscount: number;
  validFrom?: string | null;
  validTo?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  usedCount?: number;
  scope?: "public" | "specific_user";
  assignedEmail?: string;
  assignedTo?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
};

type FormState = {
  code: string;
  type: "flat" | "percent";
  value: string;
  minCartTotal: string;
  maxDiscount: string;
  validFrom: string;
  validTo: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  scope: "public" | "specific_user";
  assignedEmail: string;
};

type CouponFilter =
  | "all"
  | "active"
  | "inactive"
  | "public"
  | "specific";

const emptyForm = (): FormState => ({
  code: "",
  type: "flat",
  value: "",
  minCartTotal: "0",
  maxDiscount: "0",
  validFrom: "",
  validTo: "",
  usageLimitTotal: "0",
  usageLimitPerUser: "1",
  scope: "public",
  assignedEmail: "",
});

const prettyDate = (iso?: string | null) => {
  if (!iso) return "-";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const startOfDayISO = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
};

const endOfDayISO = (dateValue: string) => {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);

  return date.toISOString();
};

const getCouponValue = (coupon: Coupon) => {
  if (coupon.type === "flat") {
    return `₹${coupon.value}`;
  }

  return `${coupon.value}%`;
};

const isExpired = (coupon: Coupon) => {
  const expiry = coupon.validTo || coupon.expiresAt;

  if (!expiry) return false;

  return new Date(expiry).getTime() < Date.now();
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCouponId, setBusyCouponId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<CouponFilter>("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] =
    useState<FormState>(emptyForm());

  const fetchCoupons = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/coupons");

      setCoupons(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to fetch coupons"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formError = useMemo(() => {
    if (!form.code.trim()) {
      return "Coupon code is required";
    }

    if (!form.value || Number(form.value) <= 0) {
      return "Value must be greater than 0";
    }

    if (
      form.type === "percent" &&
      Number(form.value) > 100
    ) {
      return "Percent cannot exceed 100";
    }

    if (!form.validFrom || !form.validTo) {
      return "Select both validity dates";
    }

    if (form.validFrom > form.validTo) {
      return "From date cannot be after To date";
    }

    if (Number(form.minCartTotal) < 0) {
      return "Minimum cart total cannot be negative";
    }

    if (Number(form.usageLimitTotal) < 0) {
      return "Total usage limit cannot be negative";
    }

    if (Number(form.usageLimitPerUser) < 1) {
      return "Per-user limit must be at least 1";
    }

    if (
      form.type === "percent" &&
      Number(form.maxDiscount) < 0
    ) {
      return "Max discount cannot be negative";
    }

    if (
      form.scope === "specific_user" &&
      !form.assignedEmail.trim()
    ) {
      return "User email is required";
    }

    return null;
  }, [form]);

  const stats = useMemo(() => {
    const active = coupons.filter(
      (coupon) => coupon.isActive && !isExpired(coupon)
    ).length;

    const publicCoupons = coupons.filter(
      (coupon) => coupon.scope !== "specific_user"
    ).length;

    const privateCoupons = coupons.filter(
      (coupon) => coupon.scope === "specific_user"
    ).length;

    const totalUses = coupons.reduce(
      (sum, coupon) => sum + Number(coupon.usedCount || 0),
      0
    );

    return {
      total: coupons.length,
      active,
      inactive: coupons.length - active,
      publicCoupons,
      privateCoupons,
      totalUses,
    };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...coupons]
      .filter((coupon) => {
        const matchesSearch =
          !query ||
          [
            coupon.code,
            coupon.type,
            coupon.assignedEmail,
            coupon.assignedTo?.name,
            coupon.assignedTo?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) return false;

        if (filter === "active") {
          return coupon.isActive && !isExpired(coupon);
        }

        if (filter === "inactive") {
          return !coupon.isActive || isExpired(coupon);
        }

        if (filter === "public") {
          return coupon.scope !== "specific_user";
        }

        if (filter === "specific") {
          return coupon.scope === "specific_user";
        }

        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [coupons, search, filter]);

  const resetForm = () => {
    setForm(emptyForm());
  };

  const openCreateDrawer = () => {
    resetForm();
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    if (saving) return;

    setShowDrawer(false);
    resetForm();
  };

  const createCoupon = async () => {
    if (formError) {
      toast.error(formError);
      return;
    }

    try {
      setSaving(true);

      await api.post("/admin/coupons", {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minCartTotal: Number(form.minCartTotal),
        maxDiscount:
          form.type === "percent"
            ? Number(form.maxDiscount)
            : 0,
        validFrom: startOfDayISO(form.validFrom),
        validTo: endOfDayISO(form.validTo),
        usageLimitTotal: Number(form.usageLimitTotal),
        usageLimitPerUser: Number(
          form.usageLimitPerUser
        ),
        scope: form.scope,
        assignedEmail:
          form.scope === "specific_user"
            ? form.assignedEmail
                .trim()
                .toLowerCase()
            : "",
      });

      toast.success("Coupon created successfully");

      closeDrawer();
      await fetchCoupons();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to create coupon"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      setBusyCouponId(coupon._id);

      await api.patch(
        `/admin/coupons/${coupon._id}/toggle`
      );

      toast.success(
        coupon.isActive
          ? "Coupon deactivated"
          : "Coupon activated"
      );

      await fetchCoupons();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update coupon"
      );
    } finally {
      setBusyCouponId(null);
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (
      !window.confirm(`Delete coupon "${coupon.code}"?`)
    ) {
      return;
    }

    try {
      setBusyCouponId(coupon._id);

      await api.delete(
        `/admin/coupons/${coupon._id}`
      );

      toast.success("Coupon deleted");
      await fetchCoupons();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to delete coupon"
      );
    } finally {
      setBusyCouponId(null);
    }
  };

  const copyCouponCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Coupon code copied");
    } catch {
      toast.error("Unable to copy coupon code");
    }
  };

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
                Coupons
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Create public discount codes or assign exclusive coupons to
                individual customers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={fetchCoupons}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700"
              >
                <CirclePlus size={17} />
                Add Coupon
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardStat
              label="Total Coupons"
              value={stats.total}
              icon={<Tag size={18} />}
            />

            <DashboardStat
              label="Active"
              value={stats.active}
              icon={<Check size={18} />}
              accent
            />

            <DashboardStat
              label="Inactive"
              value={stats.inactive}
              icon={<X size={18} />}
            />

            <DashboardStat
              label="Public"
              value={stats.publicCoupons}
              icon={<Users size={18} />}
            />

            <DashboardStat
              label="Private"
              value={stats.privateCoupons}
              icon={<UserRound size={18} />}
            />

            <DashboardStat
              label="Total Uses"
              value={stats.totalUses}
              icon={<Gift size={18} />}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Search coupon or assigned user..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterButton>

              <FilterButton
                active={filter === "active"}
                onClick={() => setFilter("active")}
              >
                Active
              </FilterButton>

              <FilterButton
                active={filter === "inactive"}
                onClick={() => setFilter("inactive")}
              >
                Inactive
              </FilterButton>

              <FilterButton
                active={filter === "public"}
                onClick={() => setFilter("public")}
              >
                Public
              </FilterButton>

              <FilterButton
                active={filter === "specific"}
                onClick={() => setFilter("specific")}
              >
                Private
              </FilterButton>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Available Coupons
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {filteredCoupons.length} coupon
              {filteredCoupons.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 border border-slate-200 bg-white p-10 text-sm font-black text-slate-600">
              <Loader2 className="animate-spin text-green-600" size={19} />
              Loading coupons...
            </div>
          ) : filteredCoupons.length === 0 ? (
            <EmptyCoupons />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCoupons.map((coupon) => (
                <CouponCard
                  key={coupon._id}
                  coupon={coupon}
                  busy={busyCouponId === coupon._id}
                  onCopy={() => copyCouponCode(coupon.code)}
                  onToggle={() => toggleCoupon(coupon)}
                  onDelete={() => deleteCoupon(coupon)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showDrawer && (
        <CouponDrawer
          form={form}
          saving={saving}
          formError={formError}
          onChange={setForm}
          onCreate={createCoupon}
          onReset={resetForm}
          onClose={closeDrawer}
        />
      )}
    </main>
  );
}

function CouponCard({
  coupon,
  busy,
  onCopy,
  onToggle,
  onDelete,
}: {
  coupon: Coupon;
  busy: boolean;
  onCopy: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const expired = isExpired(coupon);
  const active = coupon.isActive && !expired;

  const from = coupon.validFrom || null;
  const to = coupon.validTo || coupon.expiresAt || null;

  return (
    <article className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-green-200">
      <div
        className={`h-2 ${
          active ? "bg-green-600" : "bg-slate-300"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
            <BadgePercent size={23} />
          </span>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              active
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {expired ? "Expired" : active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Coupon Code
            </p>

            <h3 className="mt-1 truncate text-2xl font-black tracking-[-0.04em]">
              {coupon.code}
            </h3>
          </div>

          <button
            type="button"
            onClick={onCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Copy size={16} />
          </button>
        </div>

        <div className="mt-4 border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-green-700">
            Discount
          </p>

          <p className="mt-1 text-3xl font-black tracking-[-0.05em]">
            {getCouponValue(coupon)}
          </p>

          {coupon.type === "percent" &&
            coupon.maxDiscount > 0 && (
              <p className="mt-1 text-xs font-bold text-green-700">
                Maximum discount ₹{coupon.maxDiscount}
              </p>
            )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <CouponDetail
            label="Scope"
            value={
              coupon.scope === "specific_user"
                ? "Specific User"
                : "Public"
            }
          />

          <CouponDetail
            label="Minimum Cart"
            value={`₹${coupon.minCartTotal || 0}`}
          />

          <CouponDetail
            label="Valid From"
            value={prettyDate(from)}
          />

          <CouponDetail
            label="Valid To"
            value={prettyDate(to)}
          />
        </div>

        {coupon.scope === "specific_user" && (
          <div className="mt-3 border border-blue-100 bg-blue-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
              Assigned To
            </p>

            <p className="mt-1 truncate text-xs font-black text-blue-800">
              {coupon.assignedEmail ||
                coupon.assignedTo?.email ||
                "Not assigned"}
            </p>
          </div>
        )}

        <div className="mt-3 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-bold">
            <span className="text-slate-500">Usage</span>

            <span className="text-slate-900">
              {coupon.usedCount || 0}
              {(coupon.usageLimitTotal || 0) > 0
                ? ` / ${coupon.usageLimitTotal}`
                : " / Unlimited"}
            </span>
          </div>

          <p className="mt-1 text-[11px] font-bold text-slate-400">
            Per user limit: {coupon.usageLimitPerUser || 1}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={busy || expired}
            className={`h-10 rounded-full border text-xs font-black disabled:opacity-40 ${
              active
                ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {busy
              ? "Updating..."
              : active
              ? "Deactivate"
              : "Activate"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-red-200 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function CouponDrawer({
  form,
  saving,
  formError,
  onChange,
  onCreate,
  onReset,
  onClose,
}: {
  form: FormState;
  saving: boolean;
  formError: string | null;
  onChange: (form: FormState) => void;
  onCreate: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      title="Create Coupon"
      subtitle="Configure discount, validity and coupon visibility."
      onClose={onClose}
      wide
    >
      <div className="space-y-6">
        <DrawerSection
          number="01"
          title="Coupon Information"
          description="Set the code, discount type and minimum cart value."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Coupon code" required>
              <input
                value={form.code}
                onChange={(event) =>
                  onChange({
                    ...form,
                    code: event.target.value.toUpperCase(),
                  })
                }
                placeholder="WELCOME100"
                className="admin-input uppercase"
              />
            </Field>

            <Field label="Discount type">
              <select
                value={form.type}
                onChange={(event) =>
                  onChange({
                    ...form,
                    type: event.target.value as
                      | "flat"
                      | "percent",
                    maxDiscount:
                      event.target.value === "flat"
                        ? "0"
                        : form.maxDiscount,
                  })
                }
                className="admin-input"
              >
                <option value="flat">Flat Amount</option>
                <option value="percent">Percentage</option>
              </select>
            </Field>

            <Field
              label={
                form.type === "flat"
                  ? "Flat value"
                  : "Percentage value"
              }
              required
            >
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(event) =>
                  onChange({
                    ...form,
                    value: event.target.value,
                  })
                }
                placeholder={form.type === "flat" ? "100" : "10"}
                className="admin-input"
              />
            </Field>

            <Field label="Minimum cart total">
              <input
                type="number"
                min="0"
                value={form.minCartTotal}
                onChange={(event) =>
                  onChange({
                    ...form,
                    minCartTotal: event.target.value,
                  })
                }
                className="admin-input"
              />
            </Field>

            <Field label="Maximum discount">
              <input
                type="number"
                min="0"
                value={form.maxDiscount}
                disabled={form.type !== "percent"}
                onChange={(event) =>
                  onChange({
                    ...form,
                    maxDiscount: event.target.value,
                  })
                }
                placeholder="Only for percentage coupons"
                className="admin-input"
              />
            </Field>

            <Field label="Visibility">
              <select
                value={form.scope}
                onChange={(event) =>
                  onChange({
                    ...form,
                    scope: event.target.value as
                      | "public"
                      | "specific_user",
                    assignedEmail:
                      event.target.value === "public"
                        ? ""
                        : form.assignedEmail,
                  })
                }
                className="admin-input"
              >
                <option value="public">Public Coupon</option>
                <option value="specific_user">
                  Specific User
                </option>
              </select>
            </Field>

            {form.scope === "specific_user" && (
              <Field
                label="Assigned user email"
                required
                className="sm:col-span-2"
              >
                <input
                  type="email"
                  value={form.assignedEmail}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      assignedEmail: event.target.value,
                    })
                  }
                  placeholder="user@example.com"
                  className="admin-input"
                />
              </Field>
            )}
          </div>
        </DrawerSection>

        <DrawerSection
          number="02"
          title="Validity"
          description="Choose when customers can apply the coupon."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valid from" required>
              <input
                type="date"
                value={form.validFrom}
                onChange={(event) =>
                  onChange({
                    ...form,
                    validFrom: event.target.value,
                  })
                }
                className="admin-input"
              />
            </Field>

            <Field label="Valid to" required>
              <input
                type="date"
                value={form.validTo}
                onChange={(event) =>
                  onChange({
                    ...form,
                    validTo: event.target.value,
                  })
                }
                className="admin-input"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection
          number="03"
          title="Usage Limits"
          description="Control total redemptions and per-user usage."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total usage limit">
              <input
                type="number"
                min="0"
                value={form.usageLimitTotal}
                onChange={(event) =>
                  onChange({
                    ...form,
                    usageLimitTotal: event.target.value,
                  })
                }
                placeholder="0 = unlimited"
                className="admin-input"
              />
            </Field>

            <Field label="Per-user limit">
              <input
                type="number"
                min="1"
                value={form.usageLimitPerUser}
                onChange={(event) =>
                  onChange({
                    ...form,
                    usageLimitPerUser: event.target.value,
                  })
                }
                className="admin-input"
              />
            </Field>
          </div>
        </DrawerSection>

        <section className="border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-green-700">
            Coupon Preview
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xl font-black">
                {form.code || "COUPON CODE"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Minimum order ₹{form.minCartTotal || 0}
              </p>
            </div>

            <p className="text-3xl font-black tracking-[-0.05em]">
              {form.type === "flat"
                ? `₹${form.value || 0}`
                : `${form.value || 0}%`}
            </p>
          </div>
        </section>

        {formError && (
          <div className="border border-red-200 bg-red-50 p-3 text-xs font-black text-red-700">
            {formError}
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="h-12 rounded-full border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onCreate}
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-green-600 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Check size={17} />
            )}

            {saving ? "Creating..." : "Create Coupon"}
          </button>
        </div>
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
        aria-label="Close coupon editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside
        className={`absolute bottom-0 right-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:rounded-none ${
          wide ? "sm:w-[620px]" : "sm:w-[470px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
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

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex gap-3 border-b border-slate-200 bg-slate-50 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
          {number}
        </span>

        <div>
          <h3 className="font-black">{title}</h3>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </section>
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

function CouponDetail({
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

      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full px-4 text-xs font-black ${
        active
          ? "bg-green-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function EmptyCoupons() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center md:col-span-2">
      <BadgePercent
        size={42}
        className="mx-auto text-slate-300"
      />

      <h3 className="mt-4 text-xl font-black">
        No coupons found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Change the filter or create a new coupon.
      </p>
    </div>
  );
}