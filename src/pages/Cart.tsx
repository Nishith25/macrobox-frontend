// frontend/src/pages/Cart.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
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

type StepType = "cart" | "address" | "schedule" | "payment";
type LocationMode = "manual" | "current";
type MsgType = "success" | "error" | null;

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

type AvailableCoupon = {
  code: string;
  type: "flat" | "percent";
  value: number;
  minCartTotal: number;
  maxDiscount: number;
  validFrom?: string | null;
  validTo?: string | null;
};

type ChallengeScheduleDay = {
  day: number;
  date: string;
  slot: string;
  preference: "veg" | "nonveg" | "mixed";
  selectedMeal: string;
  selectedMealTitle: string;
  selectedMealPrice: number;
  selectedMealProtein: number;
  selectedMealCalories: number;
  selectedMealCarbs: number;
  selectedMealFat: number;
};

const emptyAddress: Address = {
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
};

const pad2 = (num: number) => String(num).padStart(2, "0");

const todayISO = () => new Date().toISOString().slice(0, 10);

const addDaysToISO = (isoDate: string, daysToAdd: number) => {
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const formatDateForDisplay = (isoDate: string) => {
  if (!isoDate) return "Select date";

  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "Select date";

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const format12hFromHour = (hour24: number) => {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour}:00 ${period}`;
};

const format12hFromSlot = (slotHHmm: string) => {
  if (!slotHHmm) return "Select slot";

  return format12hFromHour(Number(slotHHmm.split(":")[0]));
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
  allowed ? label : `${label} — Not available`;

const makeMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

const prettyDate = (iso?: string | null) => {
  if (!iso) return null;

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-IN");
};

const formatCouponLabel = (coupon: AvailableCoupon) => {
  if (coupon.type === "flat") return `₹${coupon.value} OFF on plan`;

  return `${coupon.value}% OFF on next challenge plan`;
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

const isChallengePlan = (item: any) =>
  item?.itemType === "challenge_plan" || Boolean(item?.challengeId);

const getCartKey = (item: any) => `${item._id}-${item.challengeId || "meal"}`;

const cleanPlanTitle = (title?: string) => {
  return String(title || "Meal").replace(/^Day\s+\d+:\s*/i, "");
};

const buildScheduleFromCartItem = (item: any): ChallengeScheduleDay[] => {
  if (!isChallengePlan(item)) return [];

  if (Array.isArray(item.planDays) && item.planDays.length > 0) {
    return item.planDays.map((day: any, index: number) => ({
      day: Number(day.day || index + 1),
      date: "",
      slot: "",
      preference: day.preference || item.preference || "mixed",
      selectedMeal: String(day.selectedMeal || day.selectedMealId || ""),
      selectedMealTitle: cleanPlanTitle(
        day.selectedMealTitle || `Day ${index + 1} Meal`
      ),
      selectedMealPrice: Number(day.selectedMealPrice || 0),
      selectedMealProtein: Number(day.selectedMealProtein || 0),
      selectedMealCalories: Number(day.selectedMealCalories || 0),
      selectedMealCarbs: Number(day.selectedMealCarbs || 0),
      selectedMealFat: Number(day.selectedMealFat || 0),
    }));
  }

  if (Array.isArray(item.planItems) && item.planItems.length > 0) {
    return item.planItems.map((meal: any, index: number) => ({
      day: index + 1,
      date: "",
      slot: "",
      preference: item.preference || "mixed",
      selectedMeal: String(meal._id || ""),
      selectedMealTitle: cleanPlanTitle(meal.title || `Day ${index + 1} Meal`),
      selectedMealPrice: Number(meal.price || 0),
      selectedMealProtein: Number(meal.protein || 0),
      selectedMealCalories: Number(meal.calories || 0),
      selectedMealCarbs: Number(meal.carbs || 0),
      selectedMealFat: Number(meal.fat || 0),
    }));
  }

  return [];
};

const addressPreview = (address?: Partial<Address> | null) => {
  if (!address) return "Address not available";

  if (address.formattedAddress) return address.formattedAddress;

  const parts = [
    address.flatNo,
    address.floor,
    address.buildingName,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address not available";
};

const addressIcon = (label?: string) => {
  if (label === "Work") return <Briefcase size={18} />;
  if (label === "Home") return <Home size={18} />;

  return <MapPin size={18} />;
};

export default function Cart() {
  const navigate = useNavigate();
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } =
    useCart();

  const [step, setStep] = useState<StepType>("cart");

  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponMsgType, setCouponMsgType] = useState<MsgType>(null);

  const [addressMsg, setAddressMsg] = useState<string | null>(null);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(
    null
  );

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>(emptyAddress);
  const [addressSearch, setAddressSearch] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const googleAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  const googleMapRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleMarkerRef = useRef<google.maps.Marker | null>(null);

  const [googleSearchReady, setGoogleSearchReady] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const slots = useMemo(() => buildSlots(), []);

  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");

  const [challengeSchedules, setChallengeSchedules] = useState<
    Record<string, ChallengeScheduleDay[]>
  >({});

  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>(
    []
  );
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const hasChallengePlans = useMemo(
    () => cart.some((item: any) => isChallengePlan(item)),
    [cart]
  );

  const hasNormalMeals = useMemo(
    () => cart.some((item: any) => !isChallengePlan(item)),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const planSubtotal = useMemo(
    () =>
      cart
        .filter((item: any) => isChallengePlan(item))
        .reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const normalMealsSubtotal = useMemo(
    () =>
      cart
        .filter((item: any) => !isChallengePlan(item))
        .reduce((sum, item) => sum + item.price * item.qty, 0),
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
    "h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100";

  const scheduleInputClass =
    "h-12 w-full min-w-0 rounded-[14px] border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100";

  useEffect(() => {
    setChallengeSchedules((prev) => {
      const next: Record<string, ChallengeScheduleDay[]> = {};

      cart.forEach((item: any) => {
        if (!isChallengePlan(item)) return;

        const key = getCartKey(item);

        if (prev[key]?.length) {
          next[key] = prev[key];
        } else {
          next[key] = buildScheduleFromCartItem(item);
        }
      });

      return next;
    });
  }, [cart]);

  useEffect(() => {
    fetchSavedAddresses();
  }, []);

  useEffect(() => {
    if (cart.length > 0) fetchAvailableCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSubtotal, cart.length]);

  useEffect(() => {
    const styleId = "macrobox-google-places-premium-style";

    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");

    style.id = styleId;

    style.innerHTML = `
      .pac-container {
        z-index: 999999 !important;
        margin-top: 12px !important;
        border-radius: 18px !important;
        border: 1px solid #bbf7d0 !important;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22) !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        overflow: hidden !important;
        padding: 8px 0 !important;
      }

      .pac-item {
        padding: 14px 18px !important;
        font-size: 14px !important;
        line-height: 22px !important;
        cursor: pointer !important;
        border-top: 1px solid #f3f4f6 !important;
      }

      .pac-item:first-child {
        border-top: none !important;
      }

      .pac-item:hover {
        background: #f0fdf4 !important;
      }

      .pac-item-query {
        font-size: 15px !important;
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

  useEffect(() => {
    if (!showAddressModal) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLocationMsg("Google Maps API key is missing.");
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setGoogleSearchReady(true);

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
      })
      .catch((error: unknown) => {
        console.error("GOOGLE MAPS LOAD ERROR:", error);
        setLocationMsg("Google address search failed to load.");
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddressModal]);

  useEffect(() => {
    if (
      showAddressModal &&
      addressForm.lat != null &&
      addressForm.lng != null &&
      googleSearchReady
    ) {
      setTimeout(() => {
        renderGoogleDeliveryMap(addressForm.lat as number, addressForm.lng as number);
      }, 100);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressForm.lat, addressForm.lng, googleSearchReady, showAddressModal]);

  const fetchSavedAddresses = async () => {
    try {
      setLoadingSavedAddresses(true);

      const res = await api.get("/user/addresses");
      const list = res.data || [];

      setSavedAddresses(list);

      const defaultAddress =
        list.find((address: SavedAddress) => address.isDefault) || list[0];

      if (defaultAddress && !selectedAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch {
      setSavedAddresses([]);
    } finally {
      setLoadingSavedAddresses(false);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      setLoadingCoupons(true);

      const res = await api.get(
        `/coupons/available?cartTotal=${subtotal}&planSubtotal=${planSubtotal}`
      );

      setAvailableCoupons(res.data || []);
    } catch {
      setAvailableCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const removeCoupon = () => {
    setCoupon("");
    setDiscount(0);
    setCouponMsg("Coupon removed.");
    setCouponMsgType("success");
  };

  const applyCoupon = async (codeOverride?: string) => {
    const codeToApply = (codeOverride ?? coupon).trim().toUpperCase();

    if (!codeToApply) {
      removeCoupon();
      return;
    }

    if (planSubtotal <= 0) {
      setCouponMsg("Reward coupon is applicable only on challenge plans.");
      setCouponMsgType("error");
      return;
    }

    setApplying(true);
    setCouponMsg(null);
    setCouponMsgType(null);

    try {
      const res = await api.post("/coupons/apply", {
        code: codeToApply,
        cartTotal: subtotal,
        planSubtotal,
        normalMealsSubtotal,
        applyOn: "challenge_plan",
      });

      setCoupon(codeToApply);
      setDiscount(res.data.discount || 0);
      setCouponMsg(
        `Coupon applied on challenge plan. You saved ₹${res.data.discount}`
      );
      setCouponMsgType("success");

      fetchAvailableCoupons();
    } catch (error: any) {
      setDiscount(0);
      setCouponMsg(
        error?.response?.data?.message || "Invalid or expired coupon"
      );
      setCouponMsgType("error");
      fetchAvailableCoupons();
    } finally {
      setApplying(false);
    }
  };

  const updateChallengeScheduleDay = (
    cartKey: string,
    dayNo: number,
    patch: Partial<ChallengeScheduleDay>
  ) => {
    setChallengeSchedules((prev) => {
      const currentSchedule = prev[cartKey] || [];

      const nextSchedule = currentSchedule.map((day) => {
        if (Number(day.day) === Number(dayNo)) {
          return {
            ...day,
            ...patch,
          };
        }

        return day;
      });

      if (Number(dayNo) === 1 && patch.date !== undefined) {
        return {
          ...prev,
          [cartKey]: nextSchedule.map((day) => {
            const date = patch.date
              ? addDaysToISO(patch.date, Number(day.day) - 1)
              : "";

            return {
              ...day,
              date,
              slot:
                date && isSlotAllowed(date, day.slot || "")
                  ? day.slot
                  : "",
            };
          }),
        };
      }

      return {
        ...prev,
        [cartKey]: nextSchedule,
      };
    });

    setSlotMsg(null);
  };

  const applyDayOneSlotToAllDays = (cartKey: string) => {
    const schedule = challengeSchedules[cartKey] || [];
    const firstDay = schedule.find((day) => Number(day.day) === 1);

    if (!firstDay?.date) {
      setSlotMsg("Please select Day 1 date first.");
      return;
    }

    if (!firstDay?.slot) {
      setSlotMsg("Please select Day 1 slot first.");
      return;
    }

    setChallengeSchedules((prev) => ({
      ...prev,
      [cartKey]: (prev[cartKey] || []).map((day) => {
        const date = addDaysToISO(firstDay.date, Number(day.day) - 1);

        return {
          ...day,
          date,
          slot: isSlotAllowed(date, firstDay.slot) ? firstDay.slot : "",
        };
      }),
    }));

    setSlotMsg(null);
  };

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

    setAddressForm((prev) => ({
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
    if (!window.google?.maps) return null;

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

  const openAddressModal = () => {
    setAddressForm(selectedAddress || emptyAddress);
    setAddressSearch(
      selectedAddress?.formattedAddress || selectedAddress?.locationText || ""
    );
    setLocationMsg(null);
    setAddressMsg(null);
    setShowAddressModal(true);

    googleMapInstanceRef.current = null;
    googleMarkerRef.current = null;
  };

  const saveAddress = async () => {
    setAddressMsg(null);
    setLocationMsg(null);

    if (
      !addressForm.fullName ||
      !addressForm.phone ||
      !addressForm.flatNo ||
      !addressForm.buildingName ||
      !addressForm.city ||
      !addressForm.state ||
      !addressForm.pincode
    ) {
      setAddressMsg("Please fill complete delivery address.");
      return;
    }

    if (
      addressForm.lat == null ||
      addressForm.lng == null ||
      !addressForm.mapsUrl
    ) {
      setLocationMsg("Please select exact delivery location.");
      return;
    }

    try {
      setSavingAddress(true);

      const lat = Number(addressForm.lat);
      const lng = Number(addressForm.lng);

      const res = await api.post("/user/addresses", {
        ...addressForm,
        lat,
        lng,
        mapsUrl: addressForm.mapsUrl || makeMapsUrl(lat, lng),
        locationText: addressForm.locationText || `${lat}, ${lng}`,
        formattedAddress: addressForm.formattedAddress || `${lat}, ${lng}`,
      });

      const addresses = res.data?.addresses || [];

      setSavedAddresses(addresses);

      const selected =
        addresses.find((item: SavedAddress) => item.isDefault) || addresses[0];

      if (selected) {
        setSelectedAddress(selected);
      }

      setShowAddressModal(false);
      setStep("schedule");
    } catch (error: any) {
      setAddressMsg(error?.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const validateAddressStep = () => {
    if (!selectedAddress) {
      setAddressMsg("Please select or add a delivery address.");
      return false;
    }

    if (
      selectedAddress.lat == null ||
      selectedAddress.lng == null ||
      !selectedAddress.mapsUrl
    ) {
      setAddressMsg("Selected address does not have exact map location.");
      return false;
    }

    setAddressMsg(null);
    return true;
  };

  const validateChallengeSchedules = () => {
    for (const item of cart as any[]) {
      if (!isChallengePlan(item)) continue;

      const key = getCartKey(item);
      const schedule = challengeSchedules[key] || [];

      if (!schedule.length) {
        setSlotMsg(`Please select challenge schedule for ${item.title}.`);
        return false;
      }

      for (const day of schedule) {
        if (!day.date || !day.slot) {
          setSlotMsg("Please select date and slot for all challenge days.");
          return false;
        }

        if (!isSlotAllowed(day.date, day.slot)) {
          setSlotMsg(
            `Day ${day.day} slot is not available. Choose a slot at least 3 hours later.`
          );
          return false;
        }
      }
    }

    setSlotMsg(null);
    return true;
  };

  const validateScheduleStep = () => {
    if (!validateChallengeSchedules()) return false;

    if (hasNormalMeals) {
      if (!slotDate || !slotTime) {
        setSlotMsg("Please select delivery time for normal meals.");
        return false;
      }

      if (!isSlotAllowed(slotDate, slotTime)) {
        setSlotMsg("Normal meal time slot is not available.");
        return false;
      }
    }

    setSlotMsg(null);
    return true;
  };

  const getFinalPlanDays = (item: any) => {
    const key = getCartKey(item);

    return (challengeSchedules[key] || []).map((day) => ({
      day: day.day,
      date: day.date,
      slot: day.slot,
      preference: day.preference,
      selectedMeal: day.selectedMeal,
      selectedMealTitle: day.selectedMealTitle,
      selectedMealPrice: day.selectedMealPrice,
      selectedMealProtein: day.selectedMealProtein,
      selectedMealCalories: day.selectedMealCalories,
      selectedMealCarbs: day.selectedMealCarbs,
      selectedMealFat: day.selectedMealFat,
      alternativeMeal: null,
      alternativeMealTitle: "",
      deliveryStatus: "scheduled",
      kitchenStatus: "pending",
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

  const checkout = async () => {
    if (!validateAddressStep()) {
      setStep("address");
      return;
    }

    if (!validateScheduleStep()) {
      setStep("schedule");
      return;
    }

    const lat = Number(selectedAddress?.lat);
    const lng = Number(selectedAddress?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAddressMsg("Please select exact delivery location again.");
      setStep("address");
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

      const firstChallengeDay = cart
        .filter((item: any) => isChallengePlan(item))
        .flatMap((item: any) => getFinalPlanDays(item))[0];

      const payload = {
        items: cart.map((item: any) => {
          const finalPlanDays = isChallengePlan(item)
            ? getFinalPlanDays(item)
            : [];

          return {
            mealId:
              item.itemType === "challenge_plan"
                ? item.planItems?.[0]?._id ||
                  finalPlanDays?.[0]?.selectedMeal ||
                  item._id
                : item._id,

            itemType: item.itemType || "meal",
            challengeId: item.challengeId || "",
            title: item.title,
            description: item.description || "",
            price: item.price,
            qty: item.qty,
            protein: item.protein,
            calories: item.calories,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            planItems: item.planItems || [],
            planDays: finalPlanDays,
          };
        }),
        couponCode: finalCouponCode,
        couponApplyOn: "challenge_plan",

        address: {
          ...selectedAddress,
          locationMode: selectedAddress?.locationMode || "manual",
          lat,
          lng,
          mapsUrl: selectedAddress?.mapsUrl || makeMapsUrl(lat, lng),
          locationText: selectedAddress?.locationText || `${lat}, ${lng}`,
          formattedAddress:
            selectedAddress?.formattedAddress || `${lat}, ${lng}`,
        },

        deliverySlot: hasNormalMeals
          ? {
              date: slotDate,
              time: slotTime,
            }
          : {
              date: firstChallengeDay?.date || "",
              time: firstChallengeDay?.slot || "",
            },
      };

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
          name: selectedAddress?.fullName,
          contact: selectedAddress?.phone,
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

  const goNext = () => {
    if (step === "cart") {
      setStep("address");
      return;
    }

    if (step === "address") {
      if (validateAddressStep()) setStep("schedule");
      return;
    }

    if (step === "schedule") {
      if (validateScheduleStep()) setStep("payment");
      return;
    }

    checkout();
  };

  const primaryButtonText =
    step === "cart"
      ? "Continue"
      : step === "address"
      ? "Deliver Here"
      : step === "schedule"
      ? "Review & Pay"
      : checkingOut
      ? "Processing..."
      : "Proceed to Pay";

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#f2f3f5] px-4 py-14 text-slate-950 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[760px] rounded-[20px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <ShoppingBag size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950">
            Your cart is empty
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Add your favourite MacroBox meals to continue checkout.
          </p>

          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="mt-7 rounded-[14px] bg-green-600 px-7 py-3 text-sm font-black text-white transition hover:bg-green-700"
          >
            Explore Meals
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef0f2] pb-28 text-slate-950 lg:pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-green-600 text-white">
              <ShieldCheck size={23} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Secure Checkout
              </p>
              <h1 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                MacroBox Cart
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
          >
            Add more meals
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_390px]">
        <section className="space-y-5">
          <StepCard
            stepNo="1"
            title="Review cart"
            active={step === "cart"}
            done={step !== "cart"}
            onChange={() => setStep("cart")}
          >
            <div className="grid gap-3">
              {cart.map((item: any) => {
                const isPlan = isChallengePlan(item);

                return (
                  <div
                    key={getCartKey(item)}
                    className="rounded-[16px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-950">
                            {item.title}
                          </h3>

                          {isPlan && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700">
                              Challenge Plan
                            </span>
                          )}
                        </div>

                        {isPlan && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {(item.planItems || item.planDays || []).length || 7}{" "}
                            meals included. Schedule will be selected later.
                          </p>
                        )}

                        {!isPlan && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Normal meal delivery time will be selected later.
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <MacroPill color="green">
                            Protein {item.protein * item.qty}g
                          </MacroPill>
                          <MacroPill color="orange">
                            Calories {item.calories * item.qty} kcal
                          </MacroPill>
                          <MacroPill color="yellow">
                            Carbs {(item.carbs || 0) * item.qty}g
                          </MacroPill>
                          <MacroPill color="blue">
                            Fat {(item.fat || 0) * item.qty}g
                          </MacroPill>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <p className="text-base font-black text-slate-950">
                          ₹{item.price * item.qty}
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQty(item._id, item.challengeId)
                            }
                            disabled={isPlan}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={15} />
                          </button>

                          <span className="flex min-w-7 justify-center text-sm font-black">
                            {item.qty}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQty(item._id, item.challengeId)
                            }
                            disabled={isPlan}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item._id, item.challengeId)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </StepCard>

          <StepCard
            stepNo="2"
            title="Delivery address"
            active={step === "address"}
            done={Boolean(selectedAddress) && step !== "address" && step !== "cart"}
            onChange={() => setStep("address")}
          >
            {selectedAddress && step !== "address" ? (
              <SelectedSummary
                title={selectedAddress.addressLabel}
                description={addressPreview(selectedAddress)}
                action="Change"
                onClick={() => setStep("address")}
              />
            ) : (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Choose from saved addresses or add a new one.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="w-fit rounded-[12px] border border-green-200 bg-green-50 px-4 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"
                  >
                    Add New Address
                  </button>
                </div>

                {loadingSavedAddresses ? (
                  <p className="rounded-[16px] bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Loading saved addresses...
                  </p>
                ) : savedAddresses.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-black text-slate-800">
                      No saved address found
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Add your delivery address to continue.
                    </p>
                    <button
                      type="button"
                      onClick={openAddressModal}
                      className="mt-4 rounded-[12px] bg-green-600 px-5 py-2 text-sm font-black text-white"
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {savedAddresses.map((address) => {
                      const selected =
                        String(selectedAddress?._id || "") ===
                        String(address._id || "");

                      return (
                        <button
                          key={address._id}
                          type="button"
                          onClick={() => {
                            setSelectedAddress(address);
                            setAddressMsg(null);
                          }}
                          className={`rounded-[16px] border p-4 text-left transition ${
                            selected
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 bg-white hover:border-green-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                selected
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {addressIcon(address.addressLabel)}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-950">
                                  {address.addressLabel}
                                </p>

                                {selected && (
                                  <CheckCircle2
                                    size={16}
                                    className="text-green-600"
                                  />
                                )}
                              </div>

                              <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
                                {addressPreview(address)}
                              </p>

                              <p className="mt-3 text-xs font-black text-green-700">
                                Deliver Here
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {addressMsg && (
                  <MessageBox type="error" message={addressMsg} />
                )}
              </div>
            )}
          </StepCard>

          <StepCard
            stepNo="3"
            title="Delivery schedule"
            active={step === "schedule"}
            done={step === "payment"}
            onChange={() => setStep("schedule")}
          >
            {step !== "schedule" && step === "payment" ? (
              <SelectedSummary
                title="Schedule selected"
                description="Delivery timing is ready for payment."
                action="Change"
                onClick={() => setStep("schedule")}
              />
            ) : (
              <div className="space-y-4">
                {hasChallengePlans &&
                  cart
                    .filter((item: any) => isChallengePlan(item))
                    .map((item: any) => {
                      const cartKey = getCartKey(item);
                      const schedule = challengeSchedules[cartKey] || [];
                      const dayOne = schedule.find(
                        (day) => Number(day.day) === 1
                      );

                      return (
                        <div
                          key={cartKey}
                          className="rounded-[18px] border border-blue-100 bg-blue-50 p-3 sm:p-4"
                        >
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-blue-700">
                                <CalendarClock size={16} />
                                Challenge schedule
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {item.title}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => applyDayOneSlotToAllDays(cartKey)}
                              disabled={!dayOne?.date || !dayOne?.slot}
                              className="h-9 w-fit rounded-full bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Apply Day 1 slot to all
                            </button>
                          </div>

                          <div className="grid gap-3">
                            {schedule.map((day) => (
                              <div
                                key={`${cartKey}-day-${day.day}`}
                                className="rounded-[16px] bg-white p-3 sm:p-4"
                              >
                                <div className="flex flex-col gap-1">
                                  <p className="break-words text-sm font-black leading-5 text-slate-950 sm:text-base">
                                    Day {day.day}: {day.selectedMealTitle}
                                  </p>

                                  {day.day !== 1 && (
                                    <p className="text-xs font-bold text-slate-400">
                                      Date auto-selected from Day 1
                                    </p>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <label className="relative block w-full">
                                    <span className={scheduleInputClass}>
                                      {formatDateForDisplay(day.date)}
                                    </span>

                                    <input
                                      type="date"
                                      min={todayISO()}
                                      value={day.date}
                                      disabled={day.day !== 1}
                                      onChange={(event) =>
                                        updateChallengeScheduleDay(
                                          cartKey,
                                          day.day,
                                          {
                                            date: event.target.value,
                                          }
                                        )
                                      }
                                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                    />
                                  </label>

                                  <select
                                    value={day.slot}
                                    onChange={(event) =>
                                      updateChallengeScheduleDay(
                                        cartKey,
                                        day.day,
                                        {
                                          slot: event.target.value,
                                        }
                                      )
                                    }
                                    className={scheduleInputClass}
                                  >
                                    <option value="">Select delivery slot</option>

                                    {slots.map((slot) => {
                                      const allowed = isSlotAllowed(
                                        day.date,
                                        slot
                                      );

                                      return (
                                        <option
                                          key={slot}
                                          value={slot}
                                          disabled={!allowed}
                                        >
                                          {optionLabel(
                                            format12hFromSlot(slot),
                                            allowed
                                          )}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <p className="mt-2 text-xs font-bold text-slate-500">
                                  {day.date
                                    ? formatDateForDisplay(day.date)
                                    : "Date not selected"}{" "}
                                  •{" "}
                                  {day.slot
                                    ? format12hFromSlot(day.slot)
                                    : "Slot not selected"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                {hasNormalMeals && (
                  <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                    <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
                      <Clock size={16} className="text-green-600" />
                      Normal meal delivery
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      This slot is only for normal meals, separate from challenge
                      plan days.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="date"
                        className={inputClass}
                        value={slotDate}
                        onChange={(event) => {
                          const newDate = event.target.value;
                          setSlotDate(newDate);
                          setSlotMsg(null);

                          if (!isSlotAllowed(newDate, slotTime)) {
                            setSlotTime("");
                          }
                        }}
                        min={todayISO()}
                      />

                      <select
                        className={inputClass}
                        value={slotTime}
                        onChange={(event) => {
                          setSlotTime(event.target.value);
                          setSlotMsg(null);
                        }}
                      >
                        <option value="">Select delivery slot</option>

                        {slots.map((slot) => {
                          const allowed = isSlotAllowed(slotDate, slot);

                          return (
                            <option
                              key={slot}
                              value={slot}
                              disabled={!allowed}
                            >
                              {optionLabel(format12hFromSlot(slot), allowed)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                <p className="rounded-[14px] border border-yellow-200 bg-yellow-50 p-3 text-xs font-bold leading-5 text-yellow-800">
                  Every delivery must be scheduled at least <b>3 hours</b>{" "}
                  before the selected slot.
                </p>

                {slotMsg && <MessageBox type="error" message={slotMsg} />}
              </div>
            )}
          </StepCard>

          <StepCard
            stepNo="4"
            title="Payment"
            active={step === "payment"}
            done={false}
            onChange={() => setStep("payment")}
          >
            <div className="rounded-[16px] border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-black text-green-800">
                Review your order and proceed to secure payment.
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-green-700">
                Please confirm your address and delivery schedule before paying.
              </p>
            </div>

            {couponMsg && (
              <MessageBox
                type={couponMsgType === "error" ? "error" : "success"}
                message={couponMsg}
              />
            )}
          </StepCard>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <BillSummary
            totalProtein={totalProtein}
            totalCalories={totalCalories}
            totalCarbs={totalCarbs}
            totalFat={totalFat}
            normalMealsSubtotal={normalMealsSubtotal}
            planSubtotal={planSubtotal}
            discount={discount}
            payable={payable}
          />

          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <IconCircle>
                <Tag size={18} />
              </IconCircle>

              <h2 className="text-lg font-black text-slate-950">
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyCoupon()}
                disabled={applying}
                className="h-11 rounded-[12px] bg-green-600 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {applying ? "Applying..." : "Apply"}
              </button>

              <button
                type="button"
                onClick={removeCoupon}
                disabled={!coupon && discount === 0}
                className="h-11 rounded-[12px] border border-red-100 bg-red-50 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            {couponMsg && (
              <MessageBox
                type={couponMsgType === "error" ? "error" : "success"}
                message={couponMsg}
              />
            )}

            <div className="mt-4">
              <p className="mb-2 text-sm font-black text-slate-900">
                Available Coupons
              </p>

              {loadingCoupons ? (
                <p className="text-sm font-medium text-slate-500">
                  Loading coupons...
                </p>
              ) : availableCoupons.length === 0 ? (
                <p className="rounded-[14px] border border-slate-200 bg-slate-50 p-3 text-center text-sm font-medium text-slate-500">
                  No coupons available.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableCoupons.map((item) => {
                    const from = prettyDate(item.validFrom);
                    const to = prettyDate(item.validTo);

                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => applyCoupon(item.code)}
                        disabled={applying}
                        className="w-full rounded-[14px] border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-green-500 hover:bg-green-50"
                      >
                        <p className="text-sm font-black text-slate-950">
                          {item.code}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {formatCouponLabel(item)}
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
          </section>

          <button
            type="button"
            onClick={step === "payment" ? checkout : goNext}
            disabled={checkingOut}
            className="hidden h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-green-600 text-base font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.22)] transition hover:bg-green-700 disabled:opacity-60 lg:flex"
          >
            <LocateFixed size={18} />
            {primaryButtonText}
            {step !== "payment" && <ChevronRight size={18} />}
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-slate-200 bg-white/95 p-3 shadow-[0_-18px_45px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Payable
            </p>

            <p className="text-2xl font-black tracking-[-0.05em] text-green-700">
              ₹{payable}
            </p>
          </div>

          <button
            type="button"
            onClick={step === "payment" ? checkout : goNext}
            disabled={checkingOut}
            className="flex h-13 min-w-[190px] items-center justify-center gap-2 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
          >
            <LocateFixed size={18} />
            {primaryButtonText}
          </button>
        </div>
      </div>

      {showAddressModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/55">
          <div className="h-full w-full overflow-y-auto">
            <div className="min-h-full bg-white md:max-w-[560px]">
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>

                <p className="text-lg font-black text-slate-950">
                  Save delivery address
                </p>
              </div>

              <div className="p-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                    <Search size={17} className="text-green-600" />
                    Search location
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
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
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={geocodeTypedAddress}
                      disabled={searchingAddress}
                      className="h-12 rounded-[14px] bg-green-600 px-5 text-sm font-black text-white disabled:opacity-60"
                    >
                      {searchingAddress ? "Searching..." : "Search"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="mt-3 h-12 w-full rounded-[14px] bg-green-600 text-sm font-black text-white transition hover:bg-green-700"
                  >
                    <Navigation size={17} className="mr-1 inline" />
                    Use Current Location
                  </button>

                  {addressForm.lat != null && addressForm.lng != null && (
                    <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                      <div className="relative h-[260px] w-full">
                        <div ref={googleMapRef} className="h-full w-full" />
                      </div>
                    </div>
                  )}

                  {locationMsg && (
                    <MessageBox type="error" message={locationMsg} />
                  )}
                </div>

                <div className="mt-4 rounded-[18px] border border-slate-200 bg-white p-4">
                  <p className="mb-4 text-sm font-black text-slate-900">
                    Address details
                  </p>

                  <div className="grid gap-3">
                    <input
                      placeholder="Full Name"
                      className={inputClass}
                      value={addressForm.fullName}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          fullName: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Phone Number"
                      className={inputClass}
                      value={addressForm.phone}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          phone: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Flat / House No"
                      className={inputClass}
                      value={addressForm.flatNo}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          flatNo: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Floor optional"
                      className={inputClass}
                      value={addressForm.floor}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          floor: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Building / Apartment"
                      className={inputClass}
                      value={addressForm.buildingName}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          buildingName: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Area / Locality"
                      className={inputClass}
                      value={addressForm.area}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          area: event.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Landmark optional"
                      className={inputClass}
                      value={addressForm.landmark}
                      onChange={(event) =>
                        setAddressForm({
                          ...addressForm,
                          landmark: event.target.value,
                        })
                      }
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        placeholder="City"
                        className={inputClass}
                        value={addressForm.city}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            city: event.target.value,
                          })
                        }
                      />

                      <input
                        placeholder="State"
                        className={inputClass}
                        value={addressForm.state}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            state: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        placeholder="Pincode"
                        className={inputClass}
                        value={addressForm.pincode}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            pincode: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          })
                        }
                      />

                      <select
                        className={inputClass}
                        value={addressForm.addressLabel}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
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
                  </div>

                  {addressMsg && (
                    <MessageBox type="error" message={addressMsg} />
                  )}

                  <button
                    type="button"
                    onClick={saveAddress}
                    disabled={savingAddress}
                    className="mt-4 h-13 w-full rounded-[14px] bg-green-600 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {savingAddress ? "Saving..." : "Save Address & Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StepCard({
  stepNo,
  title,
  active,
  done,
  onChange,
  children,
}: {
  stepNo: string;
  title: string;
  active: boolean;
  done: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-sm font-black ${
              active
                ? "bg-slate-950 text-white"
                : done
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {done ? <CheckCircle2 size={18} /> : stepNo}
          </span>

          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
            {title}
          </h2>
        </div>

        {done && (
          <button
            type="button"
            onClick={onChange}
            className="text-xs font-black uppercase text-orange-600"
          >
            Change
          </button>
        )}
      </div>

      {(active || done) && children}
    </section>
  );
}

function SelectedSummary({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black text-green-700"
      >
        {action}
      </button>
    </div>
  );
}

function BillSummary({
  totalProtein,
  totalCalories,
  totalCarbs,
  totalFat,
  normalMealsSubtotal,
  planSubtotal,
  discount,
  payable,
}: {
  totalProtein: number;
  totalCalories: number;
  totalCarbs: number;
  totalFat: number;
  normalMealsSubtotal: number;
  planSubtotal: number;
  discount: number;
  payable: number;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <IconCircle>
          <ShieldCheck size={19} />
        </IconCircle>

        <h2 className="text-lg font-black text-slate-950">Bill Details</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryMetric color="green" label="Protein" value={`${totalProtein}`} unit="g" />
        <SummaryMetric
          color="orange"
          label="Calories"
          value={`${totalCalories}`}
          unit="kcal"
        />
        <SummaryMetric color="yellow" label="Carbs" value={`${totalCarbs}`} unit="g" />
        <SummaryMetric color="blue" label="Fat" value={`${totalFat}`} unit="g" />
      </div>

      <hr className="my-5 border-slate-200" />

      <div className="space-y-3 text-sm">
        <BillRow label="Meals Subtotal" value={`₹${normalMealsSubtotal}`} />
        <BillRow label="Challenge Plan" value={`₹${planSubtotal}`} />
        <BillRow label="Plan Discount" value={`-₹${discount}`} muted />

        <div className="border-t border-slate-200 pt-4">
          <div className="flex justify-between text-lg font-black">
            <span className="text-slate-950">To Pay</span>
            <span className="text-green-700">₹{payable}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function BillRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <p className="flex justify-between">
      <span className="font-medium text-slate-500">{label}</span>
      <b className={muted ? "text-slate-500" : "text-slate-950"}>{value}</b>
    </p>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
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
    <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>
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
    <div className={`rounded-[14px] border p-3 ${className}`}>
      <p className="text-xs font-black">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">
        {value} <span className="text-sm font-bold text-slate-500">{unit}</span>
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
      className={`mt-3 rounded-[14px] p-3 text-sm font-bold ${
        type === "error"
          ? "bg-red-50 text-red-600"
          : "bg-green-50 text-green-700"
      }`}
    >
      {message}
    </p>
  );
}