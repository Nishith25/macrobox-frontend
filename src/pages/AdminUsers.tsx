// frontend/src/pages/AdminUsers.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isFrozen?: boolean;
  isDeactivated?: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ NEW: search input
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get<UserRow[]>("/admin/users");
      setUsers(res.data);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      setMsg(err?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const patchUser = async (
    id: string,
    action: "freeze" | "unfreeze" | "deactivate" | "activate"
  ) => {
    setMsg(null);
    try {
      await api.patch(`/admin/users/${id}/${action}`);
      await fetchUsers();
    } catch (err: any) {
      console.error("User action error:", err);
      setMsg(err?.response?.data?.message || "Action failed");
    }
  };

  const statusText = (u: UserRow) => {
    if (u.isDeactivated) return "Deactivated";
    if (u.isFrozen) return "Frozen";
    return "Active";
  };

  const statusClass = (u: UserRow) => {
    if (u.isDeactivated) return "bg-gray-200 text-gray-700";
    if (u.isFrozen) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  // ✅ NEW: filter by name/email
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search by name or email to quickly find users.
          </p>
        </div>

        <div className="w-full sm:w-[360px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search
          </label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email (e.g. user@gmail.com)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {search.trim().length > 0 && (
              <button
                onClick={() => setSearch("")}
                className="px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
                title="Clear"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Showing {filteredUsers.length} / {users.length}
          </p>
        </div>
      </div>

      {msg && <p className="mb-4 text-sm text-red-600">{msg}</p>}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 px-5 py-3 text-sm font-semibold text-gray-600 border-b bg-gray-50">
          <div className="col-span-3">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-gray-500">
            No users found{search.trim() ? ` for "${search.trim()}"` : ""}.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u._id}
              className="grid grid-cols-12 px-5 py-4 border-b items-center"
            >
              <div className="col-span-3 font-medium">{u.name}</div>
              <div className="col-span-4 text-gray-700">{u.email}</div>

              <div className="col-span-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full ${statusClass(u)}`}
                >
                  {statusText(u)}
                </span>
                {u.role === "admin" && (
                  <span className="ml-2 text-xs px-2 py-1 rounded bg-red-100 text-red-600">
                    ADMIN
                  </span>
                )}
              </div>

              <div className="col-span-3 flex justify-end gap-2">
                {/* Freeze / Unfreeze (hide if deactivated) */}
                {!u.isDeactivated && (
                  <button
                    onClick={() =>
                      patchUser(u._id, u.isFrozen ? "unfreeze" : "freeze")
                    }
                    className={`px-3 py-1.5 rounded text-sm border transition ${
                      u.isFrozen
                        ? "bg-white hover:bg-gray-50"
                        : "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                    }`}
                  >
                    {u.isFrozen ? "Unfreeze" : "Freeze"}
                  </button>
                )}

                {/* Deactivate / Activate */}
                <button
                  onClick={() =>
                    patchUser(
                      u._id,
                      u.isDeactivated ? "activate" : "deactivate"
                    )
                  }
                  className={`px-3 py-1.5 rounded text-sm border transition ${
                    u.isDeactivated
                      ? "bg-white hover:bg-gray-50"
                      : "bg-red-500 text-white hover:bg-red-600 border-red-500"
                  }`}
                >
                  {u.isDeactivated ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Note: Frozen users cannot login (shows a support message). Deactivated
        users can be reactivated only by signing up again with the same email.
      </p>
    </div>
  );
}
