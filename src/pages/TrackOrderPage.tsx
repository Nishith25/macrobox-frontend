// frontend/src/pages/TrackOrderPage.tsx (FRONTEND)
// Professional Google Maps tracking page.
// No react-leaflet or leaflet required.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import socket from "../socket";

type DeliveryAgent = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  deliveryProfile?: {
    phone?: string;
  };
};

type LocationPoint = {
  lat?: number | null;
  lng?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string | null;
  timestamp?: string | null;
};

type DeliveryAddress = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  flatNo?: string;
  floor?: string;
  buildingName?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  locationMode?: "manual" | "current";
  locationText?: string;
  formattedAddress?: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string;
};

type TrackingData = {
  isLive?: boolean;
  currentLocation?: LocationPoint | null;
  locationHistory?: LocationPoint[];
  eta?: {
    text?: string;
    distanceText?: string;
    durationValue?: number | null;
    distanceValue?: number | null;
    lastCalculatedAt?: string | null;
  } | null;
  route?: {
    encodedPolyline?: string;
    updatedAt?: string | null;
  } | null;
};

type TrackResponse = {
  orderId: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  deliveryAgent?: DeliveryAgent | null;
  agentLocation?: LocationPoint | null;
  deliveryLocation?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
  tracking?: TrackingData;
  deliveryAddress?: DeliveryAddress | null;
  customerLocation?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
  slot?: {
    date?: string;
    time?: string;
  } | null;
};

type SocketTrackingPayload = {
  orderId?: string;
  deliveryStatus?: string;
  deliveryAgent?: DeliveryAgent | null;
  currentLocation?: LocationPoint | null;
  agentLocation?: LocationPoint | null;
  deliveryLocation?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
  eta?: TrackingData["eta"];
  route?: TrackingData["route"];
  isLive?: boolean;
  updatedAt?: string;
};

type TrackingStage =
  | "unassigned"
  | "accepted"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const GOOGLE_SCRIPT_ID = "google-maps-track-order-script";

const statusStages: {
  status: Exclude<TrackingStage, "unassigned" | "cancelled">;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    status: "accepted",
    title: "Order accepted",
    description: "Your delivery partner has accepted the order.",
    icon: <Check size={16} />,
  },
  {
    status: "picked_up",
    title: "Order picked up",
    description: "Your MacroBox order has left the kitchen.",
    icon: <PackageCheck size={16} />,
  },
  {
    status: "out_for_delivery",
    title: "Out for delivery",
    description: "Your order is currently on the way.",
    icon: <Bike size={16} />,
  },
  {
    status: "delivered",
    title: "Delivered",
    description: "Your order has been delivered successfully.",
    icon: <CheckCircle2 size={16} />,
  },
];

const statusRank: Record<TrackingStage, number> = {
  unassigned: 0,
  accepted: 1,
  picked_up: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
};

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google?.maps) {
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => resolve(),
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () =>
          reject(
            new Error("Google Maps script failed to load")
          ),
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();

    script.onerror = () =>
      reject(
        new Error("Google Maps script failed to load")
      );

    document.head.appendChild(script);
  });
};

