// frontend/src/components/Navbar.tsx (FRONTEND)

import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import {
  ChefHat,
  ClipboardList,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  Shield,
  ShoppingCart,
  TicketPercent,
  Truck,
  UserCircle,
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
    setOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-black transition ${
      isActive
        ? "bg-green-600 text-white"
        : "text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const cartLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-black transition ${
      isActive
        ? "bg-green-600 text-white"
        : "text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    `admin-subnav-link inline-flex items-center gap-1.5 rounded-[12px] px-3.5 py-2 text-xs font-black transition ${
      isActive ? "admin-subnav-link-active" : ""
    }`;

  const chefLinkClass = ({ isActive }: { isActive: boolean }) =>
    `admin-subnav-link inline-flex items-center gap-1.5 rounded-[12px] px-3.5 py-2 text-xs font-black transition ${
      isActive ? "admin-subnav-link-active" : ""
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex w-full items-center justify-between rounded-[18px] px-5 py-4 text-lg font-black transition ${
      isActive
        ? "bg-green-600 text-white"
        : "bg-slate-50 text-slate-950 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
    }`;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            onClick={closeMenu}
            className="shrink-0 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white"
          >
            MacroBox
          </Link>

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
                  <Settings size={17} />
                  Settings
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
                <ClipboardList size={17} />
                Kitchen Orders
              </NavLink>
            )}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-2 rounded-full bg-green-600 px-3 py-2 text-sm font-black text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-green-700">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  {user?.name?.split(" ")[0] || "User"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-[14px] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-[14px] px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800"
              >
                Login
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated && !isChef && (
              <button
                type="button"
                onClick={() => {
                  navigate("/cart");
                  setOpen(false);
                }}
                className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-slate-200 text-slate-900 dark:border-slate-700 dark:text-white"
                aria-label="Cart"
              >
                <ShoppingCart size={24} />

                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-green-600 px-1 text-xs font-black text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-[14px] px-3 py-2 text-sm font-black text-slate-950 dark:text-white"
              >
                Login
              </button>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-slate-200 text-slate-900 dark:border-slate-700 dark:text-white"
              aria-label="Open menu"
            >
              <Menu size={27} />
            </button>
          </div>
        </div>

        {(isAdmin || isChef) && (
          <div className="admin-subnav hidden border-t lg:block">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
              {isAdmin && (
                <>
                  <div className="admin-subnav-label mr-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em]">
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

                  <NavLink
                    to="/admin/delivery-agents"
                    className={adminLinkClass}
                  >
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
                  <div className="admin-subnav-label mr-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em]">
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
      </nav>

      {open && (
        <div className="mobile-menu-panel lg:hidden">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={closeMenu}
          />

          <aside className="mobile-menu-content absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <Link
                to="/"
                onClick={closeMenu}
                className="text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white"
              >
                MacroBox
              </Link>

              <button
                type="button"
                onClick={closeMenu}
                className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-slate-200 text-slate-950 dark:border-slate-700 dark:text-white"
                aria-label="Close menu"
              >
                <X size={30} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {isAuthenticated && (
                <div className="mb-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-lg font-black text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-950 dark:text-white">
                        {user?.name || "User"}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigate("/settings");
                      closeMenu();
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] bg-green-600 px-4 py-3 text-sm font-black text-white"
                  >
                    <UserCircle size={18} />
                    View Profile
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {!isAuthenticated && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/login");
                        closeMenu();
                      }}
                      className="flex w-full items-center justify-between rounded-[18px] bg-green-600 px-5 py-4 text-lg font-black text-white"
                    >
                      Login
                      <LogIn size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigate("/signup");
                        closeMenu();
                      }}
                      className="flex w-full items-center justify-between rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-lg font-black text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                      Create Account
                      <UserCircle size={20} />
                    </button>
                  </>
                )}

                {isAuthenticated && !isChef && (
                  <>
                    <NavLink
                      to="/meals"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Meals <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/macrotrack"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      MacroTrack <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/smart-day-planner"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Smart Day Planner <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/orders"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Orders <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/cart"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Cart {cartCount > 0 ? `(${cartCount})` : ""}{" "}
                      <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/settings"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Settings <span>→</span>
                    </NavLink>

                    {user?.role === "delivery" && (
                      <NavLink
                        to="/delivery"
                        className={mobileLinkClass}
                        onClick={closeMenu}
                      >
                        Delivery <span>→</span>
                      </NavLink>
                    )}
                  </>
                )}

                {isChef && (
                  <>
                    <p className="px-2 pt-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                      Chef
                    </p>

                    <NavLink
                      to="/orderslist"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Kitchen Orders <span>→</span>
                    </NavLink>
                  </>
                )}

                {isAdmin && (
                  <>
                    <p className="px-2 pt-5 text-xs font-black uppercase tracking-[0.18em] text-red-600">
                      Admin
                    </p>

                    <NavLink
                      to="/admin/meals"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Admin Meals <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/users"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Users <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/orders"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Orders <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/coupons"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Coupons <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/delivery-agents"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Delivery Agents <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/chefs"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Chef Management <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/orderslist"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Kitchen Orders <span>→</span>
                    </NavLink>

                    <NavLink
                      to="/admin/delivery-pincodes"
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      Delivery Pincodes <span>→</span>
                    </NavLink>
                  </>
                )}
              </div>
            </div>

            {isAuthenticated && (
              <div className="border-t border-slate-200 p-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-red-50 px-5 py-4 text-lg font-black text-red-600 dark:bg-red-950/30"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}