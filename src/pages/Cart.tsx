// frontend/src/pages/Cart.tsx (FRONTEND)
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  MapPin,
  Clock,
  Tag,
  Navigation,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 19;

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

type LocationMode = "manual" | "current";

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  locationMode: LocationMode;
  locationText: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
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

const makeMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export default function Cart() {
  const navigate = useNavigate();

  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } =
    useCart();

  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponMsgType, setCouponMsgType] = useState<MsgType>(null);

  const [addressMsg, setAddressMsg] = useState<string | null>(null);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);

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
    locationMode: "manual",
    locationText: "",
    lat: null,
    lng: null,
    mapsUrl: "",
  });

  const [slotDate, setSlotDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const slots = useMemo(() => buildSlots(), []);
  const [slotTime, setSlotTime] = useState(slots[0]);

  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>(
    []
  );
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );

  const totalProtein = useMemo(
    () => cart.reduce((s, i) => s + i.protein * i.qty, 0),
    [cart]
  );

  const totalCalories = useMemo(
    () => cart.reduce((s, i) => s + i.calories * i.qty, 0),
    [cart]
  );

  const payable = Math.max(subtotal - discount, 0);

  const cardClass = "rounded-xl border bg-white p-4 shadow-sm";
  const panelClass = "rounded-xl border bg-gray-50 p-3";
  const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600";

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

  useEffect(() => {
    if (!coupon.trim()) return;

    const applied = coupon.trim().toUpperCase();
    const stillEligible = availableCoupons.some((c) => c.code === applied);

    if (!stillEligible && discount > 0) {
      setCoupon("");
      setDiscount(0);
      setCouponMsg("Coupon removed because it is not eligible anymore.");
      setCouponMsgType("error");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCoupons]);

  const applyCoupon = async (codeOverride?: string) => {
    const codeToApply = (codeOverride ?? coupon).trim().toUpperCase();

    if (!codeToApply) {
      setCoupon("");
      setDiscount(0);
      setCouponMsg(null);
      setCouponMsgType(null);
      return;
    }

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
      setCouponMsg(err?.response?.data?.message || "Invalid or expired coupon");
      setCouponMsgType("error");

      fetchAvailableCoupons();
    } finally {
      setApplying(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocationMsg(null);

    if (!navigator.geolocation) {
      setLocationMsg("Geolocation is not supported on this device/browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        const url = makeMapsUrl(lat, lng);

        setAddress((prev) => ({
          ...prev,
          locationMode: "current",
          lat,
          lng,
          mapsUrl: url,
          locationText: `${lat}, ${lng}`,
        }));
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow it or use manual location."
            : "Failed to get current location. Try again or use manual location.";

        setLocationMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const switchToManualLocation = () => {
    setLocationMsg(null);

    setAddress((prev) => ({
      ...prev,
      locationMode: "manual",
      lat: null,
      lng: null,
      mapsUrl: "",
    }));
  };

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
    setLocationMsg(null);

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

    if (address.locationMode === "current") {
      if (address.lat == null || address.lng == null || !address.mapsUrl) {
        setLocationMsg("Please click 'Use Current Location' again.");
        return false;
      }
    } else if (!address.locationText.trim()) {
      setLocationMsg(
        "Please paste your Google Maps link / Plus Code / location details."
      );
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

  const checkout = async () => {
    if (!validateCheckout()) return;

    const lat = Number(address.lat);
    const lng = Number(address.lng);

    if (address.locationMode === "current") {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setLocationMsg("Please click Use Current Location again.");
        return;
      }
    }

    setCheckingOut(true);
    setCouponMsg(null);
    setCouponMsgType(null);

    const ok = await loadRazorpay();

    if (!ok) {
      setCheckingOut(false);
      setCouponMsg("Razorpay failed to load. Try again.");
      setCouponMsgType("error");
      return;
    }

    try {
      const finalCouponCode =
        discount > 0 && coupon.trim() ? coupon.trim().toUpperCase() : null;

      const payload = {
        items: cart.map((i) => ({
          mealId: i._id,
          title: i.title,
          price: i.price,
          qty: i.qty,
          protein: i.protein,
          calories: i.calories,
        })),
        couponCode: finalCouponCode,
        address: {
          ...address,
          locationMode: address.locationMode,
          lat: address.locationMode === "current" ? lat : null,
          lng: address.locationMode === "current" ? lng : null,
          mapsUrl:
            address.locationMode === "current"
              ? address.mapsUrl || makeMapsUrl(lat, lng)
              : "",
          locationText:
            address.locationMode === "current"
              ? `${lat}, ${lng}`
              : address.locationText,
        },
        deliverySlot: {
          date: slotDate,
          time: slotTime,
        },
      };

      console.log("CREATE ORDER PAYLOAD:", payload);

      const createRes = await api.post("/checkout/create-order", payload);

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
        theme: {
          color: "#16a34a",
        },
      });

      rzp.open();
    } catch (err: any) {
      console.log("ORDER CREATE ERROR:", err?.response?.data);
      setCouponMsg(err?.response?.data?.message || "Failed to create order");
      setCouponMsgType("error");
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <p className="mt-16 text-center text-lg text-gray-500">
        Your cart is empty 🛒
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Your Cart</h1>

      <div className="space-y-4">
        <div className="space-y-3">
          {cart.map((item) => (
            <div
              key={item._id}
              className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Protein: {item.protein * item.qty}g • Calories:{" "}
                  {item.calories * item.qty}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  ₹{item.price} × {item.qty}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => decreaseQty(item._id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-gray-50"
                >
                  <Minus size={15} />
                </button>

                <span className="min-w-6 text-center text-sm font-semibold">
                  {item.qty}
                </span>

                <button
                  onClick={() => increaseQty(item._id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-gray-50"
                >
                  <Plus size={15} />
                </button>

                <button
                  onClick={() => removeFromCart(item._id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}

          <div className={cardClass}>
            <p className="flex items-center gap-2 text-base font-bold">
              <Tag size={17} /> Available Coupons
            </p>

            {loadingCoupons ? (
              <p className="mt-2 text-xs text-gray-500">Loading coupons...</p>
            ) : availableCoupons.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                No coupons available for your cart.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {availableCoupons.map((c) => {
                  const from = prettyDate(c.validFrom);
                  const to = prettyDate(c.validTo);

                  return (
                    <div
                      key={c.code}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{c.code}</p>

                        <p className="truncate text-xs text-gray-600">
                          {formatCouponLabel(c)} • Min ₹{c.minCartTotal}
                        </p>

                        {(from || to) && (
                          <p className="truncate text-[11px] text-gray-400">
                            Valid: {from || "-"} → {to || "-"}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => applyCoupon(c.code)}
                        disabled={applying}
                        className="h-9 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Apply
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-2 text-[11px] text-gray-400">
              Only eligible coupons are shown.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Order Summary</h2>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Protein</p>
              <p className="text-lg font-bold">{totalProtein} g</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Calories</p>
              <p className="text-lg font-bold">{totalCalories}</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-lg font-bold">₹{subtotal}</p>
            </div>

            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-xs text-green-700">Payable</p>
              <p className="text-lg font-bold text-green-700">₹{payable}</p>

              {discount > 0 && (
                <p className="text-[11px] text-green-700">Saved ₹{discount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.15fr_0.95fr]">
            <div className={panelClass}>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Tag size={15} /> Apply Coupon
              </p>

              <input
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  setDiscount(0);
                  setCouponMsg(null);
                  setCouponMsgType(null);
                }}
                placeholder="Coupon code"
                className={inputClass}
              />

              <button
                onClick={() => applyCoupon()}
                disabled={applying}
                className="mt-2 h-10 w-full rounded-lg bg-green-600 text-sm font-semibold text-white disabled:opacity-60"
              >
                {applying ? "Applying..." : "Apply Coupon"}
              </button>

              <div className="mt-3 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Discount</span>
                  <b className="text-green-600">-₹{discount}</b>
                </p>
              </div>

              {couponMsg && (
                <p
                  className={`mt-2 text-xs ${
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

            <div className={cardClass}>
              <div className="mb-3">
                <p className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <MapPin size={18} className="text-green-600" />
                  Delivery Address
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Add address and exact location for live tracking.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  placeholder="Full name"
                  className={inputClass}
                  value={address.fullName}
                  onChange={(e) =>
                    setAddress({ ...address, fullName: e.target.value })
                  }
                />

                <input
                  placeholder="Phone number"
                  className={inputClass}
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />

                <input
                  placeholder="House / Flat / Street"
                  className={`${inputClass} sm:col-span-2`}
                  value={address.line1}
                  onChange={(e) =>
                    setAddress({ ...address, line1: e.target.value })
                  }
                />

                <input
                  placeholder="Landmark / Area optional"
                  className={`${inputClass} sm:col-span-2`}
                  value={address.line2}
                  onChange={(e) =>
                    setAddress({ ...address, line2: e.target.value })
                  }
                />

                <input
                  placeholder="City"
                  className={inputClass}
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                />

                <input
                  placeholder="State"
                  className={inputClass}
                  value={address.state}
                  onChange={(e) =>
                    setAddress({ ...address, state: e.target.value })
                  }
                />

                <input
                  placeholder="Pincode"
                  className={`${inputClass} sm:col-span-2`}
                  value={address.pincode}
                  onChange={(e) =>
                    setAddress({ ...address, pincode: e.target.value })
                  }
                />
              </div>

              <div className="mt-3 rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Navigation size={16} className="text-green-600" />
                  Map Location
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className={`h-10 rounded-lg border px-3 text-xs font-semibold ${
                      address.locationMode === "current"
                        ? "border-green-600 bg-green-600 text-white"
                        : "bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Current Location
                  </button>

                  <button
                    type="button"
                    onClick={switchToManualLocation}
                    className={`h-10 rounded-lg border px-3 text-xs font-semibold ${
                      address.locationMode === "manual"
                        ? "border-green-600 bg-green-600 text-white"
                        : "bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Add Manually
                  </button>
                </div>

                {address.locationMode === "current" ? (
                  <div className="mt-2 rounded-lg bg-white p-2 text-xs">
                    {address.mapsUrl ? (
                      <a
                        href={address.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-green-700 underline"
                      >
                        Open current location in Google Maps
                      </a>
                    ) : (
                      <p className="text-gray-500">
                        Click current location to capture GPS.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      value={address.locationText}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          locationText: e.target.value,
                          locationMode: "manual",
                        })
                      }
                      placeholder="Paste Google Maps link / Plus Code"
                      className={inputClass}
                    />

                    <p className="mt-1 text-[11px] text-gray-500">
                      Example: Google Maps link or Plus Code.
                    </p>
                  </div>
                )}

                {locationMsg && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                    {locationMsg}
                  </p>
                )}
              </div>

              {addressMsg && (
                <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                  {addressMsg}
                </p>
              )}
            </div>

            <div className={panelClass}>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Clock size={15} /> Delivery Time
              </p>

              <input
                type="date"
                className={inputClass}
                value={slotDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSlotDate(newDate);
                  setSlotMsg(null);

                  if (!isSlotAllowed(newDate, slotTime)) {
                    const firstAllowed = slots.find((s) =>
                      isSlotAllowed(newDate, s)
                    );

                    if (firstAllowed) setSlotTime(firstAllowed);
                  }
                }}
                min={new Date().toISOString().slice(0, 10)}
              />

              <select
                className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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

              <p className="mt-2 text-[11px] text-gray-500">
                Orders must be placed at least <b>3 hours</b> before your
                desired time slot.
              </p>

              {slotMsg && (
                <p className="mt-2 text-xs text-red-600">{slotMsg}</p>
              )}

              <hr className="my-4" />

              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <b>₹{subtotal}</b>
                </p>

                <p className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <b>-₹{discount}</b>
                </p>

                <p className="flex justify-between text-base font-bold">
                  <span>Total Payable</span>
                  <span>₹{payable}</span>
                </p>
              </div>

              <button
                onClick={checkout}
                disabled={checkingOut}
                className="mt-4 h-11 w-full rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {checkingOut ? "Processing..." : "Checkout & Pay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}