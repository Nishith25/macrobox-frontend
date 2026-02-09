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

  // ✅ new validity range (preferred)
  validFrom?: string | null;
  validTo?: string | null;

  // ✅ backward compat (old)
  expiresAt?: string | null;

  isActive: boolean;

  // ✅ usage limits
  usageLimitTotal?: number; // 0 = unlimited
  usageLimitPerUser?: number;
  usedCount?: number;
};

type FormState = {
  code: string;
  type: "flat" | "percent";
  value: string;
  minCartTotal: string;
  maxDiscount: string;

  // ✅ from -> to
  validFrom: string; // YYYY-MM-DD
  validTo: string; // YYYY-MM-DD

  // ✅ limits
  usageLimitTotal: string; // "0" = unlimited
  usageLimitPerUser: string; // default "1"
};

const prettyDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
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
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/coupons");
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
    if (!form.value || Number(form.value) <= 0) return "Value must be greater than 0";
    if (form.type === "percent" && Number(form.value) > 100) return "Percent cannot exceed 100";

    if (!form.validFrom || !form.validTo) return "Please select both From date and To date";
    if (form.validFrom > form.validTo) return "From date cannot be after To date";

    if (Number(form.minCartTotal) < 0) return "Min cart total cannot be negative";
    if (Number(form.usageLimitTotal) < 0) return "Total usage limit cannot be negative";
    if (Number(form.usageLimitPerUser) < 1) return "Per user limit must be at least 1";
    if (form.type === "percent" && Number(form.maxDiscount) < 0) return "Max discount cannot be negative";

    return null;
  }, [form]);

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
      await api.post("/coupons", {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minCartTotal: Number(form.minCartTotal),
        maxDiscount: form.type === "percent" ? Number(form.maxDiscount) : 0,

        // ✅ validity range (store as Date)
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,

        // ✅ limits
        usageLimitTotal: Number(form.usageLimitTotal), // 0 unlimited
        usageLimitPerUser: Number(form.usageLimitPerUser),
      });

      setMsg("Coupon created successfully");
      setMsgType("success");

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
      });

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
      await api.patch(`/coupons/${id}/toggle`);
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
      await api.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to delete coupon");
      setMsgType("error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Manage Coupons</h1>

      {/* CREATE */}
      <div className="border rounded-lg p-6 mb-8 bg-white">
        <h2 className="font-semibold mb-4">Create Coupon</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            placeholder="CODE (e.g. WELCOME100)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border rounded px-3 py-2"
          />

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="border rounded px-3 py-2"
          >
            <option value="flat">Flat ₹</option>
            <option value="percent">Percent %</option>
          </select>

          <input
            type="number"
            placeholder={form.type === "flat" ? "Flat value (₹)" : "Percent value (%)"}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="border rounded px-3 py-2"
          />

          <input
            type="number"
            placeholder="Min Cart Total (₹)"
            value={form.minCartTotal}
            onChange={(e) => setForm({ ...form, minCartTotal: e.target.value })}
            className="border rounded px-3 py-2"
          />

          <input
            type="number"
            placeholder="Max Discount (₹) (only %)"
            value={form.maxDiscount}
            disabled={form.type !== "percent"}
            onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
            className={`border rounded px-3 py-2 ${form.type !== "percent" ? "opacity-60" : ""}`}
          />

          {/* ✅ Valid From / Valid To */}
          <input
            type="date"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={form.validTo}
            onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            className="border rounded px-3 py-2"
          />

          {/* ✅ Limits */}
          <input
            type="number"
            placeholder="Total usage limit (0 = unlimited)"
            value={form.usageLimitTotal}
            onChange={(e) => setForm({ ...form, usageLimitTotal: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            placeholder="Per user limit"
            value={form.usageLimitPerUser}
            onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={createCoupon}
          disabled={saving}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Coupon"}
        </button>

        {msg && (
          <p className={`mt-3 text-sm ${msgType === "error" ? "text-red-600" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>

      {/* LIST */}
      <div className="border rounded-lg p-6 bg-white">
        <h2 className="font-semibold mb-4">All Coupons</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : coupons.length === 0 ? (
          <p className="text-gray-500">No coupons found</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Code</th>
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

                  const usedCount = c.usedCount ?? 0;
                  const totalLimit = c.usageLimitTotal ?? 0;
                  const perUser = c.usageLimitPerUser ?? 1;

                  return (
                    <tr key={c._id} className="border-b">
                      <td className="py-2 font-semibold">{c.code}</td>

                      <td>{c.type}</td>

                      <td>
                        {c.type === "flat" ? `₹${c.value}` : `${c.value}%`}
                        {c.type === "percent" && c.maxDiscount > 0 ? ` (cap ₹${c.maxDiscount})` : ""}
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
                        {usedCount}
                        {totalLimit > 0 ? ` / ${totalLimit}` : ""}
                        <div className="text-xs text-gray-500">Per user: {perUser}</div>
                      </td>

                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            c.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="text-right">
                        <button
                          onClick={() => toggleCoupon(c._id)}
                          className="px-3 py-1 rounded text-sm border mr-2"
                        >
                          Toggle
                        </button>

                        <button onClick={() => deleteCoupon(c._id)} className="text-red-600 text-sm">
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

      <p className="text-xs text-gray-500 mt-4">
        Validity is shown as From → To. For older coupons, To may show the old expiresAt if present.
      </p>
    </div>
  );
}
