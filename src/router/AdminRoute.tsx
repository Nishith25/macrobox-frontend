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

  // 🚫 Not logged in
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🚫 Logged in but not admin
  if (user && !isAdmin) {
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error("Access denied. Admins only.");
    }

    return <Navigate to="/macrotrack" replace />;
  }

  // ✅ Admin access granted
  return <>{children}</>;
}
