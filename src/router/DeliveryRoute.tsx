// frontend/src/router/DeliveryRoute.tsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DeliveryRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/deliverysignin"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!user) {
    return <Navigate to="/deliverysignin" replace />;
  }

  if (user.role === "admin") {
    return <>{children}</>;
  }

  if (user.role !== "delivery") {
    if (user.role === "chef") {
      return <Navigate to="/orderslist" replace />;
    }

    return <Navigate to="/macrotrack" replace />;
  }

  const approvalStatus = user.deliveryProfile?.approvalStatus;
  const isActive = user.deliveryProfile?.isActive;

  if (approvalStatus !== "approved" || isActive === false) {
    return <Navigate to="/deliverysignin" replace />;
  }

  return <>{children}</>;
}