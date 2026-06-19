// frontend/src/pages/AdminUsers.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  CircleUserRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Snowflake,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type UserRole = "user" | "admin" | "delivery" | "chef";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isFrozen?: boolean;
  isDeactivated?: boolean;
  createdAt?: string;
};

type UserFilter =
  | "all"
  | "active"
  | "frozen"
  | "deactivated"
  | "admin";

type UserAction =
  | "freeze"
  | "unfreeze"
  | "deactivate"
  | "activate";

const getStatus = (user: UserRow) => {
  if (user.isDeactivated) return "Deactivated";
  if (user.isFrozen) return "Frozen";
  return "Active";
};

const getStatusClass = (user: UserRow) => {
  if (user.isDeactivated) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (user.isFrozen) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
};

const getRoleLabel = (role: UserRole) => {
  if (role === "admin") return "Admin";
  if (role === "delivery") return "Delivery";
  if (role === "chef") return "Chef";
  return "Customer";
};

const formatDate = (value?: string) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await api.get<UserRow[]>("/admin/users");

      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error("Fetch users error:", error);

      toast.error(
        error?.response?.data?.message || "Failed to fetch users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const patchUser = async (
    user: UserRow,
    action: UserAction
  ) => {
    try {
      setBusyUserId(user._id);

      await api.patch(`/admin/users/${user._id}/${action}`);

      toast.success(
        action === "freeze"
          ? "User frozen"
          : action === "unfreeze"
          ? "User unfrozen"
          : action === "deactivate"
          ? "User deactivated"
          : "User activated"
      );

      await fetchUsers();

      setSelectedUser((current) => {
        if (current?._id !== user._id) return current;

        return {
          ...current,
          isFrozen:
            action === "freeze"
              ? true
              : action === "unfreeze"
              ? false
              : current.isFrozen,
          isDeactivated:
            action === "deactivate"
              ? true
              : action === "activate"
              ? false
              : current.isDeactivated,
        };
      });
    } catch (error: any) {
      console.error("User action error:", error);

      toast.error(
        error?.response?.data?.message || "User action failed"
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const stats = useMemo(() => {
    const active = users.filter(
      (user) => !user.isFrozen && !user.isDeactivated
    ).length;

    const frozen = users.filter(
      (user) => user.isFrozen && !user.isDeactivated
    ).length;

    const deactivated = users.filter(
      (user) => user.isDeactivated
    ).length;

    const admins = users.filter(
      (user) => user.role === "admin"
    ).length;

    return {
      total: users.length,
      active,
      frozen,
      deactivated,
      admins,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users
      .filter((user) => {
        const matchesSearch =
          !query ||
          [
            user.name,
            user.email,
            user.phone,
            user.role,
            getStatus(user),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) return false;

        if (filter === "active") {
          return !user.isFrozen && !user.isDeactivated;
        }

        if (filter === "frozen") {
          return user.isFrozen && !user.isDeactivated;
        }

        if (filter === "deactivated") {
          return user.isDeactivated;
        }

        if (filter === "admin") {
          return user.role === "admin";
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search, filter]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading users...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                MacroBox Admin
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                User Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Search customers, review account status and manage frozen or
                deactivated accounts.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchUsers}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              <RefreshCw size={16} />
              Refresh Users
            </button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardStat
              label="Total Users"
              value={stats.total}
              icon={<Users size={18} />}
            />

            <DashboardStat
              label="Active"
              value={stats.active}
              icon={<UserCheck size={18} />}
              accent
            />

            <DashboardStat
              label="Frozen"
              value={stats.frozen}
              icon={<Snowflake size={18} />}
            />

            <DashboardStat
              label="Deactivated"
              value={stats.deactivated}
              icon={<UserRoundX size={18} />}
            />

            <DashboardStat
              label="Admins"
              value={stats.admins}
              icon={<ShieldCheck size={18} />}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone or role..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterButton>

              <FilterButton
                active={filter === "active"}
                onClick={() => setFilter("active")}
              >
                Active
              </FilterButton>

              <FilterButton
                active={filter === "frozen"}
                onClick={() => setFilter("frozen")}
              >
                Frozen
              </FilterButton>

              <FilterButton
                active={filter === "deactivated"}
                onClick={() => setFilter("deactivated")}
              >
                Deactivated
              </FilterButton>

              <FilterButton
                active={filter === "admin"}
                onClick={() => setFilter("admin")}
              >
                Admins
              </FilterButton>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Registered Users
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  busy={busyUserId === user._id}
                  onView={() => setSelectedUser(user)}
                  onFreeze={() =>
                    patchUser(
                      user,
                      user.isFrozen ? "unfreeze" : "freeze"
                    )
                  }
                  onDeactivate={() =>
                    patchUser(
                      user,
                      user.isDeactivated
                        ? "activate"
                        : "deactivate"
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          busy={busyUserId === selectedUser._id}
          onClose={() => setSelectedUser(null)}
          onFreeze={() =>
            patchUser(
              selectedUser,
              selectedUser.isFrozen ? "unfreeze" : "freeze"
            )
          }
          onDeactivate={() =>
            patchUser(
              selectedUser,
              selectedUser.isDeactivated
                ? "activate"
                : "deactivate"
            )
          }
        />
      )}
    </main>
  );
}

function UserCard({
  user,
  busy,
  onView,
  onFreeze,
  onDeactivate,
}: {
  user: UserRow;
  busy: boolean;
  onView: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  const initials =
    user.name
      ?.split(" ")
      .map((item) => item[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-base font-black text-green-700">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black tracking-[-0.03em] text-slate-950">
                  {user.name || "Unnamed User"}
                </h3>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClass(
                    user
                  )}`}
                >
                  {getStatus(user)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    user.role === "admin"
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>

              <p className="mt-2 truncate text-sm font-bold text-slate-600">
                {user.email}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {user.phone || "Phone not available"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={onView}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                View
              </button>

              {!user.isDeactivated && (
                <button
                  type="button"
                  onClick={onFreeze}
                  disabled={busy}
                  className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-black disabled:opacity-50 ${
                    user.isFrozen
                      ? "border-green-200 text-green-700 hover:bg-green-50"
                      : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                  }`}
                >
                  {busy
                    ? "Updating..."
                    : user.isFrozen
                    ? "Unfreeze"
                    : "Freeze"}
                </button>
              )}

              <button
                type="button"
                onClick={onDeactivate}
                disabled={busy}
                className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-black disabled:opacity-50 ${
                  user.isDeactivated
                    ? "border-green-200 text-green-700 hover:bg-green-50"
                    : "border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                {user.isDeactivated ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function UserDrawer({
  user,
  busy,
  onClose,
  onFreeze,
  onDeactivate,
}: {
  user: UserRow;
  busy: boolean;
  onClose: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  return (
    <Drawer
      title="User Details"
      subtitle={user.email}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CircleUserRound size={24} />
            </span>

            <div>
              <h3 className="text-lg font-black text-slate-950">
                {user.name || "Unnamed User"}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <DetailBox label="Status" value={getStatus(user)} />
          <DetailBox label="Role" value={getRoleLabel(user.role)} />
          <DetailBox label="Phone" value={user.phone || "N/A"} />
          <DetailBox
            label="Joined"
            value={formatDate(user.createdAt)}
          />
        </section>

        <section className="border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Email Address
          </p>

          <p className="mt-2 break-all text-sm font-black text-slate-800">
            {user.email}
          </p>
        </section>

        <section className="border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-950">
            Account Controls
          </p>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            Frozen users cannot sign in. Deactivated users remain disabled
            until an admin activates the account.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {!user.isDeactivated && (
              <button
                type="button"
                onClick={onFreeze}
                disabled={busy}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-black disabled:opacity-50 ${
                  user.isFrozen
                    ? "border-green-200 text-green-700 hover:bg-green-50"
                    : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                }`}
              >
                <Snowflake size={16} />
                {user.isFrozen ? "Unfreeze User" : "Freeze User"}
              </button>
            )}

            <button
              type="button"
              onClick={onDeactivate}
              disabled={busy}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-black disabled:opacity-50 ${
                user.isDeactivated
                  ? "border-green-200 text-green-700 hover:bg-green-50"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {user.isDeactivated ? (
                <CheckCircle2 size={16} />
              ) : (
                <LockKeyhole size={16} />
              )}

              {user.isDeactivated
                ? "Activate User"
                : "Deactivate User"}
            </button>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close user details"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[480px] sm:rounded-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              {title}
            </h2>

            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-4 shadow-sm ${
        accent
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            accent
              ? "bg-green-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>

        <p className="text-2xl font-black tracking-[-0.05em]">
          {value}
        </p>
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full px-4 text-xs font-black ${
        active
          ? "bg-green-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        <Users size={25} />
      </span>

      <h3 className="mt-4 text-xl font-black">No users found</h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Change the search term or selected filter.
      </p>
    </div>
  );
}