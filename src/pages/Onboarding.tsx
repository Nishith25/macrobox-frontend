// frontend/src/pages/Onboarding.tsx (FRONTEND)

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
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
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  price?: number;
  foodType?: "veg" | "nonveg";
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

type BodyState = {
  height: string;
  weight: string;
  age: string;
  gender: string;
  activity: Activity;
};

type GoogleAddressResult = {
  formatted_address?: string;
  name?: string;

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
};

const GOOGLE_MAPS_SCRIPT_ID = "macrobox-onboarding-google-maps";

let googleMapsPromise: Promise<void> | null = null;

const goalOptions: GoalOption[] = [
  {
    key: "fat_loss",
    title: "Fat Loss",
    helper: "Lean, filling meals",
    description: "Stay full with calorie-conscious, protein-rich meals.",
    icon: <Flame size={23} />,
  },
  {
    key: "muscle_gain",
    title: "Muscle Gain",
    helper: "Protein-first nutrition",
    description: "Support strength, muscle growth and recovery.",
    icon: <Dumbbell size={23} />,
  },
  {
    key: "weight_gain",
    title: "Weight Gain",
    helper: "Balanced extra calories",
    description: "Build a healthy calorie surplus with balanced meals.",
    icon: <Weight size={23} />,
  },
  {
    key: "clean_eating",
    title: "Clean Eating",
    helper: "Everyday balanced meals",
    description: "Build a consistent healthy routine with simple meals.",
    icon: <HeartPulse size={23} />,
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

const stepDetails: Record<
  Step,
  {
    number: number;
    short: string;
    eyebrow: string;
    title: string;
    subtitle: string;
  }
> = {
  2: {
    number: 1,
    short: "Goal",
    eyebrow: "Personalize your meals",
    title: "What is your current primary goal?",
    subtitle:
      "Choose the result that matters most to you right now.",
  },

  3: {
    number: 2,
    short: "Body",
    eyebrow: "Calculate your targets",
    title: "Tell us a little about your body",
    subtitle:
      "These details help us estimate your calories and macros.",
  },

  4: {
    number: 3,
    short: "Address",
    eyebrow: "Set your delivery location",
    title: "Where should we deliver your meals?",
    subtitle:
      "Search your location and add the basic delivery details.",
  },

  5: {
    number: 4,
    short: "Ready",
    eyebrow: "Your setup is complete",
    title: "Your MacroBox is ready",
    subtitle:
      "Explore meals selected around your health goal.",
  },
};

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
  getAddressComponent(
    components,
    "sublocality_level_1"
  ) ||
  getAddressComponent(
    components,
    "sublocality_level_2"
  ) ||
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
      reject(
        new Error("Google Maps API key is missing.")
      );

      return;
    }

    const existingScript = document.getElementById(
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
            new Error("Google Maps failed to load.")
          ),
        {
          once: true,
        }
      );

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_MAPS_SCRIPT_ID;

    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${apiKey}&libraries=places`;

    script.async = true;
    script.defer = true;

    script.onload = () => resolve();

    script.onerror = () => {
      googleMapsPromise = null;

      reject(
        new Error("Google Maps failed to load.")
      );
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

  const updateUser =
    auth.updateUser || (() => undefined);

  const refreshStoredUser =
    auth.refreshStoredUser || (() => undefined);

  const addressInputRef =
    useRef<HTMLInputElement | null>(null);

  const autocompleteRef = useRef<any>(null);
  const autocompleteListenerRef = useRef<any>(null);

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const markerDragListenerRef = useRef<any>(null);

  const [initialized, setInitialized] =
    useState(false);

  const [step, setStep] = useState<Step>(2);

  const [saving, setSaving] = useState(false);
  const [loadingMaps, setLoadingMaps] =
    useState(false);

  const [locating, setLocating] = useState(false);

  const [loadingMeals, setLoadingMeals] =
    useState(false);

  const [selectedGoal, setSelectedGoal] =
    useState<GoalType | null>(
      user?.onboarding?.goal || null
    );

  const [body, setBody] = useState<BodyState>({
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
      user?.bodyMetrics?.activity || "moderate"
    ) as Activity,
  });

  const [addressSearch, setAddressSearch] =
    useState("");

  const [
    locationMessage,
    setLocationMessage,
  ] = useState("");

  const [serviceable, setServiceable] =
    useState<boolean | null>(null);

  const [address, setAddress] =
    useState<Address>({
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

  const currentStepDetails = stepDetails[step];

  const selectedGoalDetails = useMemo(
    () =>
      goalOptions.find(
        (goal) => goal.key === selectedGoal
      ),
    [selectedGoal]
  );

  const recommendedMeals = useMemo(() => {
    const availableMeals = meals.filter(
      (meal) => meal.isAvailable !== false
    );

    if (!selectedGoal) {
      return availableMeals.slice(0, 4);
    }

    const matchingMeals = availableMeals.filter(
      (meal) =>
        meal.goalTypes?.includes(selectedGoal)
    );

    return (
      matchingMeals.length
        ? matchingMeals
        : availableMeals
    ).slice(0, 4);
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
        // Local refresh must not block onboarding.
      }
    },
    [
      user,
      updateUser,
      refreshStoredUser,
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
        user.onboarding.goal as GoalType
      );
    }

    const savedStep = Number(
      user?.onboarding?.currentStep || 2
    );

    if (savedStep >= 2 && savedStep <= 5) {
      setStep(savedStep as Step);
    }

    setAddress((previous) => ({
      ...previous,

      fullName:
        previous.fullName ||
        user?.name ||
        "",

      phone:
        previous.phone ||
        normalizePhone(user?.phone || ""),
    }));

    setInitialized(true);
  }, [
    user,
    initialized,
    navigate,
  ]);

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
        getAddressComponent(
          components,
          "postal_code"
        )
      );

      const finalAddress =
        formattedAddress ||
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

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
        pincode:
          pincode || previous.pincode,
      }));

      setAddressSearch(finalAddress);
      setLocationMessage("");
      setServiceable(null);
    },
    []
  );

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      const google = (window as any).google;

      if (!google?.maps) {
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
              results:
                | GoogleAddressResult[]
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

              resolve(results[0] || null);
            }
          );
        }
      );
    },
    []
  );

  const setLocationFromCoordinates =
    useCallback(
      async (
        lat: number,
        lng: number,
        mode: "manual" | "current"
      ) => {
        try {
          setLoadingMaps(true);

          const result =
            await reverseGeocode(lat, lng);

          applyLocation({
            lat,
            lng,
            mode,

            formattedAddress:
              result?.formatted_address ||
              `${lat.toFixed(6)}, ${lng.toFixed(
                6
              )}`,

            components:
              result?.address_components,
          });
        } finally {
          setLoadingMaps(false);
        }
      },
      [
        applyLocation,
        reverseGeocode,
      ]
    );

  useEffect(() => {
    if (step !== 4) return;

    let cancelled = false;

    const setupAutocomplete = async () => {
      try {
        setLoadingMaps(true);

        await loadGoogleMapsScript();

        if (
          cancelled ||
          !addressInputRef.current
        ) {
          return;
        }

        const google =
          (window as any).google;

        autocompleteListenerRef.current?.remove?.();

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
                  "Select an address from the suggestions."
                );

                return;
              }

              const lat =
                place.geometry.location.lat();

              const lng =
                place.geometry.location.lng();

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                setLocationMessage(
                  "The selected location is invalid."
                );

                return;
              }

              applyLocation({
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
          "Google address search is unavailable."
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

      autocompleteListenerRef.current?.remove?.();

      autocompleteListenerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [
    step,
    applyLocation,
  ]);

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

    const google =
      (window as any).google;

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
            clickableIcons: false,
            zoomControl: true,
            gestureHandling: "greedy",
          }
        );

      mapClickListenerRef.current =
        googleMapRef.current.addListener(
          "click",
          (event: any) => {
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

            void setLocationFromCoordinates(
              clickedLat,
              clickedLng,
              "manual"
            );
          }
        );
    }

    googleMapRef.current.setCenter(position);

    if (!googleMarkerRef.current) {
      googleMarkerRef.current =
        new google.maps.Marker({
          position,
          map: googleMapRef.current,
          draggable: true,
          title: "Delivery location",
        });

      markerDragListenerRef.current =
        googleMarkerRef.current.addListener(
          "dragend",
          () => {
            const markerPosition =
              googleMarkerRef.current?.getPosition();

            if (!markerPosition) return;

            void setLocationFromCoordinates(
              markerPosition.lat(),
              markerPosition.lng(),
              "manual"
            );
          }
        );
    } else {
      googleMarkerRef.current.setMap(
        googleMapRef.current
      );

      googleMarkerRef.current.setPosition(
        position
      );
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

        const response = await api.get(
          "/meals",
          {
            params: {
              all: "true",
            },
          }
        );

        if (cancelled) return;

        const mealList = Array.isArray(
          response.data
        )
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
      setLocationMessage(
        "Enter an address or landmark."
      );

      return;
    }

    try {
      setLoadingMaps(true);
      setLocationMessage("");

      await loadGoogleMapsScript();

      const google =
        (window as any).google;

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
            | GoogleAddressResult[]
            | null,
          status: string
        ) => {
          setLoadingMaps(false);

          if (
            status !== "OK" ||
            !results?.length
          ) {
            setLocationMessage(
              "Address not found. Try a nearby landmark."
            );

            return;
          }

          const result = results[0];

          if (!result) {
            setLocationMessage(
              "Address not found. Try a nearby landmark."
            );

            return;
          }

          const location =
            result.geometry?.location;

          if (!location) {
            setLocationMessage(
              "The selected address has no map location."
            );

            return;
          }

          const lat = location.lat();
          const lng = location.lng();

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            setLocationMessage(
              "The selected coordinates are invalid."
            );

            return;
          }

          applyLocation({
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
    } catch {
      setLoadingMaps(false);

      setLocationMessage(
        "Unable to search this address."
      );
    }
  };

  const useCurrentLocation = async () => {
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

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setLocationMessage(
              "Location permission was denied. Search manually."
            );
          } else {
            setLocationMessage(
              "Unable to find your current location."
            );
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

      setLocationMessage(
        "Google Maps failed to load."
      );
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

      const response = await api.patch(
        "/onboarding/goal",
        {
          goal: selectedGoal,
        }
      );

      patchUserLocally(
        response.data?.user || {
          onboarding:
            response.data?.onboarding,
        }
      );

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

  const skipBodyDetails = async () => {
    try {
      setSaving(true);

      const response = await api.patch(
        "/onboarding/body-details",
        {
          height: null,
          weight: null,
          age: null,
          activity: "",
          gender: body.gender,
        }
      );

      patchUserLocally({
        onboarding:
          response.data?.onboarding,

        bodyMetrics:
          response.data?.bodyMetrics,
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

    try {
      setSaving(true);

      const response = await api.patch(
        "/onboarding/body-details",
        {
          height,
          weight,
          age,
          gender: body.gender,
          activity: body.activity,
        }
      );

      patchUserLocally({
        onboarding:
          response.data?.onboarding,

        bodyMetrics:
          response.data?.bodyMetrics,
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

  const handleAddressNext = async () => {
    const fullName =
      address.fullName.trim();

    const phone = normalizePhone(
      address.phone
    );

    const pincode = normalizePincode(
      address.pincode
    );

    if (!fullName) {
      toast.error(
        "Enter the receiver name."
      );

      return;
    }

    if (!isValidPhone(phone)) {
      toast.error(
        "Enter a valid 10-digit mobile number."
      );

      return;
    }

    if (!address.flatNo.trim()) {
      toast.error(
        "Enter the flat or house number."
      );

      return;
    }

    if (!address.buildingName.trim()) {
      toast.error(
        "Enter the building or apartment name."
      );

      return;
    }

    if (!address.area.trim()) {
      toast.error(
        "Enter your area or locality."
      );

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
        "Search and confirm the exact delivery location."
      );

      return;
    }

    try {
      setSaving(true);

      const response = await api.patch(
        "/onboarding/address",
        {
          address: {
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
          },
        }
      );

      patchUserLocally({
        onboarding:
          response.data?.onboarding,
      });

      if (
        response.data?.serviceable === false
      ) {
        setServiceable(false);

        toast.error(
          response.data?.message ||
            "MacroBox is not delivering to this area yet."
        );

        return;
      }

      setServiceable(true);

      toast.success(
        response.data?.message ||
          "Address saved."
      );

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

      toast.error(
        "Choose your health goal."
      );

      return;
    }

    try {
      setSaving(true);

      const response = await api.patch(
        "/onboarding/complete"
      );

      patchUserLocally(
        response.data?.user || {
          onboarding:
            response.data?.onboarding,
        }
      );

      toast.success(
        response.data?.message ||
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
          "Failed to complete onboarding."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#171614] text-white">
      <BackgroundDecoration />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col">
        <OnboardingHeader
          step={step}
          saving={saving}
          onBack={goBack}
        />

        <div className="flex flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-8 lg:px-10 lg:py-8">
          <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <DesktopIntroduction
              step={step}
              selectedGoal={selectedGoalDetails}
            />

            <section className="min-w-0">
              <MobileStepHeading step={step} />

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
                  selectedGoal={
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
                  loadingMaps={loadingMaps}
                  locating={locating}
                  saving={saving}
                  addressInputRef={
                    addressInputRef
                  }
                  mapContainerRef={
                    mapContainerRef
                  }
                  onAddressChange={setAddress}
                  onAddressSearchChange={
                    setAddressSearch
                  }
                  onSearch={searchTypedAddress}
                  onCurrentLocation={
                    useCurrentLocation
                  }
                  onContinue={
                    handleAddressNext
                  }
                />
              )}

              {step === 5 && (
                <ReadyStep
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
        </div>
      </div>
    </main>
  );
}

function BackgroundDecoration() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(117,92,75,0.42),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_70%_82%,rgba(22,163,74,0.13),transparent_30%)]" />

      <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-[#7b6252]/30 blur-[110px]" />

      <div className="pointer-events-none absolute -right-20 bottom-24 h-72 w-72 rounded-full bg-green-900/20 blur-[120px]" />

      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
    </>
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
  const details = stepDetails[step];

  return (
    <header className="shrink-0 px-4 pt-[max(18px,env(safe-area-inset-top))] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1180px] border-b border-white/15 pb-4 sm:pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 2 || saving}
            aria-label="Go back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30 sm:h-11 sm:w-11"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-white/90">
                  MacroBox
                </p>

                <p className="mt-0.5 text-[11px] font-medium text-white/50">
                  Step {details.number} of 4 ·{" "}
                  {details.short}
                </p>
              </div>

              <p className="text-sm font-semibold text-white/80">
                {details.number * 25}%
              </p>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className={`h-1 rounded-full transition ${
                    item <= details.number
                      ? "bg-white"
                      : "bg-white/15"
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

function DesktopIntroduction({
  step,
  selectedGoal,
}: {
  step: Step;
  selectedGoal?: GoalOption;
}) {
  const details = stepDetails[step];

  return (
    <aside className="hidden lg:block">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/45">
        {details.eyebrow}
      </p>

      <h1 className="mt-6 max-w-lg text-[56px] font-light leading-[1.08] tracking-[-0.05em] text-white">
        {details.title}
      </h1>

      <p className="mt-6 max-w-md text-base font-normal leading-7 text-white/55">
        {details.subtitle}
      </p>

      {selectedGoal && step > 2 && (
        <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950">
            {selectedGoal.icon}
          </span>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
              Selected goal
            </p>

            <p className="mt-0.5 text-sm font-semibold text-white">
              {selectedGoal.title}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

function MobileStepHeading({
  step,
}: {
  step: Step;
}) {
  const details = stepDetails[step];

  return (
    <div className="mb-6 lg:hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        {details.eyebrow}
      </p>

      <h1 className="mt-3 text-[34px] font-light leading-[1.14] tracking-[-0.045em] text-white sm:text-4xl">
        {details.title}
      </h1>

      <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
        {details.subtitle}
      </p>
    </div>
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
              className={`group relative flex min-h-[175px] flex-col justify-between overflow-hidden rounded-[28px] border p-5 text-left backdrop-blur-2xl transition duration-300 sm:min-h-[210px] sm:p-6 ${
                selected
                  ? "border-white bg-white text-slate-950 shadow-[0_28px_80px_rgba(0,0,0,0.25)]"
                  : "border-white/30 bg-white/[0.07] text-white hover:border-white/60 hover:bg-white/[0.11]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                    selected
                      ? "bg-slate-950 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {goal.icon}
                </span>

                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    selected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-white/35 text-transparent"
                  }`}
                >
                  <Check size={14} />
                </span>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-medium tracking-[-0.02em] sm:text-xl">
                  {goal.title}
                </h2>

                <p
                  className={`mt-1 text-xs font-medium sm:text-sm ${
                    selected
                      ? "text-slate-500"
                      : "text-white/45"
                  }`}
                >
                  {goal.helper}
                </p>

                <p
                  className={`mt-3 hidden text-xs leading-5 sm:block ${
                    selected
                      ? "text-slate-500"
                      : "text-white/40"
                  }`}
                >
                  {goal.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <BottomAction>
        <LightPrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={!selectedGoal}
        >
          Next
        </LightPrimaryButton>
      </BottomAction>
    </div>
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
  body: BodyState;
  saving: boolean;
  onBodyChange: Dispatch<
    SetStateAction<BodyState>
  >;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/20 bg-white/[0.08] p-4 backdrop-blur-2xl sm:p-6 lg:p-8">
      {selectedGoal && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950">
            {selectedGoal.icon}
          </span>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Current goal
            </p>

            <p className="mt-0.5 text-sm font-semibold text-white">
              {selectedGoal.title}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <DarkNumberInput
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

        <DarkNumberInput
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

        <DarkNumberInput
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
          <DarkLabel>Gender</DarkLabel>

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
              const selected =
                body.gender === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    onBodyChange(
                      (previous) => ({
                        ...previous,
                        gender: item.value,
                      })
                    )
                  }
                  className={`h-12 rounded-2xl border text-sm font-semibold transition ${
                    selected
                      ? "border-white bg-white text-slate-950"
                      : "border-white/20 bg-white/[0.05] text-white/70"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <DarkLabel>
            Activity level
          </DarkLabel>

          <select
            value={body.activity}
            onChange={(event) =>
              onBodyChange((previous) => ({
                ...previous,
                activity:
                  event.target
                    .value as Activity,
              }))
            }
            className="h-12 w-full rounded-2xl border border-white/20 bg-[#292725] px-4 text-sm font-semibold text-white outline-none focus:border-white/60"
          >
            {activityOptions.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-white/40">
        You can update these details later from
        MacroTrack.
      </p>

      <BottomAction inline>
        <div className="grid grid-cols-[0.65fr_1.35fr] gap-3">
          <DarkSecondaryButton
            onClick={onSkip}
            disabled={saving}
          >
            Skip
          </DarkSecondaryButton>

          <LightPrimaryButton
            onClick={onContinue}
            loading={saving}
          >
            Next
          </LightPrimaryButton>
        </div>
      </BottomAction>
    </div>
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

  addressInputRef: Ref<HTMLInputElement>;
  mapContainerRef: Ref<HTMLDivElement>;

  onAddressChange: Dispatch<
    SetStateAction<Address>
  >;

  onAddressSearchChange: (
    value: string
  ) => void;

  onSearch: () => void;
  onCurrentLocation: () => void;
  onContinue: () => void;
}) {
  const hasLocation =
    address.lat != null &&
    address.lng != null;

  return (
    <div className="rounded-[30px] border border-white/20 bg-white/[0.08] backdrop-blur-2xl">
      <div className="space-y-5 p-4 sm:p-6 lg:max-h-[690px] lg:overflow-y-auto lg:p-7">
        <section>
          <DarkLabel>
            Search delivery location
          </DarkLabel>

          <div className="grid grid-cols-[1fr_48px_48px] gap-2">
            <div className="relative min-w-0">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
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
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearch();
                  }
                }}
                placeholder="Search area or landmark"
                className="h-12 w-full rounded-2xl border border-white/20 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-white/35 focus:border-white/60"
              />
            </div>

            <button
              type="button"
              onClick={onSearch}
              disabled={
                loadingMaps ||
                !addressSearch.trim()
              }
              className="flex h-12 items-center justify-center rounded-2xl bg-white text-slate-950 transition disabled:opacity-40"
            >
              {loadingMaps ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Search size={18} />
              )}
            </button>

            <button
              type="button"
              onClick={onCurrentLocation}
              disabled={locating}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/[0.06] text-white transition disabled:opacity-40"
            >
              {locating ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <LocateFixed size={18} />
              )}
            </button>
          </div>

          {locationMessage && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-xs font-medium text-red-100">
              <XCircle
                size={14}
                className="mt-0.5 shrink-0"
              />

              {locationMessage}
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white/15 bg-black/15">
          {hasLocation ? (
            <div
              ref={mapContainerRef}
              className="h-[180px] w-full sm:h-[240px]"
            />
          ) : (
            <div className="flex h-[150px] items-center justify-center px-6 text-center sm:h-[200px]">
              <div>
                <MapPin
                  className="mx-auto text-white/25"
                  size={30}
                />

                <p className="mt-3 text-xs font-medium text-white/45">
                  Search your location or use current
                  location
                </p>
              </div>
            </div>
          )}
        </section>

        {hasLocation &&
          address.formattedAddress && (
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Selected location
              </p>

              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/70">
                {address.formattedAddress}
              </p>
            </div>
          )}

        <section>
          <DarkLabel>
            Delivery details
          </DarkLabel>

          <div className="grid grid-cols-2 gap-3">
            <DarkTextInput
              label="Name"
              value={address.fullName}
              placeholder="Receiver name"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    fullName: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="Phone"
              value={address.phone}
              placeholder="Mobile number"
              inputMode="numeric"
              maxLength={10}
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    phone:
                      normalizePhone(value),
                  })
                )
              }
            />

            <DarkTextInput
              label="Flat / House"
              value={address.flatNo}
              placeholder="Flat 201"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    flatNo: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="Building"
              value={address.buildingName}
              placeholder="Apartment"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    buildingName: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="Area"
              value={address.area}
              placeholder="Locality"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    area: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="City"
              value={address.city}
              placeholder="City"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    city: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="State"
              value={address.state}
              placeholder="State"
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    state: value,
                  })
                )
              }
            />

            <DarkTextInput
              label="Pincode"
              value={address.pincode}
              placeholder="6 digits"
              inputMode="numeric"
              maxLength={6}
              onChange={(value) =>
                onAddressChange(
                  (previous) => ({
                    ...previous,
                    pincode:
                      normalizePincode(value),
                  })
                )
              }
            />
          </div>

          <div className="mt-4">
            <DarkLabel>
              Address type
            </DarkLabel>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  "Home",
                  "Work",
                  "Other",
                ] as AddressLabel[]
              ).map((label) => {
                const selected =
                  address.addressLabel === label;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      onAddressChange(
                        (previous) => ({
                          ...previous,
                          addressLabel: label,
                        })
                      )
                    }
                    className={`h-11 rounded-2xl border text-xs font-semibold transition ${
                      selected
                        ? "border-white bg-white text-slate-950"
                        : "border-white/20 bg-white/[0.05] text-white/65"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {serviceable === false && (
            <p className="mt-3 rounded-2xl bg-red-500/15 p-3 text-xs font-medium leading-5 text-red-100">
              MacroBox is not delivering to this
              pincode yet.
            </p>
          )}
        </section>
      </div>

      <BottomAction inline>
        <LightPrimaryButton
          onClick={onContinue}
          loading={saving}
          disabled={serviceable === false}
        >
          Save address
        </LightPrimaryButton>
      </BottomAction>
    </div>
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
    <div>
      <div className="rounded-[30px] border border-white/20 bg-white/[0.08] p-4 backdrop-blur-2xl sm:p-6">
        {loadingMeals ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Loader2
                className="mx-auto animate-spin text-white"
                size={32}
              />

              <p className="mt-3 text-sm text-white/50">
                Finding your meals...
              </p>
            </div>
          </div>
        ) : meals.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-center">
            <div>
              <CheckCircle2
                className="mx-auto text-white"
                size={42}
              />

              <h2 className="mt-5 text-2xl font-light text-white">
                Setup complete
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Your MacroBox experience is ready.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/35">
                  Recommended for
                </p>

                <h2 className="mt-1 text-lg font-medium text-white">
                  {goal
                    ? goalLabelMap[goal]
                    : "Your goal"}
                </h2>
              </div>

              <Sparkles
                className="text-white/60"
                size={22}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {meals.map((meal) => (
                <MealCard
                  key={meal._id}
                  meal={meal}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomAction>
        <LightPrimaryButton
          onClick={onComplete}
          loading={saving}
        >
          Explore meals
        </LightPrimaryButton>
      </BottomAction>
    </div>
  );
}

function MealCard({
  meal,
}: {
  meal: Meal;
}) {
  const image =
    meal.imageUrl ||
    meal.image ||
    "/placeholder-meal.png";

  return (
    <article className="overflow-hidden rounded-[22px] border border-white/20 bg-white/[0.07]">
      <img
        src={image}
        alt={meal.title}
        className="h-24 w-full object-cover sm:h-28"
        onError={(event) => {
          event.currentTarget.src =
            "/placeholder-meal.png";
        }}
      />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-xs font-semibold text-white sm:text-sm">
            {meal.title}
          </h3>

          <p className="shrink-0 text-xs font-semibold text-white">
            ₹{Number(meal.price || 0)}
          </p>
        </div>

        <p className="mt-1 text-[10px] text-white/45">
          {Number(meal.calories || 0)} kcal ·{" "}
          {Number(meal.protein || 0)}g protein
        </p>
      </div>
    </article>
  );
}

function DarkNumberInput({
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
      <DarkLabel>{label}</DarkLabel>

      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-white/20 bg-white/[0.06] px-2 pr-8 text-center text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/60"
        />

        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-white/35">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function DarkTextInput({
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
      <DarkLabel>{label}</DarkLabel>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="h-11 w-full rounded-2xl border border-white/20 bg-white/[0.06] px-3 text-xs font-medium text-white outline-none placeholder:text-white/30 focus:border-white/60 sm:text-sm"
      />
    </div>
  );
}

function DarkLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
      {children}
    </label>
  );
}

function BottomAction({
  children,
  inline,
}: {
  children: ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="border-t border-white/15 p-4 sm:p-5">
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 hidden lg:block">
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#171614]/90 p-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden">
        {children}
      </div>
    </>
  );
}

function LightPrimaryButton({
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
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-medium text-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? (
        <Loader2
          size={19}
          className="animate-spin"
        />
      ) : (
        <>
          {children}
          <ArrowRight size={19} />
        </>
      )}
    </button>
  );
}

function DarkSecondaryButton({
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
      className="flex h-14 w-full items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
    >
      {children}
    </button>
  );
}