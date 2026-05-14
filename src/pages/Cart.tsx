// frontend/src/pages/Cart.tsx (FRONTEND)
import { useMemo, useState, useEffect, useRef } from "react";
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

const getAddressComponent = (
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string
) => {
  if (!components) return "";

  const found = components.find((component) => component.types.includes(type));

  return found?.long_name || "";
};

const getGoogleCity = (
  components: google.maps.GeocoderAddressComponent[] | undefined
) => {
  return (
    getAddressComponent(components, "locality") ||
    getAddressComponent(components, "administrative_area_level_3") ||
    getAddressComponent(components, "administrative_area_level_2")
  );
};

const getGoogleArea = (
  components: google.maps.GeocoderAddressComponent[] | undefined
) => {
  return (
    getAddressComponent(components, "sublocality_level_1") ||
    getAddressComponent(components, "sublocality") ||
    getAddressComponent(components, "neighborhood") ||
    getAddressComponent(components, "route")
  );
};

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

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-maps-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps script failed to load"))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Maps script failed to load"));

    document.head.appendChild(script);
  });
};

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
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const googleAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  const [googleSearchReady, setGoogleSearchReady] = useState(false);
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

  const cardClass = "rounded-xl border bg-white p-4 shadow-sm";
  const softCardClass = "rounded-xl border bg-gray-50 p-3";
  const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

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

  const applyLocationToAddress = ({
    lat,
    lng,
    formattedAddress,
    components,
    mode,
  }: {
    lat: number;
    lng: number;
    formattedAddress: string;
    components?: google.maps.GeocoderAddressComponent[];
    mode: LocationMode;
  }) => {
    const city = getGoogleCity(components);
    const area = getGoogleArea(components);
    const state = getAddressComponent(components, "administrative_area_level_1");
    const pincode = getAddressComponent(components, "postal_code");
    const url = makeMapsUrl(lat, lng);

    setAddress((prev) => ({
      ...prev,
      locationMode: mode,
      lat,
      lng,
      mapsUrl: url,
      locationText: formattedAddress || `${lat}, ${lng}`,
      formattedAddress: formattedAddress || `${lat}, ${lng}`,
      area: area || prev.area,
      city: city || prev.city,
      state: state || prev.state,
      pincode: pincode || prev.pincode,
    }));

    setAddressSearch(formattedAddress || `${lat}, ${lng}`);
    setLocationMsg(null);
  };

  const reverseGeocodeLatLng = async (lat: number, lng: number) => {
    if (!window.google?.maps) {
      return null;
    }

    return new Promise<{
      formattedAddress: string;
      components?: google.maps.GeocoderAddressComponent[];
    } | null>((resolve) => {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          location: { lat, lng },
        },
        (
          results: google.maps.GeocoderResult[] | null,
          status: string
        ) => {
          if (status !== "OK" || !results || results.length === 0) {
            resolve(null);
            return;
          }

          resolve({
            formattedAddress: results[0].formatted_address || `${lat}, ${lng}`,
            components: results[0].address_components,
          });
        }
      );
    });
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLocationMsg("Google Maps API key is missing.");
      return;
    }

    if (!addressInputRef.current) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!addressInputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: "in" },
            fields: [
              "place_id",
              "name",
              "formatted_address",
              "geometry",
              "address_components",
            ],
          }
        );

        googleAutocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();

          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();

          if (lat == null || lng == null) {
            setLocationMsg("Please select a valid address from suggestions.");
            return;
          }

          applyLocationToAddress({
            lat,
            lng,
            formattedAddress: place.formatted_address || place.name || "",
            components: place.address_components,
            mode: "manual",
          });
        });

        setGoogleSearchReady(true);
      })
      .catch((error: unknown) => {
        console.error("GOOGLE MAPS LOAD ERROR:", error);
        setLocationMsg("Google address search failed to load.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        const reverse = await reverseGeocodeLatLng(lat, lng);

        applyLocationToAddress({
          lat,
          lng,
          formattedAddress: reverse?.formattedAddress || `${lat}, ${lng}`,
          components: reverse?.components,
          mode: "current",
        });
      },
      () => {
        setLocationMsg(
          "Location permission denied. Please allow location access."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const geocodeTypedAddress = async () => {
    const query = addressSearch.trim();

    if (!query) {
      setLocationMsg("Please enter an address or landmark.");
      return;
    }

    if (!window.google?.maps) {
      setLocationMsg("Google Maps is still loading. Try again.");
      return;
    }

    try {
      setSearchingAddress(true);
      setLocationMsg(null);

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          address: query,
          componentRestrictions: { country: "IN" },
        },
        (
          results: google.maps.GeocoderResult[] | null,
          status: string
        ) => {
          setSearchingAddress(false);

          if (status !== "OK" || !results || results.length === 0) {
            setLocationMsg("No address found. Try a nearby landmark.");
            return;
          }

          const result = results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();

          applyLocationToAddress({
            lat,
            lng,
            formattedAddress: result.formatted_address || query,
            components: result.address_components,
            mode: "manual",
          });
        }
      );
    } catch (error) {
      setSearchingAddress(false);
      console.error("GEOCODE ERROR:", error);
      setLocationMsg("Unable to search address. Please try again.");
    }
  };

  const pinLocationOnMap = async (lat: number, lng: number) => {
    const cleanLat = Number(lat);
    const cleanLng = Number(lng);

    const reverse = await reverseGeocodeLatLng(cleanLat, cleanLng);

    applyLocationToAddress({
      lat: cleanLat,
      lng: cleanLng,
      formattedAddress: reverse?.formattedAddress || `${cleanLat}, ${cleanLng}`,
      components: reverse?.components,
      mode: "manual",
    });
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
            <div className={softCardClass}>
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
                  Search, pin exact location, and save address.
                </p>
              </div>

              {savedAddresses.length > 0 && (
                <div className="mb-3 rounded-xl border bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-bold text-gray-900">
                    Saved Addresses
                  </p>

                  {loadingSavedAddresses ? (
                    <p className="text-xs text-gray-500">
                      Loading saved addresses...
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                      {savedAddresses.slice(0, 3).map((saved) => (
                        <button
                          key={saved._id}
                          type="button"
                          onClick={() => selectSavedAddress(saved)}
                          className="w-full rounded-lg border bg-white p-2 text-left transition hover:border-green-500 hover:bg-green-50"
                        >
                          <p className="truncate text-sm font-bold text-gray-900">
                            {saved.addressLabel} - {saved.fullName}
                          </p>

                          <p className="truncate text-xs text-gray-600">
                            {saved.flatNo}, {saved.buildingName}, {saved.area}
                          </p>

                          <p className="truncate text-xs text-gray-500">
                            {saved.city}, {saved.state} - {saved.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-3 rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Search size={16} className="text-green-600" />
                  Search Location
                </p>

                <div className="flex gap-2">
                  <input
                    ref={addressInputRef}
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        geocodeTypedAddress();
                      }
                    }}
                    placeholder={
                      googleSearchReady
                        ? "Apartment, area, landmark..."
                        : "Loading Google search..."
                    }
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={geocodeTypedAddress}
                    disabled={searchingAddress}
                    className="h-10 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {searchingAddress ? "..." : "Search"}
                  </button>
                </div>

                <p className="mt-1 text-[11px] text-gray-500">
                  Select from Google suggestions.
                </p>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="mt-2 h-10 w-full rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Navigation size={15} className="mr-1 inline" />
                  Use Current Location
                </button>

                {address.lat != null && address.lng != null && (
                  <div className="mt-3 overflow-hidden rounded-xl border">
                    <div className="h-40 w-full">
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

                    <p className="bg-white px-3 py-1 text-[11px] text-gray-500">
                      Tap map to adjust exact pin.
                    </p>
                  </div>
                )}

                {address.formattedAddress && (
                  <p className="mt-2 line-clamp-2 rounded-lg bg-white p-2 text-xs text-gray-600">
                    <b>Selected:</b> {address.formattedAddress}
                  </p>
                )}

                {address.mapsUrl && (
                  <a
                    href={address.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-green-700 underline"
                  >
                    Open in Google Maps
                  </a>
                )}

                {locationMsg && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                    {locationMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  placeholder="Full Name"
                  className={inputClass}
                  value={address.fullName}
                  onChange={(e) =>
                    setAddress({ ...address, fullName: e.target.value })
                  }
                />

                <input
                  placeholder="Phone Number"
                  className={inputClass}
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />

                <input
                  placeholder="Flat / House No"
                  className={inputClass}
                  value={address.flatNo}
                  onChange={(e) =>
                    setAddress({ ...address, flatNo: e.target.value })
                  }
                />

                <input
                  placeholder="Floor optional"
                  className={inputClass}
                  value={address.floor}
                  onChange={(e) =>
                    setAddress({ ...address, floor: e.target.value })
                  }
                />

                <input
                  placeholder="Building / Apartment"
                  className={`${inputClass} sm:col-span-2`}
                  value={address.buildingName}
                  onChange={(e) =>
                    setAddress({ ...address, buildingName: e.target.value })
                  }
                />

                <input
                  placeholder="Area / Locality"
                  className={inputClass}
                  value={address.area}
                  onChange={(e) =>
                    setAddress({ ...address, area: e.target.value })
                  }
                />

                <input
                  placeholder="Landmark optional"
                  className={inputClass}
                  value={address.landmark}
                  onChange={(e) =>
                    setAddress({ ...address, landmark: e.target.value })
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
                  className={inputClass}
                  value={address.pincode}
                  onChange={(e) =>
                    setAddress({ ...address, pincode: e.target.value })
                  }
                />

                <select
                  className={inputClass}
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

              <label className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={saveAddressForFuture}
                  onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                />
                <BookmarkPlus size={14} className="text-green-600" />
                Save this address
              </label>

              {addressMsg && (
                <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                  {addressMsg}
                </p>
              )}
            </div>

            <div className={softCardClass}>
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
                className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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