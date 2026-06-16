// frontend/src/components/AdminRoute.tsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRef } from "react";
import toast from "react-hot-toast";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, isAdmin, user } = useAuth();
  const location = useLocation();

  const toastShownRef = useRef(false);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user && !isAdmin) {
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error("Access denied. Admins only.");
    }

    if (user.role === "delivery") {
      return <Navigate to="/delivery-dashboard" replace />;
    }

    if (user.role === "chef") {
      return <Navigate to="/orderslist" replace />;
    }

    return <Navigate to="/macrotrack" replace />;
  }

  return <>{children}</>;
}