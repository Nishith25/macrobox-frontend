// frontend/src/pages/AdminDeliveryPincodes.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  CirclePlus,
  Loader2,
  MapPin,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type DeliveryPincode = {
  _id: string;
  pincode: string;
  areaName: string;
  isActive: boolean;
  createdAt?: string;
};

type PincodeFilter = "all" | "active" | "disabled";

type PincodeForm = {
  pincode: string;
  areaName: string;
};

const emptyForm = (): PincodeForm => ({
  pincode: "",
  areaName: "",
});

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

export default function AdminDeliveryPincodes() {
  const [pincodes, setPincodes] = useState<DeliveryPincode[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<PincodeFilter>("all");

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] =
    useState<DeliveryPincode | null>(null);

  const [form, setForm] =
    useState<PincodeForm>(emptyForm());

  const fetchPincodes = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/admin/delivery-pincodes"
      );

      setPincodes(
        Array.isArray(response.data?.pincodes)
          ? response.data.pincodes
          : Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to fetch delivery pincodes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPincodes();
  }, []);

  const stats = useMemo(() => {
    const active = pincodes.filter(
      (item) => item.isActive
    ).length;

    return {
      total: pincodes.length,
      active,
      disabled: pincodes.length - active,
    };
  }, [pincodes]);

  const filteredPincodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pincodes
      .filter((item) => {
        const matchesSearch =
          !query ||
          `${item.pincode} ${item.areaName}`
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) return false;

        if (filter === "active") return item.isActive;
        if (filter === "disabled") return !item.isActive;

        return true;
      })
      .sort((a, b) => a.pincode.localeCompare(b.pincode));
  }, [pincodes, search, filter]);

  const openCreateDrawer = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setShowDrawer(true);
  };

  const openEditDrawer = (item: DeliveryPincode) => {
    setEditingItem(item);

    setForm({
      pincode: item.pincode,
      areaName: item.areaName || "",
    });

    setShowDrawer(true);
  };

  const closeDrawer = () => {
    if (saving) return;

    setShowDrawer(false);
    setEditingItem(null);
    setForm(emptyForm());
  };

  const validateForm = () => {
    const cleanPincode = form.pincode
      .replace(/\D/g, "")
      .trim();

    if (cleanPincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode.");
      return null;
    }

    if (!form.areaName.trim()) {
      toast.error("Area name is required.");
      return null;
    }

    return {
      pincode: cleanPincode,
      areaName: form.areaName.trim(),
    };
  };

  const savePincode = async (event?: FormEvent) => {
    event?.preventDefault();

    const payload = validateForm();

    if (!payload) return;

    try {
      setSaving(true);

      if (editingItem) {
        const response = await api.patch(
          `/admin/delivery-pincodes/${editingItem._id}`,
          payload
        );

        toast.success(
          response.data?.message ||
            "Pincode updated successfully."
        );
      } else {
        const response = await api.post(
          "/admin/delivery-pincodes",
          payload
        );

        toast.success(
          response.data?.message ||
            "Pincode added successfully."
        );
      }

      closeDrawer();
      await fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Failed to ${
            editingItem ? "update" : "add"
          } pincode.`
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePincode = async (item: DeliveryPincode) => {
    try {
      setBusyId(item._id);

      const response = await api.patch(
        `/admin/delivery-pincodes/${item._id}/toggle`
      );

      toast.success(
        response.data?.message ||
          (item.isActive
            ? "Pincode disabled."
            : "Pincode enabled.")
      );

      await fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update pincode."
      );
    } finally {
      setBusyId(null);
    }
  };

  const deletePincode = async (item: DeliveryPincode) => {
    if (
      !window.confirm(
        `Delete ${item.pincode} - ${item.areaName}?`
      )
    ) {
      return;
    }

    try {
      setBusyId(item._id);

      const response = await api.delete(
        `/admin/delivery-pincodes/${item._id}`
      );

      toast.success(
        response.data?.message || "Pincode deleted."
      );

      await fetchPincodes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to delete pincode."
      );
    } finally {
      setBusyId(null);
    }
  };

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
                Delivery Areas
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Configure serviceable pincodes used during customer checkout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={fetchPincodes}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700"
              >
                <CirclePlus size={17} />
                Add Pincode
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DashboardStat
              label="Total Areas"
              value={stats.total}
              icon={<MapPin size={18} />}
            />

            <DashboardStat
              label="Active"
              value={stats.active}
              icon={<Check size={18} />}
              accent
            />

            <DashboardStat
              label="Disabled"
              value={stats.disabled}
              icon={<Power size={18} />}
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
                placeholder="Search pincode or area name..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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

            <div className="flex gap-2 overflow-x-auto">
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
                active={filter === "disabled"}
                onClick={() => setFilter("disabled")}
              >
                Disabled
              </FilterButton>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              Serviceable Pincodes
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {filteredPincodes.length} area
              {filteredPincodes.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 border border-slate-200 bg-white p-10 text-sm font-black text-slate-600">
              <Loader2
                className="animate-spin text-green-600"
                size={19}
              />
              Loading pincodes...
            </div>
          ) : filteredPincodes.length === 0 ? (
            <EmptyPincodes />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPincodes.map((item) => (
                <PincodeCard
                  key={item._id}
                  item={item}
                  busy={busyId === item._id}
                  onEdit={() => openEditDrawer(item)}
                  onToggle={() => togglePincode(item)}
                  onDelete={() => deletePincode(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showDrawer && (
        <PincodeDrawer
          editing={Boolean(editingItem)}
          form={form}
          saving={saving}
          onChange={setForm}
          onSave={savePincode}
          onClose={closeDrawer}
        />
      )}
    </main>
  );
}

function PincodeCard({
  item,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: DeliveryPincode;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            item.isActive
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <MapPin size={22} />
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black ${
            item.isActive
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {item.isActive ? "Active" : "Disabled"}
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-400">
        Pincode
      </p>

      <h3 className="mt-1 text-3xl font-black tracking-[-0.05em]">
        {item.pincode}
      </h3>

      <p className="mt-2 text-sm font-black text-slate-700">
        {item.areaName || "Unnamed area"}
      </p>

      <div className="mt-4 bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          Added On
        </p>

        <p className="mt-1 text-xs font-black">
          {formatDate(item.createdAt)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <Pencil size={14} />
          Edit
        </button>

        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-full border text-xs font-black disabled:opacity-40 ${
            item.isActive
              ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
              : "border-green-200 text-green-700 hover:bg-green-50"
          }`}
        >
          <Power size={14} />
          {item.isActive ? "Disable" : "Enable"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-red-200 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </article>
  );
}

