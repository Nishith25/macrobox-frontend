// frontend/src/pages/Onboarding.tsx (FRONTEND)

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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

let googleMapsScriptLoadingPromise: Promise<void> | null = null;

const loadGoogleMapsScript = () => {
  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  if (googleMapsScriptLoadingPromise) {
    return googleMapsScriptLoadingPromise;
  }

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
  icon: ReactNode;
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

  const auth = useAuth() as any;
  const user = auth.user;
  const updateUser = auth.updateUser || (() => {});
  const refreshStoredUser = auth.refreshStoredUser || (() => {});

  const { cart, addToCart, increaseQty, decreaseQty } = useCart();

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

  const progressPercent = ((step - 1) / 5) * 100;

  const inputClass =
    "h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

  useEffect(() => {
    if (!user || initialized) return;

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

    setInitialized(true);
  }, [user, initialized, navigate]);

  useEffect(() => {
    if (step !== 4) return;

    let cancelled = false;

    const initGoogleAutocomplete = async () => {
      try {
        setLoadingMaps(true);
        await loadGoogleMapsScript();

        if (cancelled) return;

        const googleObj = (window as any).google;

        if (!googleObj?.maps?.places || !addressInputRef.current) {
          return;
        }

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
          }
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          applyGooglePlace(place);
        });
      } catch (err) {
        console.error("Google Maps load error:", err);
        toast.error("Google Maps failed to load. Check API key.");
      } finally {
        setLoadingMaps(false);
      }
    };

    initGoogleAutocomplete();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    if (address.lat == null || address.lng == null) return;

    syncGooglePinMap(address.lat, address.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, address.lat, address.lng]);

  useEffect(() => {
    if (step === 5) {
      loadRecommendedMeals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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

  const normalizePincode = (value: string) =>
    String(value || "").replace(/\D/g, "").slice(0, 6);

  const extractComponent = (components: any[], type: string) => {
    const found = components?.find((c) => c.types?.includes(type));
    return found?.long_name || "";
  };

  const checkPincode = async (pin?: string) => {
    const pincode = normalizePincode(pin || address.pincode);

    if (pincode.length !== 6) {
      setServiceable(null);
      setLocationMsg("");
      return false;
    }

    try {
      const res = await api.get(`/delivery-pincodes/check/${pincode}`);

      const ok = Boolean(res.data?.serviceable);

      setServiceable(ok);
      setLocationMsg(
        res.data?.message ||
          (ok
            ? "Great! MacroBox delivers to this area."
            : "Sorry, we don’t deliver to this address yet.")
      );

      return ok;
    } catch (err: any) {
      setServiceable(false);
      setLocationMsg(
        err?.response?.data?.message ||
          "Sorry, we don’t deliver to this address yet. We will expand soon."
      );

      return false;
    }
  };

  const reverseGeocodeAndUpdateAddress = async (lat: number, lng: number) => {
    try {
      await loadGoogleMapsScript();

      const googleObj = (window as any).google;

      if (!googleObj?.maps?.Geocoder) {
        toast.error("Google Maps is still loading.");
        return;
      }

      const geocoder = new googleObj.maps.Geocoder();

      geocoder.geocode(
        {
          location: { lat, lng },
        },
        async (results: any[] | null, status: string) => {
          if (status !== "OK" || !results?.[0]) {
            setAddress((prev) => ({
              ...prev,
              lat,
              lng,
              locationMode: "manual",
              locationText: `${lat}, ${lng}`,
              formattedAddress: `${lat}, ${lng}`,
              mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
            }));

            toast.error("Could not fetch address for this pin.");
            return;
          }

          const place = results[0];
          const components = place.address_components || [];

          const pincode = extractComponent(components, "postal_code");
          const city =
            extractComponent(components, "locality") ||
            extractComponent(components, "administrative_area_level_3") ||
            extractComponent(components, "sublocality");
          const state = extractComponent(
            components,
            "administrative_area_level_1"
          );

          const area =
            extractComponent(components, "sublocality_level_1") ||
            extractComponent(components, "sublocality") ||
            extractComponent(components, "neighborhood");

          const formatted = place.formatted_address || `${lat}, ${lng}`;

          setAddressSearch(formatted);

          setAddress((prev) => ({
            ...prev,
            area: area || prev.area,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
            lat,
            lng,
            locationMode: "manual",
            locationText: formatted,
            formattedAddress: formatted,
            mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          }));

          if (pincode) {
            await checkPincode(pincode);
          } else {
            setServiceable(null);
            setLocationMsg("Could not detect pincode. Please enter it manually.");
          }
        }
      );
    } catch (err) {
      console.error("Reverse geocode error:", err);
      toast.error("Failed to update address from pin.");
    }
  };

  const syncGooglePinMap = async (lat: number, lng: number) => {
    try {
      await loadGoogleMapsScript();

      const googleObj = (window as any).google;

      if (!googleObj?.maps || !mapRef.current) {
        return;
      }

      const center = { lat, lng };

      if (!googleMapRef.current) {
        googleMapRef.current = new googleObj.maps.Map(mapRef.current, {
          center,
          zoom: 17,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        googleMarkerRef.current = new googleObj.maps.Marker({
          position: center,
          map: googleMapRef.current,
          draggable: true,
          title: "Move pin to exact delivery location",
        });

        googleMapRef.current.addListener("click", async (event: any) => {
          const clickedLat = event.latLng.lat();
          const clickedLng = event.latLng.lng();

          googleMarkerRef.current.setPosition({
            lat: clickedLat,
            lng: clickedLng,
          });

          await reverseGeocodeAndUpdateAddress(clickedLat, clickedLng);
        });

        googleMarkerRef.current.addListener("dragend", async (event: any) => {
          const draggedLat = event.latLng.lat();
          const draggedLng = event.latLng.lng();

          await reverseGeocodeAndUpdateAddress(draggedLat, draggedLng);
        });

        return;
      }

      googleMapRef.current.setCenter(center);

      if (googleMarkerRef.current) {
        googleMarkerRef.current.setPosition(center);
      }
    } catch (err) {
      console.error("Google map init error:", err);
      toast.error("Failed to load Google map.");
    }
  };

  const applyGooglePlace = async (place: any) => {
    if (!place) return;

    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();

    const components = place.address_components || [];

    const pincode = extractComponent(components, "postal_code");
    const city =
      extractComponent(components, "locality") ||
      extractComponent(components, "administrative_area_level_3") ||
      extractComponent(components, "sublocality");
    const state = extractComponent(components, "administrative_area_level_1");

    const area =
      extractComponent(components, "sublocality_level_1") ||
      extractComponent(components, "sublocality") ||
      extractComponent(components, "neighborhood");

    const formatted = place.formatted_address || place.name || addressSearch;

    setAddressSearch(formatted);

    setAddress((prev) => ({
      ...prev,
      area: area || prev.area,
      city: city || prev.city,
      state: state || prev.state,
      pincode: pincode || prev.pincode,
      formattedAddress: formatted,
      locationText: formatted,
      lat: Number.isFinite(lat) ? lat : prev.lat,
      lng: Number.isFinite(lng) ? lng : prev.lng,
      mapsUrl:
        Number.isFinite(lat) && Number.isFinite(lng)
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : prev.mapsUrl,
      locationMode: "manual",
    }));

    if (pincode) {
      await checkPincode(pincode);
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setTimeout(() => {
        syncGooglePinMap(lat, lng);
      }, 200);
    }
  };

  const geocodeTypedAddress = async () => {
    if (!addressSearch.trim()) {
      toast.error("Please type your location.");
      return;
    }

    try {
      setSaving(true);
      setLoadingMaps(true);

      await loadGoogleMapsScript();

      const googleObj = (window as any).google;

      if (!googleObj?.maps?.Geocoder) {
        toast.error("Google Maps search is still loading. Try again.");
        return;
      }

      const geocoder = new googleObj.maps.Geocoder();

      geocoder.geocode(
        {
          address: addressSearch,
          componentRestrictions: { country: "IN" },
        },
        (results: any[] | null, status: string) => {
          setSaving(false);
          setLoadingMaps(false);

          if (status !== "OK" || !results?.[0]) {
            toast.error("Could not find this address.");
            return;
          }

          applyGooglePlace(results[0]);
        }
      );
    } catch (err) {
      setSaving(false);
      setLoadingMaps(false);
      console.error("Geocode error:", err);
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

        setAddress((prev) => ({
          ...prev,
          lat,
          lng,
          locationMode: "current",
          locationText: `${lat}, ${lng}`,
          formattedAddress: `${lat}, ${lng}`,
          mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
        }));

        await reverseGeocodeAndUpdateAddress(lat, lng);

        setSaving(false);
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

  const goBack = () => {
    if (step === 2) {
      navigate("/signup");
      return;
    }

    setStep((prev) => Math.max(2, prev - 1) as Step);
  };

  const saveGoal = async (goal: GoalType) => {
    setSelectedGoal(goal);
    setStep(3);

    try {
      setSaving(true);

      const res = await api.patch("/onboarding/goal", {
        goal,
        currentStep: 3,
      });

      updateUser({
        onboarding: res.data?.onboarding || {
          ...(user?.onboarding || {}),
          goal,
          currentStep: 3,
          completed: false,
        },
      });
    } catch (err: any) {
      console.error("Goal save failed:", err);

      updateUser({
        onboarding: {
          ...(user?.onboarding || {}),
          goal,
          currentStep: 3,
          completed: false,
        },
      });

      toast.error(
        err?.response?.data?.message || "Goal saved locally. Continue setup."
      );
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

      updateUser({
        bodyMetrics: res.data?.bodyMetrics,
        onboarding: res.data?.onboarding || {
          ...(user?.onboarding || {}),
          goal: selectedGoal,
          currentStep: 4,
          completed: false,
        },
      });

      setStep(4);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save body details");
    } finally {
      setSaving(false);
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

      const cleanPincode = normalizePincode(address.pincode);

      if (cleanPincode.length !== 6) {
        toast.error("Please enter valid 6-digit pincode.");
        return;
      }

      const isServiceable = await checkPincode(cleanPincode);

      if (!isServiceable) {
        toast.error(
          "Sorry, we don’t deliver to this address yet. We will expand to your area soon."
        );
        return;
      }

      setSaving(true);

      const finalAddress = {
        ...address,
        pincode: cleanPincode,
      };

      const res = await api.patch("/onboarding/address", {
        address: finalAddress,
      });

      updateUser({
        onboarding: res.data?.onboarding || {
          ...(user?.onboarding || {}),
          goal: selectedGoal,
          currentStep: 5,
          completed: false,
        },
      });

      if (res.data?.serviceable === false) {
        setServiceable(false);
        setLocationMsg(
          res.data?.message ||
            "Sorry, we don’t deliver to this address yet. We will expand soon."
        );
        toast.error(
          res.data?.message ||
            "Sorry, we don’t deliver to this address yet. We will expand soon."
        );
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

  const completeOnboarding = async () => {
    try {
      setSaving(true);

      const res = await api.patch("/onboarding/complete");

      if (res.data?.user) {
        refreshStoredUser(res.data.user);
      } else {
        updateUser({
          onboarding: res.data?.onboarding || {
            ...(user?.onboarding || {}),
            goal: selectedGoal,
            currentStep: 5,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        });
      }

      navigate(`/meals?goal=${selectedGoal || ""}&welcome=true`, {
        replace: true,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to finish setup.");
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
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="text-center">
              <p className="font-extrabold text-green-700">MacroBox Setup</p>
              <p className="text-sm text-gray-500">Step {step} of 5</p>
            </div>

            <div className="w-[92px]" />
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-xl md:p-10">
          {step === 2 && (
            <div>
              <div className="text-center">
                <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  <Target size={16} />
                  Pick your goal
                </p>

                <h1 className="text-4xl font-black text-gray-950 md:text-5xl">
                  What are you eating for?
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                  This one choice filters your meals, macro targets, and meal
                  suggestions.
                </p>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-4">
                {goalOptions.map((goal) => (
                  <button
                    key={goal.key}
                    type="button"
                    disabled={saving}
                    onClick={() => saveGoal(goal.key)}
                    className={`group rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:border-green-400 hover:bg-green-50 hover:shadow-xl disabled:opacity-70 ${
                      selectedGoal === goal.key
                        ? "border-green-400 bg-green-50 shadow-xl"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                      {goal.icon}
                    </div>

                    <h3 className="text-2xl font-extrabold text-gray-900">
                      {goal.title}
                    </h3>

                    <p className="mt-3 min-h-[52px] text-base leading-7 text-gray-500">
                      {goal.subtitle}
                    </p>

                    <div className="mt-6 flex items-center justify-between font-bold text-green-700">
                      <span>
                        {saving && selectedGoal === goal.key
                          ? "Saving..."
                          : "Choose"}
                      </span>
                      <ChevronRight size={20} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  <Sparkles size={16} />
                  Body details
                </p>

                <h1 className="text-4xl font-black text-gray-950">
                  Let’s calculate your daily target
                </h1>

                <p className="mt-4 text-gray-500">
                  Your selected goal:{" "}
                  <span className="font-bold text-green-700">
                    {selectedGoal ? goalLabelMap[selectedGoal] : "Not selected"}
                  </span>
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  placeholder="Height in cm"
                  value={body.height}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, height: e.target.value }))
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="Weight in kg"
                  value={body.weight}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, weight: e.target.value }))
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="Age"
                  value={body.age}
                  onChange={(e) =>
                    setBody((prev) => ({ ...prev, age: e.target.value }))
                  }
                  className={inputClass}
                />

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
                  {activityOptions.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 rounded-3xl border border-green-100 bg-green-50 p-5">
                <p className="text-sm font-bold text-green-700">
                  Live preview
                </p>

                {liveTargets.calories ? (
                  <p className="mt-2 text-2xl font-black text-gray-950">
                    ~{liveTargets.calories} kcal · {liveTargets.protein}g
                    protein · {liveTargets.carbs}g carbs · {liveTargets.fat}g
                    fat
                  </p>
                ) : (
                  <p className="mt-2 text-gray-500">
                    Fill height, weight, age, and activity to see your daily
                    macro target.
                  </p>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => saveBodyDetails(false)}
                  disabled={saving}
                  className="h-12 flex-1 rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>

                <button
                  type="button"
                  onClick={() => saveBodyDetails(true)}
                  disabled={saving}
                  className="h-12 rounded-xl border px-6 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mx-auto max-w-4xl">
              <div className="text-center">
                <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  <MapPin size={16} />
                  Delivery address
                </p>

                <h1 className="text-4xl font-black text-gray-950">
                  Where should we deliver?
                </h1>

                <p className="mt-4 text-gray-500">
                  Search your area, then drag the pin to your exact gate or
                  apartment location.
                </p>
              </div>

              <div className="mt-8 rounded-3xl border border-green-100 bg-green-50 p-5">
                <p className="mb-3 flex items-center gap-2 font-extrabold text-gray-900">
                  <Search size={18} className="text-green-600" />
                  Search Location
                </p>

                <div className="flex flex-col gap-3 md:flex-row">
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
                        : "Search full address, apartment, area, landmark..."
                    }
                    className="h-14 flex-1 rounded-2xl border border-green-200 bg-white px-5 text-base font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />

                  <button
                    type="button"
                    onClick={geocodeTypedAddress}
                    disabled={saving || loadingMaps}
                    className="h-14 rounded-2xl bg-green-600 px-8 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving || loadingMaps ? "..." : "Search"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={saving || loadingMaps}
                  className="mt-4 h-12 w-full rounded-2xl bg-green-600 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <Navigation size={16} className="mr-2 inline" />
                  Use Current Location
                </button>

                {address.lat != null && address.lng != null && (
                  <div className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">
                    <div className="relative h-[380px] w-full">
                      <div ref={mapRef} className="h-full w-full" />

                      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-white/95 px-4 py-3 shadow">
                        <p className="text-xs font-black uppercase tracking-wide text-green-700">
                          Exact delivery pin
                        </p>
                        <p className="text-sm text-gray-600">
                          Drag the pin or tap anywhere on map.
                        </p>
                      </div>
                    </div>

                    <div className="border-t bg-white px-4 py-3 text-sm text-gray-600">
                      Move the marker to your exact location. Address fields
                      will update automatically.
                    </div>
                  </div>
                )}

                {address.formattedAddress && (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-green-700">
                      Selected address
                    </p>

                    <p className="mt-2 font-semibold text-gray-800">
                      {address.formattedAddress}
                    </p>

                    {address.pincode && (
                      <p
                        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          serviceable
                            ? "bg-green-100 text-green-700"
                            : serviceable === false
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        Pincode: {address.pincode}
                      </p>
                    )}

                    {address.mapsUrl && (
                      <a
                        href={address.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block text-sm font-bold text-green-700 underline"
                      >
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                )}

                {locationMsg && (
                  <p
                    className={`mt-4 rounded-2xl p-3 text-sm font-semibold ${
                      serviceable
                        ? "bg-green-100 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {locationMsg}
                  </p>
                )}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
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
                  className={`${inputClass} md:col-span-2`}
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
                  onChange={(e) => {
                    const value = normalizePincode(e.target.value);

                    setAddress({ ...address, pincode: value });

                    if (value.length === 6) {
                      checkPincode(value);
                    } else {
                      setServiceable(null);
                      setLocationMsg("");
                    }
                  }}
                />

                <select
                  className={inputClass}
                  value={address.addressLabel}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      addressLabel: e.target.value as "Home" | "Work" | "Other",
                    })
                  }
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="button"
                onClick={saveAddress}
                disabled={saving}
                className="mt-8 h-12 w-full rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Checking delivery area..." : "Save Address & Continue"}
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="text-center">
                <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  <Utensils size={16} />
                  First meal, right now
                </p>

                <h1 className="text-4xl font-black text-gray-950">
                  Here are your best meals for{" "}
                  {selectedGoal ? goalLabelMap[selectedGoal] : "your goal"}
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                  Welcome offer — 20% off your first order. Expires in 48 hours.
                </p>
              </div>

              <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-5 text-center">
                <p className="font-black text-green-700">
                  Welcome offer applied for new users 🎉
                </p>
              </div>

              {loadingMeals ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-green-600" size={34} />
                </div>
              ) : meals.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-500">
                    No recommended meals found. You can explore all meals.
                  </p>

                  <button
                    type="button"
                    onClick={completeOnboarding}
                    className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700"
                  >
                    Explore Meals
                  </button>
                </div>
              ) : (
                <div className="mt-10 grid gap-8 md:grid-cols-3">
                  {meals.map((meal) => (
                    <MealCard
                      key={meal._id}
                      meal={meal}
                      qty={getCartQty(meal._id)}
                      onAddToCart={handleAddToCart}
                      onIncrease={(m) => {
                        const existing = cart.find(
                          (item) => item._id === m._id
                        );

                        if (existing) increaseQty(m._id);
                        else handleAddToCart(m);
                      }}
                      onDecrease={(m) => decreaseQty(m._id)}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={completeOnboarding}
                disabled={saving}
                className="mt-10 h-12 w-full rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Finishing..." : "Finish Setup"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}