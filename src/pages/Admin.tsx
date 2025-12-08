import { useState } from "react";
import baseMeals from "../data/meals";

type Meal = {
  id: number;
  title: string;
  description: string;
  protein: number;
  calories: number;
  image: string;
};

export default function Admin() {
  const [meals, setMeals] = useState<Meal[]>(baseMeals as Meal[]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    protein: "",
    calories: "",
    image: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeal: Meal = {
      id: meals.length + 1,
      title: form.title,
      description: form.description,
      protein: Number(form.protein),
      calories: Number(form.calories),
      image: form.image || "/meal1.jpg",
    };
    setMeals([...meals, newMeal]);
    setForm({ title: "", description: "", protein: "", calories: "", image: "" });
  };

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <form onSubmit={addMeal} className="bg-white rounded-2xl shadow p-6 mb-10 grid md:grid-cols-2 gap-4">
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Meal title"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Short description"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          name="protein"
          value={form.protein}
          onChange={handleChange}
          placeholder="Protein (g)"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          name="calories"
          value={form.calories}
          onChange={handleChange}
          placeholder="Calories"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          name="image"
          value={form.image}
          onChange={handleChange}
          placeholder="Image URL (optional)"
          className="border rounded-lg px-3 py-2 md:col-span-2"
        />

        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg md:col-span-2"
        >
          Add Meal
        </button>
      </form>

      <table className="w-full text-sm bg-white rounded-2xl shadow overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Protein</th>
            <th className="p-3 text-left">Calories</th>
          </tr>
        </thead>
        <tbody>
          {meals.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-3">{m.title}</td>
              <td className="p-3">{m.protein}g</td>
              <td className="p-3">{m.calories}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
