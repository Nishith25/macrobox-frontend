import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import {
  Menu,
  X,
  Shield,
  ShoppingCart,
  TicketPercent,
} from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
  };

  const closeMenu = () => setOpen(false);

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMenu}
          className="text-2xl font-bold text-green-600 tracking-tight"
        >
          MacroBox
        </Link>

        {/* ================= DESKTOP ================= */}
        <div className="hidden md:flex items-center gap-6">
          {/* CART (USER ONLY) */}
          {isAuthenticated && !isAdmin && (
            <button
              onClick={() => navigate("/cart")}
              className="relative hover:text-green-600"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* COMMON */}
          <Link to="/" className="hover:text-green-600">
            Home
          </Link>
          <Link to="/meals" className="hover:text-green-600">
            Meals
          </Link>

          {/* USER LINKS */}
          {isAuthenticated && !isAdmin && (
            <>
              <Link to="/plan-my-day" className="hover:text-green-600">
                Plan My Day
              </Link>
              <Link to="/orders" className="hover:text-green-600">
                Orders
              </Link>
              <Link to="/dashboard" className="hover:text-green-600">
                Dashboard
              </Link>
            </>
          )}

          {/* ADMIN LINKS */}
          {isAdmin && (
            <div className="flex items-center gap-4 text-red-600 font-semibold">
              <Shield size={16} />
              <Link to="/admin/meals" className="hover:underline">
                Meals
              </Link>
              <Link to="/admin/users" className="hover:underline">
                Users
              </Link>
              <Link
                to="/admin/coupons"
                className="hover:underline flex items-center gap-1"
              >
                <TicketPercent size={14} />
                Coupons
              </Link>
            </div>
          )}

          {/* AUTH */}
          {isAuthenticated ? (
            <>
              <span className="text-gray-600 text-sm">
                Hi,{" "}
                <span className="font-semibold">
                  {user?.name?.split(" ")[0]}
                </span>
                {isAdmin && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                    ADMIN
                  </span>
                )}
              </span>

              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-green-600">
                Login
              </Link>
              <Link
                to="/signup"
                className="font-semibold hover:text-green-600"
              >
                Signup
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {open && (
        <div className="md:hidden bg-white border-t px-4 pb-4 space-y-3">
          <Link to="/" onClick={closeMenu}>
            Home
          </Link>
          <Link to="/meals" onClick={closeMenu}>
            Meals
          </Link>

          {/* USER */}
          {isAuthenticated && !isAdmin && (
            <>
              <button
                onClick={() => {
                  navigate("/cart");
                  closeMenu();
                }}
                className="flex items-center gap-2"
              >
                <ShoppingCart size={18} />
                Cart ({cartCount})
              </button>

              <Link to="/plan-my-day" onClick={closeMenu}>
                Plan My Day
              </Link>
              <Link to="/orders" onClick={closeMenu}>
                Orders
              </Link>
              <Link to="/dashboard" onClick={closeMenu}>
                Dashboard
              </Link>
            </>
          )}

          {/* ADMIN */}
          {isAdmin && (
            <>
              <Link
                to="/admin/meals"
                onClick={closeMenu}
                className="text-red-600"
              >
                Admin Meals
              </Link>
              <Link
                to="/admin/users"
                onClick={closeMenu}
                className="text-red-600"
              >
                Users
              </Link>
              <Link
                to="/admin/coupons"
                onClick={closeMenu}
                className="text-red-600"
              >
                Coupons
              </Link>
            </>
          )}

          {/* AUTH */}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="text-red-500">
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/signup" onClick={closeMenu}>
                Signup
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