const normalizeStatus = (
  status?: string
): TrackingStage => {
  const normalized = String(status || "unassigned")
    .trim()
    .toLowerCase();

  if (
    normalized === "accepted" ||
    normalized === "picked_up" ||
    normalized === "out_for_delivery" ||
    normalized === "delivered" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "unassigned";
};

const readableStatus = (status?: string) => {
  if (!status) return "Awaiting assignment";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const formatAddress = (
  address?: DeliveryAddress | null
) => {
  if (!address) return "Address unavailable";

  if (address.formattedAddress) {
    return address.formattedAddress;
  }

  if (address.locationText) {
    return address.locationText;
  }

  const parts = [
    address.flatNo || address.line1,
    address.floor,
    address.buildingName || address.line2,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.join(", ") || "Address unavailable";
};

const getStatusBadgeClass = (
  status: TrackingStage
) => {
  if (status === "accepted") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "picked_up") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (status === "out_for_delivery") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (status === "delivered") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDeliveryTime = (value?: string) => {
  if (!value) return "";

  const hour = Number(value.split(":")[0]);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour =
    hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:00 ${period}`;
};

const formatSlot = (
  slot?: TrackResponse["slot"]
) => {
  if (!slot?.date && !slot?.time) {
    return "Not available";
  }

  return [
    formatDateOnly(slot?.date),
    formatDeliveryTime(slot?.time),
  ]
    .filter(Boolean)
    .join(" · ");
};

const hasValidPoint = (
  point?: LocationPoint | null
): point is LocationPoint & {
  lat: number;
  lng: number;
} =>
  Boolean(
    point &&
      typeof point.lat === "number" &&
      typeof point.lng === "number" &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
  );

const hasValidLatLng = (
  point?: {
    lat?: number | null;
    lng?: number | null;
  } | null
): point is {
  lat: number;
  lng: number;
} =>
  Boolean(
    point &&
      typeof point.lat === "number" &&
      typeof point.lng === "number" &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
  );

const createSvgMarker = (svg: string) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg
  )}`,
  scaledSize: new google.maps.Size(54, 54),
  anchor: new google.maps.Point(27, 54),
});

const getAgentMarkerIcon = () =>
  createSvgMarker(`
    <svg width="66" height="66" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#0F172A" flood-opacity="0.28"/>
      </filter>
      <circle cx="33" cy="28" r="22" fill="#16A34A" stroke="white" stroke-width="5" filter="url(#shadow)"/>
      <path d="M33 64L23 46H43L33 64Z" fill="#16A34A" stroke="white" stroke-width="3"/>
      <path d="M21 29.5H25.5L29 23H37L40.5 29.5H45" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="25" cy="34" r="3.5" stroke="white" stroke-width="2.5"/>
      <circle cx="41" cy="34" r="3.5" stroke="white" stroke-width="2.5"/>
      <path d="M29 23L33 29.5H40.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `);

const getCustomerMarkerIcon = () =>
  createSvgMarker(`
    <svg width="66" height="66" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#0F172A" flood-opacity="0.28"/>
      </filter>
      <circle cx="33" cy="28" r="22" fill="#FC8019" stroke="white" stroke-width="5" filter="url(#shadow)"/>
      <path d="M33 64L23 46H43L33 64Z" fill="#FC8019" stroke="white" stroke-width="3"/>
      <path d="M24 30.5L33 23L42 30.5V40H36V34H30V40H24V30.5Z" fill="white"/>
    </svg>
  `);

export default function TrackOrderPage() {
  const { orderId } = useParams<{
    orderId: string;
  }>();

  const mapDivRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const agentMarkerRef =
    useRef<google.maps.Marker | null>(null);

  const customerMarkerRef =
    useRef<google.maps.Marker | null>(null);

  const routePolylineRef =
    useRef<google.maps.Polyline | null>(null);

  const historyPolylineRef =
    useRef<google.maps.Polyline | null>(null);

  const agentInfoWindowRef =
    useRef<google.maps.InfoWindow | null>(null);

  const customerInfoWindowRef =
    useRef<google.maps.InfoWindow | null>(null);

  const [tracking, setTracking] =
    useState<TrackResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [mapReady, setMapReady] =
    useState(false);

  const [mapLoading, setMapLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState<string | null>(null);

const deliveryStatus = normalizeStatus(
  tracking?.deliveryStatus
);

const agentLocation =
  useMemo<LocationPoint | null>(() => {
    if (hasValidPoint(tracking?.agentLocation)) {
      return tracking.agentLocation;
    }

    if (
      hasValidPoint(
        tracking?.tracking?.currentLocation
      )
    ) {
      return tracking.tracking.currentLocation;
    }

    return null;
  }, [tracking]);

const deliveryLocation = useMemo(() => {
  if (
    hasValidLatLng(tracking?.deliveryLocation)
  ) {
    return tracking.deliveryLocation;
  }

  if (
    hasValidLatLng(tracking?.customerLocation)
  ) {
    return tracking.customerLocation;
  }

  if (
    typeof tracking?.deliveryAddress?.lat ===
      "number" &&
    typeof tracking?.deliveryAddress?.lng ===
      "number" &&
    Number.isFinite(
      tracking.deliveryAddress.lat
    ) &&
    Number.isFinite(
      tracking.deliveryAddress.lng
    )
  ) {
    return {
      lat: tracking.deliveryAddress.lat,
      lng: tracking.deliveryAddress.lng,
    };
  }

  return null;
}, [tracking]);

const hasAssignedAgent = Boolean(
  tracking?.deliveryAgent?._id ||
    tracking?.deliveryAgent?.email ||
    tracking?.deliveryAgent?.phone ||
    tracking?.deliveryAgent?.deliveryProfile?.phone
);

const hasLiveAgentLocation = Boolean(
  hasAssignedAgent &&
    tracking?.tracking?.isLive === true &&
    hasValidPoint(agentLocation) &&
    deliveryStatus !== "unassigned" &&
    deliveryStatus !== "delivered" &&
    deliveryStatus !== "cancelled"
);

const trackingHasStarted = Boolean(
  hasLiveAgentLocation &&
    [
      "picked_up",
      "out_for_delivery",
    ].includes(deliveryStatus)
);

const canShowRouteData = Boolean(
  trackingHasStarted &&
    hasValidPoint(agentLocation) &&
    hasValidLatLng(deliveryLocation)
);

const etaText =
  deliveryStatus === "delivered"
    ? "Delivered"
    : canShowRouteData
    ? tracking?.tracking?.eta?.text ||
      "Calculating"
    : "Not started";

const distanceText =
  deliveryStatus === "delivered"
    ? "Completed"
    : canShowRouteData
    ? tracking?.tracking?.eta?.distanceText ||
      "Calculating"
    : "Not started";

const isLive = trackingHasStarted;

const agentPhone =
  tracking?.deliveryAgent?.phone ||
  tracking?.deliveryAgent?.deliveryProfile?.phone ||
  "";

  const completedStageCount =
    deliveryStatus === "cancelled"
      ? 0
      : Math.max(
          0,
          statusRank[deliveryStatus]
        );

  const progressPercentage =
    deliveryStatus === "cancelled"
      ? 0
      : Math.min(
          100,
          (completedStageCount / 4) * 100
        );

  const fetchTracking = useCallback(
    async (showToast = false) => {
      if (!orderId) {
        setError("Order ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (!loading) {
          setRefreshing(true);
        }

        setError("");

        let response;

        try {
          response = await api.get(
            `/orders/track/${orderId}`
          );
        } catch {
          response = await api.get(
            `/delivery/track/${orderId}`
          );
        }

        setTracking(response.data);
        setLastUpdated(new Date().toISOString());

        if (showToast) {
          toast.success("Tracking updated");
        }
      } catch (requestError: any) {
        const message =
          requestError?.response?.data?.message ||
          "Failed to fetch tracking data";

        setError(message);

        if (showToast) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, loading]
  );

  const initializeMap = useCallback(() => {
    if (
      !window.google?.maps ||
      !mapDivRef.current ||
      mapRef.current
    ) {
      return;
    }

    const fallbackCenter = {
      lat: 17.385,
      lng: 78.4867,
    };

    const center = hasValidPoint(agentLocation)
      ? {
          lat: agentLocation.lat,
          lng: agentLocation.lng,
        }
      : hasValidLatLng(deliveryLocation)
      ? {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        }
      : fallbackCenter;

    mapRef.current = new google.maps.Map(
      mapDivRef.current,
      {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
        mapTypeId:
          google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }],
          },
        ],
      }
    );

    setMapReady(true);
    setMapLoading(false);
  }, [agentLocation, deliveryLocation]);

  const drawRoute = useCallback(() => {
    if (
      !mapRef.current ||
      !window.google?.maps
    ) {
      return;
    }

    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    const encodedPolyline =
      tracking?.tracking?.route
        ?.encodedPolyline;

    if (
      !encodedPolyline ||
      !window.google.maps.geometry?.encoding
    ) {
      return;
    }

    try {
      const path =
        window.google.maps.geometry.encoding.decodePath(
          encodedPolyline
        );

      routePolylineRef.current =
        new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#16A34A",
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map: mapRef.current,
          zIndex: 3,
        });
    } catch (routeError) {
      console.error(
        "Route polyline decode error:",
        routeError
      );
    }
  }, [tracking]);

  const drawHistory = useCallback(() => {
    if (
      !mapRef.current ||
      !window.google?.maps
    ) {
      return;
    }

    historyPolylineRef.current?.setMap(null);
    historyPolylineRef.current = null;

    const history =
      tracking?.tracking?.locationHistory
        ?.filter(hasValidPoint)
        .map((point) => ({
          lat: point.lat,
          lng: point.lng,
        })) || [];

    if (history.length < 2) return;

    historyPolylineRef.current =
      new google.maps.Polyline({
        path: history,
        geodesic: true,
        strokeColor: "#94A3B8",
        strokeOpacity: 0.5,
        strokeWeight: 4,
        map: mapRef.current,
        zIndex: 1,
      });
  }, [tracking]);

  const updateMarkers = useCallback(() => {
    if (
      !mapRef.current ||
      !window.google?.maps
    ) {
      return;
    }

    const bounds =
      new google.maps.LatLngBounds();

    let hasAnyPoint = false;

    if (hasValidPoint(agentLocation)) {
      const position = {
        lat: agentLocation.lat,
        lng: agentLocation.lng,
      };

      if (!agentMarkerRef.current) {
        agentMarkerRef.current =
          new google.maps.Marker({
            position,
            map: mapRef.current,
            title: "Delivery partner",
            icon: getAgentMarkerIcon(),
            optimized: false,
          });
      } else {
        agentMarkerRef.current.setPosition(
          position
        );

        agentMarkerRef.current.setMap(
          mapRef.current
        );
      }

      google.maps.event.clearListeners(
        agentMarkerRef.current,
        "click"
      );

      agentInfoWindowRef.current?.close();

      agentInfoWindowRef.current =
        new google.maps.InfoWindow({
          content: `
            <div style="font-family:Inter,system-ui,sans-serif;padding:4px 2px;min-width:180px;">
              <strong style="font-size:14px;color:#0f172a;">Delivery Partner</strong>
              <div style="margin-top:5px;font-size:13px;font-weight:700;color:#334155;">
                ${
                  tracking?.deliveryAgent
                    ?.name || "MacroBox Partner"
                }
              </div>
              <div style="margin-top:4px;font-size:11px;color:#64748b;">
                Updated ${formatDateTime(
                  agentLocation.updatedAt ||
                    agentLocation.timestamp
                )}
              </div>
            </div>
          `,
        });

      agentMarkerRef.current.addListener(
        "click",
        () => {
          agentInfoWindowRef.current?.open({
            anchor: agentMarkerRef.current!,
            map: mapRef.current!,
          });
        }
      );

      bounds.extend(position);
      hasAnyPoint = true;
    } else {
      agentMarkerRef.current?.setMap(null);
    }

    if (hasValidLatLng(deliveryLocation)) {
      const position = {
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
      };

      if (!customerMarkerRef.current) {
        customerMarkerRef.current =
          new google.maps.Marker({
            position,
            map: mapRef.current,
            title: "Delivery address",
            icon: getCustomerMarkerIcon(),
            optimized: false,
          });
      } else {
        customerMarkerRef.current.setPosition(
          position
        );

        customerMarkerRef.current.setMap(
          mapRef.current
        );
      }

      google.maps.event.clearListeners(
        customerMarkerRef.current,
        "click"
      );

      customerInfoWindowRef.current?.close();

      customerInfoWindowRef.current =
        new google.maps.InfoWindow({
          content: `
            <div style="font-family:Inter,system-ui,sans-serif;padding:4px 2px;max-width:240px;">
              <strong style="font-size:14px;color:#0f172a;">Delivery Address</strong>
              <div style="margin-top:5px;font-size:12px;font-weight:600;line-height:1.5;color:#475569;">
                ${formatAddress(
                  tracking?.deliveryAddress
                )}
              </div>
            </div>
          `,
        });

      customerMarkerRef.current.addListener(
        "click",
        () => {
          customerInfoWindowRef.current?.open({
            anchor: customerMarkerRef.current!,
            map: mapRef.current!,
          });
        }
      );

      bounds.extend(position);
      hasAnyPoint = true;
    } else {
      customerMarkerRef.current?.setMap(null);
    }

    if (!hasAnyPoint) return;

    const pointsAreDifferent =
      hasValidPoint(agentLocation) &&
      hasValidLatLng(deliveryLocation) &&
      (agentLocation.lat !==
        deliveryLocation.lat ||
        agentLocation.lng !==
          deliveryLocation.lng);

    if (pointsAreDifferent) {
      mapRef.current.fitBounds(bounds, {
        top: 90,
        right: 70,
        bottom: 170,
        left: 70,
      });

      return;
    }

    if (hasValidPoint(agentLocation)) {
      mapRef.current.setCenter({
        lat: agentLocation.lat,
        lng: agentLocation.lng,
      });

      mapRef.current.setZoom(17);
      return;
    }

    if (hasValidLatLng(deliveryLocation)) {
      mapRef.current.setCenter({
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
      });

      mapRef.current.setZoom(17);
    }
  }, [
    agentLocation,
    deliveryLocation,
    tracking,
  ]);

  const recenterMap = () => {
    if (!mapRef.current) return;

    if (hasValidPoint(agentLocation)) {
      mapRef.current.panTo({
        lat: agentLocation.lat,
        lng: agentLocation.lng,
      });

      mapRef.current.setZoom(17);
      return;
    }

    if (hasValidLatLng(deliveryLocation)) {
      mapRef.current.panTo({
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
      });

      mapRef.current.setZoom(17);
    }
  };

  useEffect(() => {
    const apiKey =
      import.meta.env
        .VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(
        "Google Maps API key is missing."
      );

      setMapLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(initializeMap)
      .catch((scriptError) => {
        console.error(scriptError);

        setError(
          "Google Maps could not be loaded."
        );

        setMapLoading(false);
      });
  }, [initializeMap]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  useEffect(() => {
    if (!orderId) return;

    socket.emit("join:order", orderId);
    socket.emit("order:join", orderId);
    socket.emit("joinOrder", orderId);

    const handleDeliveryUpdate = (
      payload: SocketTrackingPayload
    ) => {
      if (
        payload?.orderId &&
        String(payload.orderId) !==
          String(orderId)
      ) {
        return;
      }

      setTracking((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          deliveryStatus:
            payload.deliveryStatus ||
            previous.deliveryStatus,
          deliveryAgent:
            payload.deliveryAgent ||
            previous.deliveryAgent,
          agentLocation:
            payload.agentLocation ||
            payload.currentLocation ||
            previous.agentLocation,
          deliveryLocation:
            payload.deliveryLocation ||
            previous.deliveryLocation,
          tracking: {
            ...(previous.tracking || {}),
            isLive:
              typeof payload.isLive ===
              "boolean"
                ? payload.isLive
                : previous.tracking?.isLive,
            currentLocation:
              payload.currentLocation ||
              payload.agentLocation ||
              previous.tracking
                ?.currentLocation,
            eta:
              payload.eta ||
              previous.tracking?.eta,
            route:
              payload.route ||
              previous.tracking?.route,
            locationHistory:
              previous.tracking
                ?.locationHistory || [],
          },
        };
      });

      setLastUpdated(
        payload.updatedAt ||
          new Date().toISOString()
      );
    };

    socket.on(
      "delivery:update",
      handleDeliveryUpdate
    );

    socket.on(
      "deliveryUpdate",
      handleDeliveryUpdate
    );

    socket.on(
      "order:tracking:update",
      handleDeliveryUpdate
    );

    return () => {
      socket.emit("leave:order", orderId);
      socket.emit("order:leave", orderId);
      socket.emit("leaveOrder", orderId);

      socket.off(
        "delivery:update",
        handleDeliveryUpdate
      );

      socket.off(
        "deliveryUpdate",
        handleDeliveryUpdate
      );

      socket.off(
        "order:tracking:update",
        handleDeliveryUpdate
      );
    };
  }, [orderId]);

  useEffect(() => {
    if (!mapReady) return;

    updateMarkers();
    drawRoute();
    drawHistory();
  }, [
    mapReady,
    tracking,
    updateMarkers,
    drawRoute,
    drawHistory,
  ]);

  useEffect(() => {
    if (
      !orderId ||
      deliveryStatus === "delivered" ||
      deliveryStatus === "cancelled"
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      fetchTracking(false);
    }, 30000);

    return () =>
      window.clearInterval(interval);
  }, [
    orderId,
    deliveryStatus,
    fetchTracking,
  ]);

  useEffect(() => {
    return () => {
      routePolylineRef.current?.setMap(null);
      historyPolylineRef.current?.setMap(null);
      agentMarkerRef.current?.setMap(null);
      customerMarkerRef.current?.setMap(null);
      agentInfoWindowRef.current?.close();
      customerInfoWindowRef.current?.close();

      mapRef.current = null;
    };
  }, []);

  if (loading) {
    return <TrackingLoader />;
  }

  if (error && !tracking) {
    return (
      <TrackingError
        message={error}
        onRetry={() => fetchTracking(true)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-10 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-slate-950"
              >
                <ArrowLeft size={15} />
                Back to orders
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-[-0.055em] sm:text-4xl">
                  Track your order
                </h1>

                {isLive && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                    </span>
                    Live
                  </span>
                )}
              </div>

              <p className="mt-2 break-all text-sm font-bold text-slate-500">
                Order #
                {tracking?.orderId || orderId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={recenterMap}
                disabled={
                  !agentLocation &&
                  !deliveryLocation
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <LocateFixed size={16} />
                Recenter
              </button>

              <button
                type="button"
                onClick={() =>
                  fetchTracking(true)
                }
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-slate-800">
                {deliveryStatus === "cancelled"
                  ? "Order cancelled"
                  : readableStatus(
                      deliveryStatus
                    )}
              </p>

              <p className="text-xs font-bold text-slate-400">
                Updated{" "}
                {formatDateTime(
                  agentLocation?.updatedAt ||
                    agentLocation?.timestamp ||
                    lastUpdated
                )}
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deliveryStatus === "cancelled"
                    ? "bg-red-500"
                    : "bg-green-600"
                }`}
                style={{
                  width:
                    deliveryStatus === "cancelled"
                      ? "100%"
                      : `${progressPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="relative h-[430px] w-full sm:h-[540px] xl:h-[660px]">
              <div
                ref={mapDivRef}
                className="h-full w-full"
              />

              {mapLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100">
                  <div className="flex items-center gap-3 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                    <Loader2
                      size={18}
                      className="animate-spin text-green-600"
                    />
                    Loading live map...
                  </div>
                </div>
              )}

              <div className="absolute left-3 top-3 z-10 flex items-center gap-2 bg-white px-3 py-2 shadow-md sm:left-4 sm:top-4">
                <Navigation
                  size={16}
                  className="text-green-600"
                />

                <div>
                  <p className="text-xs font-black text-slate-950">
                    Live delivery map
                  </p>

                  <p className="text-[10px] font-bold text-slate-400">
                    Powered by Google Maps
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={recenterMap}
                aria-label="Recenter map"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-50 sm:right-4 sm:top-4"
              >
                <LocateFixed size={18} />
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 w-[calc(100%-24px)] -translate-x-1/2 bg-white p-3 shadow-[0_15px_40px_rgba(15,23,42,0.2)] sm:bottom-4 sm:w-[calc(100%-32px)] sm:max-w-2xl sm:p-4">
                <div className="grid grid-cols-3 divide-x divide-slate-200">
                  <MapMetric
                    label="Arriving in"
                    value={etaText}
                    accent
                  />

                  <MapMetric
                    label="Distance"
                    value={distanceText}
                  />

                  <MapMetric
                    label="Status"
                    value={readableStatus(
                      deliveryStatus
                    )}
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Delivery status
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                    {readableStatus(
                      deliveryStatus
                    )}
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusBadgeClass(
                    deliveryStatus
                  )}`}
                >
                  {deliveryStatus ===
                  "cancelled"
                    ? "Cancelled"
                    : deliveryStatus ===
                      "delivered"
                    ? "Completed"
                    : isLive
                    ? "Live"
                    : "Updating"}
                </span>
              </div>

              {deliveryStatus === "cancelled" ? (
                <div className="mt-5 flex items-start gap-3 border border-red-200 bg-red-50 p-4">
                  <XCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="text-sm font-black text-red-800">
                      This order was cancelled
                    </p>

                    <p className="mt-1 text-xs font-bold leading-5 text-red-700">
                      Contact MacroBox support if
                      you need assistance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  {statusStages.map(
                    (stage, index) => {
                      const active =
                        statusRank[
                          deliveryStatus
                        ] >=
                        statusRank[
                          stage.status
                        ];

                      const current =
                        deliveryStatus ===
                        stage.status;

                      return (
                        <TrackingStep
                          key={stage.status}
                          active={active}
                          current={current}
                          last={
                            index ===
                            statusStages.length -
                              1
                          }
                          icon={stage.icon}
                          title={stage.title}
                          description={
                            stage.description
                          }
                        />
                      );
                    }
                  )}
                </div>
              )}
            </section>

            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <Bike size={20} />
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Delivery partner
                    </p>

                    <h3 className="mt-1 text-base font-black text-slate-950">
                      {tracking
                        ?.deliveryAgent?.name ||
                        "Not assigned"}
                    </h3>
                  </div>
                </div>

                {agentPhone && (
                  <a
                    href={`tel:${agentPhone}`}
                    aria-label="Call delivery partner"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700"
                  >
                    <Phone size={18} />
                  </a>
                )}
              </div>

              {tracking?.deliveryAgent ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <DetailTile
                    label="Phone"
                    value={
                      agentPhone ||
                      "Not available"
                    }
                  />

                  <DetailTile
                    label="Tracking"
                    value={
                      isLive
                        ? "Live location"
                        : "Last known"
                    }
                    accent={isLive}
                  />
                </div>
              ) : (
                <p className="mt-4 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-500">
                  A delivery partner will appear
                  here after the order is
                  assigned.
                </p>
              )}
            </section>

            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <Home size={20} />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Delivering to
                  </p>

                  <h3 className="mt-1 text-base font-black text-slate-950">
                    {tracking
                      ?.deliveryAddress
                      ?.fullName ||
                      "Delivery address"}
                  </h3>
                </div>
              </div>

              <p className="mt-4 text-sm font-bold leading-6 text-slate-600">
                {formatAddress(
                  tracking?.deliveryAddress
                )}
              </p>

              {tracking?.deliveryAddress
                ?.mapsUrl && (
                <a
                  href={
                    tracking.deliveryAddress
                      .mapsUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  Open address
                </a>
              )}
            </section>

            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Order summary
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <DetailTile
                  label="Delivery slot"
                  value={formatSlot(
                    tracking?.slot
                  )}
                />

                <DetailTile
                  label="Payment"
                  value={readableStatus(
                    tracking?.paymentStatus
                  )}
                />

                <DetailTile
                  label="ETA"
                  value={etaText}
                  accent
                />

                <DetailTile
                  label="Distance"
                  value={distanceText}
                />
              </div>
            </section>

            <section className="border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">
                    Need help with this order?
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    Contact MacroBox support for
                    delivery-related assistance.
                  </p>
                </div>

                <Link
                  to="/contact"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                >
                  <ChevronRight size={17} />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {error && tracking && (
          <div className="mt-5 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <XCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function TrackingStep({
  active,
  current,
  last,
  icon,
  title,
  description,
}: {
  active: boolean;
  current: boolean;
  last: boolean;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex gap-3">
      {!last && (
        <span
          className={`absolute left-[15px] top-8 h-[calc(100%-4px)] w-0.5 ${
            active
              ? "bg-green-500"
              : "bg-slate-200"
          }`}
        />
      )}

      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
          active
            ? "border-green-600 bg-green-600 text-white"
            : "border-slate-200 bg-white text-slate-400"
        } ${
          current
            ? "ring-4 ring-green-100"
            : ""
        }`}
      >
        {icon}
      </span>

      <div className={last ? "" : "pb-6"}>
        <p
          className={`text-sm font-black ${
            active
              ? "text-slate-950"
              : "text-slate-400"
          }`}
        >
          {title}
        </p>

        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function MapMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 text-center sm:px-4">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px]">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs font-black sm:text-base ${
          accent
            ? "text-green-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-w-0 border p-3 ${
        accent
          ? "border-green-100 bg-green-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 line-clamp-2 text-xs font-black leading-5 ${
          accent
            ? "text-green-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TrackingLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <Loader2
            className="animate-spin"
            size={25}
          />
        </span>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em]">
          Loading tracking
        </h1>

        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          Getting the latest delivery and
          location information.
        </p>
      </div>
    </main>
  );
}

function TrackingError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <MapPin size={25} />
        </span>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em]">
          Tracking unavailable
        </h1>

        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-6 text-sm font-black text-white transition hover:bg-green-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    </main>
  );
}