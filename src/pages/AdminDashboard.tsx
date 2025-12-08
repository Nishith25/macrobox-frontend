import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

type Meal = {
  _id?: string;
  title: string;
  description: string;
  protein: number;
  calories: number;
  image: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const { token, user } = useAuth();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [form, setForm] = useState<Meal>({
    title: "",
    description: "",
    protein: 0,
    calories: 0,
    image: "",
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch meals on mount
  useEffect(() => {
    fetchMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMeals() {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_BASE}/api/admin/meals`, authHeaders);
      setMeals(res.data.meals || res.data); // depending on backend shape
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load meals");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedMeal(null);
    setForm({
      title: "",
      description: "",
      protein: 0,
      calories: 0,
      image: "",
    });
  }

  function handleEditClick(meal: Meal) {
    setSelectedMeal(meal);
    setForm({
      _id: meal._id,
      title: meal.title,
      description: meal.description,
      protein: meal.protein,
      calories: meal.calories,
      image: meal.image,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(mealId?: string) {
    if (!mealId) return;
    const ok = window.confirm("Delete this meal plan?");
    if (!ok) return;

    try {
      setError(null);
      await axios.delete(`${API_BASE}/api/admin/meals/${mealId}`, authHeaders);
      setMeals((prev) => prev.filter((m) => m._id !== mealId));
      setSuccess("Meal deleted");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete meal");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Prepare payload
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        protein: Number(form.protein),
        calories: Number(form.calories),
        image: form.image.trim(),
      };

      if (!payload.title || !payload.description) {
        setError("Title and description are required.");
        setSaving(false);
        return;
      }

      if (selectedMeal && selectedMeal._id) {
        // UPDATE
        const res = await axios.put(
          `${API_BASE}/api/admin/meals/${selectedMeal._id}`,
          payload,
          authHeaders
        );
        const updated = res.data.meal || res.data;

        setMeals((prev) =>
          prev.map((m) => (m._id === updated._id ? updated : m))
        );
        setSuccess("Meal updated successfully");
      } else {
        // CREATE
        const res = await axios.post(
          `${API_BASE}/api/admin/meals`,
          payload,
          authHeaders
        );
        const created = res.data.meal || res.data;

        setMeals((prev) => [created, ...prev]);
        setSuccess("New meal created");
      }

      resetForm();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save meal");
    } finally {
      setSaving(false);
    }
  }

  // Derived stats
  const totalMeals = meals.length;
  const avgProtein =
    totalMeals > 0
      ? Math.round(
          meals.reduce((sum, m) => sum + Number(m.protein || 0), 0) / totalMeals
        )
      : 0;
  const avgCalories =
    totalMeals > 0
      ? Math.round(
          meals.reduce((sum, m) => sum + Number(m.calories || 0), 0) /
            totalMeals
        )
      : 0;

  const filteredMeals = meals.filter((meal) =>
    meal.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white/90 backdrop-blur">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-semibold">
              MB
            </div>
            <div>
              <p className="font-semibold text-slate-900">MacroBox Admin</p>
              <p className="text-xs text-slate-500">
                {user?.email || "admin@macrobox"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 text-sm text-slate-600 space-y-2">
          <div className="font-semibold text-xs uppercase tracking-wide text-slate-400 mb-2">
            Overview
          </div>
          <button className="w-full flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-left text-slate-900 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Meals
          </button>
          <button className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-100">
            Coming soon…
          </button>
        </nav>

        <div className="px-4 py-4 border-t text-xs text-slate-400">
          MacroBox · Admin v2
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b bg-white/80 backdrop-blur flex items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">
              Meal Management
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Create, edit & organize all meal plans.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-sm font-medium text-slate-900">
                  {user.name}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-200 flex items-center justify-center text-emerald-600 text-sm font-semibold">
                {user.name?.[0]?.toUpperCase() || "A"}
              </div>
            </div>
          )}
        </header>

        {/* Content area */}
        <div className="flex-1 px-4 md:px-8 py-6 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Top grid: form + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Form card */}
            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900">
                    {selectedMeal ? "Edit Meal Plan" : "Create Meal Plan"}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500">
                    {selectedMeal
                      ? "Update the selected meal and save changes."
                      : "Add a new meal to your catalog."}
                  </p>
                </div>
                {selectedMeal && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-900"
                    onClick={resetForm}
                  >
                    Reset
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Muscle Gain Day Pack"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={form.image}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, image: e.target.value }))
                      }
                      placeholder="/meal1.jpg or https://…"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="High-protein meals crafted for clean muscle gain…"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={form.protein}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          protein: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={form.calories}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          calories: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {selectedMeal && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving…"
                      : selectedMeal
                      ? "Save Changes"
                      : "Create Meal"}
                  </button>
                </div>
              </form>
            </section>

            {/* Stats card */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Catalog Snapshot
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total meals</span>
                  <span className="font-semibold text-slate-900">
                    {totalMeals}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Avg protein</span>
                  <span className="font-semibold text-emerald-600">
                    {avgProtein}g
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Avg calories</span>
                  <span className="font-semibold text-sky-600">
                    {avgCalories}
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
                Pro tip: keep protein above{" "}
                <span className="font-semibold text-emerald-600">90g</span> for
                gain plans and calories under{" "}
                <span className="font-semibold text-sky-600">1800</span> for
                fat-loss packs.
              </div>
            </section>
          </div>

          {/* List header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                All Meals
              </h2>
              <p className="text-xs text-slate-500">
                Search & manage all plans in the system.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search by title…"
                className="w-full md:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 text-left">Meal</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right">Protein</th>
                    <th className="px-4 py-3 text-right">Calories</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Loading meals…
                      </td>
                    </tr>
                  )}

                  {!loading && filteredMeals.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-400 text-sm"
                      >
                        No meals found. Create your first one above.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filteredMeals.map((meal) => (
                      <tr
                        key={meal._id}
                        className="border-t border-slate-100 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {meal.image && (
                              <img
                                src={meal.image}
                                alt={meal.title}
                                className="h-9 w-9 rounded-lg object-cover border border-slate-200 hidden sm:block"
                              />
                            )}
                            <div>
                              <div className="font-medium text-slate-900">
                                {meal.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {meal._id?.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-md hidden md:table-cell">
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {meal.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {meal.protein}g
                        </td>
                        <td className="px-4 py-3 text-right text-sky-600 font-medium">
                          {meal.calories}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(meal)}
                              className="text-xs rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(meal._id)}
                              className="text-xs rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
