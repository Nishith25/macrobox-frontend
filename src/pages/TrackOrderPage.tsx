import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import socket from "../socket";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
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

type TrackResponse = {
  orderId: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  deliveryAgent?: DeliveryAgent | null;
  currentLocation?: LocationPoint | null;
  locationHistory?: LocationPoint[];
  eta?: {
    text?: string;
    distanceText?: string;
    durationValue?: number | null;
    distanceValue?: number | null;
    lastCalculatedAt?: string | null;
  } | null;
  deliveryAddress?: DeliveryAddress | null;
  slot?: {
    date?: string;
    time?: string;
  } | null;
};

const agentIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const customerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [tracking, setTracking] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTracking = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const res = await api.get(`/delivery/track/${orderId}`);
      setTracking(res.data);
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

    socket.emit("join-order-room", orderId);

    const handleDeliveryUpdate = (data: any) => {
      if (String(data?.orderId) !== String(orderId)) return;

      setTracking((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          deliveryStatus: data?.deliveryStatus || prev.deliveryStatus,
          deliveryAgent: data?.deliveryAgent || prev.deliveryAgent,
        };
      });
    };

    const handleLocationUpdate = (data: any) => {
      if (String(data?.orderId) !== String(orderId)) return;

      setTracking((prev) => {
        if (!prev) return prev;

        const newPoint = {
          lat: data?.lat,
          lng: data?.lng,
          updatedAt: data?.updatedAt || new Date().toISOString(),
        };

        return {
          ...prev,
          currentLocation: newPoint,
          locationHistory: [...(prev.locationHistory || []), newPoint],
        };
      });
    };

    socket.on("delivery:update", handleDeliveryUpdate);
    socket.on("delivery:location", handleLocationUpdate);

    return () => {
      socket.emit("leave-order-room", orderId);
      socket.off("delivery:update", handleDeliveryUpdate);
      socket.off("delivery:location", handleLocationUpdate);
    };
  }, [orderId]);

  const customerPosition = useMemo(() => {
    if (
      tracking?.deliveryAddress?.lat != null &&
      tracking?.deliveryAddress?.lng != null
    ) {
      return [
        tracking.deliveryAddress.lat,
        tracking.deliveryAddress.lng,
      ] as [number, number];
    }
    return null;
  }, [tracking]);

  const agentPosition = useMemo(() => {
    if (tracking?.currentLocation?.lat != null && tracking?.currentLocation?.lng != null) {
      return [tracking.currentLocation.lat, tracking.currentLocation.lng] as [
        number,
        number
      ];
    }
    return null;
  }, [tracking]);

  const polylinePositions = useMemo(() => {
    const points =
      tracking?.locationHistory
        ?.filter((p) => p.lat != null && p.lng != null)
        .map((p) => [p.lat as number, p.lng as number] as [number, number]) || [];

    return points;
  }, [tracking]);

  const mapCenter = useMemo(() => {
    if (agentPosition) return agentPosition;
    if (customerPosition) return customerPosition;
    return [17.385, 78.4867] as [number, number];
  }, [agentPosition, customerPosition]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Track Order</h1>
          <p className="text-gray-600 mt-2">
            Live delivery updates, current location, and agent details.
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Order ID</p>
                  <p className="font-medium break-all">{tracking.orderId}</p>
                </div>

                <div>
                  <p className="text-gray-500">Payment Status</p>
                  <p className="font-medium capitalize">
                    {tracking.paymentStatus || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Delivery Status</p>
                  <p className="font-medium capitalize">
                    {readableStatus(tracking.deliveryStatus)}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Slot</p>
                  <p className="font-medium">
                    {tracking.slot?.date || "N/A"} | {tracking.slot?.time || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">ETA</p>
                  <p className="font-medium">
                    {tracking.eta?.text || "ETA not available yet"}
                  </p>
                  {tracking.eta?.distanceText ? (
                    <p className="text-gray-500 mt-1">
                      Distance: {tracking.eta.distanceText}
                    </p>
                  ) : null}
                </div>
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
                    {formatDateTime(tracking.currentLocation?.updatedAt || null)}
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
                  <p className="font-medium">
                    {formatAddress(tracking.deliveryAddress)}
                  </p>
                </div>

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

          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Live Map</h2>

              <div className="h-[520px] overflow-hidden rounded-xl">
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

                  {customerPosition ? (
                    <Marker position={customerPosition} icon={customerIcon}>
                      <Popup>Customer Delivery Location</Popup>
                    </Marker>
                  ) : null}

                  {agentPosition ? (
                    <Marker position={agentPosition} icon={agentIcon}>
                      <Popup>Delivery Agent Live Location</Popup>
                    </Marker>
                  ) : null}

                  {polylinePositions.length > 1 ? (
                    <Polyline positions={polylinePositions} />
                  ) : null}
                </MapContainer>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}