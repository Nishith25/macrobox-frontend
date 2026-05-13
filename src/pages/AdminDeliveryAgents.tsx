import { useEffect, useState } from "react";
import api from "../api/api";

type Agent = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFrozen?: boolean;
  isDeactivated?: boolean;
  deliveryProfile?: {
    phone?: string;
    isActive?: boolean;
    approvalStatus?: "pending" | "approved" | "rejected";
    rejectionReason?: string;
  };
};

export default function AdminDeliveryAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/delivery-agents");
      setAgents(res.data || []);
    } catch {
      alert("Failed to load delivery agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const approveAgent = async (id: string) => {
    if (!confirm("Approve this delivery agent?")) return;
    await api.patch(`/admin/delivery-agents/${id}/approve`);
    fetchAgents();
  };

  const rejectAgent = async (id: string) => {
    const reason = prompt("Reason for rejection?");
    await api.patch(`/admin/delivery-agents/${id}/reject`, {
      reason: reason || "Rejected by admin",
    });
    fetchAgents();
  };

  const freezeAgent = async (id: string) => {
    if (!confirm("Freeze this delivery agent?")) return;
    await api.patch(`/admin/delivery-agents/${id}/freeze`);
    fetchAgents();
  };

  const unfreezeAgent = async (id: string) => {
    if (!confirm("Unfreeze this delivery agent?")) return;
    await api.patch(`/admin/delivery-agents/${id}/unfreeze`);
    fetchAgents();
  };

  const deactivateAgent = async (id: string) => {
    if (!confirm("Deactivate this delivery agent?")) return;
    await api.patch(`/admin/delivery-agents/${id}/deactivate`);
    fetchAgents();
  };

  const badgeClass = (status?: string) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  if (loading) {
    return <div className="p-6">Loading delivery agents...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Delivery Agent Management</h1>
      <p className="text-gray-600 mb-8">
        Approve, reject, freeze, or deactivate delivery partner registrations.
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Email Verified</th>
              <th className="p-4">Phone Verified</th>
              <th className="p-4">Approval</th>
              <th className="p-4">Account</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No delivery agents found.
                </td>
              </tr>
            ) : (
              agents.map((agent) => {
                const status =
                  agent.deliveryProfile?.approvalStatus || "pending";

                return (
                  <tr key={agent._id} className="border-t">
                    <td className="p-4 font-semibold">{agent.name}</td>

                    <td className="p-4">{agent.email}</td>

                    <td className="p-4">
                      {agent.deliveryProfile?.phone || agent.phone || "N/A"}
                    </td>

                    <td className="p-4">{agent.emailVerified ? "Yes" : "No"}</td>

                    <td className="p-4">
                      {agent.isPhoneVerified ? "Yes" : "No"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="p-4">
                      {agent.isDeactivated ? (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                          Deactivated
                        </span>
                      ) : agent.isFrozen ? (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          Frozen
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => approveAgent(agent._id)}
                          disabled={status === "approved" || agent.isDeactivated}
                          className="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => rejectAgent(agent._id)}
                          disabled={status === "rejected" || agent.isDeactivated}
                          className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          Reject
                        </button>

                        {agent.isFrozen ? (
                          <button
                            onClick={() => unfreezeAgent(agent._id)}
                            disabled={agent.isDeactivated}
                            className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                          >
                            Unfreeze
                          </button>
                        ) : (
                          <button
                            onClick={() => freezeAgent(agent._id)}
                            disabled={agent.isDeactivated}
                            className="rounded-lg bg-yellow-500 px-3 py-2 font-semibold text-white disabled:opacity-50"
                          >
                            Freeze
                          </button>
                        )}

                        <button
                          onClick={() => deactivateAgent(agent._id)}
                          disabled={agent.isDeactivated}
                          className="rounded-lg bg-gray-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}