// frontend/src/components/Navbar.tsx
import { Link, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import { Menu, X, Shield, ShoppingCart, TicketPercent } from "lucide-react";

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

  // ✅ Prevent background scroll when mobile menu open
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

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMenu}
          className="text-2xl font-extrabold text-green-600 tracking-tight"
        >
          MacroBox
        </Link>

        {/* ================= DESKTOP NAV ================= */}
        <div className="hidden md:flex items-center gap-2">
          {/* COMMON */}
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/meals" className={navLinkClass}>
            Meals
          </NavLink>

          {/* USER FEATURES (VISIBLE TO ADMIN TOO) */}
          {isAuthenticated && (
            <>
              <NavLink to="/plan-my-day" className={navLinkClass}>
                Plan My Day
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
            </>
          )}

          {/* ADMIN EXTRA LINKS */}
          {isAdmin && (
            <div className="ml-2 flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1">
              <Shield size={16} className="text-red-600" />
              <NavLink to="/admin/meals" className={({ isActive }) =>
                `px-2 py-1 rounded-md text-sm font-semibold ${
                  isActive ? "text-red-700 underline" : "text-red-600 hover:underline"
                }`
              }>
                Admin Meals
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) =>
                `px-2 py-1 rounded-md text-sm font-semibold ${
                  isActive ? "text-red-700 underline" : "text-red-600 hover:underline"
                }`
              }>
                Users
              </NavLink>
              <NavLink
                to="/admin/coupons"
                className={({ isActive }) =>
                  `px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 ${
                    isActive ? "text-red-700 underline" : "text-red-600 hover:underline"
                  }`
                }
              >
                <TicketPercent size={14} />
                Coupons
              </NavLink>
            </div>
          )}

          {/* CART (USER + ADMIN) */}
          {isAuthenticated && (
            <button
              onClick={() => navigate("/cart")}
              className="relative ml-2 px-3 py-2 rounded-lg hover:bg-gray-50"
              aria-label="Cart"
            >
              <ShoppingCart size={20} className="text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* AUTH */}
          <div className="ml-2 flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600 text-sm">
                  Hi, <span className="font-semibold">{user?.name?.split(" ")[0]}</span>
                  {isAdmin && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                      ADMIN
                    </span>
                  )}
                </span>

                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <NavLink to="/signup" className="px-3 py-2 rounded-lg text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100">
                  Signup
                </NavLink>
              </>
            )}
          </div>
        </div>

        {/* ================= MOBILE RIGHT: CART + TOGGLE ================= */}
        <div className="md:hidden flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => {
                navigate("/cart");
                setOpen(false);
              }}
              className="relative px-3 py-2 rounded-lg hover:bg-gray-50"
              aria-label="Cart"
            >
              <ShoppingCart size={22} className="text-gray-800" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            className="px-3 py-2 rounded-lg border text-gray-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU OVERLAY ================= */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={closeMenu}>
          <div
            className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold text-green-600">Menu</div>
              <button
                onClick={closeMenu}
                className="p-2 rounded-lg hover:bg-gray-50"
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
                  <div className="mt-2 inline-flex text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                    ADMIN
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <NavLink to="/" className={mobileLinkClass} onClick={closeMenu}>
                Home
              </NavLink>
              <NavLink to="/meals" className={mobileLinkClass} onClick={closeMenu}>
                Meals
              </NavLink>

              {isAuthenticated && (
                <>
                  <NavLink to="/plan-my-day" className={mobileLinkClass} onClick={closeMenu}>
                    Plan My Day
                  </NavLink>
                  <NavLink to="/orders" className={mobileLinkClass} onClick={closeMenu}>
                    Orders
                  </NavLink>
                  <NavLink to="/dashboard" className={mobileLinkClass} onClick={closeMenu}>
                    Dashboard
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <div className="my-2 border-t" />
                  <div className="px-3 pt-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                    <Shield size={14} className="text-red-600" />
                    Admin
                  </div>
                  <NavLink to="/admin/meals" className={mobileLinkClass} onClick={closeMenu}>
                    Admin Meals
                  </NavLink>
                  <NavLink to="/admin/users" className={mobileLinkClass} onClick={closeMenu}>
                    Users
                  </NavLink>
                  <NavLink
                    to="/admin/coupons"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Coupons
                  </NavLink>
                </>
              )}

              <div className="my-2 border-t" />

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              ) : (
                <>
                  <NavLink to="/login" className={mobileLinkClass} onClick={closeMenu}>
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className={({ isActive }) =>
                      `block w-full px-3 py-2 rounded-lg text-base font-semibold transition ${
                        isActive
                          ? "text-green-700 bg-green-50"
                          : "text-green-700 bg-green-50 hover:bg-green-100"
                      }`
                    }
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
