// frontend/src/components/Navbar.tsx (FRONTEND)

import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import {
  ChefHat,
  ClipboardList,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  Shield,
  ShoppingCart,
  TicketPercent,
  Truck,
  Users,
  X,
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
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-[14px] px-4 py-2.5 text-sm font-bold transition ${
      isActive
        ? "bg-green-50 text-green-700"
        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
    }`;

  const cartLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-bold transition ${
      isActive
        ? "bg-green-50 text-green-700"
        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
    }`;

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-black transition ${
      isActive
        ? "bg-red-100 text-red-700"
        : "text-red-600 hover:bg-red-50 hover:text-red-700"
    }`;

  const chefLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-black transition ${
      isActive
        ? "bg-orange-100 text-orange-700"
        : "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block w-full rounded-[14px] px-4 py-3 text-base font-bold transition ${
      isActive
        ? "bg-green-50 text-green-700"
        : "text-slate-800 hover:bg-slate-50"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center text-2xl font-black tracking-[-0.04em] text-slate-950"
        >
          MacroBox
        </Link>

        {/* DESKTOP CENTER LINKS - ONLY AFTER LOGIN */}
        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {isAuthenticated && !isChef && (
            <>
              <NavLink to="/meals" className={navLinkClass}>
                Meals
              </NavLink>

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
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-[11px] font-black text-white">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              <NavLink to="/settings" className={navLinkClass}>
                <span className="flex items-center gap-2">
                  <Settings size={17} />
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

          {isAuthenticated && isChef && (
            <NavLink to="/orderslist" className={navLinkClass}>
              <span className="flex items-center gap-2">
                <ClipboardList size={17} />
                Kitchen Orders
              </span>
            </NavLink>
          )}
        </div>

        {/* DESKTOP RIGHT AUTH */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-black text-green-700"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                {user?.name?.split(" ")[0] || "User"}
              </button>

              <button
                onClick={handleLogout}
                className="rounded-[14px] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink
                to="/login"
                className="rounded-[14px] px-4 py-2.5 text-sm font-black text-slate-900 transition hover:bg-slate-50"
              >
                Login
              </NavLink>

              <NavLink
                to="/signup"
                className="rounded-[14px] bg-green-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-green-700"
              >
                Signup
              </NavLink>
            </div>
          )}
        </div>

        {/* MOBILE RIGHT */}
        <div className="flex items-center gap-2 lg:hidden">
          {isAuthenticated && !isChef && (
            <button
              onClick={() => {
                navigate("/cart");
                setOpen(false);
              }}
              className="relative rounded-[14px] px-3 py-2 hover:bg-slate-50"
              aria-label="Cart"
            >
              <ShoppingCart size={22} className="text-slate-800" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            className="rounded-[14px] border border-slate-200 px-3 py-2 text-slate-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ADMIN / CHEF DESKTOP BAR */}
      {(isAdmin || isChef) && (
        <div className="hidden border-t border-slate-100 bg-white lg:block">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
            {isAdmin && (
              <>
                <div className="mr-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <Shield size={14} />
                  Admin
                </div>

                <NavLink to="/admin/meals" className={adminLinkClass}>
                  Admin Meals
                </NavLink>

                <NavLink to="/admin/users" className={adminLinkClass}>
                  <Users size={14} />
                  Users
                </NavLink>

                <NavLink to="/admin/orders" className={adminLinkClass}>
                  <ReceiptText size={14} />
                  Orders
                </NavLink>

                <NavLink to="/admin/coupons" className={adminLinkClass}>
                  <TicketPercent size={14} />
                  Coupons
                </NavLink>

                <NavLink to="/admin/delivery-agents" className={adminLinkClass}>
                  <Truck size={14} />
                  Delivery Agents
                </NavLink>

                <NavLink to="/admin/chefs" className={adminLinkClass}>
                  <ChefHat size={14} />
                  Chefs
                </NavLink>

                <NavLink to="/orderslist" className={adminLinkClass}>
                  <ClipboardList size={14} />
                  Kitchen Orders
                </NavLink>

                <NavLink
                  to="/admin/delivery-pincodes"
                  className={adminLinkClass}
                >
                  <MapPin size={14} />
                  Pincodes
                </NavLink>
              </>
            )}

            {isChef && !isAdmin && (
              <>
                <div className="mr-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <ChefHat size={14} />
                  Chef
                </div>

                <NavLink to="/orderslist" className={chefLinkClass}>
                  <ClipboardList size={14} />
                  Kitchen Orders
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}

      {/* MOBILE MENU */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={closeMenu}
        >
          <div
            className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xl font-black text-slate-950">MacroBox</div>

              <button
                onClick={closeMenu}
                className="rounded-xl p-2 hover:bg-slate-50"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {isAuthenticated && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-500">
                  Signed in as
                </div>

                <div className="mt-1 font-black text-slate-900">
                  {user?.name}
                </div>

                <div className="text-xs font-medium text-slate-500">
                  {user?.email}
                </div>

                {isAdmin && (
                  <div className="mt-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
                    ADMIN
                  </div>
                )}

                {isChef && (
                  <div className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                    CHEF
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              {/* CUSTOMER MOBILE LINKS - ONLY AFTER LOGIN */}
              {isAuthenticated && !isChef && (
                <>
                  <NavLink
                    to="/meals"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Meals
                  </NavLink>

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

              {/* CHEF MOBILE LINKS */}
              {isChef && (
                <>
                  <div className="my-3 border-t border-slate-200" />

                  <div className="px-4 pt-1 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
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

              {/* ADMIN MOBILE LINKS */}
              {isAdmin && (
                <>
                  <div className="my-3 border-t border-slate-200" />

                  <div className="px-4 pt-1 text-xs font-black uppercase tracking-[0.16em] text-red-600">
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

                  <NavLink
                    to="/admin/delivery-pincodes"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Delivery Pincodes
                  </NavLink>
                </>
              )}

              <div className="my-3 border-t border-slate-200" />

              {/* MOBILE AUTH */}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full rounded-[14px] px-4 py-3 text-left text-base font-bold text-red-600 hover:bg-red-50"
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
                    className="block w-full rounded-[14px] bg-green-600 px-4 py-3 text-base font-black text-white"
                    onClick={closeMenu}
                  >
                    Signup
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