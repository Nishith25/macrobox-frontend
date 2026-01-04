import { useMemo, useState } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const slots = [
  "Today 7-9 PM",
  "Tomorrow 8-10 AM",
  "Tomorrow 12-2 PM",
  "Tomorrow 6-8 PM",
];

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.qty, 0),
    [cart]
  );

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [discount, setDiscount] = useState(0);

  const [slot, setSlot] = useState(slots[0]);
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const total = Math.max(subtotal - discount, 0);

  const applyCoupon = async () => {
    try {
      const res = await api.post("/coupons/validate", { code: coupon, subtotal });

      const c = res.data;
      let d = 0;
      if (c.type === "flat") d = c.value;
      if (c.type === "percent") d = (c.value / 100) * subtotal;
      d = Math.min(d, c.maxDiscount);
      d = Math.min(d, subtotal);

      setDiscount(Math.round(d));
      setCouponApplied(c);
      toast.success(`Coupon applied: ${c.code}`);
    } catch (e: any) {
      setDiscount(0);
      setCouponApplied(null);
      toast.error(e?.response?.data?.message || "Invalid coupon");
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const existing = document.getElementById("razorpay-sdk");
      if (existing) return resolve(true);

      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePay = async () => {
    if (!cart.length) return toast.error("Cart empty");
    if (!address.fullName || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      return toast.error("Please fill full address");
    }

    const ok = await loadRazorpay();
    if (!ok) return toast.error("Razorpay SDK failed to load");

    try {
      // Create order on backend
      const createRes = await api.post("/checkout/create-order", {
        items: cart,
        address,
        deliverySlot: slot,
        couponCode: couponApplied?.code || null,
      });

      const { keyId, razorpayOrderId, amount, currency, orderId } = createRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "MacroBox",
        description: "Meal order payment",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            await api.post("/checkout/verify", {
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success("Payment successful ✅");
            clearCart();
            navigate("/orders");
          } catch (err: any) {
            toast.error(err?.response?.data?.message || "Verification failed");
          }
        },
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        theme: { color: "#16a34a" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Checkout failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
      {/* LEFT */}
      <div className="md:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold">Checkout</h1>

        {/* ADDRESS */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3">Delivery Address</h2>

          <div className="grid md:grid-cols-2 gap-3">
            <input className="border p-2 rounded" placeholder="Full name"
              value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Phone"
              value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />

            <input className="border p-2 rounded md:col-span-2" placeholder="Address line 1"
              value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <input className="border p-2 rounded md:col-span-2" placeholder="Address line 2 (optional)"
              value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />

            <input className="border p-2 rounded" placeholder="City"
              value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <input className="border p-2 rounded" placeholder="State"
              value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />

            <input className="border p-2 rounded" placeholder="Pincode"
              value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
          </div>
        </div>

        {/* SLOT */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3">Delivery Slot</h2>
          <select className="border p-2 rounded w-full" value={slot} onChange={(e) => setSlot(e.target.value)}>
            {slots.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* COUPON */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3">Apply Coupon</h2>
          <div className="flex gap-2">
            <input
              className="border p-2 rounded w-full"
              placeholder="Enter coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <button onClick={applyCoupon} className="bg-black text-white px-4 rounded">
              Apply
            </button>
          </div>
          {couponApplied && (
            <p className="text-sm text-green-700 mt-2">
              Applied: {couponApplied.code} ✅
            </p>
          )}
        </div>
      </div>

      {/* RIGHT SUMMARY */}
      <div className="border rounded-lg p-4 h-fit">
        <h2 className="font-semibold text-lg mb-3">Order Summary</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>- ₹{discount}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Pay with Razorpay
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Secure payment powered by Razorpay.
        </p>
      </div>
    </div>
  );
}
