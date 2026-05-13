// frontend/src/router/DeliveryRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DeliveryRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/deliverysignin" replace />;
  }

  if (user?.role !== "delivery") {
    return <Navigate to="/" replace />;
  }

  const approvalStatus = user.deliveryProfile?.approvalStatus;

  if (approvalStatus !== "approved") {
    return <Navigate to="/deliverysignin" replace />;
  }

  return children;
}