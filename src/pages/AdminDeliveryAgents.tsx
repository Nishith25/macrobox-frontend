// frontend/src/pages/AdminDeliveryAgents.tsx (FRONTEND)

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
  RefreshCw,
  Search,
  ShieldCheck,
  Snowflake,
  Truck,
  UserCheck,
  UserRoundX,
  Users,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type ApprovalStatus = "pending" | "approved" | "rejected";

type Agent = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFrozen?: boolean;
  isDeactivated?: boolean;
  createdAt?: string;
  deliveryProfile?: {
    phone?: string;
    isActive?: boolean;
    approvalStatus?: ApprovalStatus;
    rejectionReason?: string;
  };
};

type AgentFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "frozen"
  | "deactivated";

type AgentAction =
  | "approve"
  | "reject"
  | "freeze"
  | "unfreeze"
  | "deactivate";

const getApprovalStatus = (agent: Agent): ApprovalStatus =>
  agent.deliveryProfile?.approvalStatus || "pending";

const getPhone = (agent: Agent) =>
  agent.deliveryProfile?.phone || agent.phone || "Not available";

const getAccountStatus = (agent: Agent) => {
  if (agent.isDeactivated) return "Deactivated";
  if (agent.isFrozen) return "Frozen";

  if (
    getApprovalStatus(agent) === "approved" &&
    agent.deliveryProfile?.isActive !== false
  ) {
    return "Active";
  }

  return "Inactive";
};

