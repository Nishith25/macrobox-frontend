// frontend/src/pages/SettingsPage.tsx (FRONTEND)
import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";
import {
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
  role: "user" | "admin" | "delivery";
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const syncLocalUser = (updatedUser: CurrentUser) => {
    const oldRaw = localStorage.getItem("user");
    if (!oldRaw) return;

    try {
      const oldUser = JSON.parse(oldRaw);
      const nextUser = {
        ...oldUser,
        name: updatedUser.name,
        phone: updatedUser.phone,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
    } catch {
      // ignore
    }
  };

  const updateProfile = async () => {
    try {
      setSavingProfile(true);

      const res = await api.put("/user/profile", {
        name,
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

  const updatePhone = async () => {
    try {
      setSavingPhone(true);

      const res = await api.put("/user/phone", {
        phone,
      });

      setUser(res.data.user);
      syncLocalUser(res.data.user);

      toast.success("Phone number updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update phone");
    } finally {
      setSavingPhone(false);
    }
  };

  const changePassword = async () => {
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
    const ok = window.confirm(
      "Are you sure you want to deactivate your account? You can reactivate later by signing up again."
    );

    if (!ok) return;

    try {
      await api.put("/user/deactivate");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.success("Account deactivated");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to deactivate account");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-7">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          <Settings size={28} className="text-green-600" />
          Settings
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your profile, security, phone number and saved addresses.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* PROFILE */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">
                Email
              </label>
              <input
                value={user?.email || ""}
                disabled
                className="h-11 w-full cursor-not-allowed rounded-xl border bg-gray-100 px-3 text-sm text-gray-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Role: {user?.role}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  user?.emailVerified
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {user?.emailVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>

            <button
              onClick={updateProfile}
              disabled={savingProfile}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Save size={16} />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>

        {/* PHONE */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Phone size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Phone Number</h2>
          </div>

          <p className="mb-4 text-sm text-gray-500">
            Update your phone number used for delivery communication.
          </p>

          <div className="space-y-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />

            <button
              onClick={updatePhone}
              disabled={savingPhone}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Save size={16} />
              {savingPhone ? "Updating..." : "Update Phone"}
            </button>

            <p className="text-xs text-yellow-700">
              Note: After updating phone number, phone verification status will
              be reset.
            </p>
          </div>
        </div>

        {/* PASSWORD */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />

            <button
              onClick={changePassword}
              disabled={savingPassword}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <ShieldCheck size={16} />
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>

        {/* ACCOUNT */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Account</h2>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Manage account status and privacy controls. More options like
              notification preferences and diet preference can be added here.
            </p>

            <button
              onClick={deactivateAccount}
              className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Deactivate Account
            </button>
          </div>
        </div>
      </div>

      {/* SAVED ADDRESSES */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
        </div>

        {addresses.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            No saved addresses yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="rounded-xl border bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-bold text-gray-900">
                    {address.addressLabel || "Address"}{" "}
                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Default
                      </span>
                    )}
                  </p>

                  <button
                    onClick={() => deleteAddress(address._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <p className="text-sm text-gray-700">
                  {address.flatNo}, {address.buildingName}
                </p>

                <p className="text-sm text-gray-500">
                  {address.area}, {address.city}, {address.state} -{" "}
                  {address.pincode}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {address.fullName} • {address.phone}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(address._id)}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-white"
                    >
                      Set Default
                    </button>
                  )}

                  {address.mapsUrl && (
                    <a
                      href={address.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Open Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}