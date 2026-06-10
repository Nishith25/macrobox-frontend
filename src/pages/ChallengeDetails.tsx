// frontend/src/pages/ChallengeDetails.tsx (FRONTEND)

import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Gift,
  ShoppingCart,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { getChallengeById } from "../data/challenges";
import { useCart } from "../context/CartContext";

export default function ChallengeDetails() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const challenge = getChallengeById(challengeId);

  if (!challenge) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-black text-slate-950">
            Challenge not found
          </h1>
          <button
            onClick={() => navigate("/challenges")}
            className="mt-5 rounded-[16px] bg-green-600 px-6 py-3 text-sm font-black text-white"
          >
            Back to Challenges
          </button>
        </div>
      </main>
    );
  }

  const totalPrice = challenge.meals.reduce((sum, meal) => sum + meal.price, 0);
  const avgCalories = Math.round(
    challenge.meals.reduce((sum, meal) => sum + meal.calories, 0) /
      challenge.meals.length
  );
  const avgProtein = Math.round(
    challenge.meals.reduce((sum, meal) => sum + meal.protein, 0) /
      challenge.meals.length
  );

  const addFullChallengeToCart = () => {
    challenge.meals.forEach((meal) => {
      addToCart({
        _id: `${challenge.id}-day-${meal.day}`,
        title: `${challenge.shortTitle} Day ${meal.day}: ${meal.title}`,
        price: meal.price,
        protein: meal.protein,
        calories: meal.calories,
        carbs: 0,
        fat: 0,
        imageUrl: "/placeholder-meal.png",
      });
    });

    toast.success(`${challenge.title} added to cart`);
    navigate("/cart");
  };

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <Link
          to="/challenges"
          className="mb-5 inline-flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Challenges
        </Link>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
                <Trophy size={15} />
                {challenge.badge}
              </p>

              <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
                {challenge.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                {challenge.description}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Duration"
                  value={`${challenge.duration} Days`}
                  icon={<CalendarDays size={18} />}
                />
                <Stat
                  label="Avg Calories"
                  value={`${avgCalories} kcal`}
                  icon={<Target size={18} />}
                />
                <Stat
                  label="Avg Protein"
                  value={`${avgProtein}g`}
                  icon={<Sparkles size={18} />}
                />
              </div>
            </div>

            <div className="rounded-[26px] border border-green-200 bg-green-50 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Challenge Benefits
              </h2>

              <div className="mt-4 space-y-3">
                {challenge.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-700" />
                    <p className="text-sm font-bold text-slate-700">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[22px] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Total Challenge Price
                </p>
                <p className="mt-1 text-4xl font-black tracking-[-0.07em] text-green-700">
                  ₹{totalPrice}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Includes all 7 challenge meals
                </p>
              </div>

              <button
                onClick={addFullChallengeToCart}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-green-600 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700"
              >
                <ShoppingCart size={18} />
                Add Full Challenge to Cart
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
              Meal Schedule
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Day 1 to Day 7 Plan
            </h2>
          </div>

          <div className="grid gap-4">
            {challenge.meals.map((meal) => (
              <article
                key={meal.day}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-green-600 text-xl font-black text-white">
                    D{meal.day}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      {meal.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      {meal.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip>🔥 {meal.calories} kcal</Chip>
                      <Chip>🥩 {meal.protein}g protein</Chip>
                      <Chip>₹{meal.price}</Chip>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addToCart({
                        _id: `${challenge.id}-day-${meal.day}`,
                        title: `${challenge.shortTitle} Day ${meal.day}: ${meal.title}`,
                        price: meal.price,
                        protein: meal.protein,
                        calories: meal.calories,
                        carbs: 0,
                        fat: 0,
                        imageUrl: "/placeholder-meal.png",
                      });
                      toast.success(`Day ${meal.day} meal added`);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-slate-950 px-5 text-sm font-black text-white"
                  >
                    Add Meal
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                <Gift className="text-green-600" />
                Complete & Get Rewards
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Complete the challenge, post your progress and unlock coupons,
                free meals and MacroBox rewards.
              </p>
            </div>

            <Link
              to="/rewards"
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-green-600 px-6 text-sm font-black text-white"
            >
              View Rewards
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-700">
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
      {children}
    </span>
  );
}