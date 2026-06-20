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
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
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

type GoogleAddressResult = {
  formatted_address?: string;
  address_components?: Array<{
    long_name?: string;
    short_name?: string;
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

type GoalOption = {
  key: GoalType;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
};

type ActivityOption = {
  value: Activity;
  label: string;
  helper: string;
};

const GOOGLE_MAPS_SCRIPT_ID = "macrobox-google-maps-onboarding";

let googleMapsScriptPromise: Promise<void> | null = null;

const goalOptions: GoalOption[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    shortTitle: "Lose fat",
    subtitle: "Lean, filling meals",
    description:
      "Stay full with calorie-conscious, protein-rich meals designed for steady fat loss.",
    icon: <Flame size={24} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    shortTitle: "Build muscle",
    subtitle: "Protein-first nutrition",
    description:
      "Support strength, muscle growth and recovery with higher-protein meals.",
    icon: <Dumbbell size={24} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    shortTitle: "Gain weight",
    subtitle: "Balanced extra calories",
    description:
      "Reach a healthy calorie surplus with balanced, calorie-dense meals.",
    icon: <Weight size={24} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    shortTitle: "Eat clean",
    subtitle: "Everyday balanced meals",
    description:
      "Build a consistent healthy routine with simple, balanced daily meals.",
    icon: <HeartPulse size={24} />,
  },
];

const activityOptions: ActivityOption[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    helper: "Mostly sitting, little exercise",
  },
  {
    value: "light",
    label: "Lightly Active",
    helper: "Exercise around 1–3 days a week",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    helper: "Exercise around 3–5 days a week",
  },
  {
    value: "active",
    label: "Active",
    helper: "Exercise around 6 days a week",
  },
  {
    value: "very_active",
    label: "Very Active",
    helper: "Intense training or athlete-level activity",
  },
];

const goalLabelMap: Record<GoalType, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  weight_gain: "Weight Gain",
  clean_eating: "Clean Eating",
};

const goalBackendMap: Record<
  GoalType,
  "fat_loss" | "muscle_gain" | "weight_gain" | "maintenance"
> = {
  fat_loss: "fat_loss",
  muscle_gain: "muscle_gain",
  weight_gain: "weight_gain",
  clean_eating: "maintenance",
};

const stepDetails: Record<
  Step,
  {
    label: string;
    shortLabel: string;
  }
> = {
  2: {
    label: "Choose Goal",
    shortLabel: "Goal",
  },
  3: {
    label: "Body Details",
    shortLabel: "Body",
  },
  4: {
    label: "Delivery Address",
    shortLabel: "Address",
  },
  5: {
    label: "Recommendations",
    shortLabel: "Meals",
  },
};

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100";

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

const normalizePhone = (value: string) =>
  value.replace(/\D/g, "").slice(0, 10);

const normalizePincode = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);

const isValidPhone = (value: string) =>
  /^[6-9]\d{9}$/.test(value);

const isValidPincode = (value: string) =>
  /^\d{6}$/.test(value);

const loadGoogleMapsScript = (): Promise<void> => {
  if (
    window.google?.maps &&
    window.google.maps.places
  ) {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise(
    (resolve, reject) => {
      const apiKey =
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        reject(
          new Error(
            "VITE_GOOGLE_MAPS_API_KEY is missing."
          )
        );

        return;
      }

      const existingScript =
        document.getElementById(
          GOOGLE_MAPS_SCRIPT_ID
        ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(),
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Failed to load Google Maps."
              )
            ),
          {
            once: true,
          }
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();

      script.onerror = () => {
        googleMapsScriptPromise = null;

        reject(
          new Error(
            "Failed to load Google Maps."
          )
        );
      };

      document.head.appendChild(script);
    }
  );

  return googleMapsScriptPromise;
};

