import { useEffect, useState } from "react";
import api from "../api/api";

type User = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Fetch all users (ADMIN)
  const fetchUsers = async () => {
    try {
      setError(null);
      const res = await api.get<User[]>("/api/admin/users");
      setUsers(res.data);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔹 Update user role
  const handleRoleChange = async (
    id: string,
    role: "user" | "admin"
  ) => {
    try {
      const res = await api.patch<User>(
        `/api/admin/users/${id}/role`,
        { role }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === id ? { ...u, role: res.data.role } : u
        )
      );
    } catch (err) {
      console.error("Update role error:", err);
      alert("Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                Name
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                Email
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                Role
              </th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No users found
                </td>
              </tr>
            )}

            {users.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="px-4 py-3 text-sm">{u.name}</td>
                <td className="px-4 py-3 text-sm">{u.email}</td>
                <td className="px-4 py-3 text-sm">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleRoleChange(
                        u._id,
                        e.target.value as "user" | "admin"
                      )
                    }
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
