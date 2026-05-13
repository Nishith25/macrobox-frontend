import { useEffect, useState } from "react";
import api from "../api/api";

type Agent = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
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
        Approve or reject delivery partner registrations.
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
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
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
                    <td className="p-4">
                      {agent.emailVerified ? "Yes" : "No"}
                    </td>
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => approveAgent(agent._id)}
                          disabled={status === "approved"}
                          className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => rejectAgent(agent._id)}
                          disabled={status === "rejected"}
                          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          Reject
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