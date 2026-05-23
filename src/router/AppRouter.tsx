// frontend/src/router/AppRouter.tsx (FRONTEND)

import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Pages - Public
import Home from "../pages/Home";
import Meals from "../pages/Meals";
import MealDetails from "../pages/MealDetails";

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

// User Pages
import MacroTrack from "../pages/MacroTrack";
import SmartDayPlanner from "../pages/SmartDayPlanner";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Orders from "../pages/Orders";
import DeliveryDashboard from "../pages/DeliveryDashboard";
import TrackOrderPage from "../pages/TrackOrderPage";
import SettingsPage from "../pages/SettingsPage";

// Admin Pages
import AdminDashboard from "../pages/AdminDashboard";
import AdminUsers from "../pages/AdminUsers";
import AdminMeals from "../pages/AdminMeals";
import AdminCoupons from "../pages/AdminCoupons";
import AdminDeliveryAgents from "../pages/AdminDeliveryAgents";
import AdminOrders from "../pages/AdminOrders";
import AdminChefs from "../pages/AdminChefs";

// Chef / Kitchen Pages
import OrdersList from "../pages/OrdersList";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import DeliveryRoute from "./DeliveryRoute";

export default function AppRouter() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/meal/:id" element={<MealDetails />} />

        {/* ================= CUSTOMER AUTH ROUTES ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ================= DELIVERY AUTH ROUTES ================= */}
        <Route path="/deliverylogin" element={<DeliveryLogin />} />
        <Route path="/deliverysignup" element={<DeliverySignup />} />

        {/* ================= CHEF AUTH ROUTES ================= */}
        <Route path="/chefsignup" element={<ChefSignup />} />
        <Route path="/cheflogin" element={<ChefLogin />} />

        {/* ================= OTHER AUTH ROUTES ================= */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/resend-verification" element={<ResendVerification />} />

        {/* ================= USER PROTECTED ROUTES ================= */}
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

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

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
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/track/:orderId"
          element={
            <ProtectedRoute>
              <TrackOrderPage />
            </ProtectedRoute>
          }
        />

        {/* ================= DELIVERY ROUTES ================= */}
        <Route
          path="/delivery"
          element={
            <DeliveryRoute>
              <DeliveryDashboard />
            </DeliveryRoute>
          }
        />

        {/* ================= ADMIN ROUTES ================= */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
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

        {/* ================= CHEF + ADMIN KITCHEN ROUTE ================= */}
        <Route
          path="/orderslist"
          element={
            <ProtectedRoute>
              <OrdersList />
            </ProtectedRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}