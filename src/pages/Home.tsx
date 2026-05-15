// frontend/src/pages/Home.tsx (FRONTEND)
import { Link } from "react-router-dom";
import Container from "../components/Container";
import SectionTitle from "../components/SectionTitle";

/* ================= TYPES ================= */

export type Meal = {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  price: number;
  foodType: "veg" | "nonveg";
  isFeatured?: boolean;
};

/* ================= PAGE ================= */

export default function Home() {
  return (
    <>
      <div className="bg-gradient-to-b from-green-50 to-white px-4 py-20 text-center">
        <h1 className="mx-auto mb-4 max-w-4xl text-5xl font-bold text-gray-900">
          Fuel Your Day with MacroBox
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Goal-based meals for fat loss, muscle gain, weight gain and everyday
          clean eating — with complete calories, protein, carbs and fat tracking.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/meals"
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Explore Meals
          </Link>

          <Link
            to="/dashboard"
            className="rounded-xl border border-green-600 px-6 py-3 font-semibold text-green-700 hover:bg-green-50"
          >
            Open MacroTrack
          </Link>

          <Link
            to="/plan-my-day"
            className="rounded-xl border px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Smart Day Planner
          </Link>
        </div>
      </div>

      <Container>
        <SectionTitle title="Why MacroBox?" />

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Goal-Based Meals"
            description="Choose meals based on fat loss, weight gain, muscle gain or maintenance goals."
          />

          <FeatureCard
            title="Complete Macro Tracking"
            description="Every meal includes calories, protein, carbs and fat for accurate tracking."
          />

          <FeatureCard
            title="Smart Day Planner"
            description="Build a full-day meal plan based on your daily macro targets."
          />
        </div>
      </Container>
    </>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}