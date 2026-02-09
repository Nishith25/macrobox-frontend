// frontend/src/pages/Cart.tsx (FRONTEND)
import { useMemo, useState, useEffect } from "react";
import { Plus, Minus, Trash2, MapPin, Clock, Tag } from "lucide-react";
import { useCart } from "../context/CartContext";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * ✅ Professional single time-slots:
 * 7:00 AM → 7:00 PM (hourly)
 * ✅ User can only select a slot that is at least 3 hours from now
 * ✅ Disabled slots show: "— Time slot not available"
 *
 * ✅ Coupon expired → red text under Apply Coupon
 * ✅ Invalid time slot → red text under Delivery Time
 * ✅ Incomplete address → red text under Address
 * ✅ Cleaner UX (separate messages, no mixing)
 *
 * ✅ NEW: Show all ACTIVE coupons below cart (only coupons user can still use)
 *    - hidden if user already reached per-user limit
 *    - hidden if coupon expired/not active yet/total limit reached
 */
const SLOT_START_HOUR = 7; // 7 AM
const SLOT_END_HOUR = 19; // 7 PM

const pad2 = (n: number) => String(n).padStart(2, "0");

const format12h = (hour24: number) => {
  const period = hour24 >= 12 ? "PM" : "AM";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}:00 ${period}`;
};

const buildSlots = () => {
  const slots: string[] = [];
  for (let h = SLOT_START_HOUR; h <= SLOT_END_HOUR; h++) {
    slots.push(`${pad2(h)}:00`);
  }
  return slots;
};

const getHourFromSlot = (slotHHmm: string) => Number(slotHHmm.split(":")[0]);

const isSlotAllowed = (selectedDateISO: string, slotHHmm: string) => {
  if (!selectedDateISO || !slotHHmm) return false;

  const [yy, mm, dd] = selectedDateISO.split("-").map(Number);
  const hour = getHourFromSlot(slotHHmm);
  if (!yy || !mm || !dd || Number.isNaN(hour)) return false;

  const slotDateTime = new Date(yy, mm - 1, dd, hour, 0, 0, 0);
  const minAllowed = new Date();
  minAllowed.setHours(minAllowed.getHours() + 3);

  return slotDateTime.getTime() >= minAllowed.getTime();
};

const optionLabel = (label: string, allowed: boolean) =>
  allowed ? label : `${label} — Time slot not available`;

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

type MsgType = "success" | "error" | null;

type AvailableCoupon = {
  code: string;
  type: "flat" | "percent";
  value: number;
  minCartTotal: number;
  maxDiscount: number;
  validFrom?: string | null;
  validTo?: string | null;
};

const formatCouponLabel = (c: AvailableCoupon) => {
  if (c.type === "flat") return `₹${c.value} OFF`;
  const cap = c.maxDiscount > 0 ? ` (Max ₹${c.maxDiscount})` : "";
  return `${c.value}% OFF${cap}`;
};

const prettyDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
};

export default function Cart() {
  const navigate = useNavigate();
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();

  /* ================= STATE ================= */
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponMsgType, setCouponMsgType] = useState<MsgType>(null);

  const [addressMsg, setAddressMsg] = useState<string | null>(null);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [address, setAddress] = useState<Address>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const slots = useMemo(() => buildSlots(), []);
  const [slotTime, setSlotTime] = useState(slots[0]);

  // ✅ Available coupons list (server filters eligibility)
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  /* ================= DERIVED ================= */
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const totalProtein = useMemo(() => cart.reduce((s, i) => s + i.protein * i.qty, 0), [cart]);
  const totalCalories = useMemo(() => cart.reduce((s, i) => s + i.calories * i.qty, 0), [cart]);
  const payable = Math.max(subtotal - discount, 0);

  /* ================= FETCH AVAILABLE COUPONS ================= */
  const fetchAvailableCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await api.get(`/coupons/available?cartTotal=${subtotal}`);
      setAvailableCoupons(res.data || []);
    } catch {
      setAvailableCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (cart.length > 0) fetchAvailableCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, cart.length]);

  // ✅ If already applied coupon becomes invalid after cart change → remove it
  useEffect(() => {
    if (!coupon.trim()) return;

    const applied = coupon.trim().toUpperCase();
    const stillEligible = availableCoupons.some((c) => c.code === applied);

    if (!stillEligible) {
      setCoupon("");
      setDiscount(0);
      setCouponMsg("Coupon removed (not eligible anymore).");
      setCouponMsgType("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCoupons]);

  if (cart.length === 0) {
    return (
      <p className="text-center mt-16 text-gray-500 text-lg">
        Your cart is empty 🛒
      </p>
    );
  }

  /* ================= COUPON ================= */
  const applyCoupon = async (codeOverride?: string) => {
    const codeToApply = (codeOverride ?? coupon).trim().toUpperCase();
    if (!codeToApply) return;

    setApplying(true);
    setCouponMsg(null);
    setCouponMsgType(null);

    try {
      const res = await api.post("/coupons/apply", {
        code: codeToApply,
        cartTotal: subtotal,
      });

      setCoupon(codeToApply);
      setDiscount(res.data.discount || 0);
      setCouponMsg(`Coupon applied! You saved ₹${res.data.discount}`);
      setCouponMsgType("success");

      fetchAvailableCoupons();
    } catch (err: any) {
      setDiscount(0);
      setCouponMsg(err?.response?.data?.message || "Coupon expired");
      setCouponMsgType("error");
      fetchAvailableCoupons();
    } finally {
      setApplying(false);
    }
  };

  /* ================= RAZORPAY ================= */
  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (document.getElementById("razorpay-sdk")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const validateCheckout = () => {
    setAddressMsg(null);
    setSlotMsg(null);

    if (
      !address.fullName ||
      !address.phone ||
      !address.line1 ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      setAddressMsg("Please fill complete delivery address.");
      return false;
    }

    if (!slotDate || !slotTime) {
      setSlotMsg("Please select delivery time.");
      return false;
    }

    if (!isSlotAllowed(slotDate, slotTime)) {
      setSlotMsg("Time slot is not available.");
      return false;
    }

    return true;
  };

  /* ================= CHECKOUT ================= */
  const checkout = async () => {
    if (!validateCheckout()) return;

    setCheckingOut(true);

    const ok = await loadRazorpay();
    if (!ok) {
      setCheckingOut(false);
      setCouponMsg("Razorpay failed to load. Try again.");
      setCouponMsgType("error");
      return;
    }

    try {
      const createRes = await api.post("/checkout/create-order", {
        items: cart.map((i) => ({
          mealId: i._id,
          title: i.title,
          price: i.price,
          qty: i.qty,
          protein: i.protein,
          calories: i.calories,
        })),
        couponCode: coupon ? coupon.trim() : null,
        address,
        deliverySlot: { date: slotDate, time: slotTime },
      });

      const { razorpayOrderId, amount, keyId, orderId } = createRes.data;

      const rzp = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "MacroBox",
        description: "Meal Order",
        order_id: razorpayOrderId,
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        handler: async (response: any) => {
          await api.post("/checkout/verify", {
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          clearCart();
          setDiscount(0);
          setCoupon("");
          setCouponMsg("Payment successful ✅");
          setCouponMsgType("success");

          setTimeout(() => navigate("/orders"), 800);
        },
        modal: {
          ondismiss: () => {
            setCouponMsg("Payment cancelled.");
            setCouponMsgType("error");
          },
        },
        theme: { color: "#16a34a" },
      });

      rzp.open();
    } catch (err: any) {
      setCouponMsg(err?.response?.data?.message || "Failed to create order");
      setCouponMsgType("error");
    } finally {
      setCheckingOut(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ITEMS */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item._id}
              className="border rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-gray-500">
                  Protein: {item.protein * item.qty}g • Calories:{" "}
                  {item.calories * item.qty}
                </p>
                <p className="font-medium">
                  ₹{item.price} × {item.qty}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => decreaseQty(item._id)} className="p-2 border rounded">
                  <Minus size={16} />
                </button>
                <span className="font-semibold">{item.qty}</span>
                <button onClick={() => increaseQty(item._id)} className="p-2 border rounded">
                  <Plus size={16} />
                </button>
                <button onClick={() => removeFromCart(item._id)} className="p-2 text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* ✅ AVAILABLE COUPONS */}
          <div className="border rounded-xl p-4 bg-white">
            <p className="font-semibold flex items-center gap-2">
              <Tag size={16} /> Available Coupons
            </p>

            {loadingCoupons ? (
              <p className="text-sm text-gray-500 mt-2">Loading coupons...</p>
            ) : availableCoupons.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No coupons available for your cart.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {availableCoupons.map((c) => {
                  const from = prettyDate(c.validFrom);
                  const to = prettyDate(c.validTo);

                  return (
                    <div
                      key={c.code}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold">{c.code}</p>
                        <p className="text-sm text-gray-600">
                          {formatCouponLabel(c)} • Min ₹{c.minCartTotal}
                        </p>
                        {(from || to) && (
                          <p className="text-xs text-gray-400">
                            Valid: {from || "-"} → {to || "-"}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => applyCoupon(c.code)}
                        disabled={applying}
                        className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-60"
                      >
                        Apply
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Only eligible coupons are shown (active + valid + within your usage limits).
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="border rounded-xl p-5 bg-white h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>

          <p>
            Total Protein: <b>{totalProtein} g</b>
          </p>
          <p>
            Total Calories: <b>{totalCalories}</b>
          </p>

          <hr className="my-3" />

          <p className="flex justify-between">
            <span>Subtotal</span>
            <b>₹{subtotal}</b>
          </p>
          <p className="flex justify-between text-green-600">
            <span>Discount</span>
            <b>-₹{discount}</b>
          </p>
          <p className="flex justify-between text-lg font-bold mt-2">
            <span>Payable</span>
            <span>₹{payable}</span>
          </p>

          {/* COUPON */}
          <div className="mt-4">
            <input
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value.toUpperCase());
                setDiscount(0);
                setCouponMsg(null);
                setCouponMsgType(null);
              }}
              placeholder="Coupon code"
              className="border rounded px-3 py-2 w-full"
            />
            <button
              onClick={() => applyCoupon()}
              disabled={applying}
              className="mt-2 bg-green-600 text-white w-full py-2 rounded disabled:opacity-60"
            >
              {applying ? "Applying..." : "Apply Coupon"}
            </button>

            {couponMsg && (
              <p
                className={`text-sm mt-2 ${
                  couponMsgType === "error"
                    ? "text-red-600"
                    : couponMsgType === "success"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {couponMsg}
              </p>
            )}
          </div>

          {/* ADDRESS */}
          <div className="mt-6 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <MapPin size={16} /> Delivery Address
            </p>

            {Object.keys(address).map((k) => (
              <input
                key={k}
                placeholder={k}
                className="border rounded px-3 py-2 w-full"
                value={(address as any)[k]}
                onChange={(e) => setAddress({ ...address, [k]: e.target.value })}
              />
            ))}

            {addressMsg && <p className="text-sm mt-2 text-red-600">{addressMsg}</p>}
          </div>

          {/* SLOT */}
          <div className="mt-4">
            <p className="font-semibold flex items-center gap-2">
              <Clock size={16} /> Delivery Time
            </p>

            <input
              type="date"
              className="border rounded px-3 py-2 w-full mt-2"
              value={slotDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setSlotDate(newDate);
                setSlotMsg(null);

                if (!isSlotAllowed(newDate, slotTime)) {
                  const firstAllowed = slots.find((s) => isSlotAllowed(newDate, s));
                  if (firstAllowed) setSlotTime(firstAllowed);
                }
              }}
              min={new Date().toISOString().slice(0, 10)}
            />

            <select
              className="border rounded px-3 py-2 w-full mt-2"
              value={slotTime}
              onChange={(e) => {
                setSlotTime(e.target.value);
                setSlotMsg(null);
              }}
            >
              {slots.map((s) => {
                const allowed = isSlotAllowed(slotDate, s);
                const label = format12h(getHourFromSlot(s));
                return (
                  <option key={s} value={s} disabled={!allowed}>
                    {optionLabel(label, allowed)}
                  </option>
                );
              })}
            </select>

            <p className="text-xs text-gray-500 mt-2">
              Orders must be placed at least <b>3 hours</b> before your desired time slot.
            </p>

            {slotMsg && <p className="text-sm mt-2 text-red-600">{slotMsg}</p>}
          </div>

          <button
            onClick={checkout}
            disabled={checkingOut}
            className="mt-6 bg-green-600 text-white w-full py-3 rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            {checkingOut ? "Processing..." : "Checkout & Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}
