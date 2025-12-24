import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

type Meal = {
  _id: string;
  name: string;
  protein: number;
  calories: number;
};

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState({
    name: "",
    protein: "",
    calories: "",
  });

  const fetchMeals = async () => {
    const res = await api.get("/admin/meals");
    setMeals(res.data);
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  // ADD
  const addMeal = async () => {
    if (!form.name || !form.protein || !form.calories) {
      toast.error("Fill all fields");
      return;
    }

    await api.post("/admin/meals", {
      name: form.name,
      protein: Number(form.protein),
      calories: Number(form.calories),
    });

    toast.success("Meal added");
    setForm({ name: "", protein: "", calories: "" });
    fetchMeals();
  };

  // DELETE
  const deleteMeal = async (id: string) => {
    await api.delete(`/admin/meals/${id}`);
    toast.success("Meal deleted");
    fetchMeals();
  };

  // EDIT (simple inline)
  const updateMeal = async (meal: Meal) => {
    await api.put(`/admin/meals/${meal._id}`, meal);
    toast.success("Meal updated");
    fetchMeals();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Admin – Manage Meals</h1>

      {/* ADD FORM */}
      <div className="flex gap-4 mb-6">
        <input
          placeholder="Meal name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          placeholder="Protein (g)"
          value={form.protein}
          onChange={(e) => setForm({ ...form, protein: e.target.value })}
          className="border p-2 rounded w-32"
        />
        <input
          placeholder="Calories"
          value={form.calories}
          onChange={(e) => setForm({ ...form, calories: e.target.value })}
          className="border p-2 rounded w-32"
        />
        <button
          onClick={addMeal}
          className="bg-green-600 text-white px-4 rounded"
        >
          Add
        </button>
      </div>

      {/* TABLE */}
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Protein</th>
            <th className="p-2">Calories</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal._id} className="border-t">
              <td className="p-2">{meal.name}</td>
              <td className="p-2">{meal.protein} g</td>
              <td className="p-2">{meal.calories}</td>
              <td className="p-2 flex gap-3">
                <button
                  onClick={() => updateMeal(meal)}
                  className="text-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMeal(meal._id)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