function PincodeDrawer({
  editing,
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  editing: boolean;
  form: PincodeForm;
  saving: boolean;
  onChange: (form: PincodeForm) => void;
  onSave: (event?: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-full sm:w-[480px] sm:rounded-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em]">
              {editing ? "Edit Pincode" : "Add Pincode"}
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {editing
                ? "Update the serviceable delivery area."
                : "Create a new serviceable delivery area."}
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

        <form
          onSubmit={onSave}
          className="flex flex-1 flex-col overflow-y-auto p-5"
        >
          <div className="space-y-5">
            <Field label="Six-digit pincode" required>
              <input
                value={form.pincode}
                onChange={(event) =>
                  onChange({
                    ...form,
                    pincode: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  })
                }
                inputMode="numeric"
                placeholder="500090"
                className="admin-input"
              />
            </Field>

            <Field label="Area name" required>
              <input
                value={form.areaName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    areaName: event.target.value,
                  })
                }
                placeholder="Example: Pragathi Nagar"
                className="admin-input"
              />
            </Field>

            <div className="border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-green-700">
                Checkout Preview
              </p>

              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-600">
                  <MapPin size={18} />
                </span>

                <div>
                  <p className="font-black">
                    {form.pincode || "Pincode"}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {form.areaName || "Area name"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 rounded-full border border-slate-200 text-sm font-black text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-green-600 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Check size={17} />
              )}

              {saving
                ? "Saving..."
                : editing
                ? "Save Changes"
                : "Add Pincode"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

/* Shared components */

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

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function EmptyPincodes() {
  return (
    <div className="border border-slate-200 bg-white p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
        <MapPin size={25} />
      </span>

      <h3 className="mt-4 text-xl font-black">
        No delivery areas found
      </h3>

      <p className="mt-2 text-sm font-bold text-slate-500">
        Create a pincode or change the selected filter.
      </p>
    </div>
  );
}