export default function Onboarding() {
  const navigate = useNavigate();

  const auth = useAuth() as {
    user?: any;
    updateUser?: (user: any) => void;
    refreshStoredUser?: () => void;
  };

  const user = auth.user;
  const updateUser =
    auth.updateUser || (() => undefined);
  const refreshStoredUser =
    auth.refreshStoredUser ||
    (() => undefined);

  const addressInputRef =
    useRef<HTMLInputElement | null>(null);

  const autocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(
      null
    );

  const autocompleteListenerRef =
    useRef<google.maps.MapsEventListener | null>(
      null
    );

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const googleMapRef =
    useRef<google.maps.Map | null>(null);

  const googleMarkerRef =
    useRef<google.maps.Marker | null>(null);

  const mapClickListenerRef =
    useRef<google.maps.MapsEventListener | null>(
      null
    );

  const markerDragListenerRef =
    useRef<google.maps.MapsEventListener | null>(
      null
    );

  const [initialized, setInitialized] =
    useState(false);

  const [step, setStep] =
    useState<Step>(2);

  const [saving, setSaving] =
    useState(false);

  const [loadingMaps, setLoadingMaps] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [loadingMeals, setLoadingMeals] =
    useState(false);

  const [checkingPincode, setCheckingPincode] =
    useState(false);

  const [selectedGoal, setSelectedGoal] =
    useState<GoalType | null>(
      user?.onboarding?.goal || null
    );

  const [body, setBody] = useState({
    height: user?.bodyMetrics?.height
      ? String(user.bodyMetrics.height)
      : "",

    weight: user?.bodyMetrics?.weight
      ? String(user.bodyMetrics.weight)
      : "",

    age: user?.bodyMetrics?.age
      ? String(user.bodyMetrics.age)
      : "",

    gender:
      user?.bodyMetrics?.gender || "male",

    activity: (
      user?.bodyMetrics?.activity ||
      "moderate"
    ) as Activity,
  });

  const [addressSearch, setAddressSearch] =
    useState("");

  const [locationMessage, setLocationMessage] =
    useState("");

  const [serviceable, setServiceable] =
    useState<boolean | null>(null);

  const [serviceAreaName, setServiceAreaName] =
    useState("");

  const [address, setAddress] =
    useState<Address>({
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

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const progressPercent =
    ((step - 1) / 4) * 100;

  const selectedGoalDetails = useMemo(
    () =>
      goalOptions.find(
        (option) =>
          option.key === selectedGoal
      ),
    [selectedGoal]
  );

  const recommendedMeals = useMemo(() => {
    const availableMeals = meals.filter(
      (meal) =>
        meal.isAvailable !== false
    );

    if (!selectedGoal) {
      return availableMeals.slice(0, 6);
    }

    const matchedMeals =
      availableMeals.filter((meal) =>
        meal.goalTypes?.includes(
          selectedGoal
        )
      );

    return (
      matchedMeals.length
        ? matchedMeals
        : availableMeals
    ).slice(0, 6);
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
        // Local refresh failure must not block onboarding.
      }
    },
    [
      user,
      updateUser,
      refreshStoredUser,
    ]
  );


  const checkPincodeServiceability =
    useCallback(async (pincode: string) => {
      const cleanPincode =
        normalizePincode(pincode);

      setServiceAreaName("");

      if (!isValidPincode(cleanPincode)) {
        setServiceable(null);
        return null;
      }

      try {
        setCheckingPincode(true);

        let response;

        try {
          response = await api.get(
            `/delivery-pincodes/check/${cleanPincode}`
          );
        } catch {
          response = await api.get(
            "/delivery-pincodes/check",
            {
              params: {
                pincode: cleanPincode,
              },
            }
          );
        }

        const isServiceable =
          Boolean(
            response.data?.serviceable ??
              response.data?.isServiceable ??
              response.data?.isActive
          );

        const areaName =
          response.data?.areaName ||
          response.data?.pincode?.areaName ||
          "";

        setServiceable(isServiceable);
        setServiceAreaName(areaName);

        return isServiceable;
      } catch {
        setServiceable(false);
        setServiceAreaName("");

        return false;
      } finally {
        setCheckingPincode(false);
      }
    }, []);

  const applyLocationToAddress =
    useCallback(
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
          normalizePincode(
            getAddressComponent(
              components,
              "postal_code"
            )
          );

        const finalAddress =
          formattedAddress ||
          `${lat.toFixed(6)}, ${lng.toFixed(
            6
          )}`;

        setAddress((previous) => ({
          ...previous,
          locationMode: mode,
          lat,
          lng,
          mapsUrl: makeMapsUrl(lat, lng),
          locationText: finalAddress,
          formattedAddress: finalAddress,
          area: area || previous.area,
          city: city || previous.city,
          state: state || previous.state,
          pincode:
            pincode || previous.pincode,
        }));

        setAddressSearch(finalAddress);
        setLocationMessage("");

        if (pincode) {
          void checkPincodeServiceability(
            pincode
          );
        } else {
          setServiceable(null);
          setServiceAreaName("");
        }
      },
      [checkPincodeServiceability]
    );

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!window.google?.maps) {
        return null;
      }

      return new Promise<GoogleAddressResult | null>(
        (resolve) => {
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
              results,
              status
            ) => {
              if (
                status !== "OK" ||
                !results?.length
              ) {
                resolve(null);
                return;
              }

              resolve(
                results[0] as GoogleAddressResult
              );
            }
          );
        }
      );
    },
    []
  );

  const pinLocationOnMap =
    useCallback(
      async (
        lat: number,
        lng: number
      ) => {
        setLoadingMaps(true);

        try {
          const result =
            await reverseGeocode(
              lat,
              lng
            );

          applyLocationToAddress({
            lat,
            lng,

            formattedAddress:
              result?.formatted_address ||
              `${lat.toFixed(
                6
              )}, ${lng.toFixed(6)}`,

            components:
              result?.address_components,

            mode: "manual",
          });
        } finally {
          setLoadingMaps(false);
        }
      },
      [
        applyLocationToAddress,
        reverseGeocode,
      ]
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
      setSelectedGoal(
        user.onboarding.goal
      );
    }

    const currentStep = Number(
      user?.onboarding?.currentStep || 2
    );

    if (
      currentStep >= 2 &&
      currentStep <= 5
    ) {
      setStep(currentStep as Step);
    }

    setAddress((previous) => ({
      ...previous,
      fullName:
        previous.fullName ||
        user?.name ||
        "",

      phone:
        previous.phone ||
        normalizePhone(
          user?.phone || ""
        ),
    }));

    setInitialized(true);
  }, [
    user,
    initialized,
    navigate,
  ]);

  useEffect(() => {
    if (step !== 4) return;

    let cancelled = false;

    const setupAutocomplete =
      async () => {
        try {
          setLoadingMaps(true);

          await loadGoogleMapsScript();

          if (
            cancelled ||
            !addressInputRef.current
          ) {
            return;
          }

          autocompleteListenerRef.current?.remove();

          autocompleteRef.current =
            new google.maps.places.Autocomplete(
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
            autocompleteRef.current.addListener(
              "place_changed",
              () => {
                const place =
  autocompleteRef.current?.getPlace() as
    | GoogleAddressResult
    | undefined;

if (
  !place ||
  !place.geometry?.location
) {
  setLocationMessage(
    "Choose a valid address from the Google suggestions."
  );

  return;
}

const lat = place.geometry.location.lat();
const lng = place.geometry.location.lng();

if (
  !Number.isFinite(lat) ||
  !Number.isFinite(lng)
) {
  setLocationMessage(
    "The selected address does not contain a valid location."
  );

  return;
}

applyLocationToAddress({
  lat,
  lng,
  formattedAddress:
    place.formatted_address ||
    place.name ||
    `${lat}, ${lng}`,
  components:
    place.address_components,
  mode: "manual",
});
              }
            );
        } catch {
          setLocationMessage(
            "Google address search is unavailable. Try again or enter your address manually."
          );
        } finally {
          if (!cancelled) {
            setLoadingMaps(false);
          }
        }
      };

    void setupAutocomplete();

    return () => {
      cancelled = true;

      autocompleteListenerRef.current?.remove();
      autocompleteListenerRef.current =
        null;

      autocompleteRef.current = null;
    };
  }, [
    step,
    applyLocationToAddress,
  ]);

  useEffect(() => {
    if (
      step !== 4 ||
      address.lat == null ||
      address.lng == null ||
      !window.google?.maps ||
      !mapContainerRef.current
    ) {
      return;
    }

    const position = {
      lat: Number(address.lat),
      lng: Number(address.lng),
    };

    if (!googleMapRef.current) {
      googleMapRef.current =
        new google.maps.Map(
          mapContainerRef.current,
          {
            center: position,
            zoom: 17,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          }
        );

      mapClickListenerRef.current =
        googleMapRef.current.addListener(
          "click",
          (event: google.maps.MapMouseEvent) => {
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

            void pinLocationOnMap(
              clickedLat,
              clickedLng
            );
          }
        );
    }

    googleMapRef.current.setCenter(
      position
    );

    if (!googleMarkerRef.current) {
      googleMarkerRef.current =
        new google.maps.Marker({
          position,
          map: googleMapRef.current,
          draggable: true,
          title: "Delivery location",
          animation:
            google.maps.Animation.DROP,
        });

      markerDragListenerRef.current =
        googleMarkerRef.current.addListener(
          "dragend",
          () => {
            const markerPosition =
              googleMarkerRef.current?.getPosition();

            if (!markerPosition) return;

            void pinLocationOnMap(
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
        googleMapRef.current
      );
    }
  }, [
    step,
    address.lat,
    address.lng,
    pinLocationOnMap,
  ]);

  useEffect(() => {
    return () => {
      autocompleteListenerRef.current?.remove();
      mapClickListenerRef.current?.remove();
      markerDragListenerRef.current?.remove();

      googleMarkerRef.current?.setMap(
        null
      );

      autocompleteRef.current = null;
      googleMapRef.current = null;
      googleMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (step !== 5) return;

    let cancelled = false;

    const fetchMeals = async () => {
      try {
        setLoadingMeals(true);

        const response = await api.get(
          "/meals",
          {
            params: {
              all: "true",
            },
          }
        );

        if (cancelled) return;

        const data = Array.isArray(
          response.data
        )
          ? response.data
          : response.data?.meals || [];

        setMeals(data);
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
    if (
      step !== 4 ||
      !isValidPincode(address.pincode)
    ) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        void checkPincodeServiceability(
          address.pincode
        );
      },
      450
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    step,
    address.pincode,
    checkPincodeServiceability,
  ]);

  const geocodeTypedAddress =
    async () => {
      const searchText =
        addressSearch.trim();

      if (!searchText) {
        setLocationMessage(
          "Enter an address, apartment or landmark."
        );

        return;
      }

      try {
        setLoadingMaps(true);
        setLocationMessage("");

        await loadGoogleMapsScript();

        const geocoder =
          new google.maps.Geocoder();

        geocoder.geocode(
          {
            address: searchText,

            componentRestrictions: {
              country: "IN",
            },
          },
          (results, status) => {
            setLoadingMaps(false);

            if (
              status !== "OK" ||
              !results?.length
            ) {
              setLocationMessage(
                "We could not find this address. Try a nearby landmark or choose a Google suggestion."
              );

              return;
            }

            const result = results[0];

            const lat =
              result.geometry.location.lat();

            const lng =
              result.geometry.location.lng();

            applyLocationToAddress({
              lat,
              lng,

              formattedAddress:
                result.formatted_address,

              components:
                result.address_components,

              mode: "manual",
            });
          }
        );
      } catch {
        setLoadingMaps(false);

        setLocationMessage(
          "Unable to search this address right now."
        );
      }
    };

  const useCurrentLocation =
    async () => {
      if (!navigator.geolocation) {
        setLocationMessage(
          "Location is not supported on this device."
        );

        return;
      }

      try {
        setLocating(true);
        setLocationMessage("");

        await loadGoogleMapsScript();

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = Number(
                position.coords.latitude
              );

              const lng = Number(
                position.coords.longitude
              );

              const result =
                await reverseGeocode(
                  lat,
                  lng
                );

              applyLocationToAddress({
                lat,
                lng,

                formattedAddress:
                  result?.formatted_address ||
                  `${lat.toFixed(
                    6
                  )}, ${lng.toFixed(6)}`,

                components:
                  result?.address_components,

                mode: "current",
              });
            } finally {
              setLocating(false);
            }
          },
          (error) => {
            setLocating(false);

            if (
              error.code ===
              error.PERMISSION_DENIED
            ) {
              setLocationMessage(
                "Location permission was denied. Search your address manually."
              );
            } else if (
              error.code ===
              error.POSITION_UNAVAILABLE
            ) {
              setLocationMessage(
                "Your current location is unavailable."
              );
            } else {
              setLocationMessage(
                "Location request timed out. Try again."
              );
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000,
          }
        );
      } catch {
        setLocating(false);

        setLocationMessage(
          "Google Maps could not load. Search your address manually."
        );
      }
    };

  const goBack = () => {
    if (step === 2 || saving) return;

    const previousStep = Math.max(
      2,
      step - 1
    ) as Step;

    setStep(previousStep);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleGoalSelect = (
    goal: GoalType
  ) => {
    setSelectedGoal(goal);
  };

  const handleGoalNext = async () => {
    if (!selectedGoal) {
      toast.error(
        "Choose your primary health goal."
      );

      return;
    }

    try {
      setSaving(true);

      await saveOnboardingProgress({
        onboarding: {
          goal: selectedGoal,
          currentStep: 3,
          completed: false,
        },
      });

      setStep(3);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save your goal."
      );
    } finally {
      setSaving(false);
    }
  };

  const skipBodyDetails =
    async () => {
      try {
        setSaving(true);

        await saveOnboardingProgress({
          onboarding: {
            goal: selectedGoal,
            currentStep: 4,
            completed: false,
          },
        });

        setStep(4);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to continue."
        );
      } finally {
        setSaving(false);
      }
    };

  const handleBodyNext = async () => {
    const height = Number(body.height);
    const weight = Number(body.weight);
    const age = Number(body.age);

    if (
      !Number.isFinite(height) ||
      height < 100 ||
      height > 250
    ) {
      toast.error(
        "Enter a valid height between 100 and 250 cm."
      );

      return;
    }

    if (
      !Number.isFinite(weight) ||
      weight < 25 ||
      weight > 300
    ) {
      toast.error(
        "Enter a valid weight between 25 and 300 kg."
      );

      return;
    }

    if (
      !Number.isFinite(age) ||
      age < 13 ||
      age > 100
    ) {
      toast.error(
        "Enter a valid age between 13 and 100."
      );

      return;
    }

    if (!selectedGoal) {
      setStep(2);

      toast.error(
        "Choose your goal before adding body details."
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/user/body-metrics",
        {
          height,
          weight,
          age,
          gender: body.gender,
          activity: body.activity,
          goal:
            goalBackendMap[selectedGoal],
          locked: true,
        }
      );

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

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save body details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddressNext =
    async () => {
      const fullName =
        address.fullName.trim();

      const phone = normalizePhone(
        address.phone
      );

      const pincode =
        normalizePincode(
          address.pincode
        );

      if (!fullName) {
        toast.error(
          "Enter the receiver's full name."
        );

        return;
      }

      if (!isValidPhone(phone)) {
        toast.error(
          "Enter a valid 10-digit Indian mobile number."
        );

        return;
      }

      if (!address.flatNo.trim()) {
        toast.error(
          "Enter your flat or house number."
        );

        return;
      }

      if (!address.buildingName.trim()) {
        toast.error(
          "Enter your building or apartment name."
        );

        return;
      }

      if (!address.area.trim()) {
        toast.error(
          "Enter your area or locality."
        );

        return;
      }

      if (
        !address.city.trim() ||
        !address.state.trim()
      ) {
        toast.error(
          "Enter your city and state."
        );

        return;
      }

      if (!isValidPincode(pincode)) {
        toast.error(
          "Enter a valid 6-digit pincode."
        );

        return;
      }

      if (
        address.lat == null ||
        address.lng == null
      ) {
        toast.error(
          "Search your address and select the exact delivery location."
        );

        return;
      }

      let isServiceable =
        serviceable;

      if (isServiceable === null) {
        isServiceable =
          await checkPincodeServiceability(
            pincode
          );
      }

      if (isServiceable === false) {
        toast.error(
          "MacroBox is not delivering to this pincode yet."
        );

        return;
      }

      try {
        setSaving(true);

        const addressPayload = {
          ...address,
          fullName,
          phone,
          pincode,

          mapsUrl:
            address.mapsUrl ||
            makeMapsUrl(
              address.lat,
              address.lng
            ),
        };

        await api.post(
          "/user/addresses",
          addressPayload
        );

        await saveOnboardingProgress({
          onboarding: {
            goal: selectedGoal,
            currentStep: 5,
            completed: false,
          },
        });

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

  const completeOnboarding =
    async () => {
      if (!selectedGoal) {
        setStep(2);

        toast.error(
          "Choose your health goal."
        );

        return;
      }

      try {
        setSaving(true);

        await saveOnboardingProgress({
          onboarding: {
            goal: selectedGoal,
            currentStep: 5,
            completed: true,
          },
        });

        toast.success(
          "Your MacroBox is ready!"
        );

        navigate(
          `/meals?goal=${selectedGoal}&welcome=true`,
          {
            replace: true,
          }
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to complete the setup."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-28 text-slate-950 sm:pb-12">
      <OnboardingHeader
        step={step}
        progressPercent={progressPercent}
        onBack={goBack}
        saving={saving}
      />

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 sm:py-8">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          {step === 2 && (
            <GoalStep
              selectedGoal={selectedGoal}
              saving={saving}
              onSelect={handleGoalSelect}
              onContinue={handleGoalNext}
            />
          )}

          {step === 3 && (
            <BodyStep
              selectedGoalDetails={
                selectedGoalDetails
              }
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
              locationMessage={
                locationMessage
              }
              serviceable={serviceable}
              serviceAreaName={
                serviceAreaName
              }
              loadingMaps={loadingMaps}
              locating={locating}
              checkingPincode={
                checkingPincode
              }
              saving={saving}
              addressInputRef={
                addressInputRef
              }
              mapContainerRef={
                mapContainerRef
              }
              onAddressChange={
                setAddress
              }
              onAddressSearchChange={
                setAddressSearch
              }
              onSearch={
                geocodeTypedAddress
              }
              onCurrentLocation={
                useCurrentLocation
              }
              onContinue={
                handleAddressNext
              }
              onPincodeBlur={() =>
                void checkPincodeServiceability(
                  address.pincode
                )
              }
            />
          )}

          {step === 5 && (
            <RecommendationsStep
              goal={selectedGoal}
              meals={recommendedMeals}
              loadingMeals={loadingMeals}
              saving={saving}
              onComplete={
                completeOnboarding
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

function OnboardingHeader({
  step,
  progressPercent,
  onBack,
  saving,
}: {
  step: Step;
  progressPercent: number;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={
              step === 2 || saving
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:gap-2 sm:px-4"
          >
            <ArrowLeft size={17} />

            <span className="hidden text-sm font-bold sm:inline">
              Back
            </span>
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-black text-slate-950 sm:text-base">
              Set up your MacroBox
            </p>

            <p className="mt-0.5 text-[11px] font-bold text-slate-400 sm:text-xs">
              {stepDetails[step].label} ·
              Step {step - 1} of 4
            </p>
          </div>

          <div className="w-10 shrink-0 sm:w-[88px]" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {(
            [2, 3, 4, 5] as Step[]
          ).map((itemStep) => {
            const completed =
              itemStep < step;

            const active =
              itemStep === step;

            return (
              <div
                key={itemStep}
                className="min-w-0 flex-1"
              >
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    completed || active
                      ? "bg-green-600"
                      : "bg-slate-100"
                  }`}
                />

                <p
                  className={`mt-1.5 hidden text-center text-[10px] font-bold sm:block ${
                    active
                      ? "text-green-700"
                      : completed
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {
                    stepDetails[itemStep]
                      .shortLabel
                  }
                </p>
              </div>
            );
          })}
        </div>

        <span className="sr-only">
          Progress {progressPercent}%
        </span>
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
    <div>
      <StepHero
        eyebrow="Personalize your menu"
        icon={<Target size={16} />}
        title="What is your main goal?"
        description="We’ll use this to organize meals and recommendations around what matters most to you."
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {goalOptions.map((goal) => {
            const selected =
              selectedGoal === goal.key;

            return (
              <button
                key={goal.key}
                type="button"
                onClick={() =>
                  onSelect(goal.key)
                }
                disabled={saving}
                className={`group relative overflow-hidden border p-4 text-left transition sm:p-5 ${
                  selected
                    ? "border-green-600 bg-green-50 shadow-[0_10px_30px_rgba(22,163,74,0.12)]"
                    : "border-slate-200 bg-white hover:border-green-300 hover:shadow-sm"
                } disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      selected
                        ? "bg-green-600 text-white"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {goal.icon}
                  </span>

                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      selected
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <Check size={14} />
                  </span>
                </div>

                <p className="mt-5 text-lg font-black tracking-[-0.03em] text-slate-950">
                  {goal.title}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {goal.subtitle}
                </p>

                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                  {goal.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles
              size={18}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <div>
              <p className="text-sm font-black text-slate-900">
                Your goal only personalizes recommendations
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                You can still browse every available MacroBox meal and change your goal later.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DesktopActionBar>
        <PrimaryActionButton
          onClick={onContinue}
          loading={saving}
          disabled={!selectedGoal}
        >
          Continue
        </PrimaryActionButton>
      </DesktopActionBar>

      <MobileActionBar>
        <PrimaryActionButton
          onClick={onContinue}
          loading={saving}
          disabled={!selectedGoal}
          compact
        >
          Continue
        </PrimaryActionButton>
      </MobileActionBar>
    </div>
  );
}

function BodyStep({
  selectedGoalDetails,
  body,
  saving,
  onBodyChange,
  onSkip,
  onContinue,
}: {
  selectedGoalDetails:
    | GoalOption
    | undefined;

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
    <div>
      <StepHero
        eyebrow="Set your nutrition targets"
        icon={<Sparkles size={16} />}
        title="Tell us about your body"
        description="These details help MacroBox estimate your daily calorie and macro requirements."
      />

      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        {selectedGoalDetails && (
          <div className="mb-5 flex items-center gap-3 border border-green-100 bg-green-50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              {
                selectedGoalDetails.icon
              }
            </span>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-green-700">
                Selected goal
              </p>

              <p className="mt-0.5 text-sm font-black text-slate-950">
                {
                  selectedGoalDetails.title
                }
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledInput
            label="Height"
            suffix="cm"
            type="number"
            inputMode="decimal"
            value={body.height}
            onChange={(value) =>
              onBodyChange(
                (previous) => ({
                  ...previous,
                  height: value,
                })
              )
            }
            placeholder="175"
          />

          <LabeledInput
            label="Weight"
            suffix="kg"
            type="number"
            inputMode="decimal"
            value={body.weight}
            onChange={(value) =>
              onBodyChange(
                (previous) => ({
                  ...previous,
                  weight: value,
                })
              )
            }
            placeholder="70"
          />

          <LabeledInput
            label="Age"
            suffix="years"
            type="number"
            inputMode="numeric"
            value={body.age}
            onChange={(value) =>
              onBodyChange(
                (previous) => ({
                  ...previous,
                  age: value,
                })
              )
            }
            placeholder="21"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FormLabel>
              Gender
            </FormLabel>

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
              ].map((gender) => {
                const selected =
                  body.gender ===
                  gender.value;

                return (
                  <button
                    key={gender.value}
                    type="button"
                    onClick={() =>
                      onBodyChange(
                        (previous) => ({
                          ...previous,
                          gender:
                            gender.value,
                        })
                      )
                    }
                    className={`h-12 border text-sm font-black transition ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {gender.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FormLabel>
              Activity level
            </FormLabel>

            <select
              value={body.activity}
              onChange={(event) =>
                onBodyChange(
                  (previous) => ({
                    ...previous,

                    activity:
                      event.target
                        .value as Activity,
                  })
                )
              }
              className={inputClass}
            >
              {activityOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label} —{" "}
                    {option.helper}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <p className="text-sm font-black text-slate-900">
              Used only for personalization
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              These values help estimate nutrition targets. You can update them later in MacroTrack.
            </p>
          </div>
        </div>
      </div>

      <DesktopActionBar>
        <SecondaryActionButton
          onClick={onSkip}
          disabled={saving}
        >
          Skip for now
        </SecondaryActionButton>

        <PrimaryActionButton
          onClick={onContinue}
          loading={saving}
        >
          Save and continue
        </PrimaryActionButton>
      </DesktopActionBar>

      <MobileActionBar>
        <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
          <SecondaryActionButton
            onClick={onSkip}
            disabled={saving}
            compact
          >
            Skip
          </SecondaryActionButton>

          <PrimaryActionButton
            onClick={onContinue}
            loading={saving}
            compact
          >
            Continue
          </PrimaryActionButton>
        </div>
      </MobileActionBar>
    </div>
  );
}

function AddressStep({
  address,
  addressSearch,
  locationMessage,
  serviceable,
  serviceAreaName,
  loadingMaps,
  locating,
  checkingPincode,
  saving,
  addressInputRef,
  mapContainerRef,
  onAddressChange,
  onAddressSearchChange,
  onSearch,
  onCurrentLocation,
  onContinue,
  onPincodeBlur,
}: {
  address: Address;
  addressSearch: string;
  locationMessage: string;
  serviceable: boolean | null;
  serviceAreaName: string;
  loadingMaps: boolean;
  locating: boolean;
  checkingPincode: boolean;
  saving: boolean;

  addressInputRef: React.Ref<HTMLInputElement>;
  mapContainerRef: React.Ref<HTMLDivElement>;

  onAddressChange: React.Dispatch<
    React.SetStateAction<Address>
  >;

  onAddressSearchChange: (
    value: string
  ) => void;

  onSearch: () => void;
  onCurrentLocation: () => void;
  onContinue: () => void;
  onPincodeBlur: () => void;
}) {
  const hasLocation =
    address.lat != null &&
    address.lng != null;

  return (
    <div>
      <StepHero
        eyebrow="Set your delivery location"
        icon={<MapPin size={16} />}
        title="Where should we deliver?"
        description="Search your location first, confirm the map pin, then add your flat and building details."
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <section className="border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                Find your location
              </p>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative min-w-0">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    ref={addressInputRef}
                    value={addressSearch}
                    onChange={(event) =>
                      onAddressSearchChange(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();
                        onSearch();
                      }
                    }}
                    placeholder="Search apartment, area or landmark"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={onSearch}
                  disabled={
                    loadingMaps ||
                    !addressSearch.trim()
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingMaps ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Search size={16} />
                  )}

                  Search
                </button>
              </div>

              <div className="my-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />

                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  or
                </span>

                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={
                  onCurrentLocation
                }
                disabled={locating}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-white text-sm font-black text-green-700 transition hover:bg-green-50 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LocateFixed size={17} />
                )}

                {locating
                  ? "Finding your location..."
                  : "Use current location"}
              </button>

              {locationMessage && (
                <div className="mt-3 flex items-start gap-2 border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                  <XCircle
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  <p>{locationMessage}</p>
                </div>
              )}
            </section>

            <section className="mt-4 overflow-hidden border border-slate-200 bg-white">
              {hasLocation ? (
                <>
                  <div
                    ref={mapContainerRef}
                    className="h-[280px] w-full sm:h-[360px]"
                  />

                  <div className="border-t border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                        <MapPin size={18} />
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Confirmed map location
                        </p>

                        <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                          {address.formattedAddress ||
                            address.locationText}
                        </p>

                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          Drag the pin or tap the map to adjust the exact entrance.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center sm:min-h-[360px]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Navigation size={24} />
                  </span>

                  <p className="mt-4 text-base font-black text-slate-900">
                    Select your exact location
                  </p>

                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                    Search your address or use your current location to open the map.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="min-w-0">
            <section className="border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <Home size={18} />
                </span>

                <div>
                  <p className="text-sm font-black text-slate-950">
                    Add address details
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Required for successful delivery
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <AddressInput
                  label="Receiver name"
                  placeholder="Full name"
                  value={address.fullName}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        fullName: value,
                      })
                    )
                  }
                />

                <AddressInput
                  label="Mobile number"
                  placeholder="10-digit number"
                  value={address.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,

                        phone:
                          normalizePhone(
                            value
                          ),
                      })
                    )
                  }
                />

                <AddressInput
                  label="Flat / House number"
                  placeholder="Flat 201"
                  value={address.flatNo}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        flatNo: value,
                      })
                    )
                  }
                />

                <AddressInput
                  label="Floor"
                  placeholder="Optional"
                  value={address.floor}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        floor: value,
                      })
                    )
                  }
                />

                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <AddressInput
                    label="Building / Apartment"
                    placeholder="Apartment or building name"
                    value={
                      address.buildingName
                    }
                    onChange={(value) =>
                      onAddressChange(
                        (previous) => ({
                          ...previous,

                          buildingName:
                            value,
                        })
                      )
                    }
                  />
                </div>

                <AddressInput
                  label="Area / Locality"
                  placeholder="Locality"
                  value={address.area}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        area: value,
                      })
                    )
                  }
                />

                <AddressInput
                  label="Landmark"
                  placeholder="Optional"
                  value={address.landmark}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        landmark: value,
                      })
                    )
                  }
                />

                <AddressInput
                  label="City"
                  placeholder="City"
                  value={address.city}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        city: value,
                      })
                    )
                  }
                />

                <AddressInput
                  label="State"
                  placeholder="State"
                  value={address.state}
                  onChange={(value) =>
                    onAddressChange(
                      (previous) => ({
                        ...previous,
                        state: value,
                      })
                    )
                  }
                />

                <div>
                  <AddressInput
                    label="Pincode"
                    placeholder="6-digit pincode"
                    inputMode="numeric"
                    maxLength={6}
                    value={address.pincode}
                    onBlur={onPincodeBlur}
                    onChange={(value) => {
                      const pincode =
                        normalizePincode(
                          value
                        );

                      onAddressChange(
                        (previous) => ({
                          ...previous,
                          pincode,
                        })
                      );
                    }}
                  />

                  {checkingPincode && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-500">
                      <Loader2
                        size={13}
                        className="animate-spin"
                      />
                      Checking serviceability
                    </p>
                  )}

                  {!checkingPincode &&
                    serviceable === true && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-black text-green-700">
                        <CheckCircle2
                          size={14}
                        />
                        Delivery available
                        {serviceAreaName
                          ? ` in ${serviceAreaName}`
                          : ""}
                      </p>
                    )}

                  {!checkingPincode &&
                    serviceable === false && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-black text-red-600">
                        <XCircle
                          size={14}
                        />
                        Delivery unavailable
                      </p>
                    )}
                </div>

                <div>
                  <FormLabel>
                    Address type
                  </FormLabel>

                  <select
                    value={
                      address.addressLabel
                    }
                    onChange={(event) =>
                      onAddressChange(
                        (previous) => ({
                          ...previous,

                          addressLabel:
                            event.target
                              .value as AddressLabel,
                        })
                      )
                    }
                    className={inputClass}
                  >
                    <option value="Home">
                      Home
                    </option>

                    <option value="Work">
                      Work
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <div className="mt-4 flex items-start gap-3 border border-green-100 bg-green-50 p-4">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-green-700"
              />

              <p className="text-xs font-semibold leading-5 text-slate-600">
                Your location is shared only with the assigned delivery partner for completing your order.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DesktopActionBar>
        <PrimaryActionButton
          onClick={onContinue}
          loading={saving}
          disabled={
            !hasLocation ||
            serviceable === false
          }
        >
          Save address and continue
        </PrimaryActionButton>
      </DesktopActionBar>

      <MobileActionBar>
        <PrimaryActionButton
          onClick={onContinue}
          loading={saving}
          disabled={
            !hasLocation ||
            serviceable === false
          }
          compact
        >
          Save and continue
        </PrimaryActionButton>
      </MobileActionBar>
    </div>
  );
}