const getApprovalClass = (status: ApprovalStatus) => {
  if (status === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
};

const getAccountClass = (agent: Agent) => {
  if (agent.isDeactivated) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (agent.isFrozen) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (getAccountStatus(agent) === "Active") {
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

export default function AdminDeliveryAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AgentFilter>("all");

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [rejectingAgent, setRejectingAgent] = useState<Agent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/delivery-agents");

      setAgents(
        Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.agents)
          ? response.data.agents
          : []
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load delivery agents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const performAction = async (
    agent: Agent,
    action: Exclude<AgentAction, "reject">
  ) => {
    const confirmationMessages: Record<
      Exclude<AgentAction, "reject">,
      string
    > = {
      approve: "Approve this delivery agent?",
      freeze: "Freeze this delivery agent?",
      unfreeze: "Unfreeze this delivery agent?",
      deactivate: "Deactivate this delivery agent?",
    };

    if (!window.confirm(confirmationMessages[action])) {
      return;
    }

    try {
      setBusyId(agent._id);

      await api.patch(
        `/admin/delivery-agents/${agent._id}/${action}`
      );

      toast.success(
        action === "approve"
          ? "Delivery agent approved."
          : action === "freeze"
          ? "Delivery agent frozen."
          : action === "unfreeze"
          ? "Delivery agent unfrozen."
          : "Delivery agent deactivated."
      );

      await fetchAgents();
      setSelectedAgent(null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Action failed."
      );
    } finally {
      setBusyId(null);
    }
  };

  const rejectAgent = async () => {
    if (!rejectingAgent) return;

    const reason =
      rejectionReason.trim() || "Rejected by admin.";

    try {
      setBusyId(rejectingAgent._id);

      await api.patch(
        `/admin/delivery-agents/${rejectingAgent._id}/reject`,
        { reason }
      );

      toast.success("Delivery agent rejected.");

      setRejectingAgent(null);
      setRejectionReason("");
      setSelectedAgent(null);

      await fetchAgents();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to reject delivery agent."
      );
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = agents.filter(
      (agent) => getApprovalStatus(agent) === "pending"
    ).length;

    const approved = agents.filter(
      (agent) => getApprovalStatus(agent) === "approved"
    ).length;

    const rejected = agents.filter(
      (agent) => getApprovalStatus(agent) === "rejected"
    ).length;

    const frozen = agents.filter(
      (agent) => agent.isFrozen && !agent.isDeactivated
    ).length;

    const deactivated = agents.filter(
      (agent) => agent.isDeactivated
    ).length;

    return {
      total: agents.length,
      pending,
      approved,
      rejected,
      frozen,
      deactivated,
    };
  }, [agents]);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agents
      .filter((agent) => {
        const approval = getApprovalStatus(agent);

        const matchesSearch =
          !query ||
          [
            agent.name,
            agent.email,
            getPhone(agent),
            approval,
            getAccountStatus(agent),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) return false;

        if (filter === "pending") return approval === "pending";
        if (filter === "approved") return approval === "approved";
        if (filter === "rejected") return approval === "rejected";

        if (filter === "frozen") {
          return agent.isFrozen && !agent.isDeactivated;
        }

        if (filter === "deactivated") {
          return agent.isDeactivated;
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, search, filter]);

  if (loading) {
    return (
      <PageLoader text="Loading delivery agents..." />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-12 text-slate-950">
      <PageHeader
        eyebrow="MacroBox Admin"
        title="Delivery Partners"
        description="Review registrations, verify account details and manage delivery-partner access."
        onRefresh={fetchAgents}
      />

      <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <DashboardStat
            label="Total Partners"
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
            label="Rejected"
            value={stats.rejected}
            icon={<XCircle size={18} />}
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

        <section className="mt-5 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search partner, email or phone..."
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
              {(
                [
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                  ["rejected", "Rejected"],
                  ["frozen", "Frozen"],
                  ["deactivated", "Deactivated"],
                ] as [AgentFilter, string][]
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
              Registered Partners
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Showing {filteredAgents.length} of {agents.length} partners
            </p>
          </div>

          {filteredAgents.length === 0 ? (
            <EmptyState
              icon={<Truck size={26} />}
              title="No delivery partners found"
              text="Change the selected filter or search term."
            />
          ) : (
            <div className="grid gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent._id}
                  agent={agent}
                  busy={busyId === agent._id}
                  onView={() => setSelectedAgent(agent)}
                  onApprove={() =>
                    performAction(agent, "approve")
                  }
                  onReject={() => {
                    setRejectingAgent(agent);
                    setRejectionReason("");
                  }}
                  onFreeze={() =>
                    performAction(
                      agent,
                      agent.isFrozen ? "unfreeze" : "freeze"
                    )
                  }
                  onDeactivate={() =>
                    performAction(agent, "deactivate")
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedAgent && (
        <AgentDrawer
          agent={selectedAgent}
          busy={busyId === selectedAgent._id}
          onClose={() => setSelectedAgent(null)}
          onApprove={() =>
            performAction(selectedAgent, "approve")
          }
          onReject={() => {
            setRejectingAgent(selectedAgent);
            setRejectionReason("");
          }}
          onFreeze={() =>
            performAction(
              selectedAgent,
              selectedAgent.isFrozen
                ? "unfreeze"
                : "freeze"
            )
          }
          onDeactivate={() =>
            performAction(selectedAgent, "deactivate")
          }
        />
      )}

      {rejectingAgent && (
        <ReasonDialog
          title="Reject Delivery Partner"
          description={`Add a rejection reason for ${rejectingAgent.name}.`}
          value={rejectionReason}
          loading={busyId === rejectingAgent._id}
          onChange={setRejectionReason}
          onClose={() => {
            if (busyId) return;
            setRejectingAgent(null);
            setRejectionReason("");
          }}
          onConfirm={rejectAgent}
        />
      )}
    </main>
  );
}

function AgentCard({
  agent,
  busy,
  onView,
  onApprove,
  onReject,
  onFreeze,
  onDeactivate,
}: {
  agent: Agent;
  busy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  const approval = getApprovalStatus(agent);

  const initials =
    agent.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DP";

  return (
    <article className="border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-base font-black text-green-700">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-[-0.03em]">
                  {agent.name || "Unnamed Partner"}
                </h3>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize ${getApprovalClass(
                    approval
                  )}`}
                >
                  {approval}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getAccountClass(
                    agent
                  )}`}
                >
                  {getAccountStatus(agent)}
                </span>
              </div>

              <p className="mt-2 truncate text-sm font-bold text-slate-600">
                {agent.email}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {getPhone(agent)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <VerificationBadge
                verified={agent.emailVerified === true}
                label="Email"
              />

              <VerificationBadge
                verified={agent.isPhoneVerified === true}
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
                agent.isDeactivated
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
                agent.isDeactivated
              }
              tone="red"
            >
              Reject
            </ActionButton>

            <ActionButton
              onClick={onFreeze}
              disabled={busy || agent.isDeactivated}
              tone={agent.isFrozen ? "green" : "yellow"}
            >
              {agent.isFrozen ? "Unfreeze" : "Freeze"}
            </ActionButton>

            <ActionButton
              onClick={onDeactivate}
              disabled={busy || agent.isDeactivated}
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

function AgentDrawer({
  agent,
  busy,
  onClose,
  onApprove,
  onReject,
  onFreeze,
  onDeactivate,
}: {
  agent: Agent;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onFreeze: () => void;
  onDeactivate: () => void;
}) {
  const approval = getApprovalStatus(agent);

  return (
    <Drawer
      title="Delivery Partner"
      subtitle={agent.email}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CircleUserRound size={24} />
            </span>

            <div>
              <h3 className="text-lg font-black">
                {agent.name}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {getPhone(agent)}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <DetailBox
            label="Approval"
            value={approval}
          />

          <DetailBox
            label="Account"
            value={getAccountStatus(agent)}
          />

          <DetailBox
            label="Email Verified"
            value={agent.emailVerified ? "Yes" : "No"}
          />

          <DetailBox
            label="Phone Verified"
            value={agent.isPhoneVerified ? "Yes" : "No"}
          />

          <DetailBox
            label="Profile Active"
            value={
              agent.deliveryProfile?.isActive
                ? "Yes"
                : "No"
            }
          />

          <DetailBox
            label="Joined"
            value={formatDate(agent.createdAt)}
          />
        </div>

        {agent.deliveryProfile?.rejectionReason && (
          <section className="border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-600">
              Rejection Reason
            </p>

            <p className="mt-2 text-sm font-bold leading-6 text-red-800">
              {agent.deliveryProfile.rejectionReason}
            </p>
          </section>
        )}

        <section className="border border-slate-200 p-4">
          <p className="text-sm font-black">
            Account Controls
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionButton
              onClick={onApprove}
              disabled={
                busy ||
                approval === "approved" ||
                agent.isDeactivated
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
                agent.isDeactivated
              }
              tone="red"
            >
              Reject
            </ActionButton>

            <ActionButton
              onClick={onFreeze}
              disabled={busy || agent.isDeactivated}
              tone={agent.isFrozen ? "green" : "yellow"}
            >
              {agent.isFrozen ? "Unfreeze" : "Freeze"}
            </ActionButton>

            <ActionButton
              onClick={onDeactivate}
              disabled={busy || agent.isDeactivated}
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

/* Shared components */

function PageHeader({
  eyebrow,
  title,
  description,
  onRefresh,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onRefresh: () => void;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
              {eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              {title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

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
      className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-black ${
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
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${classes}`}
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

      <p className="mt-1 truncate text-sm font-black capitalize text-slate-900">
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
        aria-label="Close details"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
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
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
    <div className="border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        {icon}
      </span>

      <h3 className="mt-4 text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        {text}
      </p>
    </div>
  );
}