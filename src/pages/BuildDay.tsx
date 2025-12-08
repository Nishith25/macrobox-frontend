import { useState } from "react";

type Dish = {
  id: number;
  name: string;
  protein: number;
  calories: number;
};

const breakfastOptions: Dish[] = [
  { id: 1, name: "Protein oats", protein: 25, calories: 380 },
  { id: 2, name: "Scrambled eggs + toast", protein: 20, calories: 420 },
];

const lunchOptions: Dish[] = [
  { id: 3, name: "Grilled chicken bowl", protein: 35, calories: 550 },
  { id: 4, name: "Paneer rice bowl", protein: 30, calories: 600 },
];

const snackOptions: Dish[] = [
  { id: 5, name: "Greek yogurt + nuts", protein: 18, calories: 250 },
  { id: 6, name: "Protein bar", protein: 15, calories: 220 },
];

const dinnerOptions: Dish[] = [
  { id: 7, name: "Chicken + veggies", protein: 32, calories: 520 },
  { id: 8, name: "Paneer + veggies", protein: 28, calories: 500 },
];

export default function BuildDay() {
  const [breakfast, setBreakfast] = useState<Dish | null>(null);
  const [lunch, setLunch] = useState<Dish | null>(null);
  const [snack, setSnack] = useState<Dish | null>(null);
  const [dinner, setDinner] = useState<Dish | null>(null);

  const selected = [breakfast, lunch, snack, dinner].filter(Boolean) as Dish[];
  const totalProtein = selected.reduce((sum, d) => sum + d.protein, 0);
  const totalCalories = selected.reduce((sum, d) => sum + d.calories, 0);

  const selector = (
    label: string,
    options: Dish[],
    value: Dish | null,
    set: (d: Dish | null) => void
  ) => (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-semibold mb-2">{label}</h3>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={value?.id ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          const chosen = options.find((o) => o.id === id) || null;
          set(chosen);
        }}
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} • {o.protein}g P • {o.calories} kcal
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-6">Build Your Own Day</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {selector("Breakfast", breakfastOptions, breakfast, setBreakfast)}
        {selector("Lunch", lunchOptions, lunch, setLunch)}
        {selector("Snack", snackOptions, snack, setSnack)}
        {selector("Dinner", dinnerOptions, dinner, setDinner)}
      </div>

      <div className="bg-black text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Your Day&apos;s Macros</h2>
          <p className="text-gray-300">
            Total Protein: <b>{totalProtein}g</b> • Calories:{" "}
            <b>{totalCalories}</b>
          </p>
        </div>
        <button className="mt-4 md:mt-0 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold">
          Save this Day Plan
        </button>
      </div>
    </div>
  );
}
