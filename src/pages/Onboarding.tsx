// frontend/src/pages/Onboarding.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Target,
  Weight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

type GoalType = "fat_loss" | "muscle_gain" | "weight_gain" | "clean_eating";
type Step = 2 | 3 | 4 | 5;

type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

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
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  price: number;
  foodType: "veg" | "nonveg";
  goalTypes?: GoalType[];
  isAvailable?: boolean;
};

let googleMapsScriptLoadingPromise: Promise<void> | null = null;

const loadGoogleMapsScript = () => {
  if ((window as any).google?.maps?.places) return Promise.resolve();

  if (googleMapsScriptLoadingPromise) return googleMapsScriptLoadingPromise;

  googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      reject(new Error("Google Maps API key missing"));
      return;
    }

    const existingScript = document.querySelector(
      'script[data-google-maps="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));

    document.head.appendChild(script);
  });

  return googleMapsScriptLoadingPromise;
};

const goalOptions: {
  key: GoalType;
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    subtitle: "Lean, high-protein meals",
    description: "Meals that help you stay full while reducing calories.",
    icon: <Flame size={26} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    subtitle: "Protein-first meals",
    description: "High-protein meals to support strength and recovery.",
    icon: <Dumbbell size={26} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    subtitle: "Calorie-dense meals",
    description: "Balanced higher-calorie meals to help you gain weight.",
    icon: <Weight size={26} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    subtitle: "Balanced daily meals",
    description: "Simple meals for everyday healthy eating.",
    icon: <HeartPulse size={26} />,
  },
];

const activityOptions: { value: Activity; label: string; helper: string }[] = [
  { value: "sedentary", label: "Sedentary", helper: "Little movement" },
  { value: "light", label: "Light Activity", helper: "1–3 days/week" },
  { value: "moderate", label: "Moderate Activity", helper: "3–5 days/week" },
  { value: "active", label: "Active", helper: "6 days/week" },
  { value: "very_active", label: "Very Active", helper: "Athlete level" },
];

const goalLabelMap: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const makeMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

const getAddressComponent = (components: any[] | undefined, type: string) => {
  if (!components) return "";
  const found = components.find((component) => component.types.includes(type));
  return found?.long_name || "";
};

const getGoogleCity = (components: any[] | undefined) =>
  getAddressComponent(components, "locality") ||
  getAddressComponent(components, "administrative_area_level_3") ||
  getAddressComponent(components, "administrative_area_level_2");

const getGoogleArea = (components: any[] | undefined) =>
  getAddressComponent(components, "sublocality_level_1") ||
  getAddressComponent(components, "sublocality") ||
  getAddressComponent(components, "neighborhood") ||
  getAddressComponent(components, "route");

