// frontend/src/pages/AdminCoupons.tsx (FRONTEND)
import { useEffect, useMemo, useState } from "react";
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

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

const disabledInputClass =
  "w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-400 outline-none cursor-not-allowed";

const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";

const prettyDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const startOfDayISO = (yyyyMmDd: string) => {
  const d = new Date(yyyyMmDd);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfDayISO = (yyyyMmDd: string) => {
  const d = new Date(yyyyMmDd);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  const [form, setForm] = useState<FormState>({
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

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/coupons");
      setCoupons(res.data || []);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to fetch coupons");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formError = useMemo(() => {
    if (!form.code.trim()) return "Coupon code is required";
    if (!form.value || Number(form.value) <= 0)
      return "Value must be greater than 0";
    if (form.type === "percent" && Number(form.value) > 100)
      return "Percent cannot exceed 100";
    if (!form.validFrom || !form.validTo)
      return "Please select both From date and To date";
    if (form.validFrom > form.validTo)
      return "From date cannot be after To date";
    if (Number(form.minCartTotal) < 0)
      return "Min cart total cannot be negative";
    if (Number(form.usageLimitTotal) < 0)
      return "Total usage limit cannot be negative";
    if (Number(form.usageLimitPerUser) < 1)
      return "Per user limit must be at least 1";
    if (form.type === "percent" && Number(form.maxDiscount) < 0)
      return "Max discount cannot be negative";
    if (form.scope === "specific_user" && !form.assignedEmail.trim())
      return "User email is required for specific user coupon";

    return null;
  }, [form]);

  const resetForm = () => {
    setForm({
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
  };

  const createCoupon = async () => {
    setMsg(null);
    setMsgType(null);

    if (formError) {
      setMsg(formError);
      setMsgType("error");
      return;
    }

    setSaving(true);

    try {
      await api.post("/admin/coupons", {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minCartTotal: Number(form.minCartTotal),
        maxDiscount: form.type === "percent" ? Number(form.maxDiscount) : 0,
        validFrom: form.validFrom ? startOfDayISO(form.validFrom) : null,
        validTo: form.validTo ? endOfDayISO(form.validTo) : null,
        usageLimitTotal: Number(form.usageLimitTotal),
        usageLimitPerUser: Number(form.usageLimitPerUser),
        scope: form.scope,
        assignedEmail:
          form.scope === "specific_user"
            ? form.assignedEmail.trim().toLowerCase()
            : "",
      });

      setMsg("Coupon created successfully");
      setMsgType("success");
      resetForm();
      fetchCoupons();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to create coupon");
      setMsgType("error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (id: string) => {
    setMsg(null);
    setMsgType(null);

    try {
      await api.patch(`/admin/coupons/${id}/toggle`);
      fetchCoupons();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to toggle coupon");
      setMsgType("error");
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;

    setMsg(null);
    setMsgType(null);

    try {
      await api.delete(`/admin/coupons/${id}`);
      fetchCoupons();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to delete coupon");
      setMsgType("error");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Coupons</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create public coupons or assign private coupons to specific users.
        </p>
      </div>

      {/* CREATE COUPON */}
      <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">Create Coupon</h2>
          <p className="text-sm text-gray-500">
            Configure discount, validity, usage limits, and coupon visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Coupon Code</label>
            <input
              placeholder="WELCOME100"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Discount Type</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as "flat" | "percent",
                  maxDiscount: e.target.value === "flat" ? "0" : form.maxDiscount,
                })
              }
              className={inputClass}
            >
              <option value="flat">Flat Amount ₹</option>
              <option value="percent">Percentage %</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {form.type === "flat" ? "Flat Value (₹)" : "Percent Value (%)"}
            </label>
            <input
              type="number"
              placeholder={form.type === "flat" ? "100" : "10"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Minimum Cart Total (₹)</label>
            <input
              type="number"
              placeholder="500"
              value={form.minCartTotal}
              onChange={(e) =>
                setForm({ ...form, minCartTotal: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Max Discount Cap (₹)</label>
            <input
              type="number"
              placeholder="Only for percentage coupons"
              value={form.maxDiscount}
              disabled={form.type !== "percent"}
              onChange={(e) =>
                setForm({ ...form, maxDiscount: e.target.value })
              }
              className={
                form.type !== "percent" ? disabledInputClass : inputClass
              }
            />
          </div>

          <div>
            <label className={labelClass}>Coupon Visibility</label>
            <select
              value={form.scope}
              onChange={(e) =>
                setForm({
                  ...form,
                  scope: e.target.value as "public" | "specific_user",
                  assignedEmail:
                    e.target.value === "public" ? "" : form.assignedEmail,
                })
              }
              className={inputClass}
            >
              <option value="public">Public Coupon</option>
              <option value="specific_user">Specific User Coupon</option>
            </select>
          </div>

          {form.scope === "specific_user" && (
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>Assign to User Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={form.assignedEmail}
                onChange={(e) =>
                  setForm({ ...form, assignedEmail: e.target.value })
                }
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Valid From</label>
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Valid To</label>
            <input
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Total Usage Limit</label>
            <input
              type="number"
              placeholder="0 = unlimited"
              value={form.usageLimitTotal}
              onChange={(e) =>
                setForm({ ...form, usageLimitTotal: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Per User Limit</label>
            <input
              type="number"
              placeholder="1"
              value={form.usageLimitPerUser}
              onChange={(e) =>
                setForm({ ...form, usageLimitPerUser: e.target.value })
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={createCoupon}
            disabled={saving}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Coupon"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        {msg && (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              msgType === "error"
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-700"
            }`}
          >
            {msg}
          </p>
        )}
      </div>

      {/* ALL COUPONS */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">All Coupons</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : coupons.length === 0 ? (
          <p className="text-gray-500">No coupons found</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3">Code</th>
                  <th>Scope</th>
                  <th>Assigned To</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Min Cart</th>
                  <th>Validity</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((c) => {
                  const from = c.validFrom ?? null;
                  const to = c.validTo ?? c.expiresAt ?? null;

                  return (
                    <tr key={c._id} className="border-b">
                      <td className="py-3 font-semibold">{c.code}</td>

                      <td>
                        {c.scope === "specific_user" ? (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            Specific
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Public
                          </span>
                        )}
                      </td>

                      <td>{c.assignedEmail || c.assignedTo?.email || "-"}</td>

                      <td className="capitalize">{c.type}</td>

                      <td>
                        {c.type === "flat" ? `₹${c.value}` : `${c.value}%`}
                        {c.type === "percent" && c.maxDiscount > 0
                          ? ` (cap ₹${c.maxDiscount})`
                          : ""}
                      </td>

                      <td>₹{c.minCartTotal || 0}</td>

                      <td>
                        {from || to ? (
                          <>
                            {prettyDate(from)} → {prettyDate(to)}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {c.usedCount ?? 0}
                        {(c.usageLimitTotal ?? 0) > 0
                          ? ` / ${c.usageLimitTotal}`
                          : ""}
                        <div className="text-xs text-gray-500">
                          Per user: {c.usageLimitPerUser ?? 1}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            c.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="text-right">
                        <button
                          onClick={() => toggleCoupon(c._id)}
                          className="mr-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          Toggle
                        </button>

                        <button
                          onClick={() => deleteCoupon(c._id)}
                          className="text-sm font-medium text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}