import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, MapPin, Clock } from "lucide-react";
import { useCart } from "../context/CartContext";
import api from "../api/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SLOTS = [
  "7:00 AM - 9:00 AM",
  "9:00 AM - 11:00 AM",
  "12:00 PM - 2:00 PM",
  "6:00 PM - 8:00 PM",
];

export default function Cart() {
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();

  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const [checkingOut, setCheckingOut] = useState(false);

  // Address + Slot
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState(SLOTS[0]);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const totalProtein = useMemo(() => cart.reduce((s, i) => s + i.protein * i.qty, 0), [cart]);
  const totalCalories = useMemo(() => cart.reduce((s, i) => s + i.calories * i.qty, 0), [cart]);

  const payable = Math.max(subtotal - discount, 0);

  if (cart.length === 0) {
    return <p className="text-center mt-16 text-gray-500 text-lg">Your cart is empty 🛒</p>;
  }

  const applyCoupon = async () => {
    if (!coupon) return;
    setApplying(true);
    setCouponMsg(null);

    try {
      const res = await api.post("/coupons/apply", {
        code: coupon,
        cartTotal: subtotal,
      });

      setDiscount(res.data.discount);
      setCouponMsg(`Coupon applied! You saved ₹${res.data.discount}`);
    } catch (err: any) {
      setDiscount(0);
      setCouponMsg(err?.response?.data?.message || "Invalid coupon");
    } finally {
      setApplying(false);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const existing = document.getElementById("rzp-script");
      if (existing) return resolve(true);

      const script = document.createElement("script");
      script.id = "rzp-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const validateCheckout = () => {
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      setCouponMsg("Please fill delivery address (name, phone, address, city, state, pincode).");
      return false;
    }
    if (!slotDate || !slotTime) {
      setCouponMsg("Please select delivery slot date & time.");
      return false;
    }
    return true;
  };

  const checkout = async () => {
    if (!validateCheckout()) return;

    setCheckingOut(true);
    setCouponMsg(null);

    const ok = await loadRazorpay();
    if (!ok) {
      setCheckingOut(false);
      setCouponMsg("Razorpay failed to load. Try again.");
      return;
    }

    try {
      // 1) Create order on server
      const createRes = await api.post("/orders/create", {
        cart,
        couponCode: coupon ? coupon : null,
        discount,
        delivery: {
          address,
          slot: { date: slotDate, time: slotTime },
        },
      });

      const { orderId, razorpayOrderId, amount, keyId } = createRes.data;

      // 2) Open Razorpay
      const rzp = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "MacroBox",
        description: "Meal Order",
        order_id: razorpayOrderId,
        prefill: {
          name: address.name,
          contact: address.phone,
        },
        handler: async (response: any) => {
          // 3) Verify on server
          await api.post("/orders/verify", {
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          clearCart();
          setDiscount(0);
          setCoupon("");
          setCouponMsg("Payment successful ✅ Order placed!");
        },
        modal: {
          ondismiss: () => setCouponMsg("Payment cancelled."),
        },
        theme: { color: "#16a34a" },
      });

      rzp.open();
    } catch (err: any) {
      setCouponMsg(err?.response?.data?.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: ITEMS */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item._id} className="border rounded-xl p-4 flex justify-between items-center bg-white">
              <div className="flex gap-4 items-center">
                <img
                  src={item.imageUrl || "/placeholder-meal.png"}
                  className="w-20 h-20 rounded-xl object-cover border"
                />
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-500">
                    Protein: {item.protein * item.qty}g • Calories: {item.calories * item.qty}
                  </p>
                  <p className="font-medium mt-1">₹{item.price} × {item.qty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => decreaseQty(item._id)} className="p-2 border rounded-lg">
                  <Minus size={16} />
                </button>
                <span className="font-semibold w-6 text-center">{item.qty}</span>
                <button onClick={() => increaseQty(item._id)} className="p-2 border rounded-lg">
                  <Plus size={16} />
                </button>

                <button onClick={() => removeFromCart(item._id)} className="p-2 text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: SUMMARY */}
        <div className="border rounded-xl p-5 bg-white h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <p>Total Protein: <b>{totalProtein} g</b></p>
            <p>Total Calories: <b>{totalCalories}</b></p>
            <p className="flex justify-between"><span>Subtotal</span><b>₹{subtotal}</b></p>
            <p className="flex justify-between text-green-600"><span>Discount</span><b>- ₹{discount}</b></p>
            <hr />
            <p className="flex justify-between text-lg"><span>Payable</span><b>₹{payable}</b></p>
          </div>

          {/* COUPON */}
          <div className="mt-5">
            <p className="font-semibold mb-2">Coupon</p>
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Enter code"
                className="border rounded-lg px-3 py-2 w-full"
              />
              <button
                onClick={applyCoupon}
                disabled={applying}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                {applying ? "..." : "Apply"}
              </button>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="mt-6">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <MapPin size={16} /> Delivery Address
            </p>

            <div className="space-y-2">
              <input className="border rounded-lg px-3 py-2 w-full" placeholder="Full Name"
                value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 w-full" placeholder="Phone"
                value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 w-full" placeholder="Address line 1"
                value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 w-full" placeholder="Address line 2 (optional)"
                value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="City"
                  value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="State"
                  value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </div>
              <input className="border rounded-lg px-3 py-2 w-full" placeholder="Pincode"
                value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
            </div>
          </div>

          {/* SLOT */}
          <div className="mt-6">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <Clock size={16} /> Delivery Slot
            </p>

            <div className="space-y-2">
              <input
                type="date"
                className="border rounded-lg px-3 py-2 w-full"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
              />

              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
              >
                {SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {couponMsg && <p className="text-sm mt-4 text-gray-600">{couponMsg}</p>}

          <div className="flex gap-3 mt-6">
            <button
              onClick={clearCart}
              className="border border-red-500 text-red-600 px-4 py-2 rounded-lg w-full"
            >
              Clear
            </button>

            <button
              onClick={checkout}
              disabled={checkingOut}
              className="bg-green-600 text-white px-4 py-2 rounded-lg w-full hover:bg-green-700"
            >
              {checkingOut ? "Processing..." : "Checkout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
