// frontend/src/pages/SettingsPage.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Lock,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

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

export default function SettingsPage() {
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
  const currentSavedPhone = (user?.phone || "").replace(/\D/g, "").slice(0, 10);
  const phoneReady = cleanPhone.length === 10;
  const phoneChanged = cleanPhone !== currentSavedPhone;

  const pageClass = "min-h-screen bg-[#f6f7f8] text-slate-950";

  const cardClass =
    "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]";

  const titleClass = "text-slate-950";
  const mutedClass = "text-slate-500";

  const inputClass =
    "h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

  const compactAddressCardClass =
    "rounded-[18px] border border-slate-200 bg-slate-50 p-4";

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [userRes, addressRes] = await Promise.allSettled([
        api.get("/user/me"),
        api.get("/user/addresses"),
      ]);

      if (userRes.status === "fulfilled") {
        const data = userRes.value.data;
        setUser(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }

      if (addressRes.status === "fulfilled") {
        setAddresses(addressRes.value.data || []);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault),
    [addresses]
  );

  const syncLocalUser = (updatedUser: CurrentUser) => {
    const oldRaw = localStorage.getItem("user");
    if (!oldRaw) return;

    try {
      const oldUser = JSON.parse(oldRaw);

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
      // ignore local storage parse errors
    }
  };

  const resetPhoneOtpState = () => {
    setOtp("");
    setDevOtp("");
    setOtpSent(false);
    setPhoneVerifiedForUpdate(false);
    setPhoneVerificationToken("");
  };

  const updateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSavingProfile(true);

      const res = await api.put("/user/profile", {
        name: name.trim(),
      });

      setUser(res.data.user);
      syncLocalUser(res.data.user);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
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

      const res = await api.post("/auth/send-phone-otp", {
        phone: cleanPhone,
        name: name.trim() || user?.name || "MacroBox User",
      });

      setOtpSent(true);
      setOtp("");
      setPhoneVerifiedForUpdate(false);
      setPhoneVerificationToken("");

      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
        toast.success("OTP generated successfully.");
      } else {
        setDevOtp("");
        toast.success(res.data?.message || "OTP sent successfully.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (otp.trim().length !== 6) {
      toast.error("Enter valid 6-digit OTP.");
      return;
    }

    try {
      setOtpLoading(true);

      const res = await api.post("/auth/verify-phone-otp", {
        phone: cleanPhone,
        otp: otp.trim(),
      });

      setPhoneVerificationToken(res.data.phoneVerificationToken || "");
      setPhoneVerifiedForUpdate(true);
      toast.success("Phone verified successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "OTP verification failed.");
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
      toast.error("Please verify WhatsApp OTP before updating phone.");
      return;
    }

    try {
      setSavingPhone(true);

      const res = await api.put("/user/phone", {
        phone: cleanPhone,
        phoneVerificationToken,
      });

      setUser(res.data.user);
      syncLocalUser(res.data.user);
      resetPhoneOtpState();

      toast.success("Phone number updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update phone");
    } finally {
      setSavingPhone(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
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

      toast.success("Password changed successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteAddress = async (addressId?: string) => {
    if (!addressId) return;
    if (!window.confirm("Delete this saved address?")) return;

    try {
      const res = await api.delete(`/user/addresses/${addressId}`);
      setAddresses(res.data.addresses || []);
      toast.success("Address deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete address");
    }
  };

  const setDefaultAddress = async (addressId?: string) => {
    if (!addressId) return;

    try {
      const res = await api.patch(`/user/addresses/${addressId}/default`);
      setAddresses(res.data.addresses || []);
      toast.success("Default address updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to set default");
    }
  };

  const deactivateAccount = async () => {
    try {
      setDeactivating(true);

      await api.put("/user/deactivate");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast.success("Account deactivated");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to deactivate account");
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <main className={pageClass}>
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
          <div className={cardClass}>
            <p className={mutedClass}>Loading settings...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:py-10">
        <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
              <Settings size={23} />
            </span>

            <div>
              <h1 className={`text-[32px] font-black tracking-[-0.04em] ${titleClass}`}>
                Settings
              </h1>

              <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>
                Manage your profile, security and saved addresses.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-7 grid gap-5 md:grid-cols-3">
          <MiniSummary
            label="Signed in as"
            value={user?.name || "User"}
            helper={user?.email || ""}
          />

          <MiniSummary
            label="Phone"
            value={user?.phone || "Not added"}
            helper={user?.isPhoneVerified ? "Verified" : "Verification required"}
          />

          <MiniSummary
            label="Default Address"
            value={defaultAddress?.addressLabel || "Not selected"}
            helper={
              defaultAddress
                ? `${defaultAddress.area || defaultAddress.city || ""} ${
                    defaultAddress.pincode ? `- ${defaultAddress.pincode}` : ""
                  }`
                : "Set one from saved addresses"
            }
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className={cardClass}>
            <CardHeader
              icon={<User size={20} />}
              title="Profile"
              subtitle="Update your display name and view account status."
            />

            <div className="mt-5 space-y-4">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Email">
                <input value={user?.email || ""} disabled className={inputClass} />
              </Field>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    user?.emailVerified
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {user?.emailVerified ? "Email verified" : "Email not verified"}
                </span>
              </div>

              <PrimaryButton onClick={updateProfile} loading={savingProfile}>
                <Save size={16} />
                {savingProfile ? "Saving..." : "Save Profile"}
              </PrimaryButton>
            </div>
          </div>

          <div className={cardClass}>
            <CardHeader
              icon={<Phone size={20} />}
              title="Phone Number"
              subtitle="Verify WhatsApp OTP before updating your phone number."
            />

            <div className="mt-5 space-y-4">
              <Field label="Phone number">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      resetPhoneOtpState();
                    }}
                    placeholder="Phone number"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={sendPhoneOtp}
                    disabled={otpLoading || !phoneReady || !phoneChanged}
                    className="h-12 shrink-0 rounded-[16px] border border-green-600 px-4 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpLoading && !otpSent
                      ? "Sending..."
                      : otpSent
                      ? "Resend OTP"
                      : "Get OTP"}
                  </button>
                </div>
              </Field>

              {!phoneChanged && (
                <p className={`text-xs font-bold ${mutedClass}`}>
                  Enter a new phone number to enable OTP verification.
                </p>
              )}

              {otpSent && !phoneVerifiedForUpdate && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={verifyPhoneOtp}
                    disabled={otpLoading || otp.length !== 6}
                    className="h-12 shrink-0 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {otpLoading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}

              {devOtp && !phoneVerifiedForUpdate && (
                <p className="rounded-[14px] border border-yellow-300 bg-yellow-50 px-4 py-3 text-xs font-black text-yellow-800">
                  Dev OTP: {devOtp}
                </p>
              )}

              {phoneVerifiedForUpdate && (
                <p className="flex items-center gap-2 rounded-[14px] bg-green-50 px-4 py-3 text-xs font-black text-green-700">
                  <CheckCircle2 size={16} />
                  Phone number verified. You can update now.
                </p>
              )}

              <PrimaryButton
                onClick={updatePhone}
                loading={savingPhone}
                disabled={!phoneChanged || !phoneVerifiedForUpdate}
              >
                <Save size={16} />
                {savingPhone ? "Updating..." : "Update Phone"}
              </PrimaryButton>

              <p
                className="rounded-[14px] bg-yellow-50 px-4 py-3 text-xs font-bold text-yellow-700"
              >
                Note: Phone number update requires WhatsApp OTP verification.
              </p>
            </div>
          </div>

          <div className={cardClass}>
            <CardHeader
              icon={<Lock size={20} />}
              title="Change Password"
              subtitle="Keep your MacroBox account secure."
            />

            <div className="mt-5 space-y-4">
              <Field label="Current password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className={inputClass}
                />
              </Field>

              <Field label="New password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className={inputClass}
                />
              </Field>

              <Field label="Confirm new password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={inputClass}
                />
              </Field>

              <PrimaryButton onClick={changePassword} loading={savingPassword}>
                <ShieldCheck size={16} />
                {savingPassword ? "Changing..." : "Change Password"}
              </PrimaryButton>
            </div>
          </div>

          <div className={cardClass}>
            <CardHeader
              icon={<ShieldCheck size={20} />}
              title="Account"
              subtitle="Deactivate your account if you no longer want to use MacroBox."
            />

            <div className="mt-5">
              {!showDeactivateConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="rounded-[16px] border border-red-300 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                >
                  Deactivate Account
                </button>
              ) : (
                <div className="rounded-[18px] border border-red-200 bg-red-50 p-4">
                  <p className="font-black text-red-700">
                    Are you sure you want to deactivate your account?
                  </p>

                  <p className="mt-1 text-sm font-semibold text-red-600">
                    You can reactivate later by signing up again with the same email.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={deactivateAccount}
                      disabled={deactivating}
                      className="rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deactivating ? "Deactivating..." : "Yes, deactivate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(false)}
                      disabled={deactivating}
                      className="rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={`mt-5 ${cardClass}`}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardHeader
              icon={<MapPin size={20} />}
              title="Saved Addresses"
              subtitle="Compact view of your delivery addresses."
            />

            <span
              className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
            >
              {addresses.length} saved
            </span>
          </div>

          {addresses.length === 0 ? (
            <p
              className="rounded-[18px] bg-slate-50 p-4 text-sm font-semibold text-slate-500"
            >
              No saved addresses yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {addresses.map((address) => (
                <article key={address._id} className={compactAddressCardClass}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className="truncate text-base font-black text-slate-950"
                        >
                          {address.addressLabel || "Address"}
                        </h3>

                        {address.isDefault && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700">
                            Default
                          </span>
                        )}
                      </div>

                      <p
                        className="mt-1 line-clamp-1 text-sm font-bold text-slate-700"
                      >
                        {[address.flatNo, address.buildingName]
                          .filter(Boolean)
                          .join(", ") || "Address details"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteAddress(address._id)}
                      className="shrink-0 rounded-full p-2 text-red-500 hover:bg-red-50"
                      aria-label="Delete address"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <p className={`line-clamp-2 text-xs font-semibold ${mutedClass}`}>
                    {[address.area, address.city, address.state]
                      .filter(Boolean)
                      .join(", ")}
                    {address.pincode ? ` - ${address.pincode}` : ""}
                  </p>

                  <p className={`mt-2 line-clamp-1 text-xs font-semibold ${mutedClass}`}>
                    {address.fullName || "User"} • {address.phone || "No phone"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(address._id)}
                        className="rounded-[12px] border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-white"
                      >
                        Set Default
                      </button>
                    )}

                    {address.mapsUrl && (
                      <a
                        href={address.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[12px] border border-green-600 bg-green-50 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-100"
                      >
                        Open Map
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CardHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
        {icon}
      </span>

      <div>
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function MiniSummary({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
        {helper}
      </p>
    </div>
  );
}
