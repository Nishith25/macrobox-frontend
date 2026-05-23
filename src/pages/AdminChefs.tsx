import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/api";

export default function AdminChefs() {
  const [chefs, setChefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChefs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/chefs");
      setChefs(res.data.chefs || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chefs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChefs();
  }, []);

  const action = async (chefId: string, type: string) => {
    try {
      if (type === "reject") {
        const reason = prompt("Enter rejection reason") || "Rejected by admin.";
        await api.patch(`/admin/chefs/${chefId}/reject`, { reason });
      } else {
        await api.patch(`/admin/chefs/${chefId}/${type}`);
      }

      toast.success(`Chef ${type} successful.`);
      fetchChefs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Action failed.");
    }
  };

  if (loading) {
    return <div className="p-8 font-bold">Loading chefs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Chef Management
        </h1>
        <p className="mt-2 text-gray-600">
          Approve, reject, freeze, or deactivate chef registrations.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email Verified</th>
                <th className="p-4">Approval</th>
                <th className="p-4">Account</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {chefs.map((chef) => {
                const approval = chef.chefProfile?.approvalStatus || "pending";

                return (
                  <tr key={chef._id} className="border-t">
                    <td className="p-4 font-bold">{chef.name}</td>
                    <td className="p-4">{chef.email}</td>
                    <td className="p-4">{chef.phone}</td>
                    <td className="p-4">{chef.emailVerified ? "Yes" : "No"}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                        {approval}
                      </span>
                    </td>
                    <td className="p-4">
                      {chef.isDeactivated
                        ? "Deactivated"
                        : chef.isFrozen
                        ? "Frozen"
                        : chef.chefProfile?.isActive
                        ? "Active"
                        : "Inactive"}
                    </td>
                    <td className="flex flex-wrap gap-2 p-4">
                      <button
                        onClick={() => action(chef._id, "approve")}
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => action(chef._id, "reject")}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        Reject
                      </button>

                      {!chef.isFrozen ? (
                        <button
                          onClick={() => action(chef._id, "freeze")}
                          className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-white"
                        >
                          Freeze
                        </button>
                      ) : (
                        <button
                          onClick={() => action(chef._id, "unfreeze")}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                        >
                          Unfreeze
                        </button>
                      )}

                      <button
                        onClick={() => action(chef._id, "deactivate")}
                        className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-bold text-white"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                );
              })}

              {chefs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No chef registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}