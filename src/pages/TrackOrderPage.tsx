// frontend/src/pages/TrackOrderPage.tsx (FRONTEND)
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import socket from "../socket";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import polyline from "polyline";
import "leaflet/dist/leaflet.css";

type DeliveryAgent = {
  _id?: string;
  name?: string;
  email?: string;
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
  city?: string;
  state?: string;
  pincode?: string;
  locationMode?: "manual" | "current";
  locationText?: string;
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
  currentLocation?: LocationPoint | null;
  eta?: TrackingData["eta"];
  route?: TrackingData["route"];
  isLive?: boolean;
  updatedAt?: string;
};

const agentIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -40],
});

const customerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [0, -38],
});

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readableStatus(status?: string) {
  if (!status) return "N/A";
  return status.replaceAll("_", " ");
}

function formatAddress(address?: DeliveryAddress | null) {
  if (!address) return "N/A";

  const parts = [
    address.line1,
    address.line2,
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

function interpolatePoints(
  start: [number, number],
  end: [number, number],
  steps = 25
) {
  const frames: [number, number][] = [];

  for (let i = 1; i <= steps; i += 1) {
    const factor = i / steps;
    frames.push([
      start[0] + (end[0] - start[0]) * factor,
      start[1] + (end[1] - start[1]) * factor,
    ]);
  }

  return frames;
}

function FitBounds({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const [tracking, setTracking] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentAnimatedPosition, setAgentAnimatedPosition] = useState<
    [number, number] | null
  >(null);

  const animationFrameRef = useRef<number | null>(null);

  const fetchTracking = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const res = await api.get<TrackResponse>(`/delivery/track/${orderId}`);
      setTracking(res.data);

      const initialLocation = res.data?.tracking?.currentLocation;
      if (initialLocation?.lat != null && initialLocation?.lng != null) {
        setAgentAnimatedPosition([initialLocation.lat, initialLocation.lng]);
      }
    } catch (error) {
      console.error("Fetch tracking failed:", error);
      alert("Failed to load tracking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    fetchTracking();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    socket.emit("join-order-room", orderId);

    const handleDeliveryUpdate = (data: SocketTrackingPayload) => {
      if (String(data?.orderId) !== String(orderId)) return;

      setTracking((prev) => {
        if (!prev) return prev;

        const previousCurrent = prev.tracking?.currentLocation || null;
        const nextCurrent = data?.currentLocation ?? previousCurrent;
        const previousHistory = prev.tracking?.locationHistory || [];

        let updatedHistory = previousHistory;

        if (nextCurrent?.lat != null && nextCurrent?.lng != null) {
          const lastPoint = previousHistory[previousHistory.length - 1];

          const isDifferentPoint =
            !lastPoint ||
            lastPoint.lat !== nextCurrent.lat ||
            lastPoint.lng !== nextCurrent.lng;

          if (isDifferentPoint) {
            updatedHistory = [...previousHistory, nextCurrent];
          }
        }

        return {
          ...prev,
          deliveryStatus: data?.deliveryStatus || prev.deliveryStatus,
          tracking: {
            ...(prev.tracking || {}),
            isLive:
              typeof data?.isLive === "boolean"
                ? data.isLive
                : prev.tracking?.isLive,
            currentLocation: nextCurrent,
            locationHistory: updatedHistory,
            eta: data?.eta ?? prev.tracking?.eta ?? null,
            route: data?.route ?? prev.tracking?.route ?? null,
          },
        };
      });

      if (data?.currentLocation?.lat != null && data?.currentLocation?.lng != null) {
        const nextPosition: [number, number] = [
          data.currentLocation.lat,
          data.currentLocation.lng,
        ];

        setAgentAnimatedPosition((prevPos) => {
          if (!prevPos) return nextPosition;

          const frames = interpolatePoints(prevPos, nextPosition, 20);
          let index = 0;

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }

          const animate = () => {
            if (index < frames.length) {
              setAgentAnimatedPosition(frames[index]);
              index += 1;
              animationFrameRef.current = requestAnimationFrame(animate);
            }
          };

          animationFrameRef.current = requestAnimationFrame(animate);
          return prevPos;
        });
      }
    };

    socket.on("delivery:update", handleDeliveryUpdate);

    return () => {
      socket.emit("leave-order-room", orderId);
      socket.off("delivery:update", handleDeliveryUpdate);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [orderId]);

  const customerPosition = useMemo<[number, number] | null>(() => {
    if (
      tracking?.customerLocation?.lat != null &&
      tracking?.customerLocation?.lng != null
    ) {
      return [tracking.customerLocation.lat, tracking.customerLocation.lng];
    }

    if (
      tracking?.deliveryAddress?.lat != null &&
      tracking?.deliveryAddress?.lng != null
    ) {
      return [tracking.deliveryAddress.lat, tracking.deliveryAddress.lng];
    }

    return null;
  }, [tracking]);

  const agentPosition = useMemo<[number, number] | null>(() => {
    if (agentAnimatedPosition) return agentAnimatedPosition;

    const current = tracking?.tracking?.currentLocation;
    if (current?.lat != null && current?.lng != null) {
      return [current.lat, current.lng];
    }

    return null;
  }, [agentAnimatedPosition, tracking]);

  const routePolylinePositions = useMemo<[number, number][]>(() => {
  const encoded = tracking?.tracking?.route?.encodedPolyline;
  if (!encoded) return [];

  try {
    const decoded = polyline.decode(encoded) as [number, number][];
    return decoded.map(([lat, lng]): [number, number] => [lat, lng]);
  } catch (error) {
    console.error("Polyline decode failed:", error);
    return [];
  }
}, [tracking]);

  const fallbackHistoryPolyline = useMemo<[number, number][]>(() => {
  const history = tracking?.tracking?.locationHistory || [];

  return history
    .filter(
      (p): p is LocationPoint & { lat: number; lng: number } =>
        typeof p.lat === "number" && typeof p.lng === "number"
    )
    .map((p): [number, number] => [p.lat, p.lng]);
}, [tracking]);

  const polylinePositions = useMemo<[number, number][]>(() => {
    if (routePolylinePositions.length > 1) return routePolylinePositions;
    return fallbackHistoryPolyline;
  }, [routePolylinePositions, fallbackHistoryPolyline]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (agentPosition) return agentPosition;
    if (customerPosition) return customerPosition;
    return [17.385, 78.4867];
  }, [agentPosition, customerPosition]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [];

    if (agentPosition) points.push(agentPosition);
    if (customerPosition) points.push(customerPosition);
    if (polylinePositions.length) points.push(...polylinePositions);

    return points;
  }, [agentPosition, customerPosition, polylinePositions]);

  const timelineSteps = useMemo(() => {
    const status = tracking?.deliveryStatus;

    return [
      {
        label: "Accepted",
        active: ["accepted", "picked_up", "out_for_delivery", "delivered"].includes(
          status || ""
        ),
      },
      {
        label: "Picked Up",
        active: ["picked_up", "out_for_delivery", "delivered"].includes(
          status || ""
        ),
      },
      {
        label: "Out for delivery",
        active: ["out_for_delivery", "delivered"].includes(status || ""),
      },
      {
        label: "Delivered",
        active: ["delivered"].includes(status || ""),
      },
    ];
  }, [tracking]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Track Order</h1>
          <p className="text-gray-600 mt-2">
            Live route, rider location, ETA, and delivery updates.
          </p>
        </div>

        <button
          onClick={fetchTracking}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Loading tracking details...
        </div>
      ) : !tracking ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Tracking details not found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1 space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Order Summary</h2>
                  <p className="text-sm text-gray-500 break-all">{tracking.orderId}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                    tracking.deliveryStatus
                  )}`}
                >
                  {readableStatus(tracking.deliveryStatus)}
                </span>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Payment Status</p>
                  <p className="font-medium capitalize">
                    {tracking.paymentStatus || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Delivery Slot</p>
                  <p className="font-medium">
                    {tracking.slot?.date || "N/A"} | {tracking.slot?.time || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Live Tracking</p>
                  <p className="font-medium">
                    {tracking.tracking?.isLive ? "Active" : "Not active yet"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">ETA</p>
                  <p className="font-medium">
                    {tracking.tracking?.eta?.text || "Calculating..."}
                  </p>
                  {tracking.tracking?.eta?.distanceText ? (
                    <p className="text-gray-500 mt-1">
                      Distance left: {tracking.tracking.eta.distanceText}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-gray-500">Last ETA Update</p>
                  <p className="font-medium">
                    {formatDateTime(tracking.tracking?.eta?.lastCalculatedAt || null)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Delivery Progress</h2>

              <div className="space-y-3">
                {timelineSteps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        step.active ? "bg-green-600" : "bg-gray-300"
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        step.active ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {index + 1}. {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Delivery Agent</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">
                    {tracking.deliveryAgent?.name || "Not assigned yet"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">
                    {tracking.deliveryAgent?.email || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">
                    {tracking.deliveryAgent?.deliveryProfile?.phone || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Last Live Update</p>
                  <p className="font-medium">
                    {formatDateTime(tracking.tracking?.currentLocation?.updatedAt || null)}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Heading</p>
                  <p className="font-medium">
                    {tracking.tracking?.currentLocation?.heading != null
                      ? `${Math.round(tracking.tracking.currentLocation.heading)}°`
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Speed</p>
                  <p className="font-medium">
                    {tracking.tracking?.currentLocation?.speed != null
                      ? `${tracking.tracking.currentLocation.speed} m/s`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium">
                    {tracking.deliveryAddress?.fullName || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">
                    {tracking.deliveryAddress?.phone || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Address</p>
                  <p className="font-medium">{formatAddress(tracking.deliveryAddress)}</p>
                </div>

                {tracking.deliveryAddress?.locationText ? (
                  <div>
                    <p className="text-gray-500">Location Note</p>
                    <p className="font-medium">
                      {tracking.deliveryAddress.locationText}
                    </p>
                  </div>
                ) : null}

                {tracking.deliveryAddress?.mapsUrl ? (
                  <a
                    href={tracking.deliveryAddress.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-green-700 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Live Map</h2>
                  <p className="text-sm text-gray-500">
                    Rider route, live position, and destination
                  </p>
                </div>

                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {tracking.tracking?.route?.encodedPolyline
                    ? "Google route active"
                    : "Live history path active"}
                </div>
              </div>

              <div className="h-[560px] overflow-hidden rounded-xl">
                <MapContainer
                  center={mapCenter}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {fitPoints.length > 0 ? <FitBounds points={fitPoints} /> : null}

                  {customerPosition ? (
                    <Marker position={customerPosition} icon={customerIcon}>
                      <Popup>Customer Delivery Location</Popup>
                    </Marker>
                  ) : null}

                  {agentPosition ? (
                    <Marker position={agentPosition} icon={agentIcon}>
                      <Popup>
                        <div>
                          <p className="font-semibold">Delivery Agent</p>
                          <p className="text-sm text-gray-600">
                            {tracking.deliveryAgent?.name || "On the way"}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {polylinePositions.length > 1 ? (
                    <Polyline positions={polylinePositions} weight={5} />
                  ) : null}
                </MapContainer>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4 text-sm">
                  <p className="text-gray-500">Agent Coordinates</p>
                  <p className="font-medium">
                    {agentPosition
                      ? `${agentPosition[0]}, ${agentPosition[1]}`
                      : "Live location not available yet"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-sm">
                  <p className="text-gray-500">Customer Coordinates</p>
                  <p className="font-medium">
                    {customerPosition
                      ? `${customerPosition[0]}, ${customerPosition[1]}`
                      : "Customer coordinates not available"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-sm">
                  <p className="text-gray-500">Path Source</p>
                  <p className="font-medium">
                    {tracking.tracking?.route?.encodedPolyline
                      ? "Google route polyline"
                      : "Location history polyline"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}