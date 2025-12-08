import Container from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import MealCard from "../components/MealCard";
import meals from "../data/meals";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">
          Fuel Your Day with MacroBox
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          High-protein, clean meals built for muscle gain, fat loss & daily health.
        </p>
      </div>

      {/* FEATURED */}
      <Container>
        <SectionTitle title="Featured Meal Plans" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {meals.slice(0, 3).map((m) => (
            <MealCard key={m.id} meal={m} />
          ))}
        </div>
      </Container>
    </>
  );
}
