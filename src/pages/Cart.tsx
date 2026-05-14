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
  Search,
  BookmarkPlus,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  flatNo: string;
  floor: string;
  buildingName: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  addressLabel: "Home" | "Work" | "Other";
  locationMode: LocationMode;
  locationText: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
};

type SavedAddress = Address & {
  _id?: string;
  isDefault?: boolean;
};

type AddressSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    state?: string;
    postcode?: string;
    road?: string;
  };
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

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], 17);
  }, [lat, lng, map]);

  return null;
}

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
    flatNo: "",
    floor: "",
    buildingName: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    addressLabel: "Home",
    locationMode: "current",
    locationText: "",
    formattedAddress: "",
    lat: null,
    lng: null,
    mapsUrl: "",
  });

  const [addressSearch, setAddressSearch] = useState("");
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>(
    []
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);

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

  const fetchSavedAddresses = async () => {
    try {
      setLoadingSavedAddresses(true);
      const res = await api.get("/user/addresses");
      setSavedAddresses(res.data || []);
    } catch {
      setSavedAddresses([]);
    } finally {
      setLoadingSavedAddresses(false);
    }
  };

  useEffect(() => {
    fetchSavedAddresses();
  }, []);

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
      async (pos) => {
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
          formattedAddress: `${lat}, ${lng}`,
        }));

        setAddressSearch(`${lat}, ${lng}`);
      },
      () => {
        setLocationMsg(
          "Location permission denied. Please allow location access."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const searchAddress = async () => {
    const query = addressSearch.trim();

    if (!query) {
      setAddressResults([]);
      return;
    }

    try {
      setSearchingAddress(true);
      setLocationMsg(null);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
          query
        )}`
      );

      const data = await res.json();
      setAddressResults(data || []);

      if (!data || data.length === 0) {
        setLocationMsg("No address found. Try a nearby landmark or area name.");
      }
    } catch {
      setLocationMsg("Unable to search address. Please try again.");
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectSearchedAddress = (result: AddressSearchResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const url = makeMapsUrl(lat, lng);

    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      "";

    const area =
      result.address?.suburb ||
      result.address?.neighbourhood ||
      result.address?.road ||
      "";

    setAddress((prev) => ({
      ...prev,
      locationMode: "manual",
      lat,
      lng,
      mapsUrl: url,
      locationText: result.display_name,
      formattedAddress: result.display_name,
      city: prev.city || city,
      state: prev.state || result.address?.state || "",
      pincode: prev.pincode || result.address?.postcode || "",
      area: prev.area || area,
    }));

    setAddressSearch(result.display_name);
    setAddressResults([]);
    setLocationMsg(null);
  };

  const pinLocationOnMap = (lat: number, lng: number) => {
    const cleanLat = Number(lat);
    const cleanLng = Number(lng);
    const url = makeMapsUrl(cleanLat, cleanLng);

    setAddress((prev) => ({
      ...prev,
      locationMode: "manual",
      lat: cleanLat,
      lng: cleanLng,
      mapsUrl: url,
      locationText: `${cleanLat}, ${cleanLng}`,
      formattedAddress: prev.formattedAddress || `${cleanLat}, ${cleanLng}`,
    }));

    setLocationMsg(null);
  };

  const selectSavedAddress = (saved: SavedAddress) => {
    setAddress({
      fullName: saved.fullName || "",
      phone: saved.phone || "",
      flatNo: saved.flatNo || "",
      floor: saved.floor || "",
      buildingName: saved.buildingName || "",
      area: saved.area || "",
      landmark: saved.landmark || "",
      city: saved.city || "",
      state: saved.state || "",
      pincode: saved.pincode || "",
      addressLabel: saved.addressLabel || "Home",
      locationMode: saved.locationMode || "manual",
      locationText: saved.locationText || "",
      formattedAddress: saved.formattedAddress || "",
      lat: saved.lat ?? null,
      lng: saved.lng ?? null,
      mapsUrl: saved.mapsUrl || "",
    });

    setAddressSearch(saved.formattedAddress || saved.locationText || "");
    setLocationMsg(null);
    setAddressMsg(null);
  };

  const saveCurrentAddress = async () => {
    try {
      const lat = Number(address.lat);
      const lng = Number(address.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      await api.post("/user/addresses", {
        ...address,
        lat,
        lng,
        mapsUrl: address.mapsUrl || makeMapsUrl(lat, lng),
        locationText: address.locationText || `${lat}, ${lng}`,
        formattedAddress: address.formattedAddress || `${lat}, ${lng}`,
      });

      fetchSavedAddresses();
    } catch (error) {
      console.log("SAVE ADDRESS ERROR:", error);
    }
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
      !address.flatNo ||
      !address.buildingName ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      setAddressMsg("Please fill complete delivery address.");
      return false;
    }

    if (address.lat == null || address.lng == null || !address.mapsUrl) {
      setLocationMsg("Please select exact delivery location.");
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

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocationMsg("Please select exact delivery location again.");
      return;
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
          locationMode: address.locationMode || "manual",
          lat,
          lng,
          mapsUrl: address.mapsUrl || makeMapsUrl(lat, lng),
          locationText: address.locationText || `${lat}, ${lng}`,
          formattedAddress: address.formattedAddress || `${lat}, ${lng}`,
        },
        deliverySlot: {
          date: slotDate,
          time: slotTime,
        },
      };

      if (saveAddressForFuture) {
        await saveCurrentAddress();
      }

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
      <p className="text-center mt-16 text-gray-500 text-lg">
        Your cart is empty 🛒
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Your Cart</h1>

      <div className="space-y-6">
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item._id}
              className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Protein: {item.protein * item.qty}g • Calories:{" "}
                  {item.calories * item.qty}
                </p>

                <p className="mt-1 font-semibold">
                  ₹{item.price} × {item.qty}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => decreaseQty(item._id)}
                  className="rounded-lg border p-2 hover:bg-gray-50"
                >
                  <Minus size={16} />
                </button>

                <span className="min-w-6 text-center font-semibold">
                  {item.qty}
                </span>

                <button
                  onClick={() => increaseQty(item._id)}
                  className="rounded-lg border p-2 hover:bg-gray-50"
                >
                  <Plus size={16} />
                </button>

                <button
                  onClick={() => removeFromCart(item._id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Tag size={18} /> Available Coupons
            </p>

            {loadingCoupons ? (
              <p className="mt-2 text-sm text-gray-500">Loading coupons...</p>
            ) : availableCoupons.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No coupons available for your cart.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableCoupons.map((c) => {
                  const from = prettyDate(c.validFrom);
                  const to = prettyDate(c.validTo);

                  return (
                    <div
                      key={c.code}
                      className="flex items-center justify-between gap-4 rounded-xl border p-4"
                    >
                      <div>
                        <p className="font-bold">{c.code}</p>

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
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Apply
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Only eligible coupons are shown.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Protein</p>
              <p className="text-xl font-bold">{totalProtein} g</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Calories</p>
              <p className="text-xl font-bold">{totalCalories}</p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="text-xl font-bold">₹{subtotal}</p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm text-green-700">Payable</p>
              <p className="text-xl font-bold text-green-700">₹{payable}</p>

              {discount > 0 && (
                <p className="mt-1 text-xs text-green-700">
                  You saved ₹{discount}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="mb-3 flex items-center gap-2 font-semibold">
                <Tag size={16} /> Apply Coupon
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
                className="w-full rounded-lg border px-3 py-3"
              />

              <button
                onClick={() => applyCoupon()}
                disabled={applying}
                className="mt-3 w-full rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-60"
              >
                {applying ? "Applying..." : "Apply Coupon"}
              </button>

              <div className="mt-4 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Discount</span>
                  <b className="text-green-600">-₹{discount}</b>
                </p>
              </div>

              {couponMsg && (
                <p
                  className={`mt-3 text-sm ${
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

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <MapPin size={20} className="text-green-600" />
                  Delivery Address
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Search, pin exact location, and add complete delivery details.
                </p>
              </div>

              {savedAddresses.length > 0 && (
                <div className="mb-5 rounded-2xl border bg-gray-50 p-4">
                  <p className="mb-3 font-bold text-gray-900">
                    Saved Addresses
                  </p>

                  {loadingSavedAddresses ? (
                    <p className="text-sm text-gray-500">
                      Loading saved addresses...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {savedAddresses.slice(0, 3).map((saved) => (
                        <button
                          key={saved._id}
                          type="button"
                          onClick={() => selectSavedAddress(saved)}
                          className="w-full rounded-xl border bg-white p-3 text-left hover:border-green-500"
                        >
                          <p className="font-bold text-gray-900">
                            {saved.addressLabel} - {saved.fullName}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            {saved.flatNo}, {saved.buildingName}, {saved.area}
                          </p>

                          <p className="text-sm text-gray-500">
                            {saved.city}, {saved.state} - {saved.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                  <Search size={18} className="text-green-600" />
                  Search Delivery Location
                </p>

                <div className="flex gap-2">
                  <input
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchAddress();
                      }
                    }}
                    placeholder="Search apartment, area, landmark..."
                    className="w-full rounded-xl border px-4 py-3"
                  />

                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={searchingAddress}
                    className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {searchingAddress ? "..." : "Search"}
                  </button>
                </div>

                {addressResults.length > 0 && (
                  <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border bg-white">
                    {addressResults.map((result) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => selectSearchedAddress(result)}
                        className="block w-full border-b p-3 text-left text-sm hover:bg-green-50"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                >
                  <Navigation size={16} className="mr-2 inline" />
                  Use Current Location
                </button>

                {address.lat != null && address.lng != null && (
                  <div className="mt-4 overflow-hidden rounded-2xl border">
                    <div className="h-64 w-full">
                      <MapContainer
                        center={[address.lat, address.lng]}
                        zoom={17}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <RecenterMap lat={address.lat} lng={address.lng} />

                        <MapClickHandler onPick={pinLocationOnMap} />

                        <Marker
                          position={[address.lat, address.lng]}
                          icon={markerIcon}
                        />
                      </MapContainer>
                    </div>

                    <p className="bg-white px-3 py-2 text-xs text-gray-500">
                      Tap anywhere on the map to adjust the exact delivery pin.
                    </p>
                  </div>
                )}

                {address.mapsUrl && (
                  <a
                    href={address.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-green-700 underline"
                  >
                    Open selected location in Google Maps
                  </a>
                )}

                {address.formattedAddress && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-600">
                    <b>Selected:</b> {address.formattedAddress}
                  </p>
                )}

                {locationMsg && (
                  <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                    {locationMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  placeholder="Full Name"
                  className="rounded-xl border px-4 py-3"
                  value={address.fullName}
                  onChange={(e) =>
                    setAddress({ ...address, fullName: e.target.value })
                  }
                />

                <input
                  placeholder="Phone Number"
                  className="rounded-xl border px-4 py-3"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />

                <input
                  placeholder="Flat / House No"
                  className="rounded-xl border px-4 py-3"
                  value={address.flatNo}
                  onChange={(e) =>
                    setAddress({ ...address, flatNo: e.target.value })
                  }
                />

                <input
                  placeholder="Floor optional"
                  className="rounded-xl border px-4 py-3"
                  value={address.floor}
                  onChange={(e) =>
                    setAddress({ ...address, floor: e.target.value })
                  }
                />

                <input
                  placeholder="Building / Apartment Name"
                  className="rounded-xl border px-4 py-3 sm:col-span-2"
                  value={address.buildingName}
                  onChange={(e) =>
                    setAddress({ ...address, buildingName: e.target.value })
                  }
                />

                <input
                  placeholder="Area / Locality"
                  className="rounded-xl border px-4 py-3"
                  value={address.area}
                  onChange={(e) =>
                    setAddress({ ...address, area: e.target.value })
                  }
                />

                <input
                  placeholder="Landmark optional"
                  className="rounded-xl border px-4 py-3"
                  value={address.landmark}
                  onChange={(e) =>
                    setAddress({ ...address, landmark: e.target.value })
                  }
                />

                <input
                  placeholder="City"
                  className="rounded-xl border px-4 py-3"
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                />

                <input
                  placeholder="State"
                  className="rounded-xl border px-4 py-3"
                  value={address.state}
                  onChange={(e) =>
                    setAddress({ ...address, state: e.target.value })
                  }
                />

                <input
                  placeholder="Pincode"
                  className="rounded-xl border px-4 py-3"
                  value={address.pincode}
                  onChange={(e) =>
                    setAddress({ ...address, pincode: e.target.value })
                  }
                />

                <select
                  className="rounded-xl border px-4 py-3"
                  value={address.addressLabel}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      addressLabel: e.target.value as
                        | "Home"
                        | "Work"
                        | "Other",
                    })
                  }
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={saveAddressForFuture}
                  onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                />
                <BookmarkPlus size={16} className="text-green-600" />
                Save this address for future orders
              </label>

              {addressMsg && (
                <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                  {addressMsg}
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="mb-3 flex items-center gap-2 font-semibold">
                <Clock size={16} /> Delivery Time
              </p>

              <input
                type="date"
                className="w-full rounded-lg border px-3 py-3"
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
                className="mt-3 w-full rounded-lg border px-3 py-3"
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

              <p className="mt-3 text-xs text-gray-500">
                Orders must be placed at least <b>3 hours</b> before your
                desired time slot.
              </p>

              {slotMsg && (
                <p className="mt-2 text-sm text-red-600">{slotMsg}</p>
              )}

              <hr className="my-5" />

              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <b>₹{subtotal}</b>
                </p>

                <p className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <b>-₹{discount}</b>
                </p>

                <p className="flex justify-between text-lg font-bold">
                  <span>Total Payable</span>
                  <span>₹{payable}</span>
                </p>
              </div>

              <button
                onClick={checkout}
                disabled={checkingOut}
                className="mt-6 w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
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