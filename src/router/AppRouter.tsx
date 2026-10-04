// frontend/src/router/AppRouter.tsx (FRONTEND)

import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

// Public Pages
import Home from "../pages/Home";

// Protected User Pages
import Meals from "../pages/Meals";
import MealDetails from "../pages/MealDetails";
import MacroTrack from "../pages/MacroTrack";
import SmartDayPlanner from "../pages/SmartDayPlanner";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Orders from "../pages/Orders";
import TrackOrderPage from "../pages/TrackOrderPage";
import SettingsPage from "../pages/SettingsPage";
import Plans from "../pages/Plans";
import PlanDetails from "../pages/PlanDetails";
import Rewards from "../pages/Rewards";
import TransformationWall from "../pages/TransformationWall";
import AdminPlans from "../pages/AdminPlans";
import AdminRewards from "../pages/AdminRewards";

// Auth Pages
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import DeliveryLogin from "../pages/DeliveryLogin";
import DeliverySignup from "../pages/DeliverySignup";
import ChefSignup from "../pages/ChefSignup";
import ChefLogin from "../pages/ChefLogin";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";
import ResendVerification from "../pages/ResendVerification";

// Onboarding Page
import Onboarding from "../pages/Onboarding";

// Delivery
import DeliveryDashboard from "../pages/DeliveryDashboard";

// Admin Pages
import AdminUsers from "../pages/AdminUsers";
import AdminMeals from "../pages/AdminMeals";
import AdminCoupons from "../pages/AdminCoupons";
import AdminDeliveryAgents from "../pages/AdminDeliveryAgents";
import AdminOrders from "../pages/AdminOrders";
import AdminChefs from "../pages/AdminChefs";
import AdminDeliveryPincodes from "../pages/AdminDeliveryPincodes";

// Chef / Kitchen Pages
import OrdersList from "../pages/OrdersList";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import DeliveryRoute from "./DeliveryRoute";

function AuthRedirectRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const location = useLocation();

  const state = location.state as { from?: string } | null;
  const from = state?.from;

  if (!isAuthenticated) return <>{children}</>;

  if (isAdmin) {
    return <Navigate to="/admin/meals" replace />;
  }

  if (user?.role === "delivery") {
    return <Navigate to="/delivery" replace />;
  }

  if (user?.role === "chef") {
    return <Navigate to="/orderslist" replace />;
  }

  if (from && from !== "/login" && from !== "/signup") {
    return <Navigate to={from} replace />;
  }

  if (user?.role === "user" && !user?.onboarding?.completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/meals" replace />;
}

function ChefRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/cheflogin"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!user) {
    return <Navigate to="/cheflogin" replace />;
  }

  if (user.role === "admin") {
    return <>{children}</>;
  }

  if (user.role !== "chef") {
    if (user.role === "delivery") {
      return <Navigate to="/delivery" replace />;
    }

    return <Navigate to="/macrotrack" replace />;
  }

  const approvalStatus = user.chefProfile?.approvalStatus;
  const isActive = user.chefProfile?.isActive;

  if (approvalStatus !== "approved" || isActive === false) {
    return <Navigate to="/cheflogin" replace />;
  }

  return <>{children}</>;
}

function ChallengeDetailsRedirect() {
  const { challengeId } = useParams();

  return <Navigate to={`/plans/${challengeId || ""}`} replace />;
}

export default function AppRouter() {
  const location = useLocation();

  const hideLayout =
    location.pathname.startsWith("/onboarding") ||
    location.pathname === "/cheflogin" ||
    location.pathname === "/chefsignup" ||
    location.pathname === "/deliverylogin" ||
    location.pathname === "/deliverysignup";

  return (
    <>
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            <AuthRedirectRoute>
              <Login />
            </AuthRedirectRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <AuthRedirectRoute>
              <Signup />
            </AuthRedirectRoute>
          }
        />

        <Route path="/deliverylogin" element={<DeliveryLogin />} />
        <Route
          path="/deliverysignin"
          element={<Navigate to="/deliverylogin" replace />}
        />
        <Route path="/deliverysignup" element={<DeliverySignup />} />

        <Route path="/cheflogin" element={<ChefLogin />} />
        <Route path="/chefsignup" element={<ChefSignup />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/resend-verification" element={<ResendVerification />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route path="/meals" element={<Meals />} />

        <Route path="/meal/:id" element={<MealDetails />} />

        <Route
          path="/macrotrack"
          element={
            <ProtectedRoute>
              <MacroTrack />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-day-planner"
          element={
            <ProtectedRoute>
              <SmartDayPlanner />
            </ProtectedRoute>
          }
        />

        <Route path="/plans" element={<Plans />} />

        <Route path="/plans/:planId" element={<PlanDetails />} />

        <Route path="/challenges" element={<Navigate to="/plans" replace />} />
        <Route
          path="/challenges/:challengeId"
          element={<ChallengeDetailsRedirect />}
        />

        <Route
          path="/rewards"
          element={
            <ProtectedRoute>
              <Rewards />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transformation-wall"
          element={
            <ProtectedRoute>
              <TransformationWall />
            </ProtectedRoute>
          }
        />

        <Route path="/cart" element={<Cart />} />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-account"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/settings" element={<Navigate to="/my-account" replace />} />

        <Route
          path="/track/:orderId"
          element={
            <ProtectedRoute>
              <TrackOrderPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/delivery"
          element={
            <DeliveryRoute>
              <DeliveryDashboard />
            </DeliveryRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Navigate to="/admin/meals" replace />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/meals"
          element={
            <AdminRoute>
              <AdminMeals />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/delivery-agents"
          element={
            <AdminRoute>
              <AdminDeliveryAgents />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/chefs"
          element={
            <AdminRoute>
              <AdminChefs />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/delivery-pincodes"
          element={
            <AdminRoute>
              <AdminDeliveryPincodes />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/plans"
          element={
            <AdminRoute>
              <AdminPlans />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/challenges"
          element={<Navigate to="/admin/plans" replace />}
        />

        <Route
          path="/admin/rewards"
          element={
            <AdminRoute>
              <AdminRewards />
            </AdminRoute>
          }
        />

        <Route
          path="/orderslist"
          element={
            <ChefRoute>
              <OrdersList />
            </ChefRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideLayout && <Footer />}
    </>
  );
}