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

const pad2 = (num: number) => String(num).padStart(2, "0");

const format12h = (hour24: number) => {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:00 ${period}`;
};

const buildSlots = () => {
  const slots: string[] = [];

  for (let hour = SLOT_START_HOUR; hour <= SLOT_END_HOUR; hour++) {
    slots.push(`${pad2(hour)}:00`);
  }

  return slots;
};

const getHourFromSlot = (slotHHmm: string) => Number(slotHHmm.split(":")[0]);

const isSlotAllowed = (selectedDateISO: string, slotHHmm: string) => {
  if (!selectedDateISO || !slotHHmm) return false;

  const [year, month, day] = selectedDateISO.split("-").map(Number);
  const hour = getHourFromSlot(slotHHmm);

  if (!year || !month || !day || Number.isNaN(hour)) return false;

  const slotDateTime = new Date(year, month - 1, day, hour, 0, 0, 0);
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

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString();
};

const formatCouponLabel = (coupon: AvailableCoupon) => {
  if (coupon.type === "flat") return `₹${coupon.value} OFF`;

  const cap = coupon.maxDiscount > 0 ? ` • Max ₹${coupon.maxDiscount}` : "";
  return `${coupon.value}% OFF${cap}`;
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
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const totalProtein = useMemo(
    () => cart.reduce((sum, item) => sum + item.protein * item.qty, 0),
    [cart]
  );

  const totalCalories = useMemo(
    () => cart.reduce((sum, item) => sum + item.calories * item.qty, 0),
    [cart]
  );

  const totalCarbs = useMemo(
    () => cart.reduce((sum, item) => sum + (item.carbs || 0) * item.qty, 0),
    [cart]
  );

  const totalFat = useMemo(
    () => cart.reduce((sum, item) => sum + (item.fat || 0) * item.qty, 0),
    [cart]
  );

  const payable = Math.max(subtotal - discount, 0);

  const inputClass =
    "h-12 w-full rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100";

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
    const stillEligible = availableCoupons.some((item) => item.code === applied);

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
        async (event: google.maps.MapMouseEvent) => {
          const clickedLat = event.latLng?.lat();
          const clickedLng = event.latLng?.lng();

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
    } catch (error: any) {
      setDiscount(0);
      setCouponMsg(error?.response?.data?.message || "Invalid or expired coupon");
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
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

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
        items: cart.map((item) => ({
          mealId: item._id,
          title: item.title,
          price: item.price,
          qty: item.qty,
          protein: item.protein,
          calories: item.calories,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
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

      const razorpay = new window.Razorpay({
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

      razorpay.open();
    } catch (error: any) {
      setCouponMsg(error?.response?.data?.message || "Failed to create order");
      setCouponMsgType("error");
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-16 text-slate-950 dark:text-white dark:bg-slate-950 dark:text-white sm:px-6">
        <div className="mx-auto max-w-[820px] rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <ShoppingBag size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
            Your cart is empty
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Add your favourite MacroBox meals to continue checkout.
          </p>

          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="mt-7 rounded-[18px] bg-green-600 px-7 py-3 text-sm font-black text-white transition hover:bg-green-700"
          >
            Explore Meals
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] pb-24 text-slate-950 dark:text-white dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white/70 px-4 py-8 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
              <ShieldCheck size={14} />
              Secure Checkout
            </p>

            <h1 className="mt-4 text-[34px] font-black tracking-[-0.05em] text-slate-950 dark:text-white">
              Your Cart
            </h1>

            <p className="mt-1 text-base font-medium text-slate-500 dark:text-slate-400">
              Review meals, choose delivery location, and complete payment.
            </p>
          </div>

          <div className="w-fit rounded-[22px] bg-green-700 px-7 py-4 text-white shadow-[0_16px_35px_rgba(22,101,52,0.25)]">
            <p className="text-xs font-black uppercase tracking-wide text-green-100">
              Total Payable
            </p>
            <p className="mt-1 text-3xl font-black tracking-[-0.05em]">
              ₹{payable}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1240px] gap-7 px-4 py-8 sm:px-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-7">
          <SectionCard>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconCircle>
                  <ShoppingBag size={20} />
                </IconCircle>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  Meals in Cart
                </h2>
              </div>

              <span className="rounded-full bg-green-50 px-4 py-1.5 text-sm font-black text-green-700">
                {cart.length} item{cart.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <MacroPill color="green">
                          🥩 {item.protein * item.qty}g protein
                        </MacroPill>
                        <MacroPill color="orange">
                          🔥 {item.calories * item.qty} kcal
                        </MacroPill>
                        <MacroPill color="yellow">
                          🌾 {(item.carbs || 0) * item.qty}g carbs
                        </MacroPill>
                        <MacroPill color="blue">
                          💧 {(item.fat || 0) * item.qty}g fat
                        </MacroPill>
                      </div>

                      <p className="mt-3 text-sm font-black text-slate-900">
                        ₹{item.price}{" "}
                        <span className="font-bold text-slate-400">
                          × {item.qty}
                        </span>{" "}
                        <span className="text-green-700">
                          = ₹{item.price * item.qty}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseQty(item._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:text-slate-300 transition hover:bg-slate-200"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="flex min-w-8 justify-center text-base font-black text-slate-950 dark:text-white">
                        {item.qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => increaseQty(item._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700"
                      >
                        <Plus size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item._id)}
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <IconCircle>
                  <MapPin size={20} />
                </IconCircle>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  Delivery Address
                </h2>
              </div>

              <span className="rounded-full bg-orange-50 px-4 py-1.5 text-xs font-black text-orange-700">
                Exact pin required
              </span>
            </div>

            <p className="mb-5 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Search your address like Swiggy/Zomato, select the correct Google
              result, then drag the marker or tap the map to adjust the exact
              delivery pin.
            </p>

            {savedAddresses.length > 0 && (
              <div className="mb-5 rounded-[22px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">
                    Saved Addresses
                  </p>

                  <p className="text-xs font-bold text-slate-400">
                    Quick select
                  </p>
                </div>

                {loadingSavedAddresses ? (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loading saved addresses...
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {savedAddresses.slice(0, 4).map((saved) => (
                      <button
                        key={saved._id}
                        type="button"
                        onClick={() => selectSavedAddress(saved)}
                        className="rounded-[18px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 text-left transition hover:border-green-500 hover:bg-green-50"
                      >
                        <p className="truncate text-sm font-black text-slate-900">
                          {saved.addressLabel} • {saved.fullName}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                          {saved.flatNo}, {saved.buildingName}, {saved.area},{" "}
                          {saved.city} - {saved.pincode}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
              <div className="mb-4">
                <p className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                  <Search size={18} className="text-green-600" />
                  Search Location
                </p>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Type your apartment, street, area, or landmark and select from
                  Google suggestions.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    ref={addressInputRef}
                    value={addressSearch}
                    onChange={(event) => setAddressSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        geocodeTypedAddress();
                      }
                    }}
                    placeholder={
                      googleSearchReady
                        ? "Search exact delivery address..."
                        : "Loading Google Maps search..."
                    }
                    className="h-12 w-full rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 pl-11 pr-10 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />

                  {addressSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearch("");
                        setLocationMsg(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={geocodeTypedAddress}
                  disabled={searchingAddress}
                  className="h-12 rounded-[16px] bg-green-600 px-6 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {searchingAddress ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="h-12 flex-1 rounded-[16px] bg-green-600 text-sm font-black text-white transition hover:bg-green-700"
                >
                  <Navigation size={17} className="mr-1 inline" />
                  Use Current Location
                </button>

                {address.mapsUrl && (
                  <a
                    href={address.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-12 flex-1 items-center justify-center rounded-[16px] border border-green-200 bg-white text-sm font-black text-green-700 transition hover:bg-green-50"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>

              {address.lat != null && address.lng != null && (
                <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative h-[380px] w-full">
                    <div ref={googleMapRef} className="h-full w-full" />

                    <div className="absolute left-4 top-4 z-10 rounded-[16px] bg-white/95 px-4 py-3 shadow-lg">
                      <p className="text-xs font-black uppercase tracking-wide text-green-700">
                        Exact Delivery Pin
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Drag pin or tap map to adjust.
                      </p>
                    </div>

                    <div className="absolute bottom-4 left-1/2 z-10 w-[92%] max-w-xl -translate-x-1/2 rounded-[18px] bg-white px-4 py-3 shadow-xl">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-600" />

                        <p className="text-xs font-black uppercase tracking-wide text-green-700">
                          Delivering To
                        </p>
                      </div>

                      <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
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
                <MessageBox type="error" message={locationMsg} />
              )}
            </div>

            <div className="mt-5 rounded-[22px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
              <p className="mb-4 text-sm font-black text-slate-900">
                Delivery Details
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  placeholder="Full Name"
                  className={inputClass}
                  value={address.fullName}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      fullName: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Phone Number"
                  className={inputClass}
                  value={address.phone}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      phone: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Flat / House No"
                  className={inputClass}
                  value={address.flatNo}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      flatNo: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Floor optional"
                  className={inputClass}
                  value={address.floor}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      floor: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Building / Apartment"
                  className={`${inputClass} sm:col-span-2`}
                  value={address.buildingName}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      buildingName: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Area / Locality"
                  className={inputClass}
                  value={address.area}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      area: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Landmark optional"
                  className={inputClass}
                  value={address.landmark}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      landmark: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="City"
                  className={inputClass}
                  value={address.city}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      city: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="State"
                  className={inputClass}
                  value={address.state}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      state: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="Pincode"
                  className={inputClass}
                  value={address.pincode}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                />

                <select
                  className={inputClass}
                  value={address.addressLabel}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      addressLabel: event.target.value as
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

              <label className="mt-4 flex items-center gap-2 rounded-[16px] bg-slate-50 dark:bg-slate-950 p-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveAddressForFuture}
                  onChange={(event) =>
                    setSaveAddressForFuture(event.target.checked)
                  }
                />
                <BookmarkPlus size={16} className="text-green-600" />
                Save this address for future orders
              </label>

              {addressMsg && <MessageBox type="error" message={addressMsg} />}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <SectionCard>
            <div className="mb-5 flex items-center gap-3">
              <IconCircle>
                <ShieldCheck size={19} />
              </IconCircle>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">
                Order Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SummaryMetric
                color="green"
                label="Protein"
                value={`${totalProtein}`}
                unit="g"
              />
              <SummaryMetric
                color="orange"
                label="Calories"
                value={`${totalCalories}`}
                unit="kcal"
              />
              <SummaryMetric
                color="yellow"
                label="Carbs"
                value={`${totalCarbs}`}
                unit="g"
              />
              <SummaryMetric color="blue" label="Fat" value={`${totalFat}`} unit="g" />
            </div>

            <hr className="my-5 border-slate-200 dark:border-slate-800" />

            <div className="space-y-3 text-sm">
              <p className="flex justify-between">
                <span className="font-medium text-slate-500 dark:text-slate-400">Subtotal</span>
                <b className="text-slate-950 dark:text-white">₹{subtotal}</b>
              </p>

              <p className="flex justify-between">
                <span className="font-medium text-slate-500 dark:text-slate-400">Discount</span>
                <b className="text-slate-500 dark:text-slate-400">-₹{discount}</b>
              </p>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <p className="flex justify-between text-lg font-black">
                  <span className="text-slate-950 dark:text-white">Total Payable</span>
                  <span className="text-green-700">₹{payable}</span>
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex items-center gap-3">
              <IconCircle>
                <Tag size={18} />
              </IconCircle>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">
                Apply Coupon
              </h2>
            </div>

            <input
              value={coupon}
              onChange={(event) => {
                setCoupon(event.target.value.toUpperCase());
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
              className="mt-3 h-12 w-full rounded-[16px] bg-green-600 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {applying ? "Applying..." : "Apply Coupon"}
            </button>

            {couponMsg && (
              <MessageBox
                type={couponMsgType === "error" ? "error" : "success"}
                message={couponMsg}
              />
            )}

            <div className="mt-5">
              <p className="mb-3 text-sm font-black text-slate-900">
                Available Coupons
              </p>

              {loadingCoupons ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading coupons...
                </p>
              ) : availableCoupons.length === 0 ? (
                <p className="rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  No coupons available for your cart.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableCoupons.map((item) => {
                    const from = prettyDate(item.validFrom);
                    const to = prettyDate(item.validTo);

                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => applyCoupon(item.code)}
                        disabled={applying}
                        className="w-full rounded-[16px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-left transition hover:border-green-500 hover:bg-green-50"
                      >
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {item.code}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {formatCouponLabel(item)} • Min ₹{item.minCartTotal}
                        </p>

                        {(from || to) && (
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            Valid: {from || "-"} → {to || "-"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex items-center gap-3">
              <IconCircle>
                <Clock size={18} />
              </IconCircle>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">
                Delivery Time
              </h2>
            </div>

            <input
              type="date"
              className={inputClass}
              value={slotDate}
              onChange={(event) => {
                const newDate = event.target.value;

                setSlotDate(newDate);
                setSlotMsg(null);

                if (!isSlotAllowed(newDate, slotTime)) {
                  const firstAllowed = slots.find((slot) =>
                    isSlotAllowed(newDate, slot)
                  );

                  if (firstAllowed) setSlotTime(firstAllowed);
                }
              }}
              min={new Date().toISOString().slice(0, 10)}
            />

            <select
              className={`${inputClass} mt-3`}
              value={slotTime}
              onChange={(event) => {
                setSlotTime(event.target.value);
                setSlotMsg(null);
              }}
            >
              {slots.map((slot) => {
                const allowed = isSlotAllowed(slotDate, slot);
                const label = format12h(getHourFromSlot(slot));

                return (
                  <option key={slot} value={slot} disabled={!allowed}>
                    {optionLabel(label, allowed)}
                  </option>
                );
              })}
            </select>

            <p className="mt-3 rounded-[16px] border border-yellow-200 bg-yellow-50 p-3 text-xs font-medium leading-5 text-yellow-800">
              Orders must be placed at least <b>3 hours</b> before your selected
              delivery slot.
            </p>

            {slotMsg && <MessageBox type="error" message={slotMsg} />}

            <button
              type="button"
              onClick={checkout}
              disabled={checkingOut}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-green-600 text-base font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
            >
              <LocateFixed size={18} />
              {checkingOut ? "Processing..." : "Checkout & Pay"}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>○ Secure Payment</span>
              <span>⚡ Fast Delivery</span>
              <span>○ Fresh Meals</span>
            </div>
          </SectionCard>
        </aside>
      </div>
    </main>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      {children}
    </section>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
      {children}
    </span>
  );
}

function MacroPill({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "orange" | "yellow" | "blue";
}) {
  const className =
    color === "green"
      ? "bg-green-50 text-green-700"
      : color === "orange"
      ? "bg-orange-50 text-orange-600"
      : color === "yellow"
      ? "bg-yellow-50 text-yellow-700"
      : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black dark:bg-slate-800 dark:text-slate-100 ${className}`}>
      {children}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: "green" | "orange" | "yellow" | "blue";
}) {
  const className =
    color === "green"
      ? "border-green-100 bg-green-50 text-green-700"
      : color === "orange"
      ? "border-orange-100 bg-orange-50 text-orange-600"
      : color === "yellow"
      ? "border-yellow-100 bg-yellow-50 text-yellow-700"
      : "border-blue-100 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-[18px] border p-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white ${className}`}>
      <p className="text-xs font-black">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white dark:text-white">
        {value} <span className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function MessageBox({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <p
      className={`mt-3 rounded-[16px] p-3 text-sm font-bold ${
        type === "error"
          ? "bg-red-50 text-red-600"
          : "bg-green-50 text-green-700"
      }`}
    >
      {message}
    </p>
  );
}