function RecommendationsStep({
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
    <div>
      <StepHero
        eyebrow="Your setup is ready"
        icon={<Sparkles size={16} />}
        title="Meals picked for your goal"
        description={
          goal
            ? `Start with meals suitable for ${goalLabelMap[goal]}. You can still explore the complete MacroBox menu.`
            : "Start with these MacroBox meal recommendations."
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-col gap-3 border border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <CheckCircle2 size={19} />
            </span>

            <div>
              <p className="text-sm font-black text-slate-950">
                Personalization complete
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Your goal, nutrition preferences and delivery location are ready.
              </p>
            </div>
          </div>

          {goal && (
            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-green-700">
              {goalLabelMap[goal]}
            </span>
          )}
        </div>

        {loadingMeals ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={30}
                className="mx-auto animate-spin text-green-600"
              />

              <p className="mt-3 text-sm font-bold text-slate-500">
                Finding suitable meals...
              </p>
            </div>
          </div>
        ) : meals.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Sparkles
              size={36}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-lg font-black text-slate-950">
              Your menu is ready to explore
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              No specific recommendations are available right now, but you can explore all MacroBox meals.
            </p>
          </div>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {meals.map((meal) => (
              <RecommendedMealCard
                key={meal._id}
                meal={meal}
              />
            ))}
          </div>
        )}
      </div>

      <DesktopActionBar>
        <PrimaryActionButton
          onClick={onComplete}
          loading={saving}
        >
          Explore MacroBox meals
        </PrimaryActionButton>
      </DesktopActionBar>

      <MobileActionBar>
        <PrimaryActionButton
          onClick={onComplete}
          loading={saving}
          compact
        >
          Explore meals
        </PrimaryActionButton>
      </MobileActionBar>
    </div>
  );
}

function RecommendedMealCard({
  meal,
}: {
  meal: Meal;
}) {
  const imageUrl =
    meal.imageUrl ||
    meal.image ||
    "/placeholder-meal.png";

  return (
    <article className="w-[82vw] shrink-0 snap-start overflow-hidden border border-slate-200 bg-white shadow-sm sm:w-auto">
      <div className="relative">
        <img
          src={imageUrl}
          alt={meal.title}
          className="h-40 w-full object-cover sm:h-44"
          onError={(event) => {
            event.currentTarget.src =
              "/placeholder-meal.png";
          }}
        />

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black ${
            meal.foodType === "veg"
              ? "bg-white text-green-700"
              : "bg-white text-red-700"
          }`}
        >
          {meal.foodType === "veg"
            ? "VEG"
            : "NON-VEG"}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-black text-slate-950">
            {meal.title}
          </h3>

          <p className="shrink-0 text-base font-black text-slate-950">
            ₹{Number(meal.price || 0)}
          </p>
        </div>

        <p className="mt-2 line-clamp-2 min-h-[40px] text-xs font-semibold leading-5 text-slate-500">
          {meal.description ||
            "Balanced MacroBox meal prepared for your health goal."}
        </p>

        <div className="mt-4 grid grid-cols-4 divide-x divide-slate-200 border border-slate-200 bg-slate-50 py-2">
          <MealMacro
            label="Kcal"
            value={meal.calories}
          />

          <MealMacro
            label="Protein"
            value={`${meal.protein}g`}
          />

          <MealMacro
            label="Carbs"
            value={`${meal.carbs || 0}g`}
          />

          <MealMacro
            label="Fat"
            value={`${meal.fat || 0}g`}
          />
        </div>
      </div>
    </article>
  );
}

function StepHero({
  eyebrow,
  icon,
  title,
  description,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-br from-white to-green-50 px-4 py-7 text-center sm:px-8 sm:py-10">
      <span className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-white px-4 py-2 text-xs font-black text-green-700 shadow-sm">
        {icon}
        {eyebrow}
      </span>

      <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-black leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-5xl">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function LabeledInput({
  label,
  suffix,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?:
    | "text"
    | "decimal"
    | "numeric";
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>

      <div className="relative">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className={`${inputClass} ${
            suffix ? "pr-16" : ""
          }`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function AddressInput({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
  maxLength,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?:
    | "text"
    | "numeric"
    | "tel";
  maxLength?: number;
  onBlur?: () => void;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        onBlur={onBlur}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function FormLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function MealMacro({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 px-1 text-center">
      <p className="truncate text-[9px] font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[11px] font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DesktopActionBar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="hidden border-t border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-end sm:gap-3">
      {children}
    </div>
  );
}

function MobileActionBar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
      {children}
    </div>
  );
}

function PrimaryActionButton({
  children,
  onClick,
  loading,
  disabled,
  compact,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 ${
        compact
          ? "h-12 w-full px-4 text-sm"
          : "h-12 min-w-[220px] px-6 text-sm"
      }`}
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

function SecondaryActionButton({
  children,
  onClick,
  disabled,
  compact,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
        compact
          ? "h-12 w-full px-4 text-sm"
          : "h-12 min-w-[150px] px-5 text-sm"
      }`}
    >
      {children}
    </button>
  );
}