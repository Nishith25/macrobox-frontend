// frontend/src/pages/Cart.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../api/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 19;

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

const makeMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

const prettyDate = (iso?: string | null) => {
  if (!iso) return null;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleDateString();
};

const formatCouponLabel = (c: AvailableCoupon) => {
  if (c.type === "flat") return `₹${c.value} OFF`;

  const cap = c.maxDiscount > 0 ? ` • Max ₹${c.maxDiscount}` : "";
  return `${c.value}% OFF${cap}`;
};

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
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

  const googleMapRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleMarkerRef = useRef<google.maps.Marker | null>(null);

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

  const totalCarbs = useMemo(
    () => cart.reduce((s, i) => s + (i.carbs || 0) * i.qty, 0),
    [cart]
  );

  const totalFat = useMemo(
    () => cart.reduce((s, i) => s + (i.fat || 0) * i.qty, 0),
    [cart]
  );

  const payable = Math.max(subtotal - discount, 0);

  const cardClass =
    "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm";
  const inputClass =
    "h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100";

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

  useEffect(() => {
    const styleId = "macrobox-google-places-premium-style";

    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");

    style.id = styleId;

    style.innerHTML = `
      .pac-container {
        z-index: 999999 !important;
        margin-top: 12px !important;
        border-radius: 22px !important;
        border: 1px solid #bbf7d0 !important;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22) !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        overflow: hidden !important;
        padding: 10px 0 !important;
      }

      .pac-item {
        padding: 18px 20px !important;
        font-size: 15px !important;
        line-height: 24px !important;
        cursor: pointer !important;
        border-top: 1px solid #f3f4f6 !important;
      }

      .pac-item:first-child {
        border-top: none !important;
      }

      .pac-item:hover {
        background: #f0fdf4 !important;
      }

      .pac-icon {
        margin-top: 8px !important;
      }

      .pac-item-query {
        font-size: 16px !important;
        font-weight: 900 !important;
        color: #111827 !important;
      }

      .pac-matched {
        font-weight: 900 !important;
        color: #16a34a !important;
      }
    `;

    document.head.appendChild(style);
  }, []);

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
          location: {
            lat,
            lng,
          },
        },
        (results: google.maps.GeocoderResult[] | null, status: string) => {
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

  const renderGoogleDeliveryMap = (lat: number, lng: number) => {
    if (!window.google?.maps || !googleMapRef.current) return;

    const position = {
      lat,
      lng,
    };

    if (!googleMapInstanceRef.current) {
      googleMapInstanceRef.current = new google.maps.Map(googleMapRef.current, {
        center: position,
        zoom: 18,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: true,
        gestureHandling: "greedy",
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      googleMapInstanceRef.current.addListener(
        "click",
        async (e: google.maps.MapMouseEvent) => {
          const clickedLat = e.latLng?.lat();
          const clickedLng = e.latLng?.lng();

          if (clickedLat == null || clickedLng == null) return;

          await pinLocationOnMap(clickedLat, clickedLng);
        }
      );
    }

    googleMapInstanceRef.current.setCenter(position);
    googleMapInstanceRef.current.setZoom(18);

    if (!googleMarkerRef.current) {
      googleMarkerRef.current = new google.maps.Marker({
        position,
        map: googleMapInstanceRef.current,
        draggable: true,
        title: "MacroBox Delivery Location",
        animation: google.maps.Animation.DROP,
      });

      googleMarkerRef.current.addListener("dragend", async () => {
        const markerPosition = googleMarkerRef.current?.getPosition();

        if (!markerPosition) return;

        await pinLocationOnMap(markerPosition.lat(), markerPosition.lng());
      });
    } else {
      googleMarkerRef.current.setPosition(position);
      googleMarkerRef.current.setMap(googleMapInstanceRef.current);
    }
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
            componentRestrictions: {
              country: "in",
            },
            fields: [
              "place_id",
              "name",
              "formatted_address",
              "geometry",
              "address_components",
            ],
            types: ["geocode", "establishment"],
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

  useEffect(() => {
    if (address.lat != null && address.lng != null && googleSearchReady) {
      renderGoogleDeliveryMap(address.lat, address.lng);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.lat, address.lng, googleSearchReady]);

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
      setLocationMsg("Geolocation is not supported on this browser.");
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
          "Location permission denied. Please allow location access or search manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
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
          componentRestrictions: {
            country: "IN",
          },
        },
        (results: google.maps.GeocoderResult[] | null, status: string) => {
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
          carbs: i.carbs || 0,
          fat: i.fat || 0,
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
      setCouponMsg(err?.response?.data?.message || "Failed to create order");
      setCouponMsgType("error");
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <ShoppingBag size={30} className="text-green-600" />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
            Your cart is empty
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Add your favourite MacroBox meals to continue.
          </p>

          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="mt-6 rounded-2xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-green-700"
          >
            Explore Meals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/60 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-green-700">
              Secure Checkout
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950">
              Your Cart
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review meals, choose delivery location, and complete payment.
            </p>
          </div>

          <div className="rounded-3xl border border-green-100 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-400">
              Total Payable
            </p>

            <p className="text-2xl font-black text-green-700">₹{payable}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
                  <ShoppingBag size={22} className="text-green-600" />
                  Meals in Cart
                </h2>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">
                  {cart.length} item{cart.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-gray-950">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-600">
                        <span className="rounded-full bg-white px-3 py-1">
                          Protein {item.protein * item.qty}g
                        </span>

                        <span className="rounded-full bg-white px-3 py-1">
                          Calories {item.calories * item.qty}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1">
                          Carbs {(item.carbs || 0) * item.qty}g
                        </span>

                        <span className="rounded-full bg-white px-3 py-1">
                          Fat {(item.fat || 0) * item.qty}g
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-black text-gray-900">
                        ₹{item.price} × {item.qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => decreaseQty(item._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="min-w-7 text-center text-sm font-black">
                        {item.qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => increaseQty(item._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
                  <MapPin size={22} className="text-green-600" />
                  Delivery Address
                </h2>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700">
                  Exact pin required
                </span>
              </div>

              <p className="mb-5 text-sm text-gray-500">
                Search your address like Swiggy/Zomato, select the correct
                Google result, then drag the marker or tap the map to adjust the
                exact delivery pin.
              </p>

              {savedAddresses.length > 0 && (
                <div className="mb-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-gray-900">
                      Saved Addresses
                    </p>

                    <p className="text-xs font-bold text-gray-400">
                      Quick select
                    </p>
                  </div>

                  {loadingSavedAddresses ? (
                    <p className="text-sm text-gray-500">
                      Loading saved addresses...
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {savedAddresses.slice(0, 4).map((saved) => (
                        <button
                          key={saved._id}
                          type="button"
                          onClick={() => selectSavedAddress(saved)}
                          className="rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-green-500 hover:bg-green-50"
                        >
                          <p className="truncate text-sm font-black text-gray-900">
                            {saved.addressLabel} • {saved.fullName}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                            {saved.flatNo}, {saved.buildingName}, {saved.area},{" "}
                            {saved.city} - {saved.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="flex items-center gap-2 text-lg font-black text-gray-900">
                    <Search size={22} className="text-green-600" />
                    Search Location
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Type your apartment, street, area, or landmark and select
                    from Google suggestions.
                  </p>
                </div>

                <div className="relative">
                  <Search
                    size={22}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

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
                        ? "Search exact delivery address..."
                        : "Loading Google Maps search..."
                    }
                    className="h-16 w-full rounded-2xl border border-green-200 bg-white pl-12 pr-32 text-base font-bold text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  />

                  {addressSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearch("");
                        setLocationMsg(null);
                      }}
                      className="absolute right-24 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <X size={18} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={geocodeTypedAddress}
                    disabled={searchingAddress}
                    className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-green-600 px-5 text-sm font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
                  >
                    {searchingAddress ? "..." : "Search"}
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="h-12 flex-1 rounded-2xl bg-green-600 text-sm font-black text-white shadow-sm hover:bg-green-700"
                  >
                    <Navigation size={17} className="mr-1 inline" />
                    Use Current Location
                  </button>

                  {address.mapsUrl && (
                    <a
                      href={address.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-green-200 bg-white text-sm font-black text-green-700 hover:bg-green-50"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </div>

                {address.lat != null && address.lng != null && (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="relative h-[430px] w-full">
                      <div ref={googleMapRef} className="h-full w-full" />

                      <div className="absolute left-4 top-4 z-10 rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
                        <p className="text-xs font-black uppercase tracking-wide text-green-700">
                          Exact Delivery Pin
                        </p>

                        <p className="mt-1 text-xs font-medium text-gray-500">
                          Drag pin or tap map to adjust.
                        </p>
                      </div>

                      <div className="absolute bottom-4 left-1/2 z-10 w-[92%] max-w-xl -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-xl">
                        <div className="mb-2 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-600" />

                          <p className="text-xs font-black uppercase tracking-wide text-green-700">
                            Delivering To
                          </p>
                        </div>

                        <p className="line-clamp-2 text-sm font-bold leading-5 text-gray-900">
                          {address.formattedAddress || address.locationText}
                        </p>

                        {address.pincode && (
                          <p className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            Pincode: {address.pincode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {locationMsg && (
                  <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                    {locationMsg}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-4 text-sm font-black text-gray-900">
                  Delivery Details
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Full Name"
                    className={inputClass}
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        fullName: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Phone Number"
                    className={inputClass}
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        phone: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Flat / House No"
                    className={inputClass}
                    value={address.flatNo}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        flatNo: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Floor optional"
                    className={inputClass}
                    value={address.floor}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        floor: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Building / Apartment"
                    className={`${inputClass} sm:col-span-2`}
                    value={address.buildingName}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        buildingName: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Area / Locality"
                    className={inputClass}
                    value={address.area}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        area: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Landmark optional"
                    className={inputClass}
                    value={address.landmark}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        landmark: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="City"
                    className={inputClass}
                    value={address.city}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        city: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="State"
                    className={inputClass}
                    value={address.state}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        state: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Pincode"
                    className={inputClass}
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        pincode: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      })
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

                <label className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveAddressForFuture}
                    onChange={(e) =>
                      setSaveAddressForFuture(e.target.checked)
                    }
                  />
                  <BookmarkPlus size={16} className="text-green-600" />
                  Save this address for future orders
                </label>

                {addressMsg && (
                  <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                    {addressMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <div className={cardClass}>
              <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
                <ShieldCheck size={22} className="text-green-600" />
                Order Summary
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">Protein</p>
                  <p className="mt-1 text-lg font-black text-gray-950">
                    {totalProtein}g
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">Calories</p>
                  <p className="mt-1 text-lg font-black text-gray-950">
                    {totalCalories}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">Carbs</p>
                  <p className="mt-1 text-lg font-black text-gray-950">
                    {totalCarbs}g
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-400">Fat</p>
                  <p className="mt-1 text-lg font-black text-gray-950">
                    {totalFat}g
                  </p>
                </div>
              </div>

              <hr className="my-5" />

              <div className="space-y-3 text-sm">
                <p className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <b>₹{subtotal}</b>
                </p>

                <p className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <b className="text-green-600">-₹{discount}</b>
                </p>

                <p className="flex justify-between text-lg font-black">
                  <span>Total Payable</span>
                  <span className="text-green-700">₹{payable}</span>
                </p>
              </div>
            </div>

            <div className={cardClass}>
              <p className="mb-3 flex items-center gap-2 text-base font-black text-gray-950">
                <Tag size={18} className="text-green-600" />
                Apply Coupon
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
                type="button"
                onClick={() => applyCoupon()}
                disabled={applying}
                className="mt-3 h-12 w-full rounded-2xl bg-green-600 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
              >
                {applying ? "Applying..." : "Apply Coupon"}
              </button>

              {couponMsg && (
                <p
                  className={`mt-3 rounded-2xl p-3 text-sm font-bold ${
                    couponMsgType === "error"
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {couponMsg}
                </p>
              )}

              <div className="mt-5">
                <p className="mb-3 text-sm font-black text-gray-900">
                  Available Coupons
                </p>

                {loadingCoupons ? (
                  <p className="text-sm text-gray-500">Loading coupons...</p>
                ) : availableCoupons.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 p-3 text-sm font-medium text-gray-500">
                    No coupons available for your cart.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableCoupons.map((c) => {
                      const from = prettyDate(c.validFrom);
                      const to = prettyDate(c.validTo);

                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => applyCoupon(c.code)}
                          disabled={applying}
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-green-500 hover:bg-green-50"
                        >
                          <p className="text-sm font-black text-gray-950">
                            {c.code}
                          </p>

                          <p className="mt-1 text-xs font-bold text-gray-500">
                            {formatCouponLabel(c)} • Min ₹{c.minCartTotal}
                          </p>

                          {(from || to) && (
                            <p className="mt-1 text-[11px] font-medium text-gray-400">
                              Valid: {from || "-"} → {to || "-"}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={cardClass}>
              <p className="mb-3 flex items-center gap-2 text-base font-black text-gray-950">
                <Clock size={18} className="text-green-600" />
                Delivery Time
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
                className={`${inputClass} mt-3`}
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

              <p className="mt-3 rounded-2xl bg-gray-50 p-3 text-xs font-medium leading-5 text-gray-500">
                Orders must be placed at least <b>3 hours</b> before your
                selected delivery slot.
              </p>

              {slotMsg && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  {slotMsg}
                </p>
              )}

              <button
                type="button"
                onClick={checkout}
                disabled={checkingOut}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 text-sm font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              >
                <LocateFixed size={18} />
                {checkingOut ? "Processing..." : "Checkout & Pay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}