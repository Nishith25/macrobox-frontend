// frontend/src/pages/Onboarding.tsx (FRONTEND)

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
  Target,
  Weight,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "clean_eating";

type Step = 2 | 3 | 4 | 5;

type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

type AddressLabel = "Home" | "Work" | "Other";

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
  addressLabel: AddressLabel;
  locationMode: "manual" | "current";
  locationText: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
};

type Meal = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  price: number;
  foodType: "veg" | "nonveg";
  goalTypes?: GoalType[];
  isAvailable?: boolean;
};

type GoalOption = {
  key: GoalType;
  title: string;
  helper: string;
  description: string;
  icon: ReactNode;
};

type GoogleAddressResult = {
  formatted_address?: string;
  address_components?: Array<{
    long_name?: string;
    types?: string[];
  }>;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
  name?: string;
};

const GOOGLE_MAPS_SCRIPT_ID = "macrobox-onboarding-maps";

let googleMapsPromise: Promise<void> | null = null;

const goalOptions: GoalOption[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    helper: "Lean and filling",
    description: "Lower-calorie, protein-rich meals.",
    icon: <Flame size={21} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    helper: "High protein",
    description: "Meals that support strength and recovery.",
    icon: <Dumbbell size={21} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    helper: "Extra calories",
    description: "Balanced calorie-dense meals.",
    icon: <Weight size={21} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    helper: "Balanced meals",
    description: "Simple meals for a healthy daily routine.",
    icon: <HeartPulse size={21} />,
  },
];

const activityOptions: Array<{
  value: Activity;
  label: string;
}> = [
  {
    value: "sedentary",
    label: "Sedentary",
  },
  {
    value: "light",
    label: "Lightly active",
  },
  {
    value: "moderate",
    label: "Moderately active",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "very_active",
    label: "Very active",
  },
];

const goalLabelMap: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const stepNameMap: Record<Step, string> = {
  2: "Goal",
  3: "Body",
  4: "Address",
  5: "Ready",
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100";

const labelClass =
  "mb-1 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500";

const normalizePhone = (value: string) =>
  value.replace(/\D/g, "").slice(0, 10);

const normalizePincode = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);

const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value);

const isValidPincode = (value: string) => /^\d{6}$/.test(value);

const makeMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

const getAddressComponent = (
  components:
    | Array<{
        long_name?: string;
        types?: string[];
      }>
    | undefined,
  type: string
) => {
  const component = components?.find((item) =>
    item.types?.includes(type)
  );

  return component?.long_name || "";
};

const getGoogleCity = (
  components:
    | Array<{
        long_name?: string;
        types?: string[];
      }>
    | undefined
) =>
  getAddressComponent(components, "locality") ||
  getAddressComponent(components, "administrative_area_level_3") ||
  getAddressComponent(components, "administrative_area_level_2");

const getGoogleArea = (
  components:
    | Array<{
        long_name?: string;
        types?: string[];
      }>
    | undefined
) =>
  getAddressComponent(components, "sublocality_level_1") ||
  getAddressComponent(components, "sublocality_level_2") ||
  getAddressComponent(components, "sublocality") ||
  getAddressComponent(components, "neighborhood") ||
  getAddressComponent(components, "route");

