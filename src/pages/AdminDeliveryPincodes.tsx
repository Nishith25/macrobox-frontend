// frontend/src/pages/AdminDeliveryPincodes.tsx (FRONTEND)

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/api";
import {
  MapPin,
  Plus,
  Trash2,
  Power,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";

type DeliveryPincode = {
  _id: string;
  pincode: string;
  areaName: string;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminDeliveryPincodes() {
  const [pincodes, setPincodes] = useState<DeliveryPincode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pincode: "",
    areaName: "",
  });

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    pincode: "",
    areaName: "",
  });

  const fetchPincodes = async () => {
    try {
      setLoading(true);

      const res = await api.get("/admin/delivery-pincodes");
      setPincodes(res.data?.pincodes || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to fetch delivery pincodes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPincodes();
  }, []);

  const addPincode = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPincode = form.pincode.replace(/\D/g, "").trim();

    if (cleanPincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    try {
      setSaving(true);

      const res = await api.post("/admin/delivery-pincodes", {
        pincode: cleanPincode,
        areaName: form.areaName.trim(),
      });

      toast.success(res.data?.message || "Pincode added successfully.");

      setForm({
        pincode: "",
        areaName: "",
      });

      fetchPincodes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add pincode.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: DeliveryPincode) => {
    setEditingId(item._id);
    setEditForm({
      pincode: item.pincode,
      areaName: item.areaName || "",
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditForm({
      pincode: "",
      areaName: "",
    });
  };

  const saveEdit = async (id: string) => {
    const cleanPincode = editForm.pincode.replace(/\D/g, "").trim();

    if (cleanPincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    try {
      setSaving(true);

      const res = await api.patch(`/admin/delivery-pincodes/${id}`, {
        pincode: cleanPincode,
        areaName: editForm.areaName.trim(),
      });

      toast.success(res.data?.message || "Pincode updated successfully.");
      cancelEdit();
      fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update pincode."
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePincode = async (id: string) => {
    try {
      const res = await api.patch(`/admin/delivery-pincodes/${id}/toggle`);

      toast.success(res.data?.message || "Pincode updated.");
      fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update pincode."
      );
    }
  };

  const deletePincode = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this pincode?");

    if (!ok) return;

    try {
      const res = await api.delete(`/admin/delivery-pincodes/${id}`);

      toast.success(res.data?.message || "Pincode deleted.");
      fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to delete pincode."
      );
    }
  };

  return (
    <div className="min-h-screen bg-green-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-green-100 p-3 text-green-700">
              <MapPin size={26} />
            </div>

            <div>
              <p className="mb-2 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                Admin Delivery Settings
              </p>

              <h1 className="text-3xl font-extrabold text-gray-900">
                Delivery Pincodes
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Add, edit, disable or delete serviceable delivery areas. Checkout
                will allow orders only for active pincodes.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={addPincode}
          className="mb-6 grid gap-3 rounded-3xl border bg-white p-5 shadow-sm md:grid-cols-[180px_1fr_160px]"
        >
          <input
            value={form.pincode}
            onChange={(e) =>
              setForm({
                ...form,
                pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
              })
            }
            placeholder="Pincode"
            className="h-12 rounded-xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />

          <input
            value={form.areaName}
            onChange={(e) =>
              setForm({
                ...form,
                areaName: e.target.value,
              })
            }
            placeholder="Area name e.g. Pragathi Nagar"
            className="h-12 rounded-xl border px-4 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Add
          </button>
        </form>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Serviceable Pincodes
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="mr-2 animate-spin" />
              Loading pincodes...
            </div>
          ) : pincodes.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
              No delivery pincodes added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                    <th className="px-4 py-3">Pincode</th>
                    <th className="px-4 py-3">Area Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pincodes.map((item) => {
                    const isEditing = editingId === item._id;

                    return (
                      <tr key={item._id} className="border-b text-sm">
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {isEditing ? (
                            <input
                              value={editForm.pincode}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  pincode: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6),
                                })
                              }
                              className="h-10 w-32 rounded-lg border px-3 outline-none focus:border-green-500"
                            />
                          ) : (
                            item.pincode
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {isEditing ? (
                            <input
                              value={editForm.areaName}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  areaName: e.target.value,
                                })
                              }
                              className="h-10 w-full rounded-lg border px-3 outline-none focus:border-green-500"
                            />
                          ) : (
                            item.areaName || "-"
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-500">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(item._id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                                >
                                  <Save size={14} />
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => togglePincode(item._id)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                                    item.isActive
                                      ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                      : "bg-green-50 text-green-700 hover:bg-green-100"
                                  }`}
                                >
                                  <Power size={14} />
                                  {item.isActive ? "Disable" : "Enable"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deletePincode(item._id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}