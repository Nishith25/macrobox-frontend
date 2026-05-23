// frontend/src/components/Navbar.tsx (FRONTEND)

import { Link, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Shield,
  ShoppingCart,
  TicketPercent,
  Truck,
  ReceiptText,
  Settings,
  ChefHat,
  ClipboardList,
} from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isChef = user?.role === "chef";

  const handleLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
  };

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "text-green-700 bg-green-50" : "text-gray-700 hover:bg-gray-50"
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block w-full px-3 py-2 rounded-lg text-base font-medium transition ${
      isActive ? "text-green-700 bg-green-50" : "text-gray-800 hover:bg-gray-50"
    }`;

  const adminMiniLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 py-1 rounded-md text-sm font-semibold ${
      isActive ? "text-red-700 underline" : "text-red-600 hover:underline"
    }`;

  const adminIconLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 ${
      isActive ? "text-red-700 underline" : "text-red-600 hover:underline"
    }`;

  const chefIconLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 ${
      isActive
        ? "text-orange-700 underline"
        : "text-orange-600 hover:underline"
    }`;

  const cartLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
      isActive ? "text-green-700 bg-green-50" : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMenu}
          className="text-2xl font-extrabold tracking-tight text-green-600"
        >
          MacroBox
        </Link>

        {/* ================= DESKTOP NAV ================= */}
        <div className="hidden items-center gap-2 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>

          <NavLink to="/meals" className={navLinkClass}>
            Meals
          </NavLink>

          {isAuthenticated && !isChef && (
            <>
              <NavLink to="/macrotrack" className={navLinkClass}>
                MacroTrack
              </NavLink>

              <NavLink to="/smart-day-planner" className={navLinkClass}>
                Smart Day Planner
              </NavLink>

              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>

              <NavLink to="/cart" className={cartLinkClass}>
                <ShoppingCart size={18} />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] text-white">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              <NavLink to="/settings" className={navLinkClass}>
                <span className="flex items-center gap-1">
                  <Settings size={16} />
                  Settings
                </span>
              </NavLink>

              {user?.role === "delivery" && (
                <NavLink to="/delivery" className={navLinkClass}>
                  Delivery
                </NavLink>
              )}
            </>
          )}

          {/* CHEF LINKS */}
          {isAuthenticated && isChef && (
            <div className="ml-2 flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-2 py-1">
              <ChefHat size={16} className="text-orange-600" />

              <NavLink to="/orderslist" className={chefIconLinkClass}>
                <ClipboardList size={14} />
                Kitchen Orders
              </NavLink>
            </div>
          )}

          {/* ADMIN LINKS */}
          {isAdmin && (
            <div className="ml-2 flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1">
              <Shield size={16} className="text-red-600" />

              <NavLink to="/admin/meals" className={adminMiniLinkClass}>
                Admin Meals
              </NavLink>

              <NavLink to="/admin/users" className={adminMiniLinkClass}>
                Users
              </NavLink>

              <NavLink to="/admin/orders" className={adminIconLinkClass}>
                <ReceiptText size={14} />
                Orders
              </NavLink>

              <NavLink to="/admin/coupons" className={adminIconLinkClass}>
                <TicketPercent size={14} />
                Coupons
              </NavLink>

              <NavLink
                to="/admin/delivery-agents"
                className={adminIconLinkClass}
              >
                <Truck size={14} />
                Delivery Agents
              </NavLink>

              <NavLink to="/admin/chefs" className={adminIconLinkClass}>
                <ChefHat size={14} />
                Chefs
              </NavLink>

              <NavLink to="/orderslist" className={adminIconLinkClass}>
                <ClipboardList size={14} />
                Kitchen Orders
              </NavLink>
            </div>
          )}

          {/* AUTH */}
          <div className="ml-2 flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  Hi,{" "}
                  <span className="font-semibold">
                    {user?.name?.split(" ")[0]}
                  </span>

                  {isAdmin && (
                    <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-600">
                      ADMIN
                    </span>
                  )}

                  {isChef && (
                    <span className="ml-2 rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                      CHEF
                    </span>
                  )}
                </span>

                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>

                <NavLink
                  to="/signup"
                  className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  Signup
                </NavLink>

                <NavLink
                  to="/cheflogin"
                  className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                >
                  Chef Login
                </NavLink>
              </>
            )}
          </div>
        </div>

        {/* ================= MOBILE RIGHT ================= */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && !isChef && (
            <button
              onClick={() => {
                navigate("/cart");
                setOpen(false);
              }}
              className="relative rounded-lg px-3 py-2 hover:bg-gray-50"
              aria-label="Cart"
            >
              <ShoppingCart size={22} className="text-gray-800" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] text-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            className="rounded-lg border px-3 py-2 text-gray-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={closeMenu}
        >
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-green-600">Menu</div>

              <button
                onClick={closeMenu}
                className="rounded-lg p-2 hover:bg-gray-50"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {isAuthenticated && (
              <div className="mb-3 rounded-lg border p-3">
                <div className="text-sm text-gray-500">Signed in as</div>
                <div className="font-semibold text-gray-800">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>

                {isAdmin && (
                  <div className="mt-2 inline-flex rounded bg-red-100 px-2 py-1 text-xs text-red-600">
                    ADMIN
                  </div>
                )}

                {isChef && (
                  <div className="mt-2 inline-flex rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                    CHEF
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <NavLink to="/" className={mobileLinkClass} onClick={closeMenu}>
                Home
              </NavLink>

              <NavLink
                to="/meals"
                className={mobileLinkClass}
                onClick={closeMenu}
              >
                Meals
              </NavLink>

              {isAuthenticated && !isChef && (
                <>
                  <NavLink
                    to="/macrotrack"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    MacroTrack
                  </NavLink>

                  <NavLink
                    to="/smart-day-planner"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Smart Day Planner
                  </NavLink>

                  <NavLink
                    to="/orders"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Orders
                  </NavLink>

                  <NavLink
                    to="/cart"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Cart {cartCount > 0 ? `(${cartCount})` : ""}
                  </NavLink>

                  <NavLink
                    to="/settings"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Settings
                  </NavLink>

                  {user?.role === "delivery" && (
                    <NavLink
                      to="/delivery"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Delivery
                    </NavLink>
                  )}
                </>
              )}

              {isChef && (
                <>
                  <div className="my-2 border-t" />

                  <div className="flex items-center gap-2 px-3 pt-2 text-xs font-semibold text-gray-400">
                    <ChefHat size={14} className="text-orange-600" />
                    Chef
                  </div>

                  <NavLink
                    to="/orderslist"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Kitchen Orders
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <div className="my-2 border-t" />

                  <div className="flex items-center gap-2 px-3 pt-2 text-xs font-semibold text-gray-400">
                    <Shield size={14} className="text-red-600" />
                    Admin
                  </div>

                  <NavLink
                    to="/admin/meals"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Admin Meals
                  </NavLink>

                  <NavLink
                    to="/admin/users"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Users
                  </NavLink>

                  <NavLink
                    to="/admin/orders"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Orders
                  </NavLink>

                  <NavLink
                    to="/admin/coupons"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Coupons
                  </NavLink>

                  <NavLink
                    to="/admin/delivery-agents"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Delivery Agents
                  </NavLink>

                  <NavLink
                    to="/admin/chefs"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Chef Management
                  </NavLink>

                  <NavLink
                    to="/orderslist"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Kitchen Orders
                  </NavLink>
                </>
              )}

              <div className="my-2 border-t" />

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Login
                  </NavLink>

                  <NavLink
                    to="/signup"
                    className={({ isActive }) =>
                      `block w-full rounded-lg px-3 py-2 text-base font-semibold transition ${
                        isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`
                    }
                    onClick={closeMenu}
                  >
                    Signup
                  </NavLink>

                  <NavLink
                    to="/cheflogin"
                    className={({ isActive }) =>
                      `block w-full rounded-lg px-3 py-2 text-base font-semibold transition ${
                        isActive
                          ? "bg-orange-50 text-orange-700"
                          : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`
                    }
                    onClick={closeMenu}
                  >
                    Chef Login
                  </NavLink>

                  <NavLink
                    to="/chefsignup"
                    className={({ isActive }) =>
                      `block w-full rounded-lg px-3 py-2 text-base font-semibold transition ${
                        isActive
                          ? "bg-orange-50 text-orange-700"
                          : "text-orange-700 hover:bg-orange-50"
                      }`
                    }
                    onClick={closeMenu}
                  >
                    Chef Signup
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}