// frontend/src/pages/Onboarding.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  Utensils,
  Weight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import MealCard from "../components/MealCard";
import { useCart } from "../context/CartContext";
import type { Meal } from "./Home";

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

const goalOptions: {
  key: GoalType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    subtitle: "Lean, high-protein meals",
    icon: <Flame size={28} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    subtitle: "Protein-first meals",
    icon: <Dumbbell size={28} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    subtitle: "Calorie-dense meals",
    icon: <Weight size={28} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    subtitle: "Balanced daily meals",
    icon: <HeartPulse size={28} />,
  },
];

const activityOptions: { value: Activity; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light Activity" },
  { value: "moderate", label: "Moderate Activity" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very Active" },
];

const goalLabelMap: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

export default function Onboarding() {
  const navigate = useNavigate();

  const { user, updateUser, refreshStoredUser } = useAuth() as any;
  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const [step, setStep] = useState<Step>(2);
  const [saving, setSaving] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(
    user?.onboarding?.goal || null
  );

  const [body, setBody] = useState({
    height: user?.bodyMetrics?.height ? String(user.bodyMetrics.height) : "",
    weight: user?.bodyMetrics?.weight ? String(user.bodyMetrics.weight) : "",
    age: user?.bodyMetrics?.age ? String(user.bodyMetrics.age) : "",
    activity: (user?.bodyMetrics?.activity || "light") as Activity,
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

  useEffect(() => {
    if (user?.onboarding?.completed) {
      navigate("/meals", { replace: true });
      return;
    }

    if (user?.onboarding?.goal) {
      setSelectedGoal(user.onboarding.goal);
    }

    const currentStep = Number(user?.onboarding?.currentStep || 2);

    if (currentStep >= 2 && currentStep <= 5) {
      setStep(currentStep as Step);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (step !== 4) return;

    const initGoogleAutocomplete = () => {
      const googleObj = (window as any).google;

      if (!googleObj?.maps?.places || !addressInputRef.current) return;

      autocompleteRef.current = new googleObj.maps.places.Autocomplete(
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
        applyGooglePlace(place);
      });
    };

    const timer = setTimeout(initGoogleAutocomplete, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const progressPercent = ((step - 1) / 5) * 100;

  const liveTargets = useMemo(() => {
    const height = Number(body.height);
    const weight = Number(body.weight);
    const age = Number(body.age);

    if (!height || !weight || !age || !selectedGoal) {
      return {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      };
    }

    const multiplierMap: Record<Activity, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    let calories = Math.round(bmr * multiplierMap[body.activity]);

    if (selectedGoal === "fat_loss") calories -= 400;
    if (selectedGoal === "muscle_gain") calories += 250;
    if (selectedGoal === "weight_gain") calories += 500;

    calories = Math.max(calories, 1200);

    let protein = Math.round(weight * 1.8);

    if (selectedGoal === "fat_loss") protein = Math.round(weight * 2);
    if (selectedGoal === "muscle_gain") protein = Math.round(weight * 2.1);
    if (selectedGoal === "weight_gain") protein = Math.round(weight * 1.7);

    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.max(
      Math.round((calories - protein * 4 - fat * 9) / 4),
      50
    );

    return {
      calories,
      protein,
      carbs,
      fat,
    };
  }, [body, selectedGoal]);

  const goBack = () => {
    if (step === 2) {
      navigate("/signup");
      return;
    }

    setStep((prev) => Math.max(2, prev - 1) as Step);
  };

  const saveGoal = async (goal: GoalType) => {
    try {
      setSaving(true);

      const res = await api.patch("/onboarding/goal", { goal });

      setSelectedGoal(goal);

      if (updateUser) {
        updateUser({
          onboarding: res.data?.onboarding,
        });
      }

      setStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const saveBodyDetails = async (skip = false) => {
    try {
      setSaving(true);

      if (!skip) {
        if (!body.height || !body.weight || !body.age || !body.activity) {
          toast.error("Please fill all body details or skip for now.");
          setSaving(false);
          return;
        }
      }

      const payload = skip
        ? {
            height: null,
            weight: null,
            age: null,
            activity: "",
          }
        : {
            height: Number(body.height),
            weight: Number(body.weight),
            age: Number(body.age),
            activity: body.activity,
          };

      const res = await api.patch("/onboarding/body-details", payload);

      if (updateUser) {
        updateUser({
          bodyMetrics: res.data?.bodyMetrics,
          onboarding: res.data?.onboarding,
        });
      }

      setStep(4);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save body details");
    } finally {
      setSaving(false);
    }
  };

  const extractComponent = (components: any[] = [], type: string) => {
    const found = components.find((c) => c.types?.includes(type));
    return found?.long_name || "";
  };

  const applyGooglePlace = (place: any) => {
    if (!place) return;

    const latValue = place.geometry?.location?.lat;
    const lngValue = place.geometry?.location?.lng;

    const lat = typeof latValue === "function" ? latValue() : latValue;
    const lng = typeof lngValue === "function" ? lngValue() : lngValue;

    const components = place.address_components || [];

    const pincode = extractComponent(components, "postal_code");
    const city =
      extractComponent(components, "locality") ||
      extractComponent(components, "administrative_area_level_3") ||
      extractComponent(components, "sublocality");

    const state = extractComponent(components, "administrative_area_level_1");

    const formatted = place.formatted_address || place.name || addressSearch;

    setAddressSearch(formatted);

    setAddress((prev) => ({
      ...prev,
      area:
        extractComponent(components, "sublocality_level_1") ||
        extractComponent(components, "sublocality") ||
        prev.area,
      city: city || prev.city,
      state: state || prev.state,
      pincode: pincode || prev.pincode,
      formattedAddress: formatted,
      locationText: formatted,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : prev.lat,
      lng: Number.isFinite(Number(lng)) ? Number(lng) : prev.lng,
      mapsUrl:
        Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : prev.mapsUrl,
      locationMode: "manual",
    }));

    if (pincode) {
      checkPincode(pincode);
    }
  };

  const geocodeTypedAddress = async () => {
    if (!addressSearch.trim()) {
      toast.error("Please type your location.");
      return;
    }

    const googleObj = (window as any).google;

    if (!googleObj?.maps?.Geocoder) {
      toast.error("Google Maps search is still loading. Try again.");
      return;
    }

    try {
      setSaving(true);

      const geocoder = new googleObj.maps.Geocoder();

      geocoder.geocode(
        {
          address: addressSearch,
          componentRestrictions: { country: "IN" },
        },
        (results: any[] | null, status: string) => {
          setSaving(false);

          if (status !== "OK" || !results || !results[0]) {
            toast.error("Could not find this address.");
            return;
          }

          applyGooglePlace(results[0]);
        }
      );
    } catch {
      setSaving(false);
      toast.error("Failed to search location.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device.");
      return;
    }

    setSaving(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const googleObj = (window as any).google;

        if (!googleObj?.maps?.Geocoder) {
          setAddress((prev) => ({
            ...prev,
            lat,
            lng,
            locationMode: "current",
            locationText: `${lat}, ${lng}`,
            formattedAddress: `${lat}, ${lng}`,
            mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          }));

          setSaving(false);
          return;
        }

        const geocoder = new googleObj.maps.Geocoder();

        geocoder.geocode(
          {
            location: { lat, lng },
          },
          (results: any[] | null, status: string) => {
            setSaving(false);

            if (status === "OK" && results && results[0]) {
              applyGooglePlace(results[0]);
            } else {
              setAddress((prev) => ({
                ...prev,
                lat,
                lng,
                locationMode: "current",
                locationText: `${lat}, ${lng}`,
                formattedAddress: `${lat}, ${lng}`,
                mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
              }));
            }
          }
        );
      },
      () => {
        setSaving(false);
        toast.error("Unable to get your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const checkPincode = async (pin?: string) => {
    const pincode = String(pin || address.pincode || "").replace(/\D/g, "");

    if (pincode.length !== 6) {
      setServiceable(null);
      setLocationMsg("");
      return false;
    }

    try {
      const res = await api.get(`/delivery-pincodes/check/${pincode}`);

      setServiceable(Boolean(res.data?.serviceable));
      setLocationMsg(res.data?.message || "");

      return Boolean(res.data?.serviceable);
    } catch (err: any) {
      setServiceable(false);
      setLocationMsg(
        err?.response?.data?.message || "Failed to check delivery area."
      );

      return false;
    }
  };

  const saveAddress = async () => {
    try {
      if (!address.fullName.trim()) {
        toast.error("Please enter full name.");
        return;
      }

      if (!address.phone.trim()) {
        toast.error("Please enter phone number.");
        return;
      }

      if (!address.flatNo.trim()) {
        toast.error("Please enter flat / house number.");
        return;
      }

      if (!address.buildingName.trim()) {
        toast.error("Please enter building / apartment.");
        return;
      }

      if (!address.city.trim() || !address.state.trim()) {
        toast.error("Please enter city and state.");
        return;
      }

      if (!address.pincode.trim() || address.pincode.length !== 6) {
        toast.error("Please enter valid pincode.");
        return;
      }

      setSaving(true);

      const res = await api.patch("/onboarding/address", {
        address,
      });

      if (updateUser) {
        updateUser({
          onboarding: res.data?.onboarding,
        });
      }

      if (!res.data?.serviceable) {
        setServiceable(false);
        setLocationMsg(res.data?.message || "");
        toast.error(res.data?.message || "Area not serviceable.");
        return;
      }

      setServiceable(true);
      toast.success("Address saved successfully.");
      await loadRecommendedMeals();
      setStep(5);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const loadRecommendedMeals = async () => {
    if (!selectedGoal) return;

    try {
      setLoadingMeals(true);

      const res = await api.get<Meal[]>(`/meals/recommended/${selectedGoal}`);
      setMeals(res.data || []);
    } catch {
      setMeals([]);
      toast.error("Failed to load recommended meals.");
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    if (step === 5) {
      loadRecommendedMeals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const completeOnboarding = async () => {
    try {
      setSaving(true);

      const res = await api.patch("/onboarding/complete");

      if (res.data?.user && refreshStoredUser) {
        refreshStoredUser(res.data.user);
      } else if (updateUser) {
        updateUser({
          onboarding: res.data?.onboarding,
        });
      }

      navigate(`/meals?goal=${selectedGoal || ""}&welcome=true`, {
        replace: true,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to finish onboarding.");
    } finally {
      setSaving(false);
    }
  };

  const getCartQty = (mealId: string) => {
    return cart.find((item) => item._id === mealId)?.qty || 0;
  };

  const handleAddToCart = (meal: Meal) => {
    addToCart({
      _id: meal._id,
      title: meal.title,
      price: meal.price,
      protein: meal.protein,
      calories: meal.calories,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      imageUrl: meal.imageUrl,
    });

    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-green-700">MacroBox Setup</p>
              <p className="text-xs text-gray-500">Step {step} of 5</p>
            </div>

            <div className="w-[85px]" />
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {step === 2 && (
          <section className="rounded-3xl border bg-white p-6 shadow-xl md:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                <Target size={16} />
                Pick your goal
              </p>

              <h1 className="text-3xl font-extrabold text-gray-900 md:text-5xl">
                What are you eating for?
              </h1>

              <p className="mt-3 text-gray-500">
                This one choice filters your meals, macro targets, and meal
                suggestions.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {goalOptions.map((goal) => (
                <button
                  key={goal.key}
                  onClick={() => saveGoal(goal.key)}
                  disabled={saving}
                  className={`rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:border-green-300 hover:shadow-lg disabled:opacity-60 ${
                    selectedGoal === goal.key
                      ? "border-green-500 bg-green-50"
                      : "bg-white"
                  }`}
                >
                  <div className="mb-5 inline-flex rounded-2xl bg-green-100 p-4 text-green-700">
                    {goal.icon}
                  </div>

                  <h3 className="text-xl font-extrabold text-gray-900">
                    {goal.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">{goal.subtitle}</p>

                  <div className="mt-5 flex items-center justify-between text-sm font-bold text-green-700">
                    Choose
                    <ChevronRight size={18} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-3xl border bg-white p-6 shadow-xl md:p-8">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                <Sparkles size={16} />
                Body details
              </p>

              <h1 className="text-3xl font-extrabold text-gray-900">
                Let’s calculate your daily target
              </h1>

              <p className="mt-2 text-gray-500">
                Fill these details to personalize your calories and protein.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Height in cm"
                  value={body.height}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, height: e.target.value }))
                  }
                  className="h-14 rounded-2xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />

                <input
                  type="number"
                  placeholder="Weight in kg"
                  value={body.weight}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, weight: e.target.value }))
                  }
                  className="h-14 rounded-2xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />

                <input
                  type="number"
                  placeholder="Age"
                  value={body.age}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, age: e.target.value }))
                  }
                  className="h-14 rounded-2xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />

                <select
                  value={body.activity}
                  onChange={(e) =>
                    setBody((prev) => ({
                      ...prev,
                      activity: e.target.value as Activity,
                    }))
                  }
                  className="h-14 rounded-2xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  {activityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => saveBodyDetails(false)}
                  disabled={saving}
                  className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>

                <button
                  onClick={() => saveBodyDetails(true)}
                  disabled={saving}
                  className="rounded-2xl px-6 py-3 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  Skip for now
                </button>
              </div>
            </div>

            <div className="rounded-3xl border bg-gray-950 p-6 text-white shadow-xl">
              <p className="text-sm font-semibold text-green-300">
                Live Preview
              </p>

              <h2 className="mt-3 text-2xl font-extrabold">
                Your daily target
              </h2>

              {liveTargets.calories ? (
                <div className="mt-6 grid gap-3">
                  <TargetBox
                    label="Calories"
                    value={`~${liveTargets.calories} kcal`}
                  />
                  <TargetBox label="Protein" value={`${liveTargets.protein}g`} />
                  <TargetBox label="Carbs" value={`${liveTargets.carbs}g`} />
                  <TargetBox label="Fat" value={`${liveTargets.fat}g`} />
                </div>
              ) : (
                <p className="mt-6 text-sm leading-6 text-gray-300">
                  Start filling your body details and your calorie and protein
                  targets will appear here instantly.
                </p>
              )}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-3xl border bg-white p-6 shadow-xl md:p-8">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                <MapPin size={16} />
                Delivery address
              </p>

              <h1 className="text-3xl font-extrabold text-gray-900">
                Where should we deliver?
              </h1>

              <p className="mt-2 text-gray-500">
                Search like Google Maps, select your address, and we’ll check
                serviceability.
              </p>

              <div className="mt-8 rounded-3xl border border-green-100 bg-green-50 p-4">
                <p className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
                  <Search size={20} className="text-green-600" />
                  Search Location
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
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
                    placeholder="Search apartment, street, area, landmark..."
                    className="h-14 flex-1 rounded-2xl border border-green-200 bg-white px-4 text-base font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={geocodeTypedAddress}
                    disabled={saving}
                    className="h-14 rounded-2xl bg-green-600 px-7 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : "Search"}
                  </button>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Choose one address from the Google suggestions for accurate
                  delivery.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="rounded-2xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
                  >
                    <Navigation size={16} className="mr-1 inline" />
                    Use Current Location
                  </button>

                  {address.mapsUrl ? (
                    <a
                      href={address.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center rounded-2xl border border-green-200 bg-white px-4 py-3 font-bold text-green-700 hover:bg-green-50"
                    >
                      Open in Google Maps
                    </a>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>

                {address.lat != null && address.lng != null && (
                  <div className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">
                    <iframe
                      title="MacroBox delivery pin"
                      src={`https://www.google.com/maps?q=${address.lat},${address.lng}&z=17&output=embed`}
                      className="h-[300px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />

                    <div className="border-t bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                        Exact location pin
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        For pin adjustment, open Google Maps, copy the exact
                        location, and search again.
                      </p>
                    </div>
                  </div>
                )}

                {address.formattedAddress && (
                  <div className="mt-4 rounded-2xl border border-green-100 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                      Selected Address
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-gray-800">
                      {address.formattedAddress}
                    </p>

                    {address.pincode && (
                      <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Pincode: {address.pincode}
                      </span>
                    )}
                  </div>
                )}

                {locationMsg && (
                  <div
                    className={`mt-4 rounded-2xl p-4 text-sm font-semibold ${
                      serviceable
                        ? "bg-green-100 text-green-800"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {locationMsg}
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Full Name"
                  value={address.fullName}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, fullName: value }))
                  }
                />

                <Input
                  placeholder="Phone Number"
                  value={address.phone}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, phone: value }))
                  }
                />

                <Input
                  placeholder="Flat / House No"
                  value={address.flatNo}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, flatNo: value }))
                  }
                />

                <Input
                  placeholder="Floor optional"
                  value={address.floor}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, floor: value }))
                  }
                />

                <Input
                  placeholder="Building / Apartment"
                  value={address.buildingName}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, buildingName: value }))
                  }
                  className="sm:col-span-2"
                />

                <Input
                  placeholder="Area / Locality"
                  value={address.area}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, area: value }))
                  }
                />

                <Input
                  placeholder="Landmark optional"
                  value={address.landmark}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, landmark: value }))
                  }
                />

                <Input
                  placeholder="City"
                  value={address.city}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, city: value }))
                  }
                />

                <Input
                  placeholder="State"
                  value={address.state}
                  onChange={(value) =>
                    setAddress((prev) => ({ ...prev, state: value }))
                  }
                />

                <Input
                  placeholder="Pincode"
                  value={address.pincode}
                  onChange={(value) => {
                    const clean = value.replace(/\D/g, "").slice(0, 6);

                    setAddress((prev) => ({ ...prev, pincode: clean }));

                    if (clean.length === 6) {
                      checkPincode(clean);
                    } else {
                      setServiceable(null);
                      setLocationMsg("");
                    }
                  }}
                />

                <select
                  value={address.addressLabel}
                  onChange={(e) =>
                    setAddress((prev) => ({
                      ...prev,
                      addressLabel: e.target.value as "Home" | "Work" | "Other",
                    }))
                  }
                  className="rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                onClick={saveAddress}
                disabled={saving}
                className="mt-6 h-14 w-full rounded-2xl bg-green-600 font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Checking..." : "Save Address & Continue"}
              </button>
            </div>

            <div className="rounded-3xl border bg-gray-950 p-6 text-white shadow-xl">
              <p className="text-sm font-semibold text-green-300">
                Serviceability
              </p>

              <h2 className="mt-3 text-2xl font-extrabold">
                We’ll check your delivery area
              </h2>

              <p className="mt-4 text-sm leading-6 text-gray-300">
                MacroBox currently delivers only to pincodes enabled by admin.
                If your area is unavailable, you can join the waitlist and we’ll
                expand soon.
              </p>

              <div className="mt-6 rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-gray-300">Current Pincode</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {address.pincode || "------"}
                </p>
              </div>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="rounded-3xl border bg-white p-6 shadow-xl md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  <Utensils size={16} />
                  First meal, right now
                </p>

                <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
                  Here are your best meals for{" "}
                  {selectedGoal ? goalLabelMap[selectedGoal] : "your goal"}
                </h1>

                <p className="mt-2 text-gray-500">
                  Your meals are already filtered based on your selected goal.
                </p>
              </div>

              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="rounded-2xl bg-green-600 px-6 py-3 font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
              >
                Finish Setup
              </button>
            </div>

            <div className="mb-8 rounded-3xl border border-green-200 bg-green-50 p-5">
              <p className="text-lg font-extrabold text-green-800">
                Welcome offer — 20% off your first order
              </p>
              <p className="mt-1 text-sm text-green-700">
                Expires in 48 hours. Use this offer on your first MacroBox order.
              </p>
            </div>

            {loadingMeals ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-green-600" size={34} />
              </div>
            ) : meals.length === 0 ? (
              <div className="rounded-3xl border bg-gray-50 p-10 text-center">
                <p className="font-bold text-gray-800">
                  No goal-based meals found yet.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Add goal tags in Admin Meals to show personalized meals here.
                </p>
                <button
                  onClick={completeOnboarding}
                  className="mt-5 rounded-2xl bg-green-600 px-5 py-3 font-bold text-white"
                >
                  Continue to Meals
                </button>
              </div>
            ) : (
              <div className="grid gap-7 md:grid-cols-3">
                {meals.map((meal) => (
                  <MealCard
                    key={meal._id}
                    meal={meal}
                    qty={getCartQty(meal._id)}
                    onAddToCart={handleAddToCart}
                    onIncrease={(m) => {
                      const existing = cart.find((item) => item._id === m._id);
                      if (existing) increaseQty(m._id);
                      else handleAddToCart(m);
                    }}
                    onDecrease={(m) => decreaseQty(m._id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function TargetBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-300">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  className = "",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 ${className}`}
    />
  );
}