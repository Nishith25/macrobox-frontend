const todayPlan = {
  title: "Muscle Gain Day Pack",
  protein: 120,
  calories: 2300,
  meals: ["High-protein oats", "Grilled chicken bowl", "Greek yogurt snack", "Paneer + rice dinner"],
};

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

      {/* Today's plan card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h2 className="text-2xl font-semibold mb-2">Today&apos;s Plan</h2>
        <p className="text-gray-600 mb-2">{todayPlan.title}</p>
        <p className="text-gray-800 mb-4">
          <b>{todayPlan.protein}g</b> protein • <b>{todayPlan.calories}</b> kcal
        </p>

        <div className="space-y-2">
          {todayPlan.meals.map((m) => (
            <label key={m} className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="w-4 h-4" />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Weekly overview */}
      <div>
        <h2 className="text-xl font-semibold mb-3">This Week</h2>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
            <div
              key={d}
              className={`rounded-xl p-2 border ${
                i === 1 ? "bg-green-100 border-green-400" : "bg-white"
              }`}
            >
              <div className="font-semibold">{d}</div>
              <div className="text-xs text-gray-500">Protein: 110g</div>
              <div className="text-xs text-gray-500">On plan ✅</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
