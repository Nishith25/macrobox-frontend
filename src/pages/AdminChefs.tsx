// frontend/src/pages/AdminChefs.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ChefHat,
  CheckCircle2,
  CircleUserRound,
  Flame,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Snowflake,
  UserCheck,
  UserRoundX,
  Users,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type ApprovalStatus = "pending" | "approved" | "rejected";

type Chef = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFrozen?: boolean;
  isDeactivated?: boolean;
  createdAt?: string;
  chefProfile?: {
    isActive?: boolean;
    approvalStatus?: ApprovalStatus;
    rejectionReason?: string;
  };
};

type ChefFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "frozen"
  | "deactivated";

type ChefAction =
  | "approve"
  | "freeze"
  | "unfreeze"
  | "deactivate";

const getApproval = (chef: Chef): ApprovalStatus =>
  chef.chefProfile?.approvalStatus || "pending";

const getAccountStatus = (chef: Chef) => {
  if (chef.isDeactivated) return "Deactivated";
  if (chef.isFrozen) return "Frozen";
  if (chef.chefProfile?.isActive) return "Active";
  return "Inactive";
};

const approvalClass = (status: ApprovalStatus) => {
  if (status === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
};

const accountClass = (chef: Chef) => {
  if (chef.isDeactivated) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (chef.isFrozen) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (chef.chefProfile?.isActive) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
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

export default function AdminChefs() {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChefFilter>("all");

  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);

  const [rejectingChef, setRejectingChef] = useState<Chef | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchChefs = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/chefs");

      setChefs(
        Array.isArray(response.data?.chefs)
          ? response.data.chefs
          : Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to fetch chefs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChefs();
  }, []);

  const performAction = async (
    chef: Chef,
    action: ChefAction
  ) => {
    const confirmation: Record<ChefAction, string> = {
      approve: "Approve this chef?",
      freeze: "Freeze this chef?",
      unfreeze: "Unfreeze this chef?",
      deactivate: "Deactivate this chef?",
    };

    if (!window.confirm(confirmation[action])) {
      return;
    }

    try {
      setBusyId(chef._id);

      await api.patch(`/admin/chefs/${chef._id}/${action}`);

      toast.success(
        action === "approve"
          ? "Chef approved."
          : action === "freeze"
          ? "Chef frozen."
          : action === "unfreeze"
          ? "Chef unfrozen."
          : "Chef deactivated."
      );

      setSelectedChef(null);
      await fetchChefs();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Action failed."
      );
    } finally {
      setBusyId(null);
    }
  };

  const rejectChef = async () => {
    if (!rejectingChef) return;

    try {
      setBusyId(rejectingChef._id);

      await api.patch(
        `/admin/chefs/${rejectingChef._id}/reject`,
        {
          reason:
            rejectionReason.trim() || "Rejected by admin.",
        }
      );

      toast.success("Chef rejected.");

      setRejectingChef(null);
      setRejectionReason("");
      setSelectedChef(null);

      await fetchChefs();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to reject chef."
      );
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = chefs.filter(
      (chef) => getApproval(chef) === "pending"
    ).length;

    const approved = chefs.filter(
      (chef) => getApproval(chef) === "approved"
    ).length;

    const rejected = chefs.filter(
      (chef) => getApproval(chef) === "rejected"
    ).length;

    const active = chefs.filter(
      (chef) =>
        chef.chefProfile?.isActive &&
        !chef.isFrozen &&
        !chef.isDeactivated
    ).length;

    const frozen = chefs.filter(
      (chef) => chef.isFrozen && !chef.isDeactivated
    ).length;

    const deactivated = chefs.filter(
      (chef) => chef.isDeactivated
    ).length;

    return {
      total: chefs.length,
      pending,
      approved,
      rejected,
      active,
      frozen,
      deactivated,
    };
  }, [chefs]);

  const filteredChefs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return chefs
      .filter((chef) => {
        const approval = getApproval(chef);

        const matches =
          !query ||
          [
            chef.name,
            chef.email,
            chef.phone,
            approval,
            getAccountStatus(chef),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        if (!matches) return false;

        if (filter === "pending") return approval === "pending";
        if (filter === "approved") return approval === "approved";
        if (filter === "rejected") return approval === "rejected";

        if (filter === "frozen") {
          return chef.isFrozen && !chef.isDeactivated;
        }

        if (filter === "deactivated") {
          return chef.isDeactivated;
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [chefs, search, filter]);

  if (loading) {
    return (
      <PageLoader text="Loading chefs..." />
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
                Kitchen Team
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Review chef registrations, approve kitchen access and manage
                account availability.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchChefs}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardStat
              label="Total Chefs"
              value={stats.total}
              icon={<Users size={18} />}
            />

            <DashboardStat
              label="Pending"
              value={stats.pending}
              icon={<ShieldCheck size={18} />}
            />

            <DashboardStat
              label="Approved"
              value={stats.approved}
              icon={<UserCheck size={18} />}
              accent
            />

            <DashboardStat
              label="Active"
              value={stats.active}
              icon={<Flame size={18} />}
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
                placeholder="Search chef, email or phone..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                  ["rejected", "Rejected"],
                  ["frozen", "Frozen"],
                  ["deactivated", "Deactivated"],
                ] as [ChefFilter, string][]
              ).map(([value, label]) => (
                <FilterButton
                  key={value}
                  active={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </FilterButton>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Registered Chefs
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Showing {filteredChefs.length} of {chefs.length} chefs
            </p>
          </div>

          {filteredChefs.length === 0 ? (
            <EmptyState
              icon={<ChefHat size={26} />}
              title="No chefs found"
              text="Change the search term or selected status."
            />
          ) : (
            <div className="grid gap-4">
              {filteredChefs.map((chef) => (
                <ChefCard
                  key={chef._id}
                  chef={chef}
                  busy={busyId === chef._id}
                  onView={() => setSelectedChef(chef)}
                  onApprove={() =>
                    performAction(chef, "approve")
                  }
                  onReject={() => {
                    setRejectingChef(chef);
                    setRejectionReason("");
                  }}
                  onFreeze={() =>
                    performAction(
                      chef,
                      chef.isFrozen ? "unfreeze" : "freeze"
                    )
                  }
                  onDeactivate={() =>
                    performAction(chef, "deactivate")
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedChef && (
        <ChefDrawer
          chef={selectedChef}
          busy={busyId === selectedChef._id}
          onClose={() => setSelectedChef(null)}
          onApprove={() =>
            performAction(selectedChef, "approve")
          }
          onReject={() => {
            setRejectingChef(selectedChef);
            setRejectionReason("");
          }}
          onFreeze={() =>
            performAction(
              selectedChef,
              selectedChef.isFrozen
                ? "unfreeze"
                : "freeze"
            )
          }
          onDeactivate={() =>
            performAction(selectedChef, "deactivate")
          }
        />
      )}

      {rejectingChef && (
        <ReasonDialog
          title="Reject Chef"
          description={`Add a rejection reason for ${rejectingChef.name}.`}
          value={rejectionReason}
          loading={busyId === rejectingChef._id}
          onChange={setRejectionReason}
          onClose={() => {
            if (busyId) return;
            setRejectingChef(null);
            setRejectionReason("");
          }}
          onConfirm={rejectChef}
        />
      )}
    </main>
  );
}

function ChefCard({
  chef,
  busy,
  onView,
  onApprove,
  onReject,
  onFreeze,
  onDeactivate,
}: {
  chef: Chef;
  busy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  const approval = getApproval(chef);

  const initials =
    chef.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CH";

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-50 text-base font-black text-orange-700">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-[-0.03em]">
                  {chef.name || "Unnamed Chef"}
                </h3>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize ${approvalClass(
                    approval
                  )}`}
                >
                  {approval}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${accountClass(
                    chef
                  )}`}
                >
                  {getAccountStatus(chef)}
                </span>
              </div>

              <p className="mt-2 truncate text-sm font-bold text-slate-600">
                {chef.email}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {chef.phone || "Phone not available"}
              </p>
            </div>

            <div className="flex gap-2">
              <VerificationBadge
                verified={chef.emailVerified === true}
                label="Email"
              />

              <VerificationBadge
                verified={chef.isPhoneVerified === true}
                label="Phone"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ActionButton onClick={onView}>
              View Details
            </ActionButton>

            <ActionButton
              onClick={onApprove}
              disabled={
                busy ||
                approval === "approved" ||
                chef.isDeactivated
              }
              tone="green"
            >
              Approve
            </ActionButton>

            <ActionButton
              onClick={onReject}
              disabled={
                busy ||
                approval === "rejected" ||
                chef.isDeactivated
              }
              tone="red"
            >
              Reject
            </ActionButton>

            <ActionButton
              onClick={onFreeze}
              disabled={busy || chef.isDeactivated}
              tone={chef.isFrozen ? "green" : "yellow"}
            >
              {chef.isFrozen ? "Unfreeze" : "Freeze"}
            </ActionButton>

            <ActionButton
              onClick={onDeactivate}
              disabled={busy || chef.isDeactivated}
              tone="dark"
            >
              {busy ? "Updating..." : "Deactivate"}
            </ActionButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function ChefDrawer({
  chef,
  busy,
  onClose,
  onApprove,
  onReject,
  onFreeze,
  onDeactivate,
}: {
  chef: Chef;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  const approval = getApproval(chef);

  return (
    <Drawer
      title="Chef Details"
      subtitle={chef.email}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-700">
              <CircleUserRound size={24} />
            </span>

            <div>
              <h3 className="text-lg font-black">
                {chef.name}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {chef.phone || "Phone not available"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <DetailBox label="Approval" value={approval} />
          <DetailBox
            label="Account"
            value={getAccountStatus(chef)}
          />
          <DetailBox
            label="Email Verified"
            value={chef.emailVerified ? "Yes" : "No"}
          />
          <DetailBox
            label="Phone Verified"
            value={chef.isPhoneVerified ? "Yes" : "No"}
          />
          <DetailBox
            label="Kitchen Active"
            value={chef.chefProfile?.isActive ? "Yes" : "No"}
          />
          <DetailBox
            label="Joined"
            value={formatDate(chef.createdAt)}
          />
        </div>

        {chef.chefProfile?.rejectionReason && (
          <section className="border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-600">
              Rejection Reason
            </p>

            <p className="mt-2 text-sm font-bold leading-6 text-red-800">
              {chef.chefProfile.rejectionReason}
            </p>
          </section>
        )}

        <section className="border border-slate-200 p-4">
          <p className="text-sm font-black">
            Kitchen Access Controls
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionButton
              onClick={onApprove}
              disabled={
                busy ||
                approval === "approved" ||
                chef.isDeactivated
              }
              tone="green"
            >
              Approve
            </ActionButton>

            <ActionButton
              onClick={onReject}
              disabled={
                busy ||
                approval === "rejected" ||
                chef.isDeactivated
              }
              tone="red"
            >
              Reject
            </ActionButton>

            <ActionButton
              onClick={onFreeze}
              disabled={busy || chef.isDeactivated}
              tone={chef.isFrozen ? "green" : "yellow"}
            >
              {chef.isFrozen ? "Unfreeze" : "Freeze"}
            </ActionButton>

            <ActionButton
              onClick={onDeactivate}
              disabled={busy || chef.isDeactivated}
              tone="dark"
            >
              Deactivate
            </ActionButton>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

/* Reusable components */

function PageLoader({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <div className="flex items-center gap-3 border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
        <Loader2 className="animate-spin text-green-600" size={20} />
        {text}
      </div>
    </main>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
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

function VerificationBadge({
  verified,
  label,
}: {
  verified: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black ${
        verified
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-600"
      }`}
    >
      {verified ? (
        <CheckCircle2 size={13} />
      ) : (
        <XCircle size={13} />
      )}

      {label}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "green" | "red" | "yellow" | "dark";
}) {
  const classes =
    tone === "green"
      ? "border-green-200 text-green-700 hover:bg-green-50"
      : tone === "red"
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : tone === "yellow"
      ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
      : tone === "dark"
      ? "border-slate-800 bg-slate-900 text-white hover:bg-slate-800"
      : "border-slate-200 text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-black transition disabled:opacity-40 ${classes}`}
    >
      {children}
    </button>
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

      <p className="mt-1 truncate text-sm font-black capitalize">
        {value}
      </p>
    </div>
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
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[500px] sm:rounded-none">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </aside>
    </div>
  );
}

function ReasonDialog({
  title,
  description,
  value,
  loading,
  onChange,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="admin-input mt-5 min-h-[110px] resize-y py-3"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-full border border-slate-200 text-sm font-black"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <XCircle size={16} />
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
        {icon}
      </span>

      <h3 className="mt-4 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm font-bold text-slate-500">{text}</p>
    </div>
  );
}