export default function Onboarding() {
  const navigate = useNavigate();

  const auth = useAuth() as any;
  const user = auth.user;
  const updateUser = auth.updateUser || (() => {});
  const refreshStoredUser = auth.refreshStoredUser || (() => {});

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);

  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState<Step>(2);
  const [saving, setSaving] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(
    user?.onboarding?.goal || null
  );

  const [body, setBody] = useState({
    height: user?.bodyMetrics?.height ? String(user.bodyMetrics.height) : "",
    weight: user?.bodyMetrics?.weight ? String(user.bodyMetrics.weight) : "",
    age: user?.bodyMetrics?.age ? String(user.bodyMetrics.age) : "",
    gender: user?.bodyMetrics?.gender || "male",
    activity: (user?.bodyMetrics?.activity || "moderate") as Activity,
  });

  const [addressSearch, setAddressSearch] = useState("");
  const [locationMsg, setLocationMsg] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);

  const [address, setAddress] = useState<Address>({
    fullName: user?.name || "",
    phone: user?.phone || "",
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

  const progressPercent = ((step - 1) / 5) * 100;

  const inputClass =
    "h-13 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100";

  const selectedGoalDetails = useMemo(
    () => goalOptions.find((item) => item.key === selectedGoal),
    [selectedGoal]
  );

  const recommendedMeals = useMemo(() => {
    const available = meals.filter((meal) => meal.isAvailable !== false);

    if (!selectedGoal) return available.slice(0, 6);

    const matched = available.filter((meal) =>
      meal.goalTypes?.includes(selectedGoal)
    );

    return (matched.length ? matched : available).slice(0, 6);
  }, [meals, selectedGoal]);

  useEffect(() => {
    if (!user || initialized) return;

    if (user?.onboarding?.completed) {
      navigate("/meals", { replace: true });
      return;
    }

    if (user?.onboarding?.goal) setSelectedGoal(user.onboarding.goal);

    const currentStep = Number(user?.onboarding?.currentStep || 2);

    if (currentStep >= 2 && currentStep <= 5) {
      setStep(currentStep as Step);
    }

    setInitialized(true);
  }, [user, initialized, navigate]);

  useEffect(() => {
    if (step !== 4) return;

    let cancelled = false;

    const setupMaps = async () => {
      try {
        setLoadingMaps(true);
        await loadGoogleMapsScript();

        if (cancelled || !addressInputRef.current) return;

        const google = (window as any).google;

        autocompleteRef.current = new google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: "in" },
            fields: [
              "formatted_address",
              "geometry",
              "address_components",
              "name",
            ],
            types: ["geocode", "establishment"],
          }
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
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
      } catch {
        setLocationMsg("Google address search is not available right now.");
      } finally {
        setLoadingMaps(false);
      }
    };

    setupMaps();

    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 5) return;

    const fetchMeals = async () => {
      try {
        setLoadingMeals(true);

        const res = await api.get("/meals", {
          params: { all: "true" },
        });

        const data = Array.isArray(res.data) ? res.data : res.data?.meals || [];
        setMeals(data);
      } catch {
        setMeals([]);
      } finally {
        setLoadingMeals(false);
      }
    };

    fetchMeals();
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    if (address.lat == null || address.lng == null) return;
    if (!(window as any).google?.maps || !mapRef.current) return;

    const google = (window as any).google;
    const position = { lat: Number(address.lat), lng: Number(address.lng) };

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: position,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      googleMapRef.current.addListener("click", async (event: any) => {
        const clickedLat = event.latLng?.lat();
        const clickedLng = event.latLng?.lng();

        if (clickedLat == null || clickedLng == null) return;

        await pinLocationOnMap(clickedLat, clickedLng);
      });
    }

    googleMapRef.current.setCenter(position);

    if (!googleMarkerRef.current) {
      googleMarkerRef.current = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        draggable: true,
        title: "Delivery Location",
      });

      googleMarkerRef.current.addListener("dragend", async () => {
        const markerPosition = googleMarkerRef.current?.getPosition();
        if (!markerPosition) return;

        await pinLocationOnMap(markerPosition.lat(), markerPosition.lng());
      });
    } else {
      googleMarkerRef.current.setPosition(position);
    }
  }, [step, address.lat, address.lng]);

  const patchUserLocally = (data: any) => {
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
      // ignore local user refresh failures
    }
  };

  const saveOnboardingProgress = async (payload: any) => {
    try {
      await api.post("/user/onboarding", payload);
      patchUserLocally(payload);
    } catch {
      patchUserLocally(payload);
    }
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
    components?: any[];
    mode: "manual" | "current";
  }) => {
    const city = getGoogleCity(components);
    const area = getGoogleArea(components);
    const state = getAddressComponent(components, "administrative_area_level_1");
    const pincode = getAddressComponent(components, "postal_code");

    setAddress((prev) => ({
      ...prev,
      locationMode: mode,
      lat,
      lng,
      mapsUrl: makeMapsUrl(lat, lng),
      locationText: formattedAddress || `${lat}, ${lng}`,
      formattedAddress: formattedAddress || `${lat}, ${lng}`,
      area: area || prev.area,
      city: city || prev.city,
      state: state || prev.state,
      pincode: pincode || prev.pincode,
    }));

    setAddressSearch(formattedAddress || `${lat}, ${lng}`);
    setLocationMsg("");
    setServiceable(pincode ? true : null);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const google = (window as any).google;

    if (!google?.maps) return null;

    return new Promise<any | null>((resolve) => {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        { location: { lat, lng } },
        (results: any[] | null, status: string) => {
          if (status !== "OK" || !results?.length) {
            resolve(null);
            return;
          }

          resolve(results[0]);
        }
      );
    });
  };

  const pinLocationOnMap = async (lat: number, lng: number) => {
    const result = await reverseGeocode(lat, lng);

    applyLocationToAddress({
      lat,
      lng,
      formattedAddress: result?.formatted_address || `${lat}, ${lng}`,
      components: result?.address_components,
      mode: "manual",
    });
  };

  const geocodeTypedAddress = async () => {
    if (!addressSearch.trim()) {
      setLocationMsg("Please enter an address or landmark.");
      return;
    }

    const google = (window as any).google;

    if (!google?.maps) {
      setLocationMsg("Google Maps is still loading. Please try again.");
      return;
    }

    try {
      setLoadingMaps(true);

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          address: addressSearch.trim(),
          componentRestrictions: { country: "IN" },
        },
        (results: any[] | null, status: string) => {
          setLoadingMaps(false);

          if (status !== "OK" || !results?.length) {
            setLocationMsg("No address found. Try a nearby landmark.");
            return;
          }

          const result = results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();

          applyLocationToAddress({
            lat,
            lng,
            formattedAddress: result.formatted_address,
            components: result.address_components,
            mode: "manual",
          });
        }
      );
    } catch {
      setLoadingMaps(false);
      setLocationMsg("Unable to search address. Please try again.");
    }
  };

  const useCurrentLocation = async () => {
    setLocationMsg("");

    if (!navigator.geolocation) {
      setLocationMsg("Location is not supported on this device.");
      return;
    }

    try {
      await loadGoogleMapsScript();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          const result = await reverseGeocode(lat, lng);

          applyLocationToAddress({
            lat,
            lng,
            formattedAddress: result?.formatted_address || `${lat}, ${lng}`,
            components: result?.address_components,
            mode: "current",
          });
        },
        () => {
          setLocationMsg(
            "Location permission denied. Search your address manually."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
        }
      );
    } catch {
      setLocationMsg("Google Maps failed to load. Search manually.");
    }
  };

  const goBack = () => {
    if (step === 2) return;
    setStep((prev) => (prev - 1) as Step);
  };

  const handleGoalNext = async (goal: GoalType) => {
    setSelectedGoal(goal);
    setSaving(true);

    try {
      await saveOnboardingProgress({
        onboarding: {
          goal,
          currentStep: 3,
          completed: false,
        },
      });

      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleBodyNext = async () => {
    const height = Number(body.height);
    const weight = Number(body.weight);
    const age = Number(body.age);

    if (!height || !weight || !age) {
      toast.error("Please enter height, weight and age.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/user/body-metrics", {
        height,
        weight,
        age,
        gender: body.gender,
        activity: body.activity,
        goal:
          selectedGoal === "clean_eating"
            ? "maintenance"
            : selectedGoal || "fat_loss",
        locked: true,
      });

      await saveOnboardingProgress({
        onboarding: {
          goal: selectedGoal,
          currentStep: 4,
          completed: false,
        },
        bodyMetrics: {
          height,
          weight,
          age,
          gender: body.gender,
          activity: body.activity,
        },
      });

      setStep(4);
    } catch {
      toast.error("Failed to save body details.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddressNext = async () => {
    if (
      !address.fullName ||
      !address.phone ||
      !address.flatNo ||
      !address.buildingName ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      toast.error("Please complete your delivery address.");
      return;
    }

    if (address.lat == null || address.lng == null) {
      toast.error("Please select your exact delivery location.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/user/addresses", {
        ...address,
        mapsUrl: address.mapsUrl || makeMapsUrl(address.lat, address.lng),
      });

      await saveOnboardingProgress({
        onboarding: {
          goal: selectedGoal,
          currentStep: 5,
          completed: false,
        },
      });

      setStep(5);
    } catch {
      toast.error("Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    if (!selectedGoal) {
      toast.error("Please choose your goal.");
      setStep(2);
      return;
    }

    setSaving(true);

    try {
      await saveOnboardingProgress({
        onboarding: {
          goal: selectedGoal,
          currentStep: 5,
          completed: true,
        },
      });

      toast.success("MacroBox setup completed!");
      navigate(`/meals?goal=${selectedGoal}&welcome=true`, { replace: true });
    } catch {
      toast.error("Failed to complete setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        {/* TOP PROGRESS */}
        <div className="mb-7 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 2}
              className="inline-flex h-12 w-fit items-center gap-2 rounded-[16px] border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="text-center">
              <p className="text-lg font-black text-green-700">
                MacroBox Setup
              </p>
              <p className="mt-1 text-sm font-bold text-slate-400">
                Step {step} of 5
              </p>
            </div>

            <div className="hidden w-[110px] md:block" />
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          {step === 2 && (
            <div>
              <StepHeader
                badgeIcon={<Target size={15} />}
                badge="Pick your goal"
                title="What are you eating for?"
                subtitle="This one choice filters your meals, macro targets, and meal suggestions."
                note="You can also change your goal later from MacroTrack or Settings."
              />

              <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {goalOptions.map((goal) => {
                  const active = selectedGoal === goal.key;

                  return (
                    <button
                      key={goal.key}
                      type="button"
                      onClick={() => handleGoalNext(goal.key)}
                      disabled={saving}
                      className={`group rounded-[26px] border p-6 text-left transition hover:-translate-y-1 hover:shadow-xl disabled:opacity-60 ${
                        active
                          ? "border-green-500 bg-green-50 shadow-[0_16px_40px_rgba(22,163,74,0.14)]"
                          : "border-slate-200 bg-white hover:border-green-300"
                      }`}
                    >
                      <div className="mb-10 flex items-start justify-between">
                        <span
                          className={`flex h-16 w-16 items-center justify-center rounded-[22px] ${
                            active
                              ? "bg-green-600 text-white"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {goal.icon}
                        </span>

                        {active && (
                          <CheckCircle2
                            size={24}
                            className="text-green-600"
                          />
                        )}
                      </div>

                      <h3 className="text-2xl font-black text-slate-950">
                        {goal.title}
                      </h3>

                      <p className="mt-2 text-base font-bold text-slate-500">
                        {goal.subtitle}
                      </p>

                      <p className="mt-4 min-h-[48px] text-sm font-medium leading-6 text-slate-500">
                        {goal.description}
                      </p>

                      <div className="mt-8 flex items-center justify-between text-sm font-black text-green-700">
                        Choose
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepHeader
                badgeIcon={<Sparkles size={15} />}
                badge="Body details"
                title="Let’s calculate your daily targets"
                subtitle="These details help MacroBox recommend meals that fit your goal."
                note={
                  selectedGoalDetails
                    ? `Current goal: ${selectedGoalDetails.title}. You can change it later.`
                    : "You can update these values later from MacroTrack."
                }
              />

              <div className="mx-auto mt-10 max-w-4xl">
                <div className="grid gap-4 md:grid-cols-3">
                  <LabeledInput
                    label="Height (cm)"
                    value={body.height}
                    onChange={(value) =>
                      setBody((prev) => ({ ...prev, height: value }))
                    }
                    placeholder="e.g. 175"
                  />

                  <LabeledInput
                    label="Weight (kg)"
                    value={body.weight}
                    onChange={(value) =>
                      setBody((prev) => ({ ...prev, weight: value }))
                    }
                    placeholder="e.g. 70"
                  />

                  <LabeledInput
                    label="Age"
                    value={body.age}
                    onChange={(value) =>
                      setBody((prev) => ({ ...prev, age: value }))
                    }
                    placeholder="e.g. 21"
                  />

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Gender
                    </label>
                    <select
                      value={body.gender}
                      onChange={(e) =>
                        setBody((prev) => ({
                          ...prev,
                          gender: e.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Activity Level
                    </label>
                    <select
                      value={body.activity}
                      onChange={(e) =>
                        setBody((prev) => ({
                          ...prev,
                          activity: e.target.value as Activity,
                        }))
                      }
                      className={inputClass}
                    >
                      {activityOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label} — {item.helper}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <PrimaryButton onClick={handleBodyNext} loading={saving}>
                  Continue to Address
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepHeader
                badgeIcon={<MapPin size={15} />}
                badge="Delivery location"
                title="Where should we deliver?"
                subtitle="Search your address, select the Google result, then adjust the exact pin if needed."
                note="You can save and change delivery addresses later from checkout."
              />

              <div className="mx-auto mt-10 max-w-5xl">
                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                          loadingMaps
                            ? "Loading Google Maps..."
                            : "Search apartment, area, street or landmark"
                        }
                        className="h-13 w-full rounded-[18px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={geocodeTypedAddress}
                      className="h-13 rounded-[18px] bg-green-600 px-6 text-sm font-black text-white hover:bg-green-700"
                    >
                      Search
                    </button>

                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="h-13 rounded-[18px] border border-green-200 bg-white px-6 text-sm font-black text-green-700 hover:bg-green-50"
                    >
                      <Navigation size={16} className="mr-1 inline" />
                      Current
                    </button>
                  </div>

                  {locationMsg && (
                    <p className="mt-3 rounded-[16px] bg-red-50 p-3 text-sm font-bold text-red-600">
                      {locationMsg}
                    </p>
                  )}

                  {address.lat != null && address.lng != null && (
                    <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                      <div ref={mapRef} className="h-[320px] w-full" />
                    </div>
                  )}

                  {address.formattedAddress && (
                    <div className="mt-4 rounded-[20px] border border-green-100 bg-green-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-green-700">
                        Selected location
                      </p>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-900">
                        {address.formattedAddress}
                      </p>
                      {serviceable === true && (
                        <p className="mt-2 text-xs font-black text-green-700">
                          Delivery area detected successfully.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="Full name"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Phone number"
                    value={address.phone}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Flat / House No"
                    value={address.flatNo}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        flatNo: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Floor optional"
                    value={address.floor}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        floor: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={`${inputClass} md:col-span-2`}
                    placeholder="Building / Apartment"
                    value={address.buildingName}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        buildingName: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Area / Locality"
                    value={address.area}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        area: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Landmark optional"
                    value={address.landmark}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        landmark: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="City"
                    value={address.city}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="State"
                    value={address.state}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                  />

                  <input
                    className={inputClass}
                    placeholder="Pincode"
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                  />

                  <select
                    className={inputClass}
                    value={address.addressLabel}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        addressLabel: e.target.value as
                          | "Home"
                          | "Work"
                          | "Other",
                      }))
                    }
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <PrimaryButton onClick={handleAddressNext} loading={saving}>
                  Continue to Meals
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <StepHeader
                badgeIcon={<Sparkles size={15} />}
                badge="You are ready"
                title="Your MacroBox is personalized"
                subtitle={
                  selectedGoal
                    ? `Here are meals filtered for ${goalLabelMap[selectedGoal]}.`
                    : "Here are meals selected for your setup."
                }
                note="You can change your goal, body details and address later."
              />

              {loadingMeals ? (
                <div className="mt-12 flex justify-center">
                  <Loader2 className="animate-spin text-green-600" size={34} />
                </div>
              ) : (
                <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {recommendedMeals.length === 0 ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 text-center md:col-span-2 xl:col-span-3">
                      <p className="font-black text-slate-900">
                        No meals found yet.
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        You can still finish setup and explore meals later.
                      </p>
                    </div>
                  ) : (
                    recommendedMeals.map((meal) => (
                      <div
                        key={meal._id}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
                      >
                        <img
                          src={meal.imageUrl || "/placeholder-meal.png"}
                          alt={meal.title}
                          className="h-44 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-meal.png";
                          }}
                        />

                        <div className="p-5">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                              {meal.title}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                meal.foodType === "veg"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {meal.foodType === "veg" ? "Veg" : "Non-Veg"}
                            </span>
                          </div>

                          <p className="line-clamp-2 min-h-[44px] text-sm font-medium leading-6 text-slate-500">
                            {meal.description || "Goal-based MacroBox meal."}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <MacroChip label="Calories" value={`${meal.calories} kcal`} />
                            <MacroChip label="Protein" value={`${meal.protein}g`} />
                            <MacroChip label="Carbs" value={`${meal.carbs || 0}g`} />
                            <MacroChip label="Fat" value={`${meal.fat || 0}g`} />
                          </div>

                          <p className="mt-4 text-xl font-black text-slate-950">
                            ₹{meal.price}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="mx-auto mt-8 max-w-md">
                <PrimaryButton onClick={completeOnboarding} loading={saving}>
                  Finish Setup & Explore Meals
                </PrimaryButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StepHeader({
  badgeIcon,
  badge,
  title,
  subtitle,
  note,
}: {
  badgeIcon: ReactNode;
  badge: string;
  title: string;
  subtitle: string;
  note?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-5 py-2 text-sm font-black text-green-700">
        {badgeIcon}
        {badge}
      </div>

      <h1 className="mt-7 text-[36px] font-black leading-tight tracking-[-0.06em] text-slate-950 sm:text-[52px]">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-slate-500 sm:text-lg">
        {subtitle}
      </p>

      {note && (
        <p className="mx-auto mt-4 inline-flex rounded-full border border-green-100 bg-green-50 px-4 py-2 text-sm font-black text-green-700">
          {note}
        </p>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-13 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-green-600 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
      {!loading ? <ArrowRight size={18} /> : null}
    </button>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}