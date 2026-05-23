// frontend/src/pages/TrackOrderPage.tsx (FRONTEND)
// Google Maps version — NO react-leaflet / NO leaflet

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bike,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Route,
  Truck,
  User,
} from "lucide-react";
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

declare global {
  interface Window {
    google?: typeof google;
  }
}

const GOOGLE_SCRIPT_ID = "google-maps-track-order-script";

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps script failed to load"))
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
      reject(new Error("Google Maps script failed to load"));

    document.head.appendChild(script);
  });
};

function readableStatus(status?: string) {
  if (!status) return "N/A";
  return status.replaceAll("_", " ");
}

function formatAddress(address?: DeliveryAddress | null) {
  if (!address) return "N/A";

  if (address.formattedAddress) return address.formattedAddress;

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

  return parts.join(", ") || "N/A";
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case "accepted":
      return "bg-blue-100 text-blue-700";
    case "picked_up":
      return "bg-yellow-100 text-yellow-700";
    case "out_for_delivery":
      return "bg-orange-100 text-orange-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSlot(slot?: TrackResponse["slot"]) {
  if (!slot?.date && !slot?.time) return "N/A";

  return `${slot?.date || ""} ${slot?.time || ""}`.trim();
}

function hasValidPoint(point?: LocationPoint | null) {
  return (
    point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function hasValidLatLng(
  point?: { lat?: number | null; lng?: number | null } | null
) {
  return (
    point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function createSvgMarker(svg: string) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(58, 58),
    anchor: new google.maps.Point(29, 58),
  };
}

function getAgentMarkerIcon() {
  return createSvgMarker(`
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
      <circle cx="35" cy="30" r="25" fill="#16A34A" stroke="white" stroke-width="6" filter="url(#shadow)"/>
      <text x="35" y="40" text-anchor="middle" font-size="28">🏍️</text>
      <path d="M35 68L24 50H46L35 68Z" fill="#16A34A" stroke="white" stroke-width="4"/>
    </svg>
  `);
}

function getCustomerMarkerIcon() {
  return createSvgMarker(`
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
      <circle cx="35" cy="30" r="25" fill="#EF4444" stroke="white" stroke-width="6" filter="url(#shadow)"/>
      <text x="35" y="40" text-anchor="middle" font-size="28">📍</text>
      <path d="M35 68L24 50H46L35 68Z" fill="#EF4444" stroke="white" stroke-width="4"/>
    </svg>
  `);
}

export default function TrackOrderPage() {
  const { orderId } = useParams();

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const agentMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const historyPolylineRef = useRef<google.maps.Polyline | null>(null);

  const [tracking, setTracking] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const deliveryStatus = tracking?.deliveryStatus || "unassigned";

  const agentLocation = useMemo<LocationPoint | null>(() => {
    if (hasValidPoint(tracking?.agentLocation)) return tracking?.agentLocation || null;

    if (hasValidPoint(tracking?.tracking?.currentLocation)) {
      return tracking?.tracking?.currentLocation || null;
    }

    return null;
  }, [tracking]);

  const deliveryLocation = useMemo(() => {
    if (hasValidLatLng(tracking?.deliveryLocation)) {
      return tracking?.deliveryLocation || null;
    }

    if (hasValidLatLng(tracking?.customerLocation)) {
      return tracking?.customerLocation || null;
    }

    if (
      typeof tracking?.deliveryAddress?.lat === "number" &&
      typeof tracking?.deliveryAddress?.lng === "number"
    ) {
      return {
        lat: tracking.deliveryAddress.lat,
        lng: tracking.deliveryAddress.lng,
      };
    }

    return null;
  }, [tracking]);

  const etaText = tracking?.tracking?.eta?.text || "Calculating";
  const distanceText = tracking?.tracking?.eta?.distanceText || "N/A";
  const isLive = Boolean(tracking?.tracking?.isLive);

  const fetchTracking = useCallback(async () => {
    if (!orderId) return;

    try {
      setError("");

      let res;

      try {
        res = await api.get(`/orders/track/${orderId}`);
      } catch {
        res = await api.get(`/delivery/track/${orderId}`);
      }

      setTracking(res.data);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch tracking data");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const initializeMap = useCallback(() => {
    if (!window.google?.maps || !mapDivRef.current || mapRef.current) return;

    const fallbackCenter = {
      lat: 17.385,
      lng: 78.4867,
    };

    const center =
      hasValidPoint(agentLocation)
        ? {
            lat: agentLocation!.lat!,
            lng: agentLocation!.lng!,
          }
        : hasValidLatLng(deliveryLocation)
        ? {
            lat: deliveryLocation!.lat!,
            lng: deliveryLocation!.lng!,
          }
        : fallbackCenter;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: true,
      gestureHandling: "greedy",
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "on" }],
        },
        {
          featureType: "poi.medical",
          stylers: [{ visibility: "on" }],
        },
      ],
    });

    setMapReady(true);
  }, [agentLocation, deliveryLocation]);

  const drawRoute = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    const encoded = tracking?.tracking?.route?.encodedPolyline;

    if (!encoded || !window.google.maps.geometry?.encoding) return;

    try {
      const decodedPath = window.google.maps.geometry.encoding.decodePath(encoded);

      routePolylineRef.current = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: "#16A34A",
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map: mapRef.current,
      });
    } catch (err) {
      console.error("Route polyline decode error:", err);
    }
  }, [tracking]);

  const drawHistory = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    if (historyPolylineRef.current) {
      historyPolylineRef.current.setMap(null);
      historyPolylineRef.current = null;
    }

    const history =
      tracking?.tracking?.locationHistory
        ?.filter((p) => hasValidPoint(p))
        .map((p) => ({
          lat: p.lat!,
          lng: p.lng!,
        })) || [];

    if (history.length < 2) return;

    historyPolylineRef.current = new google.maps.Polyline({
      path: history,
      geodesic: true,
      strokeColor: "#F97316",
      strokeOpacity: 0.7,
      strokeWeight: 4,
      map: mapRef.current,
    });
  }, [tracking]);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const bounds = new google.maps.LatLngBounds();
    let hasAnyPoint = false;

    if (hasValidPoint(agentLocation)) {
      const position = {
        lat: agentLocation!.lat!,
        lng: agentLocation!.lng!,
      };

      if (!agentMarkerRef.current) {
        agentMarkerRef.current = new google.maps.Marker({
          position,
          map: mapRef.current,
          title: "Delivery Partner",
          icon: getAgentMarkerIcon(),
          animation: google.maps.Animation.DROP,
        });
      } else {
        agentMarkerRef.current.setPosition(position);
        agentMarkerRef.current.setMap(mapRef.current);
      }

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:system-ui;padding:4px 2px;">
            <strong>Delivery Partner</strong><br/>
            ${tracking?.deliveryAgent?.name || "Partner"}<br/>
            <small>${formatDateTime(agentLocation?.updatedAt || agentLocation?.timestamp)}</small>
          </div>
        `,
      });

      agentMarkerRef.current.addListener("click", () => {
        infoWindow.open({
          anchor: agentMarkerRef.current!,
          map: mapRef.current!,
        });
      });

      bounds.extend(position);
      hasAnyPoint = true;
    } else if (agentMarkerRef.current) {
      agentMarkerRef.current.setMap(null);
    }

    if (hasValidLatLng(deliveryLocation)) {
      const position = {
        lat: deliveryLocation!.lat!,
        lng: deliveryLocation!.lng!,
      };

      if (!customerMarkerRef.current) {
        customerMarkerRef.current = new google.maps.Marker({
          position,
          map: mapRef.current,
          title: "Delivery Address",
          icon: getCustomerMarkerIcon(),
          animation: google.maps.Animation.DROP,
        });
      } else {
        customerMarkerRef.current.setPosition(position);
        customerMarkerRef.current.setMap(mapRef.current);
      }

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:system-ui;padding:4px 2px;max-width:260px;">
            <strong>Delivery Address</strong><br/>
            <small>${formatAddress(tracking?.deliveryAddress)}</small>
          </div>
        `,
      });

      customerMarkerRef.current.addListener("click", () => {
        infoWindow.open({
          anchor: customerMarkerRef.current!,
          map: mapRef.current!,
        });
      });

      bounds.extend(position);
      hasAnyPoint = true;
    } else if (customerMarkerRef.current) {
      customerMarkerRef.current.setMap(null);
    }

    if (hasAnyPoint) {
      if (
        hasValidPoint(agentLocation) &&
        hasValidLatLng(deliveryLocation) &&
        agentLocation?.lat !== deliveryLocation?.lat &&
        agentLocation?.lng !== deliveryLocation?.lng
      ) {
        mapRef.current.fitBounds(bounds, {
          top: 80,
          right: 80,
          bottom: 180,
          left: 80,
        });
      } else if (hasValidPoint(agentLocation)) {
        mapRef.current.setCenter({
          lat: agentLocation!.lat!,
          lng: agentLocation!.lng!,
        });
        mapRef.current.setZoom(17);
      } else if (hasValidLatLng(deliveryLocation)) {
        mapRef.current.setCenter({
          lat: deliveryLocation!.lat!,
          lng: deliveryLocation!.lng!,
        });
        mapRef.current.setZoom(17);
      }
    }
  }, [agentLocation, deliveryLocation, tracking]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError("Google Maps API key missing. Add VITE_GOOGLE_MAPS_API_KEY.");
      setLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        initializeMap();
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load Google Maps.");
        setLoading(false);
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

    const handleDeliveryUpdate = (payload: SocketTrackingPayload) => {
      if (payload?.orderId && String(payload.orderId) !== String(orderId)) {
        return;
      }

      setTracking((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          deliveryStatus: payload.deliveryStatus || prev.deliveryStatus,
          deliveryAgent: payload.deliveryAgent || prev.deliveryAgent,
          agentLocation:
            payload.agentLocation ||
            payload.currentLocation ||
            prev.agentLocation,
          deliveryLocation:
            payload.deliveryLocation || prev.deliveryLocation,
          tracking: {
            ...(prev.tracking || {}),
            isLive:
              typeof payload.isLive === "boolean"
                ? payload.isLive
                : prev.tracking?.isLive,
            currentLocation:
              payload.currentLocation ||
              payload.agentLocation ||
              prev.tracking?.currentLocation,
            eta: payload.eta || prev.tracking?.eta,
            route: payload.route || prev.tracking?.route,
            locationHistory: prev.tracking?.locationHistory || [],
          },
        };
      });

      setLastUpdated(new Date().toISOString());
    };

    socket.on("delivery:update", handleDeliveryUpdate);
    socket.on("deliveryUpdate", handleDeliveryUpdate);
    socket.on("order:tracking:update", handleDeliveryUpdate);

    return () => {
      socket.emit("leave:order", orderId);
      socket.emit("order:leave", orderId);
      socket.emit("leaveOrder", orderId);

      socket.off("delivery:update", handleDeliveryUpdate);
      socket.off("deliveryUpdate", handleDeliveryUpdate);
      socket.off("order:tracking:update", handleDeliveryUpdate);
    };
  }, [orderId]);

  useEffect(() => {
    if (!mapReady) return;

    updateMarkers();
    drawRoute();
    drawHistory();
  }, [mapReady, tracking, updateMarkers, drawRoute, drawHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50/40 px-4 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border bg-white p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto animate-spin text-green-600" size={36} />
          <h1 className="mt-4 text-2xl font-black text-gray-900">
            Loading order tracking...
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we fetch your live delivery updates.
          </p>
        </div>
      </div>
    );
  }

  if (error && !tracking) {
    return (
      <div className="min-h-screen bg-green-50/40 px-4 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border bg-white p-8 text-center shadow-sm">
          <MapPin className="mx-auto text-red-600" size={38} />
          <h1 className="mt-4 text-2xl font-black text-gray-900">
            Tracking unavailable
          </h1>
          <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchTracking}
            className="mt-6 rounded-2xl bg-green-600 px-6 py-3 text-sm font-black text-white hover:bg-green-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
              Live Delivery Tracking
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950">
              Track Your Order
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Order ID:{" "}
              <span className="font-bold text-gray-800">
                {tracking?.orderId || orderId}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={fetchTracking}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-white px-5 py-3 text-sm font-black text-green-700 shadow-sm hover:bg-green-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="relative h-[650px] w-full">
              <div ref={mapDivRef} className="h-full w-full" />

              <div className="absolute left-4 top-4 z-10 rounded-3xl bg-white/95 p-4 shadow-xl backdrop-blur">
                <p className="flex items-center gap-2 text-sm font-black text-gray-950">
                  <Navigation size={18} className="text-green-600" />
                  Live Map
                </p>

                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Google Maps delivery tracking
                </p>
              </div>

              <div className="absolute bottom-4 left-1/2 z-10 w-[94%] max-w-3xl -translate-x-1/2 rounded-3xl bg-white p-4 shadow-2xl">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-green-700">
                      ETA
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-950">
                      {etaText}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Distance
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-950">
                      {distanceText}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Status
                    </p>
                    <p className="mt-1 text-lg font-black capitalize text-gray-950">
                      {readableStatus(deliveryStatus)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-gray-500">
                    Delivery Status
                  </p>
                  <h2 className="mt-1 text-2xl font-black capitalize text-gray-950">
                    {readableStatus(deliveryStatus)}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusBadgeClass(
                    deliveryStatus
                  )}`}
                >
                  {readableStatus(deliveryStatus)}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <StatusStep
                  active={[
                    "accepted",
                    "picked_up",
                    "out_for_delivery",
                    "delivered",
                  ].includes(deliveryStatus)}
                  icon={<CheckCircle2 size={16} />}
                  title="Order accepted"
                  desc="Your order has been accepted."
                />

                <StatusStep
                  active={[
                    "picked_up",
                    "out_for_delivery",
                    "delivered",
                  ].includes(deliveryStatus)}
                  icon={<PackageCheck size={16} />}
                  title="Picked up"
                  desc="Delivery partner picked up your order."
                />

                <StatusStep
                  active={["out_for_delivery", "delivered"].includes(
                    deliveryStatus
                  )}
                  icon={<Truck size={16} />}
                  title="Out for delivery"
                  desc="Your meal is on the way."
                />

                <StatusStep
                  active={deliveryStatus === "delivered"}
                  icon={<CheckCircle2 size={16} />}
                  title="Delivered"
                  desc="Order delivered successfully."
                />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-4 flex items-center gap-2 text-lg font-black text-gray-950">
                <Bike size={20} className="text-green-600" />
                Delivery Partner
              </p>

              {tracking?.deliveryAgent ? (
                <div className="space-y-3">
                  <InfoLine
                    icon={<User size={16} />}
                    label="Name"
                    value={tracking.deliveryAgent.name || "N/A"}
                  />

                  <InfoLine
                    icon={<Phone size={16} />}
                    label="Phone"
                    value={
                      tracking.deliveryAgent.phone ||
                      tracking.deliveryAgent.deliveryProfile?.phone ||
                      "N/A"
                    }
                  />

                  <InfoLine
                    icon={<LocateFixed size={16} />}
                    label="Live"
                    value={isLive ? "Active" : "Inactive"}
                    valueClass={isLive ? "text-green-700" : "text-gray-600"}
                  />

                  <InfoLine
                    icon={<Clock size={16} />}
                    label="Last update"
                    value={formatDateTime(
                      agentLocation?.updatedAt ||
                        agentLocation?.timestamp ||
                        lastUpdated
                    )}
                  />
                </div>
              ) : (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                  Delivery partner is not assigned yet.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-4 flex items-center gap-2 text-lg font-black text-gray-950">
                <MapPin size={20} className="text-green-600" />
                Delivery Address
              </p>

              <p className="rounded-2xl bg-gray-50 p-4 text-sm font-bold leading-6 text-gray-800">
                {formatAddress(tracking?.deliveryAddress)}
              </p>

              {tracking?.deliveryAddress?.mapsUrl && (
                <a
                  href={tracking.deliveryAddress.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-2xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 hover:bg-green-100"
                >
                  Open in Google Maps
                </a>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-4 flex items-center gap-2 text-lg font-black text-gray-950">
                <Route size={20} className="text-green-600" />
                Order Details
              </p>

              <div className="space-y-3">
                <InfoLine
                  icon={<Clock size={16} />}
                  label="Delivery slot"
                  value={formatSlot(tracking?.slot)}
                />

                <InfoLine
                  icon={<CheckCircle2 size={16} />}
                  label="Payment"
                  value={tracking?.paymentStatus || "N/A"}
                />

                <InfoLine
                  icon={<Navigation size={16} />}
                  label="Distance"
                  value={distanceText}
                />

                <InfoLine icon={<Clock size={16} />} label="ETA" value={etaText} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusStep({
  active,
  icon,
  title,
  desc,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className={`flex gap-3 rounded-2xl p-3 ${
        active ? "bg-green-50" : "bg-gray-50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
          active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {icon}
      </div>

      <div>
        <p
          className={`text-sm font-black ${
            active ? "text-green-800" : "text-gray-600"
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs font-medium text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
  valueClass = "text-gray-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
        <span className="text-green-600">{icon}</span>
        {label}
      </div>

      <p className={`text-right text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}