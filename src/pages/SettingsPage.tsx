// frontend/src/pages/SettingsPage.tsx (FRONTEND)
// MacroBox My Account Page
// Primary route: /my-account
// Optional legacy redirect: /settings -> /my-account

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Home,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  UserCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

type SavedAddress = {
  _id?: string;
  fullName?: string;
  phone?: string;
  flatNo?: string;
  floor?: string;
  buildingName?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  addressLabel?: "Home" | "Work" | "Other";
  mapsUrl?: string;
  isDefault?: boolean;
};

type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "delivery" | "chef";
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
  savedAddresses?: SavedAddress[];
};

type AccountTab =
  | "profile"
  | "password"
  | "addresses"
  | "help"
  | "account";

const WHATSAPP_NUMBER = "918985892525";

const cleanPhoneNumber = (value?: string) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);

const formatPhone = (value?: string) => {
  const number = cleanPhoneNumber(value);

  if (!number) return "Phone not added";
  if (number.length !== 10) return number;

  return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
};

const addressText = (address: SavedAddress) => {
  const parts = [
    address.flatNo,
    address.floor,
    address.buildingName,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address details not available";
};

const addressIcon = (label?: string) => {
  if (label === "Work") return <Briefcase size={17} />;
  if (label === "Home") return <Home size={17} />;

  return <MapPin size={17} />;
};

const buildWhatsAppUrl = (user?: CurrentUser | null) => {
  const message = [
    "Hello MacroBox Support,",
    "",
    "I need help with my MacroBox account.",
    user?.name ? `Name: ${user.name}` : "",
    user?.email ? `Email: ${user.email}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerifiedForUpdate, setPhoneVerifiedForUpdate] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const cleanPhone = cleanPhoneNumber(phone);
  const currentSavedPhone = cleanPhoneNumber(user?.phone);

  const phoneReady = cleanPhone.length === 10;
  const phoneChanged = cleanPhone !== currentSavedPhone;

  const verifiedItems = useMemo(() => {
    return [
      user?.emailVerified === true,
      user?.isPhoneVerified === true,
    ].filter(Boolean).length;
  }, [user?.emailVerified, user?.isPhoneVerified]);

  const themedInput =
    "mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-55";

  const loadAccount = async () => {
    try {
      setLoading(true);

      const [userResponse, addressResponse] = await Promise.allSettled([
        api.get("/user/me"),
        api.get("/user/addresses"),
      ]);

      if (userResponse.status === "fulfilled") {
        const data = userResponse.value.data as CurrentUser;

        setUser(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }

      if (addressResponse.status === "fulfilled") {
        const data = addressResponse.value.data;
        setAddresses(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("Failed to load account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const syncLocalUser = (updatedUser: CurrentUser) => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return;

    try {
      const oldUser = JSON.parse(storedUser);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...oldUser,
          name: updatedUser.name,
          phone: updatedUser.phone,
          isPhoneVerified: updatedUser.isPhoneVerified,
        })
      );
    } catch {
      // Ignore invalid local-storage data.
    }
  };

  const resetPhoneOtpState = () => {
    setOtp("");
    setDevOtp("");
    setOtpSent(false);
    setPhoneVerifiedForUpdate(false);
    setPhoneVerificationToken("");
  };

  const closePhoneEditor = () => {
    setPhone(user?.phone || "");
    resetPhoneOtpState();
    setShowPhoneEditor(false);
  };

  const handleLogout = async () => {
    await logout();

    localStorage.removeItem("token");
    localStorage.removeItem("macrobox_token");
    localStorage.removeItem("user");

    toast.success("Logged out successfully.");
    navigate("/login");
  };

  const updateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await api.put("/user/profile", {
        name: name.trim(),
      });

      const updatedUser = response.data.user as CurrentUser;

      setUser(updatedUser);
      setPhone(updatedUser.phone || phone);
      syncLocalUser(updatedUser);

      toast.success("Profile updated.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!phoneReady) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    if (!phoneChanged) {
      toast.error("Enter a new phone number first.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/send-phone-otp", {
        phone: cleanPhone,
        name: name.trim() || user?.name || "MacroBox User",
      });

      setOtpSent(true);
      setOtp("");
      setPhoneVerifiedForUpdate(false);
      setPhoneVerificationToken("");

      if (response.data?.devOtp) {
        setDevOtp(response.data.devOtp);
        toast.success("OTP generated successfully.");
      } else {
        setDevOtp("");
        toast.success(response.data?.message || "OTP sent successfully.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (otp.trim().length !== 6) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await api.post("/auth/verify-phone-otp", {
        phone: cleanPhone,
        otp: otp.trim(),
      });

      setPhoneVerificationToken(
        response.data.phoneVerificationToken || ""
      );
      setPhoneVerifiedForUpdate(true);

      toast.success("Phone verified successfully.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "OTP verification failed."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const updatePhone = async () => {
    if (!phoneReady) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    if (!phoneChanged) {
      toast.error("Enter a new phone number to update.");
      return;
    }

    if (!phoneVerifiedForUpdate || !phoneVerificationToken) {
      toast.error("Verify the WhatsApp OTP before updating your phone.");
      return;
    }

    try {
      setSavingPhone(true);

      const response = await api.put("/user/phone", {
        phone: cleanPhone,
        phoneVerificationToken,
      });

      const updatedUser = response.data.user as CurrentUser;

      setUser(updatedUser);
      setPhone(updatedUser.phone || cleanPhone);
      syncLocalUser(updatedUser);

      resetPhoneOtpState();
      setShowPhoneEditor(false);

      toast.success("Phone number updated.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update phone."
      );
    } finally {
      setSavingPhone(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);

      await api.put("/user/password", {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password changed successfully.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to change password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteAddress = async (addressId?: string) => {
    if (!addressId) return;
    if (!window.confirm("Delete this saved address?")) return;

    try {
      const response = await api.delete(`/user/addresses/${addressId}`);

      setAddresses(
        Array.isArray(response.data?.addresses)
          ? response.data.addresses
          : []
      );

      toast.success("Address deleted.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to delete address."
      );
    }
  };

  const setDefaultAddress = async (addressId?: string) => {
    if (!addressId) return;

    try {
      const response = await api.patch(
        `/user/addresses/${addressId}/default`
      );

      setAddresses(
        Array.isArray(response.data?.addresses)
          ? response.data.addresses
          : []
      );

      toast.success("Default address updated.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to set default.");
    }
  };

  const deactivateAccount = async () => {
    try {
      setDeactivating(true);

      await api.put("/user/deactivate");

      localStorage.removeItem("token");
      localStorage.removeItem("macrobox_token");
      localStorage.removeItem("user");

      toast.success("Account deactivated.");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate account."
      );
    } finally {
      setDeactivating(false);
    }
  };

  const openWhatsAppSupport = () => {
    window.open(buildWhatsAppUrl(user), "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <AccountLoading />;
  }

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14 lg:px-8 lg:pb-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.26em] sm:text-xs">
                  My Account
                </p>

                <h1 className="mb-text mt-4 max-w-4xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[72px]">
                  Your MacroBox,
                  <br />
                  your preferences.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Manage your personal information, phone verification,
                  security and delivery locations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <AccountTopStat
                  label="Member"
                  value={user?.name || "MacroBox User"}
                  icon={<UserCircle size={16} />}
                />

                <AccountTopStat
                  label="Phone"
                  value={user?.isPhoneVerified ? "Verified" : "Pending"}
                  icon={<Phone size={16} />}
                  accent={user?.isPhoneVerified}
                />

                <AccountTopStat
                  label="Addresses"
                  value={`${addresses.length} saved`}
                  icon={<MapPin size={16} />}
                />

                <AccountTopStat
                  label="Security"
                  value={`${verifiedItems}/2 verified`}
                  icon={<ShieldCheck size={16} />}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-glass overflow-hidden rounded-[28px] sm:rounded-[32px] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <AccountNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />

            <div className="min-w-0 p-4 sm:p-6 lg:p-8">
              {activeTab === "profile" && (
                <AccountPanel
                  icon={<User size={21} />}
                  eyebrow="Personal information"
                  title="Profile"
                  subtitle="Manage your name, email address and registered phone number."
                >
                  <div className="grid gap-5">
                    <ProfileOverview
                      user={user}
                      onChangePhone={() => setShowPhoneEditor(true)}
                    />

                    <ThemeField label="Display name">
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        className={themedInput}
                      />
                    </ThemeField>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ThemeField label="Email address">
                        <div className="relative">
                          <input
                            value={user?.email || ""}
                            disabled
                            className={`${themedInput} pr-12`}
                          />

                          <VerificationIcon
                            verified={Boolean(user?.emailVerified)}
                          />
                        </div>
                      </ThemeField>

                      <ThemeField label="Registered phone">
                        <div className="relative">
                          <input
                            value={formatPhone(user?.phone)}
                            disabled
                            className={`${themedInput} pr-12`}
                          />

                          <VerificationIcon
                            verified={Boolean(user?.isPhoneVerified)}
                          />
                        </div>
                      </ThemeField>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <PrimaryButton
                        onClick={updateProfile}
                        loading={savingProfile}
                      >
                        <Save size={16} />
                        {savingProfile ? "Saving..." : "Save profile"}
                      </PrimaryButton>

                      <button
                        type="button"
                        onClick={() => setShowPhoneEditor((current) => !current)}
                        className="mb-outline-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium"
                      >
                        <Phone size={16} />
                        {showPhoneEditor ? "Cancel phone update" : "Change phone"}
                      </button>
                    </div>

                    {showPhoneEditor && (
                      <PhoneUpdateSection
                        user={user}
                        phone={phone}
                        otp={otp}
                        devOtp={devOtp}
                        otpSent={otpSent}
                        otpLoading={otpLoading}
                        phoneReady={phoneReady}
                        phoneChanged={phoneChanged}
                        phoneVerifiedForUpdate={phoneVerifiedForUpdate}
                        savingPhone={savingPhone}
                        themedInput={themedInput}
                        onPhoneChange={(value) => {
                          setPhone(cleanPhoneNumber(value));
                          resetPhoneOtpState();
                        }}
                        onOtpChange={(value) =>
                          setOtp(value.replace(/\D/g, "").slice(0, 6))
                        }
                        onSendOtp={sendPhoneOtp}
                        onVerifyOtp={verifyPhoneOtp}
                        onSavePhone={updatePhone}
                        onCancel={closePhoneEditor}
                      />
                    )}
                  </div>
                </AccountPanel>
              )}

              {activeTab === "password" && (
                <AccountPanel
                  icon={<Lock size={21} />}
                  eyebrow="Account security"
                  title="Change password"
                  subtitle="Use a strong password that is different from your other accounts."
                >
                  <div className="grid gap-5">
                    <PasswordSecurityCard />

                    <ThemeField label="Current password">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        autoComplete="current-password"
                        placeholder="Enter current password"
                        className={themedInput}
                      />
                    </ThemeField>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ThemeField label="New password">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          autoComplete="new-password"
                          placeholder="Minimum 6 characters"
                          className={themedInput}
                        />
                      </ThemeField>

                      <ThemeField label="Confirm new password">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
                          className={themedInput}
                        />
                      </ThemeField>
                    </div>

                    <PrimaryButton
                      onClick={changePassword}
                      loading={savingPassword}
                    >
                      <ShieldCheck size={16} />
                      {savingPassword ? "Changing..." : "Change password"}
                    </PrimaryButton>
                  </div>
                </AccountPanel>
              )}

              {activeTab === "addresses" && (
                <AccountPanel
                  icon={<MapPin size={21} />}
                  eyebrow="Delivery locations"
                  title="Saved addresses"
                  subtitle="Manage the locations available during MacroBox checkout."
                  rightText={`${addresses.length} saved`}
                >
                  {addresses.length === 0 ? (
                    <EmptyAddresses />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {addresses.map((address) => (
                        <AddressCard
                          key={address._id || address.mapsUrl}
                          address={address}
                          onDelete={() => deleteAddress(address._id)}
                          onSetDefault={() =>
                            setDefaultAddress(address._id)
                          }
                        />
                      ))}
                    </div>
                  )}

                  <p className="mb-text-faint mt-5 text-xs leading-5">
                    New addresses can be added during checkout, where the exact
                    map location can also be selected.
                  </p>
                </AccountPanel>
              )}

              {activeTab === "help" && (
                <AccountPanel
                  icon={<CircleHelp size={21} />}
                  eyebrow="Customer support"
                  title="Help & support"
                  subtitle="Chat directly with MacroBox support through WhatsApp."
                >
                  <div className="grid gap-5">
                    <WhatsAppSupportCard
                      user={user}
                      onOpen={openWhatsAppSupport}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <HelpInfoCard
                        icon={<Phone size={18} />}
                        label="Support number"
                        value="+91 89858 92525"
                      />

                      <HelpInfoCard
                        icon={<MessageCircle size={18} />}
                        label="Support channel"
                        value="WhatsApp chat"
                      />
                    </div>

                    <InlineNotice
                      type="neutral"
                      text="When WhatsApp opens, explain your issue and include your order ID when asking about an order."
                    />
                  </div>
                </AccountPanel>
              )}

              {activeTab === "account" && (
                <AccountPanel
                  icon={<Settings size={21} />}
                  eyebrow="Account controls"
                  title="Account"
                  subtitle="Sign out safely or deactivate your MacroBox account."
                >
                  <div className="grid gap-5">
                    <AccountActionCard
                      icon={<LogOut size={19} />}
                      title="Sign out"
                      description="Sign out of MacroBox on this device."
                      action="Logout"
                      onClick={handleLogout}
                    />

                    <AccountActionCard
                      icon={<AlertTriangle size={19} />}
                      title="Deactivate account"
                      description="Disable your account and remove access until it is reactivated."
                      action="Deactivate"
                      danger
                      onClick={() => setShowDeactivateConfirm(true)}
                    />
                  </div>
                </AccountPanel>
              )}
            </div>
          </div>
        </section>
      </div>

      {showDeactivateConfirm && (
        <ConfirmationDialog
          loading={deactivating}
          onCancel={() => setShowDeactivateConfirm(false)}
          onConfirm={deactivateAccount}
        />
      )}
    </main>
  );
}

function AccountLoading() {
  return (
    <main className="mb-theme-background flex min-h-screen items-center justify-center px-4">
      <div className="mb-glass rounded-[28px] px-8 py-7 text-center">
        <Loader2 className="mb-text mx-auto animate-spin" size={30} />

        <p className="mb-text mt-4 text-sm font-medium">Loading account</p>

        <p className="mb-text-faint mt-1 text-xs">
          Preparing your MacroBox preferences.
        </p>
      </div>
    </main>
  );
}

function AccountTopStat({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-glass min-w-0 rounded-[22px] p-4 sm:min-w-[150px]">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent ? "mb-accent-surface" : "mb-outline-button"
        }`}
      >
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function AccountNavigation({
  activeTab,
  setActiveTab,
  onLogout,
}: {
  activeTab: AccountTab;
  setActiveTab: (tab: AccountTab) => void;
  onLogout: () => void;
}) {
  const items: {
    tab: AccountTab;
    label: string;
    subtitle: string;
    icon: ReactNode;
  }[] = [
    {
      tab: "profile",
      label: "Profile",
      subtitle: "Name and contacts",
      icon: <UserCircle size={18} />,
    },
    {
      tab: "password",
      label: "Password",
      subtitle: "Security settings",
      icon: <Lock size={18} />,
    },
    {
      tab: "addresses",
      label: "Addresses",
      subtitle: "Delivery locations",
      icon: <MapPin size={18} />,
    },
    {
      tab: "help",
      label: "Help",
      subtitle: "WhatsApp support",
      icon: <CircleHelp size={18} />,
    },
    {
      tab: "account",
      label: "Account",
      subtitle: "Logout and deactivate",
      icon: <Settings size={18} />,
    },
  ];

  return (
    <aside className="mb-divider border-b p-3 lg:border-b-0 lg:border-r lg:p-4">
      <div className="macrobox-hide-scrollbar flex gap-2 overflow-x-auto lg:block lg:space-y-2">
        {items.map((item) => {
          const active = activeTab === item.tab;

          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              className={`flex min-w-[165px] items-center gap-3 rounded-[20px] p-3 text-left transition lg:w-full lg:min-w-0 ${
                active
                  ? "mb-primary-button"
                  : "mb-outline-button border-transparent bg-transparent"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  active
                    ? "bg-black/10"
                    : "border border-[var(--mb-border)] bg-[var(--mb-surface)]"
                }`}
              >
                {item.icon}
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {item.label}
                </span>

                <span
                  className={`mt-0.5 block truncate text-[10px] ${
                    active ? "text-black/55" : "mb-text-faint"
                  }`}
                >
                  {item.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-divider mt-4 border-t pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[20px] border border-red-300/20 bg-red-500/10 p-3 text-left text-red-200 transition hover:bg-red-500/20"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <LogOut size={18} />
          </span>

          <span>
            <span className="block text-sm font-medium">Logout</span>

            <span className="mt-0.5 block text-[10px] text-red-200/60">
              Sign out on this device
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function AccountPanel({
  icon,
  eyebrow,
  title,
  subtitle,
  children,
  rightText,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  rightText?: string;
}) {
  return (
    <section>
      <div className="mb-divider mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mb-accent-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            {icon}
          </span>

          <div>
            <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.17em]">
              {eyebrow}
            </p>

            <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
              {title}
            </h2>

            <p className="mb-text-muted mt-2 max-w-2xl text-sm leading-6">
              {subtitle}
            </p>
          </div>
        </div>

        {rightText && (
          <span className="mb-outline-button w-fit rounded-full px-3 py-1.5 text-[10px] font-medium">
            {rightText}
          </span>
        )}
      </div>

      <div className="max-w-4xl">{children}</div>
    </section>
  );
}

function ProfileOverview({
  user,
  onChangePhone,
}: {
  user: CurrentUser | null;
  onChangePhone: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ProfileInfoCard
        icon={<User size={17} />}
        label="Name"
        value={user?.name || "MacroBox User"}
      />

      <ProfileInfoCard
        icon={<ShieldCheck size={17} />}
        label="Email"
        value={user?.email || "Email not available"}
        verified={user?.emailVerified}
      />

      <button
        type="button"
        onClick={onChangePhone}
        className="mb-glass-hover rounded-[22px] border border-[var(--mb-border)] bg-[var(--mb-surface)] p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
            <Phone size={17} />
          </span>

          <ChevronRight className="mb-text-faint" size={17} />
        </div>

        <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.14em]">
          Phone
        </p>

        <p className="mb-text mt-1 truncate text-sm font-medium">
          {formatPhone(user?.phone)}
        </p>

        <p
          className={`mt-2 text-[10px] font-medium ${
            user?.isPhoneVerified ? "mb-accent" : "text-amber-200"
          }`}
        >
          {user?.isPhoneVerified ? "Verified" : "Verification pending"}
        </p>
      </button>
    </div>
  );
}

function ProfileInfoCard({
  icon,
  label,
  value,
  verified,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--mb-border)] bg-[var(--mb-surface)] p-4">
      <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium">{value}</p>

      {verified !== undefined && (
        <p
          className={`mt-2 text-[10px] font-medium ${
            verified ? "mb-accent" : "text-amber-200"
          }`}
        >
          {verified ? "Verified" : "Verification pending"}
        </p>
      )}
    </div>
  );
}

function PhoneUpdateSection({
  user,
  phone,
  otp,
  devOtp,
  otpSent,
  otpLoading,
  phoneReady,
  phoneChanged,
  phoneVerifiedForUpdate,
  savingPhone,
  themedInput,
  onPhoneChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onSavePhone,
  onCancel,
}: {
  user: CurrentUser | null;
  phone: string;
  otp: string;
  devOtp: string;
  otpSent: boolean;
  otpLoading: boolean;
  phoneReady: boolean;
  phoneChanged: boolean;
  phoneVerifiedForUpdate: boolean;
  savingPhone: boolean;
  themedInput: string;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onSavePhone: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="mb-glass-subtle rounded-[24px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mb-accent-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Phone size={18} />
          </span>

          <div>
            <p className="mb-text text-sm font-medium">
              Change registered phone
            </p>

            <p className="mb-text-faint mt-1 text-xs leading-5">
              Current number: {formatPhone(user?.phone)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mb-outline-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          aria-label="Close phone editor"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <ThemeField label="New phone number">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <span className="mb-text-faint pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
                +91
              </span>

              <input
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                inputMode="numeric"
                placeholder="10-digit phone number"
                className={`${themedInput} pl-14`}
              />
            </div>

            <button
              type="button"
              onClick={onSendOtp}
              disabled={otpLoading || !phoneReady || !phoneChanged}
              className="mb-outline-button h-12 shrink-0 rounded-full px-5 text-sm font-medium disabled:opacity-40"
            >
              {otpLoading && !otpSent
                ? "Sending..."
                : otpSent
                  ? "Resend OTP"
                  : "Get OTP"}
            </button>
          </div>
        </ThemeField>

        {!phoneChanged && (
          <InlineNotice
            type="neutral"
            text="Enter a different phone number to begin verification."
          />
        )}

        {otpSent && !phoneVerifiedForUpdate && (
          <ThemeField label="WhatsApp OTP">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={otp}
                onChange={(event) => onOtpChange(event.target.value)}
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                className={`${themedInput} tracking-[0.3em]`}
              />

              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={otpLoading || otp.length !== 6}
                className="mb-primary-button h-12 shrink-0 rounded-full px-6 text-sm font-medium disabled:opacity-40"
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </ThemeField>
        )}

        {devOtp && !phoneVerifiedForUpdate && (
          <InlineNotice
            type="warning"
            text={`Development OTP: ${devOtp}`}
          />
        )}

        {phoneVerifiedForUpdate && (
          <InlineNotice
            type="success"
            text="Phone verified. You can now save this number."
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton
            onClick={onSavePhone}
            loading={savingPhone}
            disabled={!phoneChanged || !phoneVerifiedForUpdate}
          >
            <Save size={16} />
            {savingPhone ? "Updating..." : "Update phone"}
          </PrimaryButton>

          <button
            type="button"
            onClick={onCancel}
            className="mb-outline-button h-12 rounded-full px-5 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

function PasswordSecurityCard() {
  return (
    <div className="mb-accent-surface rounded-[22px] p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />

        <div>
          <p className="text-sm font-semibold">Protect your MacroBox account</p>

          <p className="mt-1 text-xs leading-5 opacity-80">
            Use at least 6 characters and avoid reusing your email or phone
            number as the password.
          </p>
        </div>
      </div>
    </div>
  );
}

function VerificationIcon({ verified }: { verified: boolean }) {
  return (
    <span
      className={`absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${
        verified
          ? "border border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] text-[var(--mb-accent-text)]"
          : "border border-amber-300/20 bg-amber-500/10 text-amber-200"
      }`}
    >
      {verified ? <Check size={14} /> : <AlertTriangle size={13} />}
    </span>
  );
}

function ThemeField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-text-faint mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>

      {children}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="mb-primary-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-40 sm:w-fit"
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
}

function InlineNotice({
  type,
  text,
}: {
  type: "success" | "warning" | "neutral";
  text: string;
}) {
  const style =
    type === "success"
      ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] text-[var(--mb-accent-text)]"
      : type === "warning"
        ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
        : "border-[var(--mb-border)] bg-[var(--mb-surface)] text-[var(--mb-muted)]";

  return (
    <div className={`rounded-[18px] border p-3 text-xs leading-5 ${style}`}>
      <div className="flex items-start gap-2">
        {type === "success" ? (
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        ) : type === "warning" ? (
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        ) : (
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        )}

        <p>{text}</p>
      </div>
    </div>
  );
}

function AddressCard({
  address,
  onDelete,
  onSetDefault,
}: {
  address: SavedAddress;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <article
      className={`rounded-[24px] border p-4 transition sm:p-5 ${
        address.isDefault
          ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)]"
          : "mb-glass-hover border-[var(--mb-border)] bg-[var(--mb-surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              address.isDefault ? "mb-primary-button" : "mb-outline-button"
            }`}
          >
            {addressIcon(address.addressLabel)}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mb-text text-base font-medium">
                {address.addressLabel || "Address"}
              </h3>

              {address.isDefault && (
                <span className="mb-primary-button rounded-full px-2.5 py-1 text-[8px] font-medium">
                  Default
                </span>
              )}
            </div>

            <p className="mb-text-muted mt-2 line-clamp-3 text-xs leading-5">
              {addressText(address)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete address"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mb-divider mt-4 border-t pt-4">
        <p className="mb-text text-xs font-medium">
          {address.fullName || "MacroBox User"}
        </p>

        <p className="mb-text-faint mt-1 text-[10px]">
          {formatPhone(address.phone)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!address.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            className="mb-outline-button inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-medium"
          >
            <CheckCircle2 size={14} />
            Set default
          </button>
        )}

        {address.mapsUrl && (
          <a
            href={address.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-outline-button inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-medium"
          >
            <Navigation size={14} />
            Open map
          </a>
        )}
      </div>
    </article>
  );
}

function EmptyAddresses() {
  return (
    <div className="rounded-[26px] border border-[var(--mb-border)] bg-[var(--mb-surface)] p-8 text-center sm:p-9">
      <span className="mb-primary-button mx-auto flex h-14 w-14 items-center justify-center rounded-full">
        <MapPin size={23} />
      </span>

      <h3 className="mb-text mt-5 text-xl font-light">No saved addresses</h3>

      <p className="mb-text-muted mx-auto mt-2 max-w-md text-sm leading-6">
        Add an address during checkout and it will appear here for future
        orders.
      </p>
    </div>
  );
}

function WhatsAppSupportCard({
  user,
  onOpen,
}: {
  user: CurrentUser | null;
  onOpen: () => void;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <MessageCircle size={21} />
          </span>

          <div>
            <p className="mb-text text-lg font-light tracking-[-0.03em]">
              Chat with MacroBox support
            </p>

            <p className="mb-text-muted mt-2 max-w-xl text-sm leading-6">
              Open WhatsApp and send a message to our support number for help
              with orders, plans, payments, delivery or your account.
            </p>

            <p className="mb-accent mt-3 text-xs font-medium">
              +91 89858 92525
            </p>

            {user?.name && (
              <p className="mb-text-faint mt-1 text-[10px]">
                The message will include your name and email for faster support.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mb-primary-button inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium sm:w-auto"
        >
          Open WhatsApp
          <ExternalLink size={16} />
        </button>
      </div>
    </section>
  );
}

function HelpInfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[22px] p-4">
      <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full">
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function AccountActionCard({
  icon,
  title,
  description,
  action,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-[24px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
        danger
          ? "border-red-300/20 bg-red-500/10"
          : "border-[var(--mb-border)] bg-[var(--mb-surface)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-red-500/10 text-red-200" : "mb-accent-surface"
          }`}
        >
          {icon}
        </span>

        <div>
          <p
            className={`text-sm font-medium ${
              danger ? "text-red-100" : "mb-text"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-xs leading-5 ${
              danger ? "text-red-100/65" : "mb-text-muted"
            }`}
          >
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`h-11 shrink-0 rounded-full px-5 text-sm font-medium transition ${
          danger
            ? "border border-red-300/25 bg-red-500/15 text-red-100 hover:bg-red-500/25"
            : "mb-outline-button"
        }`}
      >
        {action}
      </button>
    </div>
  );
}

function ConfirmationDialog({
  loading,
  onCancel,
  onConfirm,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-[480px] rounded-[30px] border border-red-300/20 bg-[var(--mb-bg-secondary)] p-5 shadow-[var(--mb-shadow-large)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-200">
            <AlertTriangle size={21} />
          </span>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mb-text mt-6 text-2xl font-light tracking-[-0.04em]">
          Deactivate account?
        </h2>

        <p className="mb-text-muted mt-3 text-sm leading-6">
          Your MacroBox access will be disabled. Confirm only when you are sure
          you no longer want to use this account.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="mb-outline-button h-12 rounded-full text-sm font-medium"
          >
            Keep account
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-red-300/25 bg-red-500/20 px-5 text-sm font-medium text-red-100 transition hover:bg-red-500/30 disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}
