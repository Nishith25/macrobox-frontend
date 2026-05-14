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
  deliveryAgent?: DeliveryAgent | null;
  currentLocation?: LocationPoint | null;
  eta?: TrackingData["eta"];
  route?: TrackingData["route"];
  isLive?: boolean;
  updatedAt?: string;
};

const agentIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 46px;
      height: 46px;
      border-radius: 999px;
      background: #16a34a;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 27px;
      box-shadow: 0 10px 22px rgba(0,0,0,0.28);
      border: 3px solid white;
    ">
      🏍️
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -24],
});

const customerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: #111827;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 23px;
      box-shadow: 0 10px 22px rgba(0,0,0,0.28);
      border: 3px solid white;
    ">
      🏠
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

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

function formatDistanceAway(meters?: number | null) {
  if (!meters || Number.isNaN(Number(meters))) return "Distance calculating...";
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [70, 70] });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          deliveryAgent: data?.deliveryAgent ?? prev.deliveryAgent,
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

      if (
        data?.currentLocation?.lat != null &&
        data?.currentLocation?.lng != null
      ) {
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

  const agentPhone =
    tracking?.deliveryAgent?.deliveryProfile?.phone ||
    tracking?.deliveryAgent?.phone ||
    "";

  const etaText = tracking?.tracking?.eta?.text || "Time calculating...";
  const distanceAway = formatDistanceAway(
    tracking?.tracking?.eta?.distanceValue || null
  );
  const distanceText = tracking?.tracking?.eta?.distanceText || distanceAway;

  const liveNotice =
    tracking?.deliveryAgent &&
    !agentPosition &&
    tracking.deliveryStatus !== "delivered" &&
    tracking.deliveryStatus !== "cancelled";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Track Order</h1>
          <p className="text-gray-600 mt-2">
            Track your delivery route, rider location, distance, and estimated time.
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
                  <p className="text-sm text-gray-500 break-all">
                    {tracking.orderId}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                    tracking.deliveryStatus
                  )}`}
                >
                  {readableStatus(tracking.deliveryStatus)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500">Payment</p>
                  <p className="font-bold capitalize">
                    {tracking.paymentStatus || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500">Tracking</p>
                  <p className="font-bold">
                    {tracking.tracking?.isLive ? "Active" : "Not active"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 col-span-2">
                  <p className="text-gray-500">Delivery Slot</p>
                  <p className="font-bold">
                    {tracking.slot?.date || "N/A"} |{" "}
                    {tracking.slot?.time || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-3">
                  <p className="text-green-700">Estimated Time</p>
                  <p className="text-xl font-extrabold text-green-800">
                    {etaText}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-blue-700">Distance Left</p>
                  <p className="text-xl font-extrabold text-blue-800">
                    {distanceText}
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
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Delivery Agent</h2>

                {tracking.deliveryAgent ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Assigned
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Pending
                  </span>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-semibold">
                    {tracking.deliveryAgent?.name || "Not assigned yet"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-semibold">
                    {tracking.deliveryAgent?.email || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-semibold">{agentPhone || "N/A"}</p>
                </div>

                {agentPhone ? (
                  <a
                    href={`tel:${agentPhone}`}
                    className="inline-flex w-full justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Call Delivery Agent
                  </a>
                ) : null}

                {liveNotice ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    Delivery partner is assigned. Live bike location will appear
                    after pickup and live tracking starts.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-semibold">
                    {tracking.deliveryAddress?.fullName || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-semibold">
                    {tracking.deliveryAddress?.phone || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Address</p>
                  <p className="font-semibold">
                    {formatAddress(tracking.deliveryAddress)}
                  </p>
                </div>

                {tracking.deliveryAddress?.locationText ? (
                  <div>
                    <p className="text-gray-500">Location Note</p>
                    <p className="font-semibold">
                      {tracking.deliveryAddress.locationText}
                    </p>
                  </div>
                ) : null}

                {tracking.deliveryAddress?.mapsUrl ? (
                  <a
                    href={tracking.deliveryAddress.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
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
                  <h2 className="text-xl font-semibold">Live Delivery Map</h2>
                  <p className="text-sm text-gray-500">
                    Bike location and route to your delivery address.
                  </p>
                </div>

                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {agentPosition
                    ? "Live tracking active"
                    : "Waiting for bike location"}
                </div>
              </div>

              {liveNotice ? (
                <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  Live map will update automatically when the delivery partner
                  starts sharing location after pickup.
                </div>
              ) : null}

              <div className="relative h-[620px] overflow-hidden rounded-2xl">
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

                  {fitPoints.length > 0 ? (
                    <FitBounds points={fitPoints} />
                  ) : null}

                  {customerPosition ? (
                    <Marker position={customerPosition} icon={customerIcon}>
                      <Popup>Delivery Address</Popup>
                    </Marker>
                  ) : null}

                  {agentPosition ? (
                    <Marker position={agentPosition} icon={agentIcon}>
                      <Popup>
                        <div>
                          <p className="font-semibold">Delivery Partner</p>
                          <p className="text-sm text-gray-600">
                            {tracking.deliveryAgent?.name || "On the way"}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {polylinePositions.length > 1 ? (
                    <Polyline
                      positions={polylinePositions}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 6,
                        opacity: 0.9,
                      }}
                    />
                  ) : null}
                </MapContainer>

                {agentPosition && customerPosition ? (
                  <div className="absolute left-1/2 top-6 z-[500] -translate-x-1/2 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg">
                    {distanceText}
                  </div>
                ) : null}

                <div className="absolute bottom-5 left-5 right-5 z-[500] rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-3xl font-extrabold text-green-700">
                        ⚡ {etaText}
                      </p>
                      <p className="mt-1 text-lg font-semibold italic text-gray-900">
                        Order on the way
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {distanceText}
                      </p>
                    </div>

                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-50 text-5xl shadow-inner">
                      🛵
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}