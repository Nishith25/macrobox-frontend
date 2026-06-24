// frontend/src/pages/Cart.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AddressFormDrawer from "../components/account/AddressFormDrawer";
import { useCart } from "../context/CartContext";
import api from "../api/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 19;

type StepType =
  | "cart"
  | "address"
  | "schedule"
  | "payment";

type LocationMode =
  | "manual"
  | "current";

type MsgType =
  | "success"
  | "error"
  | null;

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
  addressLabel:
    | "Home"
    | "Work"
    | "Other";
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
  applyOn?:
    | "cart"
    | "meal"
    | "plan"
    | "challenge_plan";
  rewardType?:
    | "none"
    | "next_plan"
    | "manual";
};

type PlanScheduleDay = {
  day: number;
  date: string;
  slot: string;
  preference:
    | "veg"
    | "nonveg"
    | "mixed";
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

const pad2 = (number: number) =>
  String(number).padStart(2, "0");

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const addDaysToISO = (
  isoDate: string,
  daysToAdd: number
) => {
  if (!isoDate) return "";

  const [year, month, day] =
    isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  date.setDate(
    date.getDate() + daysToAdd
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const formatDateForDisplay = (
  isoDate: string
) => {
  if (!isoDate) {
    return "Select date";
  }

  const [year, month, day] =
    isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "Select date";
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const format12hFromHour = (
  hour24: number
) => {
  const period =
    hour24 >= 12 ? "PM" : "AM";

  const hour =
    hour24 % 12 === 0
      ? 12
      : hour24 % 12;

  return `${hour}:00 ${period}`;
};

const format12hFromSlot = (
  slotHHmm: string
) => {
  if (!slotHHmm) {
    return "Select slot";
  }

  return format12hFromHour(
    Number(slotHHmm.split(":")[0])
  );
};

const buildSlots = () => {
  const slots: string[] = [];

  for (
    let hour = SLOT_START_HOUR;
    hour <= SLOT_END_HOUR;
    hour += 1
  ) {
    slots.push(`${pad2(hour)}:00`);
  }

  return slots;
};

const getHourFromSlot = (
  slotHHmm: string
) =>
  Number(slotHHmm.split(":")[0]);

const isSlotAllowed = (
  selectedDateISO: string,
  slotHHmm: string
) => {
  if (
    !selectedDateISO ||
    !slotHHmm
  ) {
    return false;
  }

  const [year, month, day] =
    selectedDateISO
      .split("-")
      .map(Number);

  const hour =
    getHourFromSlot(slotHHmm);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour)
  ) {
    return false;
  }

  const slotDateTime =
    new Date(
      year,
      month - 1,
      day,
      hour,
      0,
      0,
      0
    );

  const minimumAllowed =
    new Date();

  minimumAllowed.setHours(
    minimumAllowed.getHours() + 3
  );

  return (
    slotDateTime.getTime() >=
    minimumAllowed.getTime()
  );
};

const optionLabel = (
  label: string,
  allowed: boolean
) =>
  allowed
    ? label
    : `${label} — Not available`;

const makeMapsUrl = (
  lat: number,
  lng: number
) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

const prettyDate = (
  iso?: string | null
) => {
  if (!iso) return null;

  const date = new Date(iso);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};

const formatCouponLabel = (
  coupon: AvailableCoupon
) => {
  const rewardText =
    coupon.rewardType ===
      "next_plan" ||
    coupon.applyOn === "plan"
      ? "next plan"
      : "cart";

  if (coupon.type === "flat") {
    return `₹${coupon.value} OFF on ${rewardText}`;
  }

  return `${coupon.value}% OFF on ${rewardText}`;
};

const getAddressComponent = (
  components:
    | google.maps.GeocoderAddressComponent[]
    | undefined,
  type: string
) => {
  if (!components) return "";

  const found = components.find(
    (component) =>
      component.types.includes(type)
  );

  return found?.long_name || "";
};

const getGoogleCity = (
  components:
    | google.maps.GeocoderAddressComponent[]
    | undefined
) =>
  getAddressComponent(
    components,
    "locality"
  ) ||
  getAddressComponent(
    components,
    "administrative_area_level_3"
  ) ||
  getAddressComponent(
    components,
    "administrative_area_level_2"
  );

const getGoogleArea = (
  components:
    | google.maps.GeocoderAddressComponent[]
    | undefined
) =>
  getAddressComponent(
    components,
    "sublocality_level_1"
  ) ||
  getAddressComponent(
    components,
    "sublocality"
  ) ||
  getAddressComponent(
    components,
    "neighborhood"
  ) ||
  getAddressComponent(
    components,
    "route"
  );

const loadGoogleMapsScript = (
  apiKey: string
): Promise<void> =>
  new Promise(
    (resolve, reject) => {
      if (
        window.google?.maps?.places
      ) {
        resolve();
        return;
      }

      const existingScript =
        document.getElementById(
          "google-maps-script"
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve()
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Google Maps script failed to load"
              )
            )
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.id =
        "google-maps-script";

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
        "&libraries=places,geometry";

      script.async = true;
      script.defer = true;

      script.onload = () =>
        resolve();

      script.onerror = () =>
        reject(
          new Error(
            "Google Maps script failed to load"
          )
        );

      document.head.appendChild(
        script
      );
    }
  );

const isPlanItem = (item: any) =>
  item?.itemType === "plan" ||
  item?.itemType ===
    "challenge_plan" ||
  Boolean(item?.planId) ||
  Boolean(item?.challengeId);

const getFinalPlanId = (
  item: any
) =>
  String(
    item?.planId ||
      item?.challengeId ||
      item?._id ||
      ""
  )
    .replace(/^plan-/, "")
    .trim();

const getCartKey = (item: any) => {
  const planId =
    getFinalPlanId(item);

  if (
    isPlanItem(item) &&
    planId
  ) {
    return `${item._id}-${planId}`;
  }

  return `${item._id}-meal`;
};

const cleanPlanTitle = (
  title?: string
) =>
  String(title || "Meal").replace(
    /^Day\s+\d+:\s*/i,
    ""
  );

const buildScheduleFromCartItem = (
  item: any
): PlanScheduleDay[] => {
  if (!isPlanItem(item)) {
    return [];
  }

  if (
    Array.isArray(
      item.planDays
    ) &&
    item.planDays.length > 0
  ) {
    return item.planDays.map(
      (day: any, index: number) => ({
        day: Number(
          day.day || index + 1
        ),

        date: String(
          day.date || ""
        ),

        slot: String(
          day.slot || ""
        ),

        preference:
          day.preference ||
          item.preference ||
          "mixed",

        selectedMeal: String(
          day.selectedMeal ||
            day.selectedMealId ||
            ""
        ),

        selectedMealTitle:
          cleanPlanTitle(
            day.selectedMealTitle ||
              `Day ${
                index + 1
              } Meal`
          ),

        selectedMealPrice:
          Number(
            day.selectedMealPrice ||
              0
          ),

        selectedMealProtein:
          Number(
            day.selectedMealProtein ||
              0
          ),

        selectedMealCalories:
          Number(
            day.selectedMealCalories ||
              0
          ),

        selectedMealCarbs:
          Number(
            day.selectedMealCarbs ||
              0
          ),

        selectedMealFat:
          Number(
            day.selectedMealFat ||
              0
          ),
      })
    );
  }

  if (
    Array.isArray(
      item.planItems
    ) &&
    item.planItems.length > 0
  ) {
    return item.planItems.map(
      (
        meal: any,
        index: number
      ) => ({
        day: index + 1,
        date: "",
        slot: "",

        preference:
          item.preference ||
          "mixed",

        selectedMeal: String(
          meal._id || ""
        ),

        selectedMealTitle:
          cleanPlanTitle(
            meal.title ||
              `Day ${
                index + 1
              } Meal`
          ),

        selectedMealPrice:
          Number(
            meal.price || 0
          ),

        selectedMealProtein:
          Number(
            meal.protein || 0
          ),

        selectedMealCalories:
          Number(
            meal.calories || 0
          ),

        selectedMealCarbs:
          Number(
            meal.carbs || 0
          ),

        selectedMealFat:
          Number(meal.fat || 0),
      })
    );
  }

  return [];
};

const addressPreview = (
  address?:
    | Partial<Address>
    | null
) => {
  if (!address) {
    return "Address not available";
  }

  if (
    address.formattedAddress
  ) {
    return address.formattedAddress;
  }

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

  return parts.length
    ? parts.join(", ")
    : "Address not available";
};

const addressIcon = (
  label?: string
) => {
  if (label === "Work") {
    return <Briefcase size={18} />;
  }

  if (label === "Home") {
    return <Home size={18} />;
  }

  return <MapPin size={18} />;
};

export default function Cart() {
  const navigate = useNavigate();

  const {
    cart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  } = useCart();

  const [step, setStep] =
    useState<StepType>("cart");

  const [coupon, setCoupon] =
    useState("");

  const [discount, setDiscount] =
    useState(0);

  const [
    couponMsg,
    setCouponMsg,
  ] = useState<string | null>(
    null
  );

  const [
    couponMsgType,
    setCouponMsgType,
  ] = useState<MsgType>(null);

  const [
    addressMsg,
    setAddressMsg,
  ] = useState<string | null>(
    null
  );

  const [slotMsg, setSlotMsg] =
    useState<string | null>(
      null
    );

  const [
    locationMsg,
    setLocationMsg,
  ] = useState<string | null>(
    null
  );

  const [applying, setApplying] =
    useState(false);

  const [
    checkingOut,
    setCheckingOut,
  ] = useState(false);

  const [
    savedAddresses,
    setSavedAddresses,
  ] = useState<SavedAddress[]>([]);

  const [
    loadingSavedAddresses,
    setLoadingSavedAddresses,
  ] = useState(false);

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<SavedAddress | null>(
      null
    );

  const [
    showAddressModal,
    setShowAddressModal,
  ] = useState(false);

  const [
    addressForm,
    setAddressForm,
  ] =
    useState<Address>(emptyAddress);

  const [
    addressSearch,
    setAddressSearch,
  ] = useState("");

  const [
    savingAddress,
    setSavingAddress,
  ] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);

  const googleAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(
      null
    );

  const googleMapRef = useRef<HTMLDivElement>(null);

  const googleMapInstanceRef =
    useRef<google.maps.Map | null>(
      null
    );

  const googleMarkerRef =
    useRef<google.maps.Marker | null>(
      null
    );

  const [
    googleSearchReady,
    setGoogleSearchReady,
  ] = useState(false);

  const [
    searchingAddress,
    setSearchingAddress,
  ] = useState(false);

  const slots = useMemo(
    () => buildSlots(),
    []
  );

  const [slotDate, setSlotDate] =
    useState("");

  const [slotTime, setSlotTime] =
    useState("");

  const [
    planSchedules,
    setPlanSchedules,
  ] = useState<
    Record<
      string,
      PlanScheduleDay[]
    >
  >({});

  const [
    availableCoupons,
    setAvailableCoupons,
  ] = useState<
    AvailableCoupon[]
  >([]);

  const [
    loadingCoupons,
    setLoadingCoupons,
  ] = useState(false);

  const hasPlans = useMemo(
    () =>
      cart.some((item: any) =>
        isPlanItem(item)
      ),
    [cart]
  );

  const hasNormalMeals =
    useMemo(
      () =>
        cart.some(
          (item: any) =>
            !isPlanItem(item)
        ),
      [cart]
    );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          item.price * item.qty,
        0
      ),
    [cart]
  );

  const planSubtotal =
    useMemo(
      () =>
        cart
          .filter((item: any) =>
            isPlanItem(item)
          )
          .reduce(
            (sum, item) =>
              sum +
              item.price *
                item.qty,
            0
          ),
      [cart]
    );

  const normalMealsSubtotal =
    useMemo(
      () =>
        cart
          .filter(
            (item: any) =>
              !isPlanItem(item)
          )
          .reduce(
            (sum, item) =>
              sum +
              item.price *
                item.qty,
            0
          ),
      [cart]
    );

  const totalProtein =
    useMemo(
      () =>
        cart.reduce(
          (sum, item) =>
            sum +
            item.protein *
              item.qty,
          0
        ),
      [cart]
    );

  const totalCalories =
    useMemo(
      () =>
        cart.reduce(
          (sum, item) =>
            sum +
            item.calories *
              item.qty,
          0
        ),
      [cart]
    );

  const totalCarbs =
    useMemo(
      () =>
        cart.reduce(
          (sum, item) =>
            sum +
            (item.carbs ||
              0) *
              item.qty,
          0
        ),
      [cart]
    );

  const totalFat = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          (item.fat || 0) *
            item.qty,
        0
      ),
    [cart]
  );

  const payable = Math.max(
    subtotal - discount,
    0
  );

  const themedInputClass =
    "mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium";

  const scheduleInputClass =
    "mb-input h-12 w-full min-w-0 rounded-2xl px-4 text-sm font-medium";

  useEffect(() => {
    setPlanSchedules(
      (previous) => {
        const next: Record<
          string,
          PlanScheduleDay[]
        > = {};

        cart.forEach(
          (item: any) => {
            if (
              !isPlanItem(item)
            ) {
              return;
            }

            const key =
              getCartKey(item);

            next[key] =
              previous[key]
                ?.length
                ? previous[key]
                : buildScheduleFromCartItem(
                    item
                  );
          }
        );

        return next;
      }
    );
  }, [cart]);

  useEffect(() => {
    void fetchSavedAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      void fetchAvailableCoupons();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSubtotal, cart.length]);

  useEffect(() => {
    const styleId =
      "macrobox-google-places-premium-style";

    if (
      document.getElementById(
        styleId
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id = styleId;

    style.innerHTML = `
      .pac-container {
        z-index: 999999 !important;
        margin-top: 12px !important;
        border-radius: 18px !important;
        border: 1px solid var(--mb-border) !important;
        background: var(--mb-bg-secondary) !important;
        color: var(--mb-text) !important;
        box-shadow: var(--mb-shadow-large) !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        overflow: hidden !important;
        padding: 8px 0 !important;
      }

      .pac-item {
        padding: 14px 18px !important;
        font-size: 14px !important;
        line-height: 22px !important;
        cursor: pointer !important;
        border-top: 1px solid var(--mb-divider) !important;
        color: var(--mb-text-muted) !important;
      }

      .pac-item:first-child {
        border-top: none !important;
      }

      .pac-item:hover {
        background: var(--mb-surface-hover) !important;
      }

      .pac-item-query {
        font-size: 15px !important;
        font-weight: 600 !important;
        color: var(--mb-text) !important;
      }

      .pac-matched {
        font-weight: 700 !important;
        color: var(--mb-accent-text) !important;
      }

      .pac-icon {
        filter: invert(1);
        opacity: 0.55;
      }
    `;

    document.head.appendChild(
      style
    );
  }, []);

  useEffect(() => {
    if (!showAddressModal) {
      return;
    }

    const apiKey =
      import.meta.env
        .VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLocationMsg(
        "Google Maps API key is missing."
      );

      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setGoogleSearchReady(
          true
        );

        if (
          !addressInputRef.current
        ) {
          return;
        }

        const autocomplete =
          new google.maps.places.Autocomplete(
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

              types: [
                "geocode",
                "establishment",
              ],
            }
          );

        googleAutocompleteRef.current =
          autocomplete;

        autocomplete.addListener(
          "place_changed",
          () => {
            const place =
              autocomplete.getPlace();

            const lat =
              place.geometry?.location?.lat();

            const lng =
              place.geometry?.location?.lng();

            if (
              lat == null ||
              lng == null
            ) {
              setLocationMsg(
                "Select a valid address from the suggestions."
              );

              return;
            }

            applyLocationToAddress(
              {
                lat,
                lng,

                formattedAddress:
                  place.formatted_address ||
                  place.name ||
                  "",

                components:
                  place.address_components,

                mode: "manual",
              }
            );
          }
        );
      })
      .catch(
        (error: unknown) => {
          console.error(
            "GOOGLE MAPS LOAD ERROR:",
            error
          );

          setLocationMsg(
            "Google address search failed to load."
          );
        }
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddressModal]);

  useEffect(() => {
    if (
      showAddressModal &&
      addressForm.lat != null &&
      addressForm.lng != null &&
      googleSearchReady
    ) {
      window.setTimeout(() => {
        renderGoogleDeliveryMap(
          addressForm.lat as number,
          addressForm.lng as number
        );
      }, 100);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressForm.lat,
    addressForm.lng,
    googleSearchReady,
    showAddressModal,
  ]);

  const fetchSavedAddresses =
    async () => {
      try {
        setLoadingSavedAddresses(
          true
        );

        const response =
          await api.get(
            "/user/addresses"
          );

        const list =
          Array.isArray(
            response.data
          )
            ? response.data
            : response.data || [];

        setSavedAddresses(list);

        const defaultAddress =
          list.find(
            (
              address: SavedAddress
            ) =>
              address.isDefault
          ) || list[0];

        if (
          defaultAddress &&
          !selectedAddress
        ) {
          setSelectedAddress(
            defaultAddress
          );
        }
      } catch {
        setSavedAddresses([]);
      } finally {
        setLoadingSavedAddresses(
          false
        );
      }
    };

  const fetchAvailableCoupons =
    async () => {
      try {
        setLoadingCoupons(true);

        const response =
          await api.get(
            `/coupons/available?cartTotal=${subtotal}&planSubtotal=${planSubtotal}`
          );

        setAvailableCoupons(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );
      } catch {
        setAvailableCoupons([]);
      } finally {
        setLoadingCoupons(false);
      }
    };

  const removeCoupon = () => {
    setCoupon("");
    setDiscount(0);

    setCouponMsg(
      "Coupon removed."
    );

    setCouponMsgType(
      "success"
    );
  };

  const applyCoupon = async (
    codeOverride?: string
  ) => {
    const codeToApply = (
      codeOverride ?? coupon
    )
      .trim()
      .toUpperCase();

    if (!codeToApply) {
      removeCoupon();
      return;
    }

    if (planSubtotal <= 0) {
      setCouponMsg(
        "Plan reward coupon is applicable only on meal plans."
      );

      setCouponMsgType(
        "error"
      );

      return;
    }

    try {
      setApplying(true);
      setCouponMsg(null);
      setCouponMsgType(null);

      const response =
        await api.post(
          "/coupons/apply",
          {
            code: codeToApply,
            cartTotal: subtotal,
            planSubtotal,
            normalMealsSubtotal,
            applyOn: "plan",
          }
        );

      const savedDiscount =
        Number(
          response.data
            ?.discount || 0
        );

      setCoupon(codeToApply);
      setDiscount(savedDiscount);

      setCouponMsg(
        `Coupon applied. You saved ₹${savedDiscount}.`
      );

      setCouponMsgType(
        "success"
      );

      void fetchAvailableCoupons();
    } catch (error: any) {
      setDiscount(0);

      setCouponMsg(
        error?.response?.data
          ?.message ||
          "Invalid or expired coupon."
      );

      setCouponMsgType(
        "error"
      );

      void fetchAvailableCoupons();
    } finally {
      setApplying(false);
    }
  };

  const updatePlanScheduleDay = (
    cartKey: string,
    dayNumber: number,
    patch: Partial<PlanScheduleDay>
  ) => {
    setPlanSchedules(
      (previous) => {
        const currentSchedule =
          previous[cartKey] ||
          [];

        const nextSchedule =
          currentSchedule.map(
            (day) =>
              Number(day.day) ===
              Number(dayNumber)
                ? {
                    ...day,
                    ...patch,
                  }
                : day
          );

        if (
          Number(dayNumber) === 1 &&
          patch.date !== undefined
        ) {
          return {
            ...previous,

            [cartKey]:
              nextSchedule.map(
                (day) => {
                  const date =
                    patch.date
                      ? addDaysToISO(
                          patch.date,
                          Number(
                            day.day
                          ) - 1
                        )
                      : "";

                  return {
                    ...day,
                    date,

                    slot:
                      date &&
                      isSlotAllowed(
                        date,
                        day.slot ||
                          ""
                      )
                        ? day.slot
                        : "",
                  };
                }
              ),
          };
        }

        return {
          ...previous,
          [cartKey]:
            nextSchedule,
        };
      }
    );

    setSlotMsg(null);
  };

  const applyDayOneSlotToAllDays =
    (cartKey: string) => {
      const schedule =
        planSchedules[cartKey] ||
        [];

      const firstDay =
        schedule.find(
          (day) =>
            Number(day.day) === 1
        );

      if (!firstDay?.date) {
        setSlotMsg(
          "Select the Day 1 date first."
        );

        return;
      }

      if (!firstDay.slot) {
        setSlotMsg(
          "Select the Day 1 slot first."
        );

        return;
      }

      setPlanSchedules(
        (previous) => ({
          ...previous,

          [cartKey]: (
            previous[cartKey] ||
            []
          ).map((day) => {
            const date =
              addDaysToISO(
                firstDay.date,
                Number(day.day) - 1
              );

            return {
              ...day,
              date,

              slot: isSlotAllowed(
                date,
                firstDay.slot
              )
                ? firstDay.slot
                : "",
            };
          }),
        })
      );

      setSlotMsg(null);
    };

  const applyLocationToAddress =
    ({
      lat,
      lng,
      formattedAddress,
      components,
      mode,
    }: {
      lat: number;
      lng: number;
      formattedAddress: string;

      components?:
        google.maps.GeocoderAddressComponent[];

      mode: LocationMode;
    }) => {
      const city =
        getGoogleCity(components);

      const area =
        getGoogleArea(components);

      const state =
        getAddressComponent(
          components,
          "administrative_area_level_1"
        );

      const pincode =
        getAddressComponent(
          components,
          "postal_code"
        );

      const mapsUrl =
        makeMapsUrl(lat, lng);

      setAddressForm(
        (previous) => ({
          ...previous,
          locationMode: mode,
          lat,
          lng,
          mapsUrl,

          locationText:
            formattedAddress ||
            `${lat}, ${lng}`,

          formattedAddress:
            formattedAddress ||
            `${lat}, ${lng}`,

          area:
            area ||
            previous.area,

          city:
            city ||
            previous.city,

          state:
            state ||
            previous.state,

          pincode:
            pincode ||
            previous.pincode,
        })
      );

      setAddressSearch(
        formattedAddress ||
          `${lat}, ${lng}`
      );

      setLocationMsg(null);
    };

  const reverseGeocodeLatLng =
    async (
      lat: number,
      lng: number
    ) => {
      if (!window.google?.maps) {
        return null;
      }

      return new Promise<{
        formattedAddress: string;

        components?:
          google.maps.GeocoderAddressComponent[];
      } | null>((resolve) => {
        const geocoder =
          new google.maps.Geocoder();

        geocoder.geocode(
          {
            location: {
              lat,
              lng,
            },
          },

          (
            results:
              | google.maps.GeocoderResult[]
              | null,
            status: string
          ) => {
            if (
              status !== "OK" ||
              !results?.length
            ) {
              resolve(null);
              return;
            }

            resolve({
              formattedAddress:
                results[0]
                  .formatted_address ||
                `${lat}, ${lng}`,

              components:
                results[0]
                  .address_components,
            });
          }
        );
      });
    };

  const pinLocationOnMap =
    async (
      lat: number,
      lng: number
    ) => {
      const cleanLat =
        Number(lat);

      const cleanLng =
        Number(lng);

      const reverse =
        await reverseGeocodeLatLng(
          cleanLat,
          cleanLng
        );

      applyLocationToAddress({
        lat: cleanLat,
        lng: cleanLng,

        formattedAddress:
          reverse?.formattedAddress ||
          `${cleanLat}, ${cleanLng}`,

        components:
          reverse?.components,

        mode: "manual",
      });
    };

  const renderGoogleDeliveryMap =
    (lat: number, lng: number) => {
      if (
        !window.google?.maps ||
        !googleMapRef.current
      ) {
        return;
      }

      const position = {
        lat,
        lng,
      };

      if (
        !googleMapInstanceRef.current
      ) {
        googleMapInstanceRef.current =
          new google.maps.Map(
            googleMapRef.current,
            {
              center: position,
              zoom: 18,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              zoomControl: true,
              clickableIcons: true,
              gestureHandling:
                "greedy",

              mapTypeId:
                google.maps.MapTypeId
                  .ROADMAP,
            }
          );

        googleMapInstanceRef.current.addListener(
          "click",
          async (
            event: google.maps.MapMouseEvent
          ) => {
            const clickedLat =
              event.latLng?.lat();

            const clickedLng =
              event.latLng?.lng();

            if (
              clickedLat == null ||
              clickedLng == null
            ) {
              return;
            }

            await pinLocationOnMap(
              clickedLat,
              clickedLng
            );
          }
        );
      }

      googleMapInstanceRef.current.setCenter(
        position
      );

      googleMapInstanceRef.current.setZoom(
        18
      );

      if (
        !googleMarkerRef.current
      ) {
        googleMarkerRef.current =
          new google.maps.Marker({
            position,

            map:
              googleMapInstanceRef.current,

            draggable: true,

            title:
              "MacroBox Delivery Location",

            animation:
              google.maps.Animation
                .DROP,
          });

        googleMarkerRef.current.addListener(
          "dragend",
          async () => {
            const markerPosition =
              googleMarkerRef.current?.getPosition();

            if (!markerPosition) {
              return;
            }

            await pinLocationOnMap(
              markerPosition.lat(),
              markerPosition.lng()
            );
          }
        );
      } else {
        googleMarkerRef.current.setPosition(
          position
        );

        googleMarkerRef.current.setMap(
          googleMapInstanceRef.current
        );
      }
    };

  const useCurrentLocation =
    async () => {
      setLocationMsg(null);

      if (
        !navigator.geolocation
      ) {
        setLocationMsg(
          "Geolocation is not supported by this browser."
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(
            position.coords
              .latitude
          );

          const lng = Number(
            position.coords
              .longitude
          );

          const reverse =
            await reverseGeocodeLatLng(
              lat,
              lng
            );

          applyLocationToAddress({
            lat,
            lng,

            formattedAddress:
              reverse?.formattedAddress ||
              `${lat}, ${lng}`,

            components:
              reverse?.components,

            mode: "current",
          });
        },

        () => {
          setLocationMsg(
            "Location permission was denied. Allow access or search manually."
          );
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
        }
      );
    };

  const geocodeTypedAddress =
    async () => {
      const query =
        addressSearch.trim();

      if (!query) {
        setLocationMsg(
          "Enter an address or landmark."
        );

        return;
      }

      if (
        !window.google?.maps
      ) {
        setLocationMsg(
          "Google Maps is still loading."
        );

        return;
      }

      try {
        setSearchingAddress(true);
        setLocationMsg(null);

        const geocoder =
          new google.maps.Geocoder();

        geocoder.geocode(
          {
            address: query,

            componentRestrictions: {
              country: "IN",
            },
          },

          (
            results:
              | google.maps.GeocoderResult[]
              | null,
            status: string
          ) => {
            setSearchingAddress(
              false
            );

            if (
              status !== "OK" ||
              !results?.length
            ) {
              setLocationMsg(
                "No address found. Try a nearby landmark."
              );

              return;
            }

            const result =
              results[0];

            const lat =
              result.geometry.location.lat();

            const lng =
              result.geometry.location.lng();

            applyLocationToAddress({
              lat,
              lng,

              formattedAddress:
                result.formatted_address ||
                query,

              components:
                result.address_components,

              mode: "manual",
            });
          }
        );
      } catch (error) {
        setSearchingAddress(
          false
        );

        console.error(
          "GEOCODE ERROR:",
          error
        );

        setLocationMsg(
          "Unable to search this address."
        );
      }
    };

  const openAddressModal = () => {
    setAddressForm(
      selectedAddress ||
        emptyAddress
    );

    setAddressSearch(
      selectedAddress
        ?.formattedAddress ||
        selectedAddress
          ?.locationText ||
        ""
    );

    setLocationMsg(null);
    setAddressMsg(null);

    setShowAddressModal(true);

    googleMapInstanceRef.current =
      null;

    googleMarkerRef.current =
      null;
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
      setAddressMsg(
        "Complete all required delivery-address fields."
      );

      return;
    }

    if (
      addressForm.lat == null ||
      addressForm.lng == null ||
      !addressForm.mapsUrl
    ) {
      setLocationMsg(
        "Select the exact delivery location on the map."
      );

      return;
    }

    try {
      setSavingAddress(true);

      const lat = Number(
        addressForm.lat
      );

      const lng = Number(
        addressForm.lng
      );

      const response =
        await api.post(
          "/user/addresses",
          {
            ...addressForm,
            lat,
            lng,

            mapsUrl:
              addressForm.mapsUrl ||
              makeMapsUrl(
                lat,
                lng
              ),

            locationText:
              addressForm
                .locationText ||
              `${lat}, ${lng}`,

            formattedAddress:
              addressForm
                .formattedAddress ||
              `${lat}, ${lng}`,
          }
        );

      const addresses =
        Array.isArray(
          response.data
            ?.addresses
        )
          ? response.data
              .addresses
          : [];

      setSavedAddresses(
        addresses
      );

      const selected =
        addresses.find(
          (
            item: SavedAddress
          ) => item.isDefault
        ) || addresses[0];

      if (selected) {
        setSelectedAddress(
          selected
        );
      }

      setShowAddressModal(
        false
      );

      setStep("schedule");
    } catch (error: any) {
      setAddressMsg(
        error?.response?.data
          ?.message ||
          "Failed to save address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const validateAddressStep =
    () => {
      if (!selectedAddress) {
        setAddressMsg(
          "Select or add a delivery address."
        );

        return false;
      }

      if (
        selectedAddress.lat ==
          null ||
        selectedAddress.lng ==
          null ||
        !selectedAddress.mapsUrl
      ) {
        setAddressMsg(
          "The selected address does not have an exact map location."
        );

        return false;
      }

      setAddressMsg(null);
      return true;
    };

  const validatePlanSchedules =
    () => {
      for (const item of cart as any[]) {
        if (!isPlanItem(item)) {
          continue;
        }

        const key =
          getCartKey(item);

        const schedule =
          planSchedules[key] ||
          [];

        if (!schedule.length) {
          setSlotMsg(
            `Select a schedule for ${item.title}.`
          );

          return false;
        }

        for (const day of schedule) {
          if (
            !day.date ||
            !day.slot
          ) {
            setSlotMsg(
              "Select a date and slot for every plan day."
            );

            return false;
          }

          if (
            !isSlotAllowed(
              day.date,
              day.slot
            )
          ) {
            setSlotMsg(
              `Day ${day.day} must be scheduled at least three hours in advance.`
            );

            return false;
          }
        }
      }

      setSlotMsg(null);
      return true;
    };

  const validateScheduleStep =
    () => {
      if (
        !validatePlanSchedules()
      ) {
        return false;
      }

      if (hasNormalMeals) {
        if (
          !slotDate ||
          !slotTime
        ) {
          setSlotMsg(
            "Select the delivery date and slot for normal meals."
          );

          return false;
        }

        if (
          !isSlotAllowed(
            slotDate,
            slotTime
          )
        ) {
          setSlotMsg(
            "The normal-meal slot is no longer available."
          );

          return false;
        }
      }

      setSlotMsg(null);
      return true;
    };

  const getFinalPlanDays = (
    item: any
  ) => {
    const key =
      getCartKey(item);

    return (
      planSchedules[key] || []
    ).map((day) => ({
      day: day.day,
      date: day.date,
      slot: day.slot,

      preference:
        day.preference,

      selectedMeal:
        day.selectedMeal,

      selectedMealTitle:
        day.selectedMealTitle,

      selectedMealPrice:
        day.selectedMealPrice,

      selectedMealProtein:
        day.selectedMealProtein,

      selectedMealCalories:
        day.selectedMealCalories,

      selectedMealCarbs:
        day.selectedMealCarbs,

      selectedMealFat:
        day.selectedMealFat,

      alternativeMeal: null,
      alternativeMealTitle: "",

      deliveryStatus:
        "scheduled",

      kitchenStatus:
        "pending",
    }));
  };

  const loadRazorpay = () =>
    new Promise<boolean>(
      (resolve) => {
        if (
          document.getElementById(
            "razorpay-sdk"
          )
        ) {
          resolve(true);
          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.id =
          "razorpay-sdk";

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () =>
          resolve(true);

        script.onerror = () =>
          resolve(false);

        document.body.appendChild(
          script
        );
      }
    );

  const checkout = async () => {
    if (!validateAddressStep()) {
      setStep("address");
      return;
    }

    if (!validateScheduleStep()) {
      setStep("schedule");
      return;
    }

    const lat = Number(
      selectedAddress?.lat
    );

    const lng = Number(
      selectedAddress?.lng
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setAddressMsg(
        "Select the exact delivery location again."
      );

      setStep("address");
      return;
    }

    try {
      setCheckingOut(true);
      setCouponMsg(null);
      setCouponMsgType(null);

      const loaded =
        await loadRazorpay();

      if (!loaded) {
        setCouponMsg(
          "Razorpay failed to load."
        );

        setCouponMsgType(
          "error"
        );

        return;
      }

      const finalCouponCode =
        discount > 0 &&
        coupon.trim()
          ? coupon
              .trim()
              .toUpperCase()
          : null;

      const firstPlanDay =
        cart
          .filter((item: any) =>
            isPlanItem(item)
          )
          .flatMap(
            (item: any) =>
              getFinalPlanDays(
                item
              )
          )[0];

      const payload = {
        items: cart.map(
          (item: any) => {
            const planItem =
              isPlanItem(item);

            const planId =
              getFinalPlanId(
                item
              );

            const finalPlanDays =
              planItem
                ? getFinalPlanDays(
                    item
                  )
                : [];

            return {
              mealId: planItem
                ? item.planItems?.[0]
                    ?._id ||
                  finalPlanDays?.[0]
                    ?.selectedMeal ||
                  item._id
                : item._id,

              itemType: planItem
                ? "plan"
                : "meal",

              planId: planItem
                ? planId
                : "",

              challengeId:
                planItem
                  ? planId
                  : "",

              title: item.title,

              description:
                item.description ||
                "",

              price: item.price,
              qty: item.qty,

              protein:
                item.protein,

              calories:
                item.calories,

              carbs:
                item.carbs || 0,

              fat:
                item.fat || 0,

              preference:
                item.preference ||
                "",

              rewardEligible:
                item.rewardEligible !==
                false,

              planItems:
                item.planItems ||
                [],

              planDays:
                finalPlanDays,
            };
          }
        ),

        couponCode:
          finalCouponCode,

        couponApplyOn: "plan",

        address: {
          ...selectedAddress,

          locationMode:
            selectedAddress
              ?.locationMode ||
            "manual",

          lat,
          lng,

          mapsUrl:
            selectedAddress
              ?.mapsUrl ||
            makeMapsUrl(
              lat,
              lng
            ),

          locationText:
            selectedAddress
              ?.locationText ||
            `${lat}, ${lng}`,

          formattedAddress:
            selectedAddress
              ?.formattedAddress ||
            `${lat}, ${lng}`,
        },

        deliverySlot:
          hasNormalMeals
            ? {
                date: slotDate,
                time: slotTime,
              }
            : {
                date:
                  firstPlanDay
                    ?.date || "",

                time:
                  firstPlanDay
                    ?.slot || "",
              },
      };

      const createResponse =
        await api.post(
          "/checkout/create-order",
          payload
        );

      const {
        razorpayOrderId,
        amount,
        keyId,
        orderId,
      } = createResponse.data;

      const razorpay =
        new window.Razorpay({
          key:
            keyId ||
            import.meta.env
              .VITE_RAZORPAY_KEY_ID,

          amount,
          currency: "INR",
          name: "MacroBox",

          description: hasPlans
            ? "MacroBox Plan Order"
            : "MacroBox Meal Order",

          order_id:
            razorpayOrderId,

          prefill: {
            name:
              selectedAddress
                ?.fullName,

            contact:
              selectedAddress
                ?.phone,
          },

          handler: async (
            response: any
          ) => {
            const verifyResponse =
              await api.post(
                "/checkout/verify",
                {
                  orderId,

                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,
                }
              );

            clearCart();
            setDiscount(0);
            setCoupon("");

            if (
              verifyResponse.data
                ?.rewardCoupon
                ?.code
            ) {
              setCouponMsg(
                `Payment successful. Your next-plan coupon is ${verifyResponse.data.rewardCoupon.code}.`
              );
            } else {
              setCouponMsg(
                "Payment successful."
              );
            }

            setCouponMsgType(
              "success"
            );

            window.setTimeout(
              () =>
                navigate(
                  "/orders"
                ),
              800
            );
          },

          modal: {
            ondismiss: () => {
              setCouponMsg(
                "Payment was cancelled."
              );

              setCouponMsgType(
                "error"
              );
            },
          },

          theme: {
            color: "#16a34a",
          },
        });

      razorpay.open();
    } catch (error: any) {
      setCouponMsg(
        error?.response?.data
          ?.message ||
          "Failed to create order."
      );

      setCouponMsgType(
        "error"
      );
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
      if (
        validateAddressStep()
      ) {
        setStep("schedule");
      }

      return;
    }

    if (step === "schedule") {
      if (
        validateScheduleStep()
      ) {
        setStep("payment");
      }

      return;
    }

    void checkout();
  };

  const primaryButtonText =
    step === "cart"
      ? "Continue"
      : step === "address"
      ? "Deliver here"
      : step === "schedule"
      ? "Review & pay"
      : checkingOut
      ? "Processing..."
      : "Proceed to pay";

  if (cart.length === 0) {
    return (
      <main className="mb-theme-background flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-14">
        <div className="mb-glass relative z-10 w-full max-w-[680px] rounded-[32px] p-8 text-center sm:p-12">
          <span className="mb-primary-button mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <ShoppingBag size={27} />
          </span>

          <p className="mb-text-faint mt-6 text-[10px] font-semibold uppercase tracking-[0.2em]">
            MacroBox cart
          </p>

          <h1 className="mb-text mt-3 text-3xl font-light tracking-[-0.05em] sm:text-5xl">
            Your cart is empty.
          </h1>

          <p className="mb-text-muted mx-auto mt-4 max-w-md text-sm leading-6">
            Add healthy meals or a complete
            MacroBox plan to begin checkout.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/meals")
            }
            className="mb-primary-button mt-7 inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-7 text-sm font-medium"
          >
            Explore meals
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-40 lg:pb-16">
      <div className="relative z-10">
        <header className="mb-divider sticky top-0 z-40 border-b bg-[color:var(--mb-bg)]/90 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="mb-primary-button flex h-11 w-11 items-center justify-center rounded-full">
                <ShieldCheck size={21} />
              </span>

              <div>
                <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.17em]">
                  Secure checkout
                </p>

                <h1 className="mb-text mt-0.5 text-lg font-light tracking-[-0.035em]">
                  MacroBox cart
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/meals")
              }
              className="mb-outline-button hidden h-11 items-center rounded-full px-5 text-xs font-medium sm:inline-flex"
            >
              Add more meals
            </button>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
          <section className="space-y-4">
            <CheckoutProgress
              step={step}
              setStep={setStep}
            />

            <StepCard
              stepNo="1"
              title="Review cart"
              subtitle={`${cart.length} ${
                cart.length === 1
                  ? "item"
                  : "items"
              } selected`}
              active={step === "cart"}
              done={step !== "cart"}
              onChange={() =>
                setStep("cart")
              }
            >
              <div className="grid gap-3">
                {cart.map(
                  (item: any) => {
                    const plan =
                      isPlanItem(item);

                    const planId =
                      getFinalPlanId(
                        item
                      );

                    return (
                      <CartItemCard
  key={getCartKey(item)}
  item={item}
  isPlan={plan}
  onDecrease={() =>
    decreaseQty(item._id, planId)
  }
  onIncrease={() =>
    increaseQty(item._id, planId)
  }
  onRemove={() =>
    removeFromCart(item._id, planId)
  }
/>
                    );
                  }
                )}
              </div>
            </StepCard>

            <StepCard
              stepNo="2"
              title="Delivery address"
              subtitle="Select where your order should arrive"
              active={
                step === "address"
              }
              done={
                Boolean(
                  selectedAddress
                ) &&
                step !== "address" &&
                step !== "cart"
              }
              onChange={() =>
                setStep("address")
              }
            >
              {selectedAddress &&
              step !== "address" ? (
                <SelectedSummary
                  icon={addressIcon(
                    selectedAddress.addressLabel
                  )}
                  title={
                    selectedAddress.addressLabel
                  }
                  description={addressPreview(
                    selectedAddress
                  )}
                  action="Change"
                  onClick={() =>
                    setStep(
                      "address"
                    )
                  }
                />
              ) : (
                <AddressSelector
                  savedAddresses={
                    savedAddresses
                  }
                  selectedAddress={
                    selectedAddress
                  }
                  loading={
                    loadingSavedAddresses
                  }
                  message={addressMsg}
                  onSelect={(
                    address
                  ) => {
                    setSelectedAddress(
                      address
                    );

                    setAddressMsg(
                      null
                    );
                  }}
                  onAdd={
                    openAddressModal
                  }
                />
              )}
            </StepCard>

            <StepCard
              stepNo="3"
              title="Delivery schedule"
              subtitle="Choose dates and delivery slots"
              active={
                step === "schedule"
              }
              done={
                step === "payment"
              }
              onChange={() =>
                setStep("schedule")
              }
            >
              {step === "payment" ? (
                <SelectedSummary
                  icon={
                    <CalendarClock
                      size={18}
                    />
                  }
                  title="Schedule selected"
                  description="Delivery timing is ready for final review."
                  action="Change"
                  onClick={() =>
                    setStep(
                      "schedule"
                    )
                  }
                />
              ) : (
                <div className="space-y-4">
                  {hasPlans &&
                    cart
                      .filter(
                        (item: any) =>
                          isPlanItem(
                            item
                          )
                      )
                      .map(
                        (item: any) => {
                          const cartKey =
                            getCartKey(
                              item
                            );

                          const schedule =
                            planSchedules[
                              cartKey
                            ] || [];

                          return (
                            <PlanScheduleCard
                              key={
                                cartKey
                              }
                              item={
                                item
                              }
                              cartKey={
                                cartKey
                              }
                              schedule={
                                schedule
                              }
                              slots={
                                slots
                              }
                              inputClass={
                                scheduleInputClass
                              }
                              onUpdate={
                                updatePlanScheduleDay
                              }
                              onApplyAll={
                                applyDayOneSlotToAllDays
                              }
                            />
                          );
                        }
                      )}

                  {hasNormalMeals && (
                    <NormalMealSchedule
                      slotDate={
                        slotDate
                      }
                      slotTime={
                        slotTime
                      }
                      slots={slots}
                      inputClass={
                        themedInputClass
                      }
                      onDateChange={(
                        value
                      ) => {
                        setSlotDate(
                          value
                        );

                        setSlotMsg(
                          null
                        );

                        if (
                          !isSlotAllowed(
                            value,
                            slotTime
                          )
                        ) {
                          setSlotTime(
                            ""
                          );
                        }
                      }}
                      onTimeChange={(
                        value
                      ) => {
                        setSlotTime(
                          value
                        );

                        setSlotMsg(
                          null
                        );
                      }}
                    />
                  )}

                  <div className="mb-warning-badge rounded-[18px] border p-4 text-xs leading-5">
                    Every delivery slot must
                    be selected at least{" "}
                    <strong>
                      three hours
                    </strong>{" "}
                    in advance.
                  </div>

                  {slotMsg && (
                    <MessageBox
                      type="error"
                      message={
                        slotMsg
                      }
                    />
                  )}
                </div>
              )}
            </StepCard>

            <StepCard
              stepNo="4"
              title="Payment"
              subtitle="Complete payment securely using Razorpay"
              active={
                step === "payment"
              }
              done={false}
              onChange={() =>
                setStep("payment")
              }
            >
              <div className="mb-accent-surface rounded-[20px] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      Secure payment
                    </p>

                    <p className="mt-1 text-xs leading-5 opacity-80">
                      Review the address,
                      schedule and total
                      before continuing.
                    </p>
                  </div>
                </div>
              </div>

              {couponMsg && (
                <MessageBox
                  type={
                    couponMsgType ===
                    "error"
                      ? "error"
                      : "success"
                  }
                  message={couponMsg}
                />
              )}
            </StepCard>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <BillSummary
              totalProtein={
                totalProtein
              }
              totalCalories={
                totalCalories
              }
              totalCarbs={
                totalCarbs
              }
              totalFat={totalFat}
              normalMealsSubtotal={
                normalMealsSubtotal
              }
              planSubtotal={
                planSubtotal
              }
              discount={discount}
              payable={payable}
            />

            <button
              type="button"
              onClick={
                step === "payment"
                  ? () =>
                      void checkout()
                  : goNext
              }
              disabled={
                checkingOut
              }
              className="mb-primary-button hidden h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium lg:flex"
            >
              {checkingOut ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <LocateFixed
                  size={18}
                />
              )}

              {primaryButtonText}

              {step !==
                "payment" && (
                <ChevronRight
                  size={18}
                />
              )}
            </button>

            <CouponPanel
              coupon={coupon}
              discount={discount}
              applying={applying}
              couponMessage={
                couponMsg
              }
              couponMessageType={
                couponMsgType
              }
              coupons={
                availableCoupons
              }
              loading={
                loadingCoupons
              }
              inputClass={
                themedInputClass
              }
              onCouponChange={(
                value
              ) => {
                setCoupon(
                  value.toUpperCase()
                );

                setDiscount(0);
                setCouponMsg(null);
                setCouponMsgType(
                  null
                );
              }}
              onApply={(code) =>
                void applyCoupon(
                  code
                )
              }
              onRemove={
                removeCoupon
              }
            />
          </aside>
        </div>
      </div>

      <MobileCheckoutBar
        payable={payable}
        checkingOut={checkingOut}
        buttonText={
          primaryButtonText
        }
        onClick={
          step === "payment"
            ? () =>
                void checkout()
            : goNext
        }
      />

      {showAddressModal && (
  <AddressFormDrawer
    addressForm={addressForm}
    addressSearch={addressSearch}
    googleSearchReady={googleSearchReady}
    searchingAddress={searchingAddress}
    savingAddress={savingAddress}
    addressMessage={addressMsg}
    locationMessage={locationMsg}
    addressInputRef={addressInputRef}
    googleMapRef={googleMapRef}
    setAddressForm={setAddressForm}
    setAddressSearch={setAddressSearch}
    onSearch={() => void geocodeTypedAddress()}
    onCurrentLocation={() => void useCurrentLocation()}
    onSave={() => void saveAddress()}
    onClose={() => setShowAddressModal(false)}
  />
)}
    </main>
  );
}

