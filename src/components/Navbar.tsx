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
    `mbx-nav-link ${isActive ? "mbx-nav-active" : ""}`;

  const cartLinkClass = ({ isActive }: { isActive: boolean }) =>
    `mbx-nav-link mbx-cart-link ${isActive ? "mbx-nav-active" : ""}`;

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    `mbx-admin-link ${isActive ? "mbx-admin-active" : ""}`;

  const chefLinkClass = ({ isActive }: { isActive: boolean }) =>
    `mbx-chef-link ${isActive ? "mbx-chef-active" : ""}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `mbx-mobile-link ${isActive ? "mbx-mobile-link-active" : ""}`;

  return (
    <>
      <nav className="mbx-navbar">
        <div className="mbx-navbar-inner">
          <Link to="/" onClick={closeMenu} className="mbx-logo">
            MacroBox
          </Link>

          <div className="mbx-desktop-links">
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
                    <span className="mbx-cart-count">{cartCount}</span>
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

          <div className="mbx-desktop-auth">
            {isAuthenticated ? (
              <div className="mbx-user-area">
                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="mbx-user-pill"
                >
                  <span className="mbx-user-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  {user?.name?.split(" ")[0] || "User"}
                </button>

                <button onClick={handleLogout} className="mbx-logout-btn">
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mbx-login-btn"
              >
                Login
              </button>
            )}
          </div>

          <div className="mbx-mobile-right">
            {isAuthenticated && !isChef && (
              <button
                onClick={() => {
                  navigate("/cart");
                  setOpen(false);
                }}
                className="mbx-mobile-cart-btn"
                aria-label="Cart"
              >
                <ShoppingCart size={22} />

                {cartCount > 0 && (
                  <span className="mbx-mobile-cart-count">{cartCount}</span>
                )}
              </button>
            )}

            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mbx-mobile-login-btn"
              >
                Login
              </button>
            )}

            <button
              type="button"
              className="mbx-menu-btn"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {(isAdmin || isChef) && (
          <div className="mbx-admin-bar">
            <div className="mbx-admin-bar-inner">
              {isAdmin && (
                <>
                  <div className="mbx-admin-label">
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
                  <div className="mbx-admin-label">
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
        <div className="mbx-mobile-menu-wrap">
          <div className="mbx-mobile-backdrop" onClick={closeMenu} />

          <aside className="mbx-mobile-drawer">
            <div className="mbx-mobile-drawer-header">
              <Link to="/" onClick={closeMenu} className="mbx-mobile-logo">
                MacroBox
              </Link>

              <button
                type="button"
                onClick={closeMenu}
                className="mbx-mobile-close"
                aria-label="Close menu"
              >
                <X size={26} />
              </button>
            </div>

            <div className="mbx-mobile-drawer-body">
              {isAuthenticated && (
                <div className="mbx-mobile-profile">
                  <div className="mbx-mobile-profile-row">
                    <div className="mbx-mobile-avatar">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="mbx-mobile-name">{user?.name || "User"}</p>
                      <p className="mbx-mobile-email">{user?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigate("/settings");
                      closeMenu();
                    }}
                    className="mbx-mobile-profile-btn"
                  >
                    <UserCircle size={18} />
                    View Profile
                  </button>
                </div>
              )}

              <div className="mbx-mobile-link-list">
                {!isAuthenticated && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/login");
                        closeMenu();
                      }}
                      className="mbx-mobile-primary-link"
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
                      className="mbx-mobile-outline-link"
                    >
                      Create Account
                      <UserCircle size={20} />
                    </button>
                  </>
                )}

                {isAuthenticated && !isChef && (
                  <>
                    <NavLink to="/meals" className={mobileLinkClass} onClick={closeMenu}>
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

                    <NavLink to="/orders" className={mobileLinkClass} onClick={closeMenu}>
                      Orders <span>→</span>
                    </NavLink>

                    <NavLink to="/cart" className={mobileLinkClass} onClick={closeMenu}>
                      Cart {cartCount > 0 ? `(${cartCount})` : ""} <span>→</span>
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
                    <p className="mbx-mobile-section-label chef">Chef</p>

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
                    <p className="mbx-mobile-section-label admin">Admin</p>

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
              <div className="mbx-mobile-drawer-footer">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mbx-mobile-logout"
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