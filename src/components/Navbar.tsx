// frontend/src/components/Navbar.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ChefHat,
  ChevronRight,
  ClipboardList,
  Gift,
  Home,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  ReceiptText,
  Shield,
  ShoppingCart,
  Sparkles,
  TicketPercent,
  Truck,
  UserCircle,
  Users,
  Utensils,
  X,
  Zap,
  CalendarCheck,
} from "lucide-react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const WHATSAPP_NUMBER = "918985892525";

type MenuLink = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

const customerLinks: MenuLink[] = [
  {
    to: "/meals",
    label: "Meals",
    icon: <Utensils size={16} />,
  },
  {
    to: "/macrotrack",
    label: "MacroTrack",
    icon: <Zap size={16} />,
  },
  {
    to: "/smart-day-planner",
    label: "Day Planner",
    icon: <CalendarCheck size={16} />,
  },
  {
    to: "/plans",
    label: "Plans",
    icon: <ClipboardList size={16} />,
  },
  {
    to: "/rewards",
    label: "Rewards",
    icon: <Gift size={16} />,
  },
  {
    to: "/orders",
    label: "Orders",
    icon: <ReceiptText size={16} />,
  },
];

const adminLinks: MenuLink[] = [
  {
    to: "/admin/meals",
    label: "Meals",
    icon: <Utensils size={14} />,
  },
  {
    to: "/admin/plans",
    label: "Plans",
    icon: <ClipboardList size={14} />,
  },
  {
    to: "/admin/rewards",
    label: "Rewards",
    icon: <Gift size={14} />,
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: <Users size={14} />,
  },
  {
    to: "/admin/orders",
    label: "Orders",
    icon: <ReceiptText size={14} />,
  },
  {
    to: "/admin/coupons",
    label: "Coupons",
    icon: <TicketPercent size={14} />,
  },
  {
    to: "/admin/delivery-agents",
    label: "Delivery Agents",
    icon: <Truck size={14} />,
  },
  {
    to: "/admin/chefs",
    label: "Chefs",
    icon: <ChefHat size={14} />,
  },
  {
    to: "/orderslist",
    label: "Kitchen Orders",
    icon: <ClipboardList size={14} />,
  },
  {
    to: "/admin/delivery-pincodes",
    label: "Pincodes",
    icon: <MapPin size={14} />,
  },
];

export default function Navbar() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const { cartCount } = useCart();

  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  const isChef = user?.role === "chef";
  const isDelivery = user?.role === "delivery";

  const userInitial = useMemo(() => {
    return user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  }, [user?.name]);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMenu();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Hi MacroBox, I need help with my account, meals, plan or order."
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
      "_blank",
      "noopener,noreferrer"
    );

    closeMenu();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        <nav className="border-b border-[var(--mb-divider)] bg-[color:var(--mb-bg-overlay)] shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:h-[76px] sm:px-6 lg:px-8">
            <BrandLink onClick={closeMenu} />

            {/* DESKTOP CUSTOMER NAVIGATION */}
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
              {isAuthenticated && !isChef && (
                <div className="macrobox-hide-scrollbar flex max-w-full items-center gap-1 overflow-x-auto">
                  {customerLinks.map((item) => (
                    <DesktopNavLink key={item.to} item={item} />
                  ))}

                  {isDelivery && (
                    <DesktopNavLink
                      item={{
                        to: "/delivery",
                        label: "Delivery",
                        icon: <Truck size={16} />,
                      }}
                    />
                  )}
                </div>
              )}

              {isAuthenticated && isChef && (
                <DesktopNavLink
                  item={{
                    to: "/orderslist",
                    label: "Kitchen Orders",
                    icon: <ChefHat size={16} />,
                  }}
                />
              )}
            </div>

            {/* DESKTOP ACTIONS */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {!isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="mb-outline-button inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
                  >
                    <LogIn size={16} />
                    Login
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="mb-primary-button inline-flex h-11 items-center rounded-full px-5 text-sm font-medium"
                  >
                    Create account
                  </button>
                </>
              ) : !isChef ? (
                <>
                  <CartButton cartCount={cartCount} />

                  <NavLink
                    to="/my-account"
                    className={({ isActive }) =>
                      `inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                        isActive
                          ? "mb-primary-button"
                          : "mb-outline-button"
                      }`
                    }
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--mb-accent-soft)] text-[var(--mb-accent-text)]">
                      {userInitial}
                    </span>

                    <span className="max-w-[105px] truncate">
                      {user?.name || "Account"}
                    </span>
                  </NavLink>
                </>
              ) : (
                <NavLink
                  to="/my-account"
                  className={({ isActive }) =>
                    `inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                      isActive
                        ? "mb-primary-button"
                        : "mb-outline-button"
                    }`
                  }
                >
                  <UserCircle size={16} />
                  Account
                </NavLink>
              )}
            </div>

            {/* MOBILE ACTIONS */}
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              {isAuthenticated && !isChef && (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="mb-outline-button relative flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12"
                  aria-label={`Cart with ${cartCount} items`}
                >
                  <ShoppingCart size={20} />

                  {cartCount > 0 && (
                    <CartCountBadge cartCount={cartCount} />
                  )}
                </button>
              )}

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="mb-outline-button hidden h-11 items-center rounded-full px-4 text-sm font-medium min-[390px]:inline-flex"
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mb-primary-button flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12"
                aria-label="Open navigation menu"
                aria-expanded={open}
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </nav>

        {/* DESKTOP ADMIN / CHEF SUBNAV */}
        {(isAdmin || isChef) && (
          <div className="hidden border-b border-[var(--mb-divider)] bg-[var(--mb-bg-secondary)] lg:block">
            <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-6 py-2 lg:px-8">
              <div
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                  isAdmin
                    ? "border-red-300/20 bg-red-500/10 text-red-200"
                    : "border-orange-300/20 bg-orange-500/10 text-orange-200"
                }`}
              >
                {isAdmin ? (
                  <Shield size={13} />
                ) : (
                  <ChefHat size={13} />
                )}

                {isAdmin ? "Admin" : "Chef"}
              </div>

              <div className="macrobox-hide-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {isAdmin &&
                  adminLinks.map((item) => (
                    <AdminDesktopLink key={item.to} item={item} />
                  ))}

                {isChef && !isAdmin && (
                  <AdminDesktopLink
                    item={{
                      to: "/orderslist",
                      label: "Kitchen Orders",
                      icon: <ClipboardList size={14} />,
                    }}
                    chef
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MOBILE MENU */}
      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-[var(--mb-divider)] bg-[var(--mb-bg-secondary)] shadow-[var(--mb-shadow-large)]">
            <div className="mb-divider flex shrink-0 items-center justify-between border-b px-4 py-4 sm:px-5">
              <BrandLink onClick={closeMenu} compact />

              <button
                type="button"
                onClick={closeMenu}
                className="mb-outline-button flex h-11 w-11 items-center justify-center rounded-full"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-themed-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(28px,env(safe-area-inset-bottom))] sm:px-5">
              {isAuthenticated ? (
                <MobileUserCard
                  name={user?.name || "MacroBox User"}
                  email={user?.email || ""}
                  initial={userInitial}
                  role={user?.role || "user"}
                  onAccount={() => {
                    navigate("/my-account");
                    closeMenu();
                  }}
                />
              ) : (
                <GuestCard
                  onLogin={() => {
                    navigate("/login");
                    closeMenu();
                  }}
                  onSignup={() => {
                    navigate("/signup");
                    closeMenu();
                  }}
                />
              )}

              <div className="mt-6">
                <MobileSectionTitle
                  icon={<Sparkles size={13} />}
                  title="Navigation"
                />

                <div className="mt-3 grid gap-2">
                  <MobileNavLink
                    item={{
                      to: "/",
                      label: "Home",
                      icon: <Home size={18} />,
                      end: true,
                    }}
                    onClick={closeMenu}
                  />

                  {!isAuthenticated && (
                    <MobileNavLink
                      item={{
                        to: "/meals",
                        label: "Explore Meals",
                        icon: <Utensils size={18} />,
                      }}
                      onClick={closeMenu}
                    />
                  )}

                  {isAuthenticated &&
                    !isChef &&
                    customerLinks.map((item) => (
                      <MobileNavLink
                        key={item.to}
                        item={item}
                        onClick={closeMenu}
                      />
                    ))}

                  {isAuthenticated && !isChef && (
                    <>
                      <MobileNavLink
                        item={{
                          to: "/cart",
                          label:
                            cartCount > 0
                              ? `Cart (${cartCount})`
                              : "Cart",
                          icon: <ShoppingCart size={18} />,
                        }}
                        onClick={closeMenu}
                      />

                      <MobileNavLink
                        item={{
                          to: "/my-account",
                          label: "My Account",
                          icon: <UserCircle size={18} />,
                        }}
                        onClick={closeMenu}
                      />
                    </>
                  )}

                  {isDelivery && (
                    <MobileNavLink
                      item={{
                        to: "/delivery",
                        label: "Delivery Dashboard",
                        icon: <Truck size={18} />,
                      }}
                      onClick={closeMenu}
                    />
                  )}

                  {isChef && (
                    <>
                      <MobileNavLink
                        item={{
                          to: "/orderslist",
                          label: "Kitchen Orders",
                          icon: <ChefHat size={18} />,
                        }}
                        onClick={closeMenu}
                      />

                      <MobileNavLink
                        item={{
                          to: "/my-account",
                          label: "My Account",
                          icon: <UserCircle size={18} />,
                        }}
                        onClick={closeMenu}
                      />
                    </>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="mt-7">
                  <MobileSectionTitle
                    icon={<Shield size={13} />}
                    title="Admin controls"
                    danger
                  />

                  <div className="mt-3 grid gap-2">
                    {adminLinks.map((item) => (
                      <MobileNavLink
                        key={item.to}
                        item={item}
                        onClick={closeMenu}
                        admin
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-divider mt-7 border-t pt-5">
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="mb-accent-surface flex w-full items-center justify-between rounded-[20px] p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="mb-primary-button flex h-10 w-10 items-center justify-center rounded-full">
                      <MessageCircle size={17} />
                    </span>

                    <span>
                      <span className="block text-sm font-medium">
                        Help & support
                      </span>

                      <span className="mt-1 block text-[10px] opacity-70">
                        Chat with MacroBox on WhatsApp
                      </span>
                    </span>
                  </div>

                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function BrandLink({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2.5"
      aria-label="MacroBox home"
    >
      <span
        className={`mb-primary-button flex items-center justify-center rounded-full ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <Utensils size={compact ? 16 : 18} />
      </span>

      <span
        className={`mb-text font-semibold tracking-[-0.065em] ${
          compact ? "text-xl" : "text-[24px]"
        }`}
      >
        MacroBox
      </span>
    </Link>
  );
}

function DesktopNavLink({ item }: { item: MenuLink }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition ${
          isActive
            ? "mb-primary-button"
            : "mb-text-muted hover:bg-[var(--mb-surface)] hover:text-[var(--mb-text)]"
        }`
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

function AdminDesktopLink({
  item,
  chef = false,
}: {
  item: MenuLink;
  chef?: boolean;
}) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${
          isActive
            ? chef
              ? "border-orange-300/25 bg-orange-500/20 text-orange-100"
              : "border-red-300/25 bg-red-500/20 text-red-100"
            : "border-transparent text-[var(--mb-muted)] hover:border-[var(--mb-border)] hover:bg-[var(--mb-surface)] hover:text-[var(--mb-text)]"
        }`
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

function CartButton({ cartCount }: { cartCount: number }) {
  return (
    <NavLink
      to="/cart"
      className={({ isActive }) =>
        `relative inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
          isActive ? "mb-primary-button" : "mb-outline-button"
        }`
      }
    >
      <ShoppingCart size={17} />
      Cart

      {cartCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--mb-accent)] px-1 text-[10px] font-semibold text-white">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </NavLink>
  );
}

function CartCountBadge({ cartCount }: { cartCount: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--mb-bg)] bg-[var(--mb-accent)] px-1 text-[9px] font-semibold text-white">
      {cartCount > 99 ? "99+" : cartCount}
    </span>
  );
}

function MobileUserCard({
  name,
  email,
  initial,
  role,
  onAccount,
}: {
  name: string;
  email: string;
  initial: string;
  role: string;
  onAccount: () => void;
}) {
  return (
    <section className="mb-glass rounded-[24px] p-4">
      <div className="flex items-center gap-3">
        <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-medium">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <p className="mb-text truncate text-base font-medium">{name}</p>

          <p className="mb-text-faint mt-1 truncate text-xs">{email}</p>
        </div>

        <span className="mb-accent-surface rounded-full px-3 py-1 text-[9px] font-medium capitalize">
          {role}
        </span>
      </div>

      <button
        type="button"
        onClick={onAccount}
        className="mb-outline-button mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium"
      >
        <UserCircle size={16} />
        My Account
      </button>
    </section>
  );
}

function GuestCard({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <section className="mb-glass rounded-[24px] p-4">
      <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
        <UserCircle size={18} />
      </span>

      <h2 className="mb-text mt-4 text-xl font-light tracking-[-0.04em]">
        Welcome to MacroBox
      </h2>

      <p className="mb-text-muted mt-2 text-xs leading-5">
        Login or create an account to access meal plans, tracking and orders.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLogin}
          className="mb-outline-button h-11 rounded-full text-sm font-medium"
        >
          Login
        </button>

        <button
          type="button"
          onClick={onSignup}
          className="mb-primary-button h-11 rounded-full text-sm font-medium"
        >
          Sign up
        </button>
      </div>
    </section>
  );
}

function MobileSectionTitle({
  icon,
  title,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  danger?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-2 px-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${
        danger ? "text-red-200/70" : "mb-text-faint"
      }`}
    >
      {icon}
      {title}
    </p>
  );
}

function MobileNavLink({
  item,
  onClick,
  admin = false,
}: {
  item: MenuLink;
  onClick: () => void;
  admin?: boolean;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[19px] border p-3.5 transition ${
          isActive
            ? admin
              ? "border-red-300/25 bg-red-500/15 text-red-100"
              : "mb-primary-button"
            : admin
              ? "border-red-300/10 bg-red-500/5 text-red-100/80 hover:bg-red-500/10"
              : "border-[var(--mb-border)] bg-[var(--mb-surface)] text-[var(--mb-text-soft)] hover:bg-[var(--mb-surface-hover)]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isActive
                  ? "bg-black/10"
                  : admin
                    ? "bg-red-500/10"
                    : "bg-[var(--mb-surface-strong)]"
              }`}
            >
              {item.icon}
            </span>

            <span className="truncate text-sm font-medium">
              {item.label}
            </span>
          </span>

          <ChevronRight
            size={16}
            className={isActive ? "text-black/45" : "opacity-45"}
          />
        </>
      )}
    </NavLink>
  );
}