function CheckoutProgress({
  step,
  setStep,
}: {
  step: StepType;
  setStep: (
    step: StepType
  ) => void;
}) {
  const steps: {
    key: StepType;
    label: string;
  }[] = [
    {
      key: "cart",
      label: "Cart",
    },
    {
      key: "address",
      label: "Address",
    },
    {
      key: "schedule",
      label: "Schedule",
    },
    {
      key: "payment",
      label: "Payment",
    },
  ];

  const currentIndex =
    steps.findIndex(
      (item) =>
        item.key === step
    );

  return (
    <div className="mb-glass macrobox-hide-scrollbar flex max-w-full overflow-x-auto rounded-[24px] p-2">
      {steps.map(
        (item, index) => {
          const active =
            item.key === step;

          const completed =
            index < currentIndex;

          return (
            <button
  key={item.key}
  type="button"
  onClick={() => {
    if (index <= currentIndex) {
      setStep(item.key);
    }
  }}
  className={`flex min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-xs font-medium transition ${
    active
      ? "mb-primary-button"
      : completed
        ? "mb-accent-surface"
        : "mb-text-faint"
  }`}
>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                  active
                    ? "bg-black/10"
                    : completed
                    ? "bg-white/10"
                    : "bg-[var(--mb-surface)]"
                }`}
              >
                {completed ? (
                  <Check size={13} />
                ) : (
                  index + 1
                )}
              </span>

              {item.label}
            </button>
          );
        }
      )}
    </div>
  );
}

function StepCard({
  stepNo,
  title,
  subtitle,
  active,
  done,
  onChange,
  children,
}: {
  stepNo: string;
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border backdrop-blur-2xl transition ${
        active
          ? "border-[var(--mb-border-hover)] bg-[var(--mb-surface-hover)] shadow-[var(--mb-shadow-medium)]"
          : "mb-glass"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 p-5 sm:p-6 ${
          active || done
            ? "mb-divider border-b"
            : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              active
                ? "mb-primary-button"
                : done
                ? "mb-accent-surface"
                : "mb-outline-button"
            }`}
          >
            {done ? (
              <CheckCircle2
                size={18}
              />
            ) : (
              stepNo
            )}
          </span>

          <div className="min-w-0">
            <h2 className="mb-text text-xl font-light tracking-[-0.035em] sm:text-2xl">
              {title}
            </h2>

            <p className="mb-text-faint mt-1 text-xs leading-5">
              {subtitle}
            </p>
          </div>
        </div>

        {done && (
          <button
            type="button"
            onClick={onChange}
            className="mb-outline-button shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium"
          >
            Change
          </button>
        )}
      </div>

      {(active || done) && (
        <div className="p-4 sm:p-5 lg:p-6">
          {children}
        </div>
      )}
    </section>
  );
}

function CartItemCard({
  item,
  isPlan,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: any;
  isPlan: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const quantity = Number(item.qty || 1);

  return (
    <article className="mb-glass-subtle mb-glass-hover min-w-0 overflow-hidden rounded-[22px] p-4 sm:p-5">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="mb-text min-w-0 break-words text-base font-medium sm:text-lg">
            {item.title}
          </h3>

          <span
            className={
              isPlan
                ? "mb-accent-surface shrink-0 rounded-full px-3 py-1 text-[9px] font-semibold"
                : "mb-outline-button shrink-0 rounded-full px-3 py-1 text-[9px] font-medium"
            }
          >
            {isPlan ? "Meal plan" : "Single meal"}
          </span>
        </div>

        <p className="mb-text-muted mt-2 break-words text-xs leading-5 sm:text-sm">
          {isPlan
            ? `${
                (item.planItems || item.planDays || []).length || 7
              } plan days included. Schedule each day during checkout.`
            : "Choose one common delivery date and slot for normal meals."}
        </p>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <MacroPill>
            Protein {Number(item.protein || 0) * quantity}g
          </MacroPill>

          <MacroPill>
            Calories {Number(item.calories || 0) * quantity} kcal
          </MacroPill>

          <MacroPill>
            Carbs {Number(item.carbs || 0) * quantity}g
          </MacroPill>

          <MacroPill>
            Fat {Number(item.fat || 0) * quantity}g
          </MacroPill>
        </div>

        <div className="mb-divider mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="mb-text shrink-0 text-2xl font-light tracking-[-0.04em]">
            ₹{Number(item.price || 0) * quantity}
          </p>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onDecrease}
              disabled={isPlan}
              aria-label="Decrease quantity"
              className="mb-outline-button flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-35"
            >
              <Minus size={14} />
            </button>

            <span className="mb-text flex min-w-7 justify-center text-sm font-medium">
              {quantity}
            </span>

            <button
              type="button"
              onClick={onIncrease}
              disabled={isPlan}
              aria-label="Increase quantity"
              className="mb-primary-button flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-35"
            >
              <Plus size={14} />
            </button>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${item.title}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-300/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function AddressSelector({
  savedAddresses,
  selectedAddress,
  loading,
  message,
  onSelect,
  onAdd,
}: {
  savedAddresses: SavedAddress[];
  selectedAddress: SavedAddress | null;
  loading: boolean;
  message: string | null;
  onSelect: (
    address: SavedAddress
  ) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="mb-text-muted text-sm">
          Choose a saved address or
          add a new delivery location.
        </p>

        <button
          type="button"
          onClick={onAdd}
          className="mb-outline-button inline-flex h-10 w-fit items-center gap-2 rounded-full px-4 text-xs font-medium"
        >
          <Plus size={14} />
          Add address
        </button>
      </div>

      {loading ? (
        <div className="mb-glass-subtle flex items-center gap-3 rounded-[20px] p-5">
          <Loader2
            size={18}
            className="mb-text animate-spin"
          />

          <p className="mb-text-muted text-sm">
            Loading saved addresses...
          </p>
        </div>
      ) : savedAddresses.length ===
        0 ? (
        <div className="mb-glass-subtle rounded-[22px] p-7 text-center">
          <MapPin
            size={26}
            className="mb-text-faint mx-auto"
          />

          <p className="mb-text mt-4 text-sm font-medium">
            No saved address
          </p>

          <p className="mb-text-faint mt-1 text-xs">
            Add an exact delivery
            location to continue.
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mb-primary-button mt-5 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
          >
            <Plus size={15} />
            Add address
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {savedAddresses.map(
            (address) => {
              const selected =
                String(
                  selectedAddress?._id ||
                    ""
                ) ===
                String(
                  address._id || ""
                );

              return (
                <button
                  key={
                    address._id ||
                    address.mapsUrl
                  }
                  type="button"
                  onClick={() =>
                    onSelect(
                      address
                    )
                  }
                  className={`rounded-[22px] border p-4 text-left transition ${
                    selected
                      ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] shadow-[var(--mb-shadow-small)]"
                      : "mb-glass-subtle mb-glass-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "mb-primary-button"
                          : "mb-outline-button"
                      }`}
                    >
                      {addressIcon(
                        address.addressLabel
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="mb-text text-sm font-medium">
                          {
                            address.addressLabel
                          }
                        </p>

                        {selected && (
                          <CheckCircle2
                            size={15}
                            className="mb-accent"
                          />
                        )}
                      </div>

                      <p className="mb-text-muted mt-2 line-clamp-3 text-xs leading-5">
                        {addressPreview(
                          address
                        )}
                      </p>

                      <p className="mb-accent mt-3 text-[10px] font-semibold">
                        Deliver here
                      </p>
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}

      {message && (
        <MessageBox
          type="error"
          message={message}
        />
      )}
    </div>
  );
}

function PlanScheduleCard({
  item,
  cartKey,
  schedule,
  slots,
  inputClass,
  onUpdate,
  onApplyAll,
}: {
  item: any;
  cartKey: string;
  schedule: PlanScheduleDay[];
  slots: string[];
  inputClass: string;
  onUpdate: (
    cartKey: string,
    day: number,
    patch: Partial<PlanScheduleDay>
  ) => void;
  onApplyAll: (
    cartKey: string
  ) => void;
}) {
  const dayOne = schedule.find(
    (day) =>
      Number(day.day) === 1
  );

  const otherDays =
    schedule.filter(
      (day) =>
        Number(day.day) !== 1
    );

  return (
    <section className="mb-glass-subtle rounded-[24px] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <CalendarClock
            size={18}
          />
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
            Plan schedule
          </p>

          <h3 className="mb-text mt-1 text-base font-medium">
            {item.title}
          </h3>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="mb-glass rounded-[20px] p-4">
          <p className="mb-text text-sm font-medium">
            Day 1:{" "}
            {dayOne?.selectedMealTitle ||
              "Meal"}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              min={todayISO()}
              value={
                dayOne?.date ||
                ""
              }
              onChange={(event) =>
                onUpdate(
                  cartKey,
                  1,
                  {
                    date:
                      event.target
                        .value,
                  }
                )
              }
              className={
                inputClass
              }
            />

            <select
              value={
                dayOne?.slot ||
                ""
              }
              onChange={(event) =>
                onUpdate(
                  cartKey,
                  1,
                  {
                    slot:
                      event.target
                        .value,
                  }
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                Select delivery slot
              </option>

              {slots.map(
                (slot) => {
                  const allowed =
                    isSlotAllowed(
                      dayOne?.date ||
                        "",
                      slot
                    );

                  return (
                    <option
                      key={slot}
                      value={slot}
                      disabled={
                        !allowed
                      }
                    >
                      {optionLabel(
                        format12hFromSlot(
                          slot
                        ),
                        allowed
                      )}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="mb-text-faint text-xs">
              {dayOne?.date
                ? formatDateForDisplay(
                    dayOne.date
                  )
                : "Date not selected"}{" "}
              ·{" "}
              {dayOne?.slot
                ? format12hFromSlot(
                    dayOne.slot
                  )
                : "Slot not selected"}
            </p>

            <button
              type="button"
              onClick={() =>
                onApplyAll(
                  cartKey
                )
              }
              disabled={
                !dayOne?.date ||
                !dayOne?.slot
              }
              className="mb-outline-button h-9 w-fit rounded-full px-4 text-[10px] font-medium disabled:opacity-40"
            >
              Apply slot to all
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          {otherDays.map(
            (day) => (
              <div
                key={`${cartKey}-${day.day}`}
                className="mb-glass rounded-[18px] p-3.5"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                  <div className="min-w-0">
                    <p className="mb-text text-sm font-medium leading-5">
                      Day {day.day}:{" "}
                      {
                        day.selectedMealTitle
                      }
                    </p>

                    <p className="mb-text-faint mt-1 text-[10px]">
                      {day.date
                        ? formatDateForDisplay(
                            day.date
                          )
                        : "Date follows Day 1"}
                    </p>
                  </div>

                  <select
                    value={
                      day.slot || ""
                    }
                    onChange={(
                      event
                    ) =>
                      onUpdate(
                        cartKey,
                        day.day,
                        {
                          slot:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                    disabled={
                      !day.date
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select slot
                    </option>

                    {slots.map(
                      (slot) => {
                        const allowed =
                          isSlotAllowed(
                            day.date ||
                              "",
                            slot
                          );

                        return (
                          <option
                            key={
                              slot
                            }
                            value={
                              slot
                            }
                            disabled={
                              !allowed
                            }
                          >
                            {optionLabel(
                              format12hFromSlot(
                                slot
                              ),
                              allowed
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function NormalMealSchedule({
  slotDate,
  slotTime,
  slots,
  inputClass,
  onDateChange,
  onTimeChange,
}: {
  slotDate: string;
  slotTime: string;
  slots: string[];
  inputClass: string;
  onDateChange: (
    value: string
  ) => void;
  onTimeChange: (
    value: string
  ) => void;
}) {
  return (
    <section className="mb-glass-subtle rounded-[24px] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Clock size={18} />
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
            Normal meals
          </p>

          <h3 className="mb-text mt-1 text-base font-medium">
            Common delivery time
          </h3>

          <p className="mb-text-muted mt-1 text-xs leading-5">
            This slot applies only to
            normal meals and remains
            separate from plan deliveries.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          type="date"
          min={todayISO()}
          value={slotDate}
          onChange={(event) =>
            onDateChange(
              event.target.value
            )
          }
          className={inputClass}
        />

        <select
          value={slotTime}
          onChange={(event) =>
            onTimeChange(
              event.target.value
            )
          }
          className={inputClass}
        >
          <option value="">
            Select delivery slot
          </option>

          {slots.map((slot) => {
            const allowed =
              isSlotAllowed(
                slotDate,
                slot
              );

            return (
              <option
                key={slot}
                value={slot}
                disabled={!allowed}
              >
                {optionLabel(
                  format12hFromSlot(
                    slot
                  ),
                  allowed
                )}
              </option>
            );
          })}
        </select>
      </div>
    </section>
  );
}

function SelectedSummary({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="mb-glass-subtle flex flex-col gap-4 rounded-[20px] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          {icon}
        </span>

        <div>
          <p className="mb-text text-sm font-medium">
            {title}
          </p>

          <p className="mb-text-muted mt-1 text-xs leading-5">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="mb-outline-button h-10 w-fit rounded-full px-4 text-xs font-medium"
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
    <section className="mb-glass rounded-[28px] p-5">
      <div className="flex items-center gap-3">
        <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
          <ShieldCheck size={19} />
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
            Checkout summary
          </p>

          <h2 className="mb-text mt-1 text-xl font-light">
            Bill details
          </h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SummaryMetric
          label="Protein"
          value={`${totalProtein}g`}
        />

        <SummaryMetric
          label="Calories"
          value={`${totalCalories}`}
        />

        <SummaryMetric
          label="Carbs"
          value={`${totalCarbs}g`}
        />

        <SummaryMetric
          label="Fat"
          value={`${totalFat}g`}
        />
      </div>

      <div className="mb-divider my-5 border-t" />

      <div className="space-y-3">
        <BillRow
          label="Meals subtotal"
          value={`₹${normalMealsSubtotal}`}
        />

        <BillRow
          label="Plans subtotal"
          value={`₹${planSubtotal}`}
        />

        <BillRow
          label="Plan discount"
          value={`-₹${discount}`}
          discount
        />

        <div className="mb-divider border-t pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.14em]">
                Amount payable
              </p>

              <p className="mb-text mt-2 text-sm">
                Including applicable
                discounts
              </p>
            </div>

            <p className="mb-text text-3xl font-light tracking-[-0.05em]">
              ₹{payable}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[17px] p-3">
      <p className="mb-text-faint text-[8px] uppercase tracking-[0.13em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function BillRow({
  label,
  value,
  discount = false,
}: {
  label: string;
  value: string;
  discount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="mb-text-muted">
        {label}
      </span>

      <span
        className={
          discount
            ? "mb-accent font-medium"
            : "mb-text font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function CouponPanel({
  coupon,
  discount,
  applying,
  couponMessage,
  couponMessageType,
  coupons,
  loading,
  inputClass,
  onCouponChange,
  onApply,
  onRemove,
}: {
  coupon: string;
  discount: number;
  applying: boolean;
  couponMessage:
    | string
    | null;
  couponMessageType: MsgType;
  coupons: AvailableCoupon[];
  loading: boolean;
  inputClass: string;
  onCouponChange: (
    value: string
  ) => void;
  onApply: (
    code?: string
  ) => void;
  onRemove: () => void;
}) {
  return (
    <section className="mb-glass rounded-[28px] p-5">
      <div className="flex items-center gap-3">
        <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
          <Tag size={18} />
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
            Offers
          </p>

          <h2 className="mb-text mt-1 text-xl font-light">
            Apply coupon
          </h2>
        </div>
      </div>

      <input
        value={coupon}
        onChange={(event) =>
          onCouponChange(
            event.target.value
          )
        }
        placeholder="Enter coupon code"
        className={`${inputClass} mt-5`}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            onApply()
          }
          disabled={applying}
          className="mb-primary-button h-11 rounded-full text-sm font-medium"
        >
          {applying
            ? "Applying..."
            : "Apply"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={
            !coupon &&
            discount === 0
          }
          className="inline-flex h-11 items-center justify-center rounded-full border border-red-300/20 bg-red-500/10 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-35"
        >
          Remove
        </button>
      </div>

      {couponMessage && (
        <MessageBox
          type={
            couponMessageType ===
            "error"
              ? "error"
              : "success"
          }
          message={couponMessage}
        />
      )}

      <div className="mt-5">
        <p className="mb-text mb-3 text-sm font-medium">
          Available coupons
        </p>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2
              size={16}
              className="mb-text animate-spin"
            />

            <p className="mb-text-muted text-xs">
              Loading coupons...
            </p>
          </div>
        ) : coupons.length ===
          0 ? (
          <div className="mb-glass-subtle rounded-[18px] p-4 text-center">
            <p className="mb-text-faint text-xs">
              No coupons available.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map(
              (item) => {
                const from =
                  prettyDate(
                    item.validFrom
                  );

                const to =
                  prettyDate(
                    item.validTo
                  );

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() =>
                      onApply(
                        item.code
                      )
                    }
                    disabled={
                      applying
                    }
                    className="mb-glass-subtle mb-glass-hover w-full rounded-[18px] p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-text text-sm font-medium">
                          {item.code}
                        </p>

                        <p className="mb-text-muted mt-1 text-[10px] leading-4">
                          {formatCouponLabel(
                            item
                          )}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="mb-text-faint mt-1 shrink-0"
                      />
                    </div>

                    {(from || to) && (
                      <p className="mb-text-extra-faint mt-2 text-[9px]">
                        {from || "Now"} →{" "}
                        {to ||
                          "No expiry"}
                      </p>
                    )}
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}


function MobileCheckoutBar({
  payable,
  checkingOut,
  buttonText,
  onClick,
}: {
  payable: number;
  checkingOut: boolean;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <div className="mb-divider fixed inset-x-0 bottom-0 z-[70] border-t bg-[color:var(--mb-bg-secondary)]/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[var(--mb-shadow-large)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-[560px] items-center gap-4">
        <div className="shrink-0">
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.14em]">
            Payable
          </p>

          <p className="mb-text mt-1 text-2xl font-light tracking-[-0.05em]">
            ₹{payable}
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={checkingOut}
          className="mb-primary-button flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium disabled:opacity-50"
        >
          {checkingOut ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <LocateFixed size={17} />
          )}

          {buttonText}
        </button>
      </div>
    </div>
  );
}



function MacroPill({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="mb-outline-button rounded-full px-3 py-1 text-[9px] font-medium">
      {children}
    </span>
  );
}

function MessageBox({
  type,
  message,
}: {
  type:
    | "success"
    | "error";
  message: string;
}) {
  return (
    <div
      className={`mt-3 rounded-[18px] border p-3 text-xs font-medium leading-5 ${
        type === "error"
          ? "mb-danger-message"
          : "mb-success-message"
      }`}
    >
      {message}
    </div>
  );
}