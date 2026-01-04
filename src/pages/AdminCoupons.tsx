import { useEffect, useState } from "react";
import api from "../api/api";

type Coupon = {
  _id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  minCartTotal: number;
  maxDiscount: number;
  expiresAt: string;
  isActive: boolean;
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<any>({
    code: "",
    type: "flat",
    value: "",
    minCartTotal: 0,
    maxDiscount: 0,
    expiresAt: "",
  });

  const fetchCoupons = async () => {
    const res = await api.get("/coupons");
    setCoupons(res.data);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const createCoupon = async () => {
    if (!form.code || !form.value || !form.expiresAt) {
      alert("Fill required fields");
      return;
    }

    await api.post("/coupons", {
      ...form,
      value: Number(form.value),
      minCartTotal: Number(form.minCartTotal),
      maxDiscount: Number(form.maxDiscount),
    });

    setForm({
      code: "",
      type: "flat",
      value: "",
      minCartTotal: 0,
      maxDiscount: 0,
      expiresAt: "",
    });

    fetchCoupons();
  };

  const toggleCoupon = async (id: string) => {
    await api.patch(`/coupons/${id}/toggle`);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await api.delete(`/coupons/${id}`);
    fetchCoupons();
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Manage Coupons</h1>

      {/* CREATE */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Create Coupon</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input placeholder="CODE" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border rounded px-3 py-2" />

          <select value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border rounded px-3 py-2">
            <option value="flat">Flat ₹</option>
            <option value="percent">Percent %</option>
          </select>

          <input type="number" placeholder="Value"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="border rounded px-3 py-2" />

          <input type="number" placeholder="Min Cart Total"
            value={form.minCartTotal}
            onChange={(e) => setForm({ ...form, minCartTotal: e.target.value })}
            className="border rounded px-3 py-2" />

          {form.type === "percent" && (
            <input type="number" placeholder="Max Discount"
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
              className="border rounded px-3 py-2" />
          )}

          <input type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="border rounded px-3 py-2" />
        </div>

        <button
          onClick={createCoupon}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg"
        >
          Create Coupon
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {coupons.map((c) => (
          <div key={c._id} className="border rounded-lg p-4 flex justify-between">
            <div>
              <p className="font-semibold">{c.code}</p>
              <p className="text-sm text-gray-500">
                {c.type === "flat" ? `₹${c.value}` : `${c.value}%`}
                • Min ₹{c.minCartTotal}
              </p>
              <p className="text-xs text-gray-400">
                Expires: {new Date(c.expiresAt).toDateString()}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={() => toggleCoupon(c._id)}
                className={`px-3 py-1 rounded text-sm ${
                  c.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </button>

              <button
                onClick={() => deleteCoupon(c._id)}
                className="text-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