const loadGoogleMapsScript = (): Promise<void> => {
  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      reject(new Error("Google Maps API key is missing."));
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), {
        once: true,
      });

      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google Maps failed to load.")),
        {
          once: true,
        }
      );

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();

    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error("Google Maps failed to load."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export default function Onboarding() {
  const navigate = useNavigate();

  const auth = useAuth() as {
    user?: any;
    updateUser?: (user: any) => void;
    refreshStoredUser?: () => void;
  };

  const user = auth.user;

  const updateUser = auth.updateUser || (() => undefined);
  const refreshStoredUser = auth.refreshStoredUser || (() => undefined);

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const autocompleteListenerRef = useRef<any>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const markerDragListenerRef = useRef<any>(null);

  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState<Step>(2);

  const [saving, setSaving] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [locating, setLocating] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(
    user?.onboarding?.goal || null
  );

  const [body, setBody] = useState({
    height: user?.bodyMetrics?.height
      ? String(user.bodyMetrics.height)
      : "",
    weight: user?.bodyMetrics?.weight
      ? String(user.bodyMetrics.weight)
      : "",
    age: user?.bodyMetrics?.age ? String(user.bodyMetrics.age) : "",
    gender: user?.bodyMetrics?.gender || "male",
    activity: (user?.bodyMetrics?.activity || "moderate") as Activity,
  });

  const [addressSearch, setAddressSearch] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);

  const [address, setAddress] = useState<Address>({
    fullName: user?.name || "",
    phone: normalizePhone(user?.phone || ""),
    flatNo: "",
    floor: "",
    buildingName: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    addressLabel: "Home",
    locationMode: "manual",
    locationText: "",
    formattedAddress: "",
    lat: null,
    lng: null,
    mapsUrl: "",
  });

  const [meals, setMeals] = useState<Meal[]>([]);

  const selectedGoalDetails = useMemo(
    () => goalOptions.find((goal) => goal.key === selectedGoal),
    [selectedGoal]
  );

  const recommendedMeals = useMemo(() => {
    const availableMeals = meals.filter(
      (meal) => meal.isAvailable !== false
    );

    if (!selectedGoal) {
      return availableMeals.slice(0, 4);
    }

    const matchingMeals = availableMeals.filter((meal) =>
      meal.goalTypes?.includes(selectedGoal)
    );

    return (matchingMeals.length ? matchingMeals : availableMeals).slice(0, 4);
  }, [meals, selectedGoal]);

  const patchUserLocally = useCallback(
    (data: any) => {
      try {
        const nextUser = {
          ...user,
          ...data,
          onboarding: {
            ...user?.onboarding,
            ...data?.onboarding,
          },
          bodyMetrics: {
            ...user?.bodyMetrics,
            ...data?.bodyMetrics,
          },
        };

        updateUser(nextUser);
        refreshStoredUser();
      } catch {
        // Do not block onboarding if local refresh fails.
      }
    },
    [user, updateUser, refreshStoredUser]
  );

  useEffect(() => {
    if (!user || initialized) return;

    if (user?.onboarding?.completed) {
      navigate("/meals", {
        replace: true,
      });

      return;
    }

    if (user?.onboarding?.goal) {
      setSelectedGoal(user.onboarding.goal);
    }

    const savedStep = Number(user?.onboarding?.currentStep || 2);

    if (savedStep >= 2 && savedStep <= 5) {
      setStep(savedStep as Step);
    }

    setAddress((previous) => ({
      ...previous,
      fullName: previous.fullName || user?.name || "",
      phone: previous.phone || normalizePhone(user?.phone || ""),
    }));

    setInitialized(true);
  }, [user, initialized, navigate]);

  const applyLocation = useCallback(
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
      components?: Array<{
        long_name?: string;
        types?: string[];
      }>;
      mode: "manual" | "current";
    }) => {
      const area = getGoogleArea(components);
      const city = getGoogleCity(components);

      const state = getAddressComponent(
        components,
        "administrative_area_level_1"
      );

      const pincode = normalizePincode(
        getAddressComponent(components, "postal_code")
      );

      const finalAddress =
        formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      setAddress((previous) => ({
        ...previous,
        locationMode: mode,
        locationText: finalAddress,
        formattedAddress: finalAddress,
        lat,
        lng,
        mapsUrl: makeMapsUrl(lat, lng),
        area: area || previous.area,
        city: city || previous.city,
        state: state || previous.state,
        pincode: pincode || previous.pincode,
      }));

      setAddressSearch(finalAddress);
      setLocationMessage("");
      setServiceable(null);
    },
    []
  );

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const google = (window as any).google;

    if (!google?.maps) {
      return null;
    }

    return new Promise<GoogleAddressResult | null>((resolve) => {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          location: {
            lat,
            lng,
          },
        },
        (results: GoogleAddressResult[] | null, status: string) => {
          if (status !== "OK" || !results?.length) {
            resolve(null);
            return;
          }

          resolve(results[0] || null);
        }
      );
    });
  }, []);

  const setLocationFromCoordinates = useCallback(
    async (lat: number, lng: number, mode: "manual" | "current") => {
      try {
        setLoadingMaps(true);

        const result = await reverseGeocode(lat, lng);

        applyLocation({
          lat,
          lng,
          mode,
          formattedAddress:
            result?.formatted_address ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          components: result?.address_components,
        });
      } finally {
        setLoadingMaps(false);
      }
    },
    [applyLocation, reverseGeocode]
  );

  useEffect(() => {
    if (step !== 4) return;

    let cancelled = false;

    const setupAutocomplete = async () => {
      try {
        setLoadingMaps(true);

        await loadGoogleMapsScript();

        if (cancelled || !addressInputRef.current) {
          return;
        }

        const google = (window as any).google;

        autocompleteListenerRef.current?.remove?.();

        autocompleteRef.current = new google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: {
              country: "in",
            },
            fields: [
              "formatted_address",
              "geometry",
              "address_components",
              "name",
            ],
            types: ["geocode"],
          }
        );

        autocompleteListenerRef.current =
          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace() as
              | GoogleAddressResult
              | undefined;

            if (!place || !place.geometry?.location) {
              setLocationMessage("Select an address from the suggestions.");
              return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              setLocationMessage("The selected location is invalid.");
              return;
            }

            applyLocation({
              lat,
              lng,
              formattedAddress:
                place.formatted_address ||
                place.name ||
                `${lat}, ${lng}`,
              components: place.address_components,
              mode: "manual",
            });
          });
      } catch {
        setLocationMessage("Google address search is unavailable.");
      } finally {
        if (!cancelled) {
          setLoadingMaps(false);
        }
      }
    };

    void setupAutocomplete();

    return () => {
      cancelled = true;
      autocompleteListenerRef.current?.remove?.();
      autocompleteListenerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [step, applyLocation]);

  useEffect(() => {
    if (
      step !== 4 ||
      address.lat == null ||
      address.lng == null ||
      !(window as any).google?.maps ||
      !mapContainerRef.current
    ) {
      return;
    }

    const google = (window as any).google;

    const position = {
      lat: Number(address.lat),
      lng: Number(address.lng),
    };

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        zoomControl: true,
        gestureHandling: "greedy",
      });

      mapClickListenerRef.current = googleMapRef.current.addListener(
        "click",
        (event: any) => {
          const clickedLat = event.latLng?.lat();
          const clickedLng = event.latLng?.lng();

          if (clickedLat == null || clickedLng == null) return;

          void setLocationFromCoordinates(clickedLat, clickedLng, "manual");
        }
      );
    }

    googleMapRef.current.setCenter(position);

    if (!googleMarkerRef.current) {
      googleMarkerRef.current = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        draggable: true,
        title: "Delivery location",
      });

      markerDragListenerRef.current =
        googleMarkerRef.current.addListener("dragend", () => {
          const markerPosition = googleMarkerRef.current?.getPosition();

          if (!markerPosition) return;

          void setLocationFromCoordinates(
            markerPosition.lat(),
            markerPosition.lng(),
            "manual"
          );
        });
    } else {
      googleMarkerRef.current.setMap(googleMapRef.current);
      googleMarkerRef.current.setPosition(position);
    }
  }, [
    step,
    address.lat,
    address.lng,
    setLocationFromCoordinates,
  ]);

  useEffect(() => {
    if (step !== 5) return;

    let cancelled = false;

    const fetchMeals = async () => {
      try {
        setLoadingMeals(true);

        const response = await api.get("/meals", {
          params: {
            all: "true",
          },
        });

        if (cancelled) return;

        const mealList = Array.isArray(response.data)
          ? response.data
          : response.data?.meals || [];

        setMeals(mealList);
      } catch {
        if (!cancelled) {
          setMeals([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMeals(false);
        }
      }
    };

    void fetchMeals();

    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    return () => {
      autocompleteListenerRef.current?.remove?.();
      mapClickListenerRef.current?.remove?.();
      markerDragListenerRef.current?.remove?.();

      googleMarkerRef.current?.setMap?.(null);

      autocompleteRef.current = null;
      googleMapRef.current = null;
      googleMarkerRef.current = null;
    };
  }, []);

  const searchTypedAddress = async () => {
    const query = addressSearch.trim();

    if (!query) {
      setLocationMessage("Enter an address or landmark.");
      return;
    }

    try {
      setLoadingMaps(true);
      setLocationMessage("");

      await loadGoogleMapsScript();

      const google = (window as any).google;
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          address: query,
          componentRestrictions: {
            country: "IN",
          },
        },
        (results: GoogleAddressResult[] | null, status: string) => {
          setLoadingMaps(false);

          if (status !== "OK" || !results?.length) {
            setLocationMessage("Address not found. Try a nearby landmark.");
            return;
          }

          const result = results[0];

          if (!result) {
            setLocationMessage("Address not found. Try a nearby landmark.");
            return;
          }

          const location = result.geometry?.location;

          if (!location) {
            setLocationMessage("The selected address has no map location.");
            return;
          }

          const lat = location.lat();
          const lng = location.lng();

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setLocationMessage("The selected coordinates are invalid.");
            return;
          }

          applyLocation({
            lat,
            lng,
            formattedAddress: result.formatted_address || query,
            components: result.address_components,
            mode: "manual",
          });
        }
      );
    } catch {
      setLoadingMaps(false);
      setLocationMessage("Unable to search this address.");
    }
  };

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported on this device.");
      return;
    }

    try {
      setLocating(true);
      setLocationMessage("");

      await loadGoogleMapsScript();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await setLocationFromCoordinates(
              position.coords.latitude,
              position.coords.longitude,
              "current"
            );
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          setLocating(false);

          if (error.code === error.PERMISSION_DENIED) {
            setLocationMessage(
              "Location permission was denied. Search manually."
            );
          } else {
            setLocationMessage("Unable to find your current location.");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
    } catch {
      setLocating(false);
      setLocationMessage("Google Maps failed to load.");
    }
  };

  const goBack = () => {
    if (saving || step === 2) return;

    setStep((step - 1) as Step);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleGoalNext = async () => {
    if (!selectedGoal) {
      toast.error("Choose your health goal.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/onboarding/goal", {
        goal: selectedGoal,
      });

      patchUserLocally(
        response.data?.user || {
          onboarding: response.data?.onboarding,
        }
      );

      setStep(3);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save your goal."
      );
    } finally {
      setSaving(false);
    }
  };

  const skipBodyDetails = async () => {
    try {
      setSaving(true);

      const response = await api.patch("/onboarding/body-details", {
        height: null,
        weight: null,
        age: null,
        activity: "",
        gender: body.gender,
      });

      patchUserLocally({
        onboarding: response.data?.onboarding,
        bodyMetrics: response.data?.bodyMetrics,
      });

      setStep(4);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to continue."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBodyNext = async () => {
    const height = Number(body.height);
    const weight = Number(body.weight);
    const age = Number(body.age);

    if (!Number.isFinite(height) || height < 100 || height > 250) {
      toast.error("Enter a valid height between 100 and 250 cm.");
      return;
    }

    if (!Number.isFinite(weight) || weight < 25 || weight > 300) {
      toast.error("Enter a valid weight between 25 and 300 kg.");
      return;
    }

    if (!Number.isFinite(age) || age < 13 || age > 100) {
      toast.error("Enter a valid age between 13 and 100.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/onboarding/body-details", {
        height,
        weight,
        age,
        gender: body.gender,
        activity: body.activity,
      });

      patchUserLocally({
        onboarding: response.data?.onboarding,
        bodyMetrics: response.data?.bodyMetrics,
      });

      setStep(4);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save body details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddressNext = async () => {
    const fullName = address.fullName.trim();
    const phone = normalizePhone(address.phone);
    const pincode = normalizePincode(address.pincode);

    if (!fullName) {
      toast.error("Enter the receiver name.");
      return;
    }

    if (!isValidPhone(phone)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!address.flatNo.trim()) {
      toast.error("Enter the flat or house number.");
      return;
    }

    if (!address.buildingName.trim()) {
      toast.error("Enter the building or apartment name.");
      return;
    }

    if (!address.area.trim()) {
      toast.error("Enter your area or locality.");
      return;
    }

    if (!address.city.trim()) {
      toast.error("Enter your city.");
      return;
    }

    if (!address.state.trim()) {
      toast.error("Enter your state.");
      return;
    }

    if (!isValidPincode(pincode)) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    if (address.lat == null || address.lng == null) {
      toast.error("Search and confirm the exact delivery location.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/onboarding/address", {
        address: {
          ...address,
          fullName,
          phone,
          pincode,
          mapsUrl:
            address.mapsUrl || makeMapsUrl(address.lat, address.lng),
        },
      });

      patchUserLocally({
        onboarding: response.data?.onboarding,
      });

      if (response.data?.serviceable === false) {
        setServiceable(false);

        toast.error(
          response.data?.message ||
            "MacroBox is not delivering to this area yet."
        );

        return;
      }

      setServiceable(true);

      toast.success(response.data?.message || "Address saved.");

      setStep(5);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save the delivery address."
      );
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    if (!selectedGoal) {
      setStep(2);
      toast.error("Choose your health goal.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/onboarding/complete");

      patchUserLocally(
        response.data?.user || {
          onboarding: response.data?.onboarding,
        }
      );

      toast.success(
        response.data?.message || "Your MacroBox is ready!"
      );

      navigate(`/meals?goal=${selectedGoal}&welcome=true`, {
        replace: true,
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to complete onboarding."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <OnboardingHeader
        step={step}
        saving={saving}
        onBack={goBack}
      />

      <div className="mx-auto max-w-[960px] px-3 py-4 pb-28 sm:px-6 sm:py-7 sm:pb-10">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {step === 2 && (
            <GoalStep
              selectedGoal={selectedGoal}
              saving={saving}
              onSelect={setSelectedGoal}
              onContinue={handleGoalNext}
            />
          )}

          {step === 3 && (
            <BodyStep
              selectedGoal={selectedGoalDetails}
              body={body}
              saving={saving}
              onBodyChange={setBody}
              onSkip={skipBodyDetails}
              onContinue={handleBodyNext}
            />
          )}

          {step === 4 && (
            <AddressStep
              address={address}
              addressSearch={addressSearch}
              locationMessage={locationMessage}
              serviceable={serviceable}
              loadingMaps={loadingMaps}
              locating={locating}
              saving={saving}
              addressInputRef={addressInputRef}
              mapContainerRef={mapContainerRef}
              onAddressChange={setAddress}
              onAddressSearchChange={setAddressSearch}
              onSearch={searchTypedAddress}
              onCurrentLocation={useCurrentLocation}
              onContinue={handleAddressNext}
            />
          )}

          {step === 5 && (
            <ReadyStep
              goal={selectedGoal}
              meals={recommendedMeals}
              loadingMeals={loadingMeals}
              saving={saving}
              onComplete={completeOnboarding}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function OnboardingHeader({
  step,
  saving,
  onBack,
}: {
  step: Step;
  saving: boolean;
  onBack: () => void;
}) {
  const currentStep = step - 1;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[960px] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 2 || saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Set up MacroBox
                </p>

                <p className="text-[11px] font-bold text-slate-400">
                  Step {currentStep} of 4 · {stepNameMap[step]}
                </p>
              </div>

              <p className="text-xs font-black text-green-700">
                {currentStep * 25}%
              </p>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 rounded-full ${
                    item <= currentStep ? "bg-green-600" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function GoalStep({
  selectedGoal,
  saving,
  onSelect,
  onContinue,
}: {
  selectedGoal: GoalType | null;
  saving: boolean;
  onSelect: (goal: GoalType) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <StepHeader
        icon={<Target size={17} />}
        title="Choose your goal"
        subtitle="Pick one option to personalize your meals."
      />

      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6">
        {goalOptions.map((goal) => {
          const selected = selectedGoal === goal.key;

          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => onSelect(goal.key)}
              disabled={saving}
              className={`relative rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-green-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {goal.icon}
                </span>

                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 text-transparent"
                  }`}
                >
                  <Check size={12} />
                </span>
              </div>

              <p className="mt-4 text-base font-black text-slate-950">
                {goal.title}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                {goal.helper}
              </p>

              <p className="mt-2 hidden text-xs font-semibold leading-5 text-slate-500 sm:block">
                {goal.description}
              </p>
            </button>
          );
        })}
      </div>

      <StickyAction>
        <PrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={!selectedGoal}
        >
          Continue
        </PrimaryButton>
      </StickyAction>
    </>
  );
}

function BodyStep({
  selectedGoal,
  body,
  saving,
  onBodyChange,
  onSkip,
  onContinue,
}: {
  selectedGoal?: GoalOption;
  body: {
    height: string;
    weight: string;
    age: string;
    gender: string;
    activity: Activity;
  };
  saving: boolean;
  onBodyChange: React.Dispatch<
    React.SetStateAction<{
      height: string;
      weight: string;
      age: string;
      gender: string;
      activity: Activity;
    }>
  >;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <StepHeader
        icon={<Sparkles size={17} />}
        title="Body details"
        subtitle="Used to estimate calories and daily macros."
      />

      <div className="p-4 sm:p-6">
        {selectedGoal && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
            <span className="text-green-700">{selectedGoal.icon}</span>

            <p className="text-xs font-black text-green-800">
              Goal: {selectedGoal.title}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <NumberInput
            label="Height"
            suffix="cm"
            value={body.height}
            placeholder="175"
            onChange={(value) =>
              onBodyChange((previous) => ({
                ...previous,
                height: value,
              }))
            }
          />

          <NumberInput
            label="Weight"
            suffix="kg"
            value={body.weight}
            placeholder="70"
            onChange={(value) =>
              onBodyChange((previous) => ({
                ...previous,
                weight: value,
              }))
            }
          />

          <NumberInput
            label="Age"
            suffix="yrs"
            value={body.age}
            placeholder="21"
            onChange={(value) =>
              onBodyChange((previous) => ({
                ...previous,
                age: value,
              }))
            }
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Gender</label>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: "male",
                  label: "Male",
                },
                {
                  value: "female",
                  label: "Female",
                },
              ].map((item) => {
                const selected = body.gender === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      onBodyChange((previous) => ({
                        ...previous,
                        gender: item.value,
                      }))
                    }
                    className={`h-11 rounded-xl border text-sm font-black ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>Activity level</label>

            <select
              value={body.activity}
              onChange={(event) =>
                onBodyChange((previous) => ({
                  ...previous,
                  activity: event.target.value as Activity,
                }))
              }
              className={inputClass}
            >
              {activityOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          You can edit these details later from MacroTrack.
        </p>
      </div>

      <StickyAction>
        <div className="grid grid-cols-[0.65fr_1.35fr] gap-2">
          <SecondaryButton onClick={onSkip} disabled={saving}>
            Skip
          </SecondaryButton>

          <PrimaryButton onClick={onContinue} loading={saving}>
            Continue
          </PrimaryButton>
        </div>
      </StickyAction>
    </>
  );
}

function AddressStep({
  address,
  addressSearch,
  locationMessage,
  serviceable,
  loadingMaps,
  locating,
  saving,
  addressInputRef,
  mapContainerRef,
  onAddressChange,
  onAddressSearchChange,
  onSearch,
  onCurrentLocation,
  onContinue,
}: {
  address: Address;
  addressSearch: string;
  locationMessage: string;
  serviceable: boolean | null;
  loadingMaps: boolean;
  locating: boolean;
  saving: boolean;
  addressInputRef: React.Ref<HTMLInputElement>;
  mapContainerRef: React.Ref<HTMLDivElement>;
  onAddressChange: React.Dispatch<React.SetStateAction<Address>>;
  onAddressSearchChange: (value: string) => void;
  onSearch: () => void;
  onCurrentLocation: () => void;
  onContinue: () => void;
}) {
  const hasLocation = address.lat != null && address.lng != null;

  return (
    <>
      <StepHeader
        icon={<MapPin size={17} />}
        title="Delivery address"
        subtitle="Search your location, then enter basic delivery details."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <section className="rounded-2xl bg-slate-50 p-3">
          <div className="grid grid-cols-[1fr_44px_44px] gap-2">
            <div className="relative min-w-0">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={addressInputRef}
                value={addressSearch}
                onChange={(event) =>
                  onAddressSearchChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearch();
                  }
                }}
                placeholder="Search area or landmark"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-green-500"
              />
            </div>

            <button
              type="button"
              onClick={onSearch}
              disabled={loadingMaps || !addressSearch.trim()}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-50"
            >
              {loadingMaps ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}
            </button>

            <button
              type="button"
              onClick={onCurrentLocation}
              disabled={locating}
              className="flex h-11 items-center justify-center rounded-xl border border-green-200 bg-white text-green-700 disabled:opacity-50"
            >
              {locating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LocateFixed size={17} />
              )}
            </button>
          </div>

          {locationMessage && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-red-600">
              <XCircle size={14} className="mt-0.5 shrink-0" />
              {locationMessage}
            </p>
          )}

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {hasLocation ? (
              <div
                ref={mapContainerRef}
                className="h-[180px] w-full sm:h-[240px]"
              />
            ) : (
              <div className="flex h-[150px] items-center justify-center text-center">
                <div>
                  <MapPin className="mx-auto text-slate-300" size={28} />

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Search or use current location
                  </p>
                </div>
              </div>
            )}
          </div>

          {hasLocation && address.formattedAddress && (
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
              {address.formattedAddress}
            </p>
          )}
        </section>

        <section>
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Delivery details
          </p>

          <div className="grid grid-cols-2 gap-3">
            <SmallInput
              label="Name"
              value={address.fullName}
              placeholder="Receiver name"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  fullName: value,
                }))
              }
            />

            <SmallInput
              label="Phone"
              value={address.phone}
              placeholder="Mobile number"
              inputMode="numeric"
              maxLength={10}
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  phone: normalizePhone(value),
                }))
              }
            />

            <SmallInput
              label="Flat / House"
              value={address.flatNo}
              placeholder="Flat 201"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  flatNo: value,
                }))
              }
            />

            <SmallInput
              label="Building"
              value={address.buildingName}
              placeholder="Apartment"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  buildingName: value,
                }))
              }
            />

            <SmallInput
              label="Area"
              value={address.area}
              placeholder="Locality"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  area: value,
                }))
              }
            />

            <SmallInput
              label="City"
              value={address.city}
              placeholder="City"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  city: value,
                }))
              }
            />

            <SmallInput
              label="State"
              value={address.state}
              placeholder="State"
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  state: value,
                }))
              }
            />

            <SmallInput
              label="Pincode"
              value={address.pincode}
              placeholder="6 digits"
              inputMode="numeric"
              maxLength={6}
              onChange={(value) =>
                onAddressChange((previous) => ({
                  ...previous,
                  pincode: normalizePincode(value),
                }))
              }
            />
          </div>

          <div className="mt-4">
            <label className={labelClass}>Address type</label>

            <div className="grid grid-cols-3 gap-2">
              {(["Home", "Work", "Other"] as AddressLabel[]).map((label) => {
                const selected = address.addressLabel === label;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      onAddressChange((previous) => ({
                        ...previous,
                        addressLabel: label,
                      }))
                    }
                    className={`h-10 rounded-xl border text-xs font-black ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {serviceable === false && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
              MacroBox is not delivering to this pincode yet.
            </p>
          )}
        </section>
      </div>

      <StickyAction>
        <PrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={serviceable === false}
        >
          Save address
        </PrimaryButton>
      </StickyAction>
    </>
  );
}

function ReadyStep({
  goal,
  meals,
  loadingMeals,
  saving,
  onComplete,
}: {
  goal: GoalType | null;
  meals: Meal[];
  loadingMeals: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
  return (
    <>
      <StepHeader
        icon={<CheckCircle2 size={17} />}
        title="Your MacroBox is ready"
        subtitle={
          goal
            ? `Meals selected for ${goalLabelMap[goal]}.`
            : "Your personalized meal setup is complete."
        }
      />

      <div className="p-4 sm:p-6">
        {loadingMeals ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 className="animate-spin text-green-600" size={30} />
          </div>
        ) : meals.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center">
            <Sparkles className="mx-auto text-green-600" size={34} />

            <p className="mt-3 text-lg font-black text-slate-950">
              Setup complete
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Explore all available MacroBox meals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {meals.map((meal) => (
              <CompactMealCard key={meal._id} meal={meal} />
            ))}
          </div>
        )}
      </div>

      <StickyAction>
        <PrimaryButton onClick={onComplete} loading={saving}>
          Explore meals
        </PrimaryButton>
      </StickyAction>
    </>
  );
}

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-white to-green-50 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
          {icon}
        </span>

        <div>
          <h1 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
            {title}
          </h1>

          <p className="mt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function StickyAction({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_25px_rgba(15,23,42,0.07)] backdrop-blur sm:flex sm:justify-end sm:p-4">
      <div className="w-full sm:max-w-sm">{children}</div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight size={17} />
        </>
      )}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function NumberInput({
  label,
  suffix,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  suffix: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>

      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 px-2 pr-8 text-center text-sm font-bold outline-none focus:border-green-500"
        />

        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SmallInput({
  label,
  value,
  placeholder,
  onChange,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className={inputClass}
      />
    </div>
  );
}

function CompactMealCard({
  meal,
}: {
  meal: Meal;
}) {
  const image =
    meal.imageUrl || meal.image || "/placeholder-meal.png";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img
        src={image}
        alt={meal.title}
        className="h-24 w-full object-cover sm:h-28"
        onError={(event) => {
          event.currentTarget.src = "/placeholder-meal.png";
        }}
      />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-black text-slate-950">
            {meal.title}
          </p>

          <p className="shrink-0 text-xs font-black text-slate-950">
            ₹{Number(meal.price || 0)}
          </p>
        </div>

        <p className="mt-1 text-[10px] font-bold text-slate-500">
          {meal.calories || 0} kcal · {meal.protein || 0}g protein
        </p>
      </div>
    </article>
  );
}