export default function Hero() {
  return (
    <section className="w-full bg-black text-white py-20 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">

        <div className="flex-1">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Fuel Your Day with <span className="text-green-400">MacroBox</span>
          </h1>

          <p className="text-gray-300 mt-4 text-lg">
            Full-day high-protein meals crafted by nutritionists —
            designed for muscle gain, fat loss, and clean eating.
          </p>

          <div className="mt-8 flex gap-4">
            <button className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold">
              Plan My Day
            </button>

            <button className="border border-gray-300 hover:border-white px-6 py-3 rounded-lg font-semibold">
              Browse Meals
            </button>
          </div>
        </div>

        <div className="flex-1">
          <img
            src="/hero-meal.png"
            alt="Hero Meal"
            className="rounded-xl shadow-xl"
          />
        </div>

      </div>
    </section>
  );
}
