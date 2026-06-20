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
  icon: ReactNode;
};

type ActivityOption = {
  value: Activity;
  label: string;
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

const GOOGLE_MAPS_SCRIPT_ID = "macrobox-onboarding-google-maps";

let googleMapsPromise: Promise<void> | null = null;

const goalOptions: GoalOption[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    helper: "Lean and filling",
    icon: <Flame size={22} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    helper: "High protein",
    icon: <Dumbbell size={22} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    helper: "Extra calories",
    icon: <Weight size={22} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    helper: "Balanced meals",
    icon: <HeartPulse size={22} />,
  },
];

const activityOptions: ActivityOption[] = [
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

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-12 sm:px-4";

const compactLabelClass =
  "mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 sm:mb-2 sm:text-[11px]";

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
  const item = components?.find((component) =>
    component.types?.includes(type)
  );

  return item?.long_name || "";
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
  const markerRef = useRef<any>(null);
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
        // Local update failure must not block onboarding.
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

          resolve(results[0]);
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

            if (!place?.geometry?.location) {
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
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
      });

      mapClickListenerRef.current = googleMapRef.current.addListener(
        "click",
        (event: any) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();

          if (lat == null || lng == null) return;

          void setLocationFromCoordinates(lat, lng, "manual");
        }
      );
    }

    googleMapRef.current.setCenter(position);

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: googleMapRef.current,
        position,
        draggable: true,
        title: "Delivery location",
      });

      markerDragListenerRef.current = markerRef.current.addListener(
        "dragend",
        () => {
          const markerPosition = markerRef.current?.getPosition();

          if (!markerPosition) return;

          void setLocationFromCoordinates(
            markerPosition.lat(),
            markerPosition.lng(),
            "manual"
          );
        }
      );
    } else {
      markerRef.current.setMap(googleMapRef.current);
      markerRef.current.setPosition(position);
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

      markerRef.current?.setMap?.(null);

      autocompleteRef.current = null;
      googleMapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const searchTypedAddress = async () => {
    const query = addressSearch.trim();

    if (!query) {
      setLocationMessage("Enter an address or nearby landmark.");
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
  (
    results: GoogleAddressResult[] | null,
    status: string
  ) => {
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
      setLocationMessage(
        "The selected address does not have a valid location."
      );
      return;
    }

    const lat = location.lat();
    const lng = location.lng();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocationMessage("The selected address coordinates are invalid.");
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
              "Location permission denied. Search manually."
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
      toast.error("Enter a valid height.");
      return;
    }

    if (!Number.isFinite(weight) || weight < 25 || weight > 300) {
      toast.error("Enter a valid weight.");
      return;
    }

    if (!Number.isFinite(age) || age < 13 || age > 100) {
      toast.error("Enter a valid age.");
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
      toast.error("Enter a valid mobile number.");
      return;
    }

    if (!address.flatNo.trim()) {
      toast.error("Enter the flat or house number.");
      return;
    }

    if (!address.buildingName.trim()) {
      toast.error("Enter the building name.");
      return;
    }

    if (!address.area.trim()) {
      toast.error("Enter the area or locality.");
      return;
    }

    if (!address.city.trim() || !address.state.trim()) {
      toast.error("Enter the city and state.");
      return;
    }

    if (!isValidPincode(pincode)) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    if (address.lat == null || address.lng == null) {
      toast.error("Select your exact delivery location.");
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

      toast.success(
        response.data?.message || "Delivery address saved."
      );

      setStep(5);
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
    <main className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#f7f7f7] text-slate-950">
      <CompactHeader
        step={step}
        saving={saving}
        onBack={goBack}
      />

      <section className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-6 sm:py-6">
        <div className="mx-auto h-full max-w-[1080px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
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
              serviceable={serviceable}
              locationMessage={locationMessage}
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
        </div>
      </section>
    </main>
  );
}

function CompactHeader({
  step,
  saving,
  onBack,
}: {
  step: Step;
  saving: boolean;
  onBack: () => void;
}) {
  const visibleStep = step - 1;

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-[1080px] items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 2 || saving}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 disabled:opacity-30"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950 sm:text-base">
                Set up MacroBox
              </p>

              <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                Step {visibleStep} of 4
              </p>
            </div>

            <p className="text-xs font-black text-green-700">
              {visibleStep * 25}%
            </p>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className={`h-1.5 rounded-full ${
                  item <= visibleStep ? "bg-green-600" : "bg-slate-100"
                }`}
              />
            ))}
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
    <StepLayout
      icon={<Target size={15} />}
      title="Choose your goal"
      subtitle="Pick one to personalize your meals."
      footer={
        <PrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={!selectedGoal}
        >
          Continue
        </PrimaryButton>
      }
    >
      <div className="grid h-full grid-cols-2 gap-2 sm:gap-4">
        {goalOptions.map((goal) => {
          const selected = selectedGoal === goal.key;

          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => onSelect(goal.key)}
              disabled={saving}
              className={`relative flex min-h-0 flex-col justify-between rounded-2xl border p-3 text-left transition sm:p-5 ${
                selected
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 bg-white hover:border-green-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
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

              <div className="mt-2">
                <p className="text-sm font-black text-slate-950 sm:text-lg">
                  {goal.title}
                </p>

                <p className="mt-0.5 text-[11px] font-bold text-slate-500 sm:text-sm">
                  {goal.helper}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </StepLayout>
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
    <StepLayout
      icon={<Sparkles size={15} />}
      title="Body details"
      subtitle="Used to calculate your calorie and macro targets."
      footer={
        <div className="grid grid-cols-[0.65fr_1.35fr] gap-2">
          <SecondaryButton
            onClick={onSkip}
            disabled={saving}
          >
            Skip
          </SecondaryButton>

          <PrimaryButton
            onClick={onContinue}
            loading={saving}
          >
            Continue
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex h-full flex-col justify-center">
        {selectedGoal && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
            <span className="text-green-700">{selectedGoal.icon}</span>

            <p className="text-xs font-black text-green-800">
              Goal: {selectedGoal.title}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <CompactInput
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

          <CompactInput
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

          <CompactInput
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={compactLabelClass}>Gender</label>

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
              ].map((option) => {
                const selected = body.gender === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onBodyChange((previous) => ({
                        ...previous,
                        gender: option.value,
                      }))
                    }
                    className={`h-11 rounded-xl border text-xs font-black sm:h-12 sm:text-sm ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={compactLabelClass}>Activity</label>

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
              {activityOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] font-semibold leading-4 text-slate-400 sm:text-xs">
          You can edit these values later from MacroTrack.
        </p>
      </div>
    </StepLayout>
  );
}

function AddressStep({
  address,
  addressSearch,
  serviceable,
  locationMessage,
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
  serviceable: boolean | null;
  locationMessage: string;
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
    <StepLayout
      icon={<MapPin size={15} />}
      title="Delivery address"
      subtitle="Search your location and add the basic delivery details."
      footer={
        <PrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={serviceable === false}
        >
          Save address
        </PrimaryButton>
      }
    >
      <div className="grid h-full min-h-0 gap-2 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-h-0">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                placeholder="Search location"
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-2 text-xs font-semibold outline-none focus:border-green-500 sm:h-11 sm:text-sm"
              />
            </div>

            <button
              type="button"
              onClick={onSearch}
              disabled={loadingMaps || !addressSearch.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white disabled:opacity-50 sm:h-11 sm:w-auto sm:px-4"
            >
              {loadingMaps ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Search size={15} />
              )}

              <span className="ml-2 hidden text-xs font-black sm:inline">
                Search
              </span>
            </button>

            <button
              type="button"
              onClick={onCurrentLocation}
              disabled={locating}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-200 text-green-700 disabled:opacity-50 sm:h-11"
            >
              {locating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LocateFixed size={15} />
              )}
            </button>
          </div>

          {locationMessage && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-600">
              <XCircle size={12} />
              {locationMessage}
            </p>
          )}

          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            {hasLocation ? (
              <div
                ref={mapContainerRef}
                className="h-[115px] w-full sm:h-[170px] lg:h-[260px]"
              />
            ) : (
              <div className="flex h-[115px] items-center justify-center bg-slate-50 px-4 text-center sm:h-[170px] lg:h-[260px]">
                <div>
                  <MapPin
                    size={23}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-1 text-[10px] font-bold text-slate-500 sm:text-xs">
                    Search or use current location
                  </p>
                </div>
              </div>
            )}
          </div>

          {hasLocation && address.formattedAddress && (
            <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-500">
              {address.formattedAddress}
            </p>
          )}
        </div>

        <div className="grid min-h-0 grid-cols-2 content-start gap-2">
          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <MiniAddressInput
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

          <div className="col-span-2">
            <label className={compactLabelClass}>Address type</label>

            <div className="grid grid-cols-3 gap-2">
              {(["Home", "Work", "Other"] as AddressLabel[]).map(
                (label) => {
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
                      className={`h-9 rounded-xl border text-[11px] font-black sm:h-10 sm:text-xs ${
                        selected
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {serviceable === false && (
            <p className="col-span-2 text-[10px] font-bold text-red-600">
              MacroBox is not delivering to this pincode yet.
            </p>
          )}
        </div>
      </div>
    </StepLayout>
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
    <StepLayout
      icon={<CheckCircle2 size={15} />}
      title="Your MacroBox is ready"
      subtitle={
        goal
          ? `Meals selected for ${goalLabelMap[goal]}.`
          : "Your personalized setup is complete."
      }
      footer={
        <PrimaryButton
          onClick={onComplete}
          loading={saving}
        >
          Explore meals
        </PrimaryButton>
      }
    >
      {loadingMeals ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Loader2
              size={28}
              className="mx-auto animate-spin text-green-600"
            />

            <p className="mt-2 text-xs font-bold text-slate-500">
              Finding meals...
            </p>
          </div>
        </div>
      ) : meals.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Sparkles
              size={34}
              className="mx-auto text-green-600"
            />

            <p className="mt-3 text-lg font-black text-slate-950">
              Setup complete
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Explore the complete MacroBox menu.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {meals.map((meal) => (
            <CompactMealCard
              key={meal._id}
              meal={meal}
            />
          ))}
        </div>
      )}
    </StepLayout>
  );
}

function CompactMealCard({ meal }: { meal: Meal }) {
  const image =
    meal.imageUrl || meal.image || "/placeholder-meal.png";

  return (
    <article className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img
        src={image}
        alt={meal.title}
        className="h-[72px] w-full object-cover sm:h-28"
        onError={(event) => {
          event.currentTarget.src = "/placeholder-meal.png";
        }}
      />

      <div className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="line-clamp-1 text-xs font-black text-slate-950 sm:text-sm">
            {meal.title}
          </p>

          <p className="shrink-0 text-[10px] font-black text-slate-900 sm:text-xs">
            ₹{Number(meal.price || 0)}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-slate-500 sm:text-[10px]">
          <span>{meal.calories || 0} kcal</span>
          <span>{meal.protein || 0}g protein</span>
        </div>
      </div>
    </article>
  );
}

function StepLayout({
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-white to-green-50 px-4 py-3 sm:px-7 sm:py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            {icon}
          </span>

          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl">
              {title}
            </h1>

            <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-sm">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-6">
        {children}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:flex sm:justify-end sm:p-4">
        <div className="w-full sm:max-w-sm">{footer}</div>
      </div>
    </div>
  );
}

function CompactInput({
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
      <label className={compactLabelClass}>{label}</label>

      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 px-2 pr-8 text-center text-sm font-bold outline-none focus:border-green-500 sm:h-12 sm:px-3 sm:pr-10"
        />

        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 sm:right-3 sm:text-[10px]">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function MiniAddressInput({
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
      <label className={compactLabelClass}>{label}</label>

      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px] font-semibold outline-none focus:border-green-500 sm:h-10 sm:px-3 sm:text-xs"
      />
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
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
    >
      {loading ? (
        <Loader2
          size={17}
          className="animate-spin"
        />
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
      className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-50 sm:h-12"
    >
      {children}
    </button>
  );
}