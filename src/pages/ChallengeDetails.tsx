// frontend/src/pages/ChallengeDetails.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Gift,
  Loader2,
  ShoppingCart,
  Sparkles,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";
import { useCart } from "../context/CartContext";
import { challenges } from "../data/challenges";

type BackendChallenge = {
  _id: string;
  challengeId: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal: string;
  badge?: string;
  durationDays?: number;
  price?: number;
  trialPrice?: number | null;
  originalPrice?: number | null;
  perks?: string[];
  rewards?: string[];
  meals?: string[];
  isJoined?: boolean;
  userChallenge?: any;
};

type ChallengeCartMeal = {
  _id: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
};

export default function ChallengeDetails() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const localChallenge = useMemo(
    () => challenges.find((item) => item.id === challengeId),
    [challengeId]
  );

  const [challenge, setChallenge] = useState<BackendChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [adding, setAdding] = useState(false);

  const displayTitle = challenge?.title || localChallenge?.title || "Challenge";

  const displayDescription =
    challenge?.description ||
    localChallenge?.description ||
    "Start your MacroBox challenge and stay consistent with goal-based meals.";

  const displayBadge =
    challenge?.badge || localChallenge?.badge || "MacroBox Challenge";

  const displayPrice =
    challenge?.trialPrice ||
    challenge?.price ||
    localChallenge?.startingPrice ||
    99;

  const originalPrice = challenge?.originalPrice || null;

  const durationDays =
    challenge?.durationDays || localChallenge?.duration || 7;

  const perks: string[] = challenge?.perks?.length
    ? challenge.perks
    : [
        "Goal-based meals",
        "Macro-friendly options",
        "Challenge reward access",
        "Progress consistency support",
      ];

  const rewards: string[] = challenge?.rewards?.length
    ? challenge.rewards
    : [
        "Complete the challenge and unlock rewards",
        "Post stories and claim MacroBox coupons",
      ];

  useEffect(() => {
    const loadChallenge = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/challenges/${challengeId}`);
        setChallenge(res.data);
      } catch (error: any) {
        console.error(error);

        if (!localChallenge) {
          toast.error(error?.response?.data?.message || "Challenge not found");
        }
      } finally {
        setLoading(false);
      }
    };

    if (challengeId) {
      loadChallenge();
    }
  }, [challengeId, localChallenge]);

  const joinChallenge = async () => {
    try {
      setJoining(true);

      const res = await api.post(`/challenges/${challengeId}/join`);

      setChallenge((prev) =>
        prev
          ? {
              ...prev,
              isJoined: true,
              userChallenge: res.data.userChallenge,
            }
          : prev
      );

      toast.success(res.data.message || "Challenge joined successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to join challenge"
      );
    } finally {
      setJoining(false);
    }
  };

  const addChallengeToCart = async () => {
    try {
      setAdding(true);

      await api.post(`/challenges/${challengeId}/join`).catch(() => null);

      const res = await api.get(`/challenges/${challengeId}/cart-meals`);

      const meals: ChallengeCartMeal[] = res.data.meals || [];

      if (!meals.length) {
        toast.error("No meals found for this challenge");
        return;
      }

      meals.forEach((meal) => {
        addToCart({
          _id: meal._id,
          title: meal.title,
          price: meal.price,
          protein: meal.protein,
          calories: meal.calories,
          carbs: meal.carbs,
          fat: meal.fat,
          imageUrl: meal.imageUrl,
        });
      });

      toast.success(`${meals.length} challenge meals added to cart`);
      navigate("/cart");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to add challenge meals"
      );
    } finally {
      setAdding(false);
    }
  };

  if (loading && !localChallenge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f8]">
        <div className="flex items-center gap-3 rounded-[20px] bg-white px-6 py-4 text-sm font-black text-slate-700 shadow-sm">
          <Loader2 className="animate-spin text-green-600" size={20} />
          Loading challenge...
        </div>
      </main>
    );
  }

  if (!localChallenge && !challenge) {
    return (
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-10">
        <div className="mx-auto max-w-[900px] rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">
            Challenge not found
          </h1>

          <button
            type="button"
            onClick={() => navigate("/challenges")}
            className="mt-5 rounded-[16px] bg-green-600 px-6 py-3 text-sm font-black text-white"
          >
            Back to Challenges
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <Link
          to="/challenges"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to Challenges
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-green-100 bg-gradient-to-br from-green-50 via-white to-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
              <Trophy size={15} />
              {displayBadge}
            </p>

            <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
              {displayTitle}
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
              {displayDescription}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <InfoCard
                label="Duration"
                value={`${durationDays} Day${durationDays > 1 ? "s" : ""}`}
              />

              <InfoCard label="Starting From" value={`₹${displayPrice}`} />

              <InfoCard label="Reward" value="Unlockable" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={joinChallenge}
                disabled={joining || challenge?.isJoined}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] border border-green-200 bg-white px-6 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:opacity-60"
              >
                {joining ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : challenge?.isJoined ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Trophy size={18} />
                )}

                {challenge?.isJoined ? "Already Joined" : "Join Challenge"}
              </button>

              <button
                type="button"
                onClick={addChallengeToCart}
                disabled={adding}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-green-600 px-6 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
              >
                {adding ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ShoppingCart size={18} />
                )}

                Add Challenge to Cart
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="rounded-[24px] bg-slate-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                Plan Price
              </p>

              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-black tracking-[-0.06em]">
                  ₹{displayPrice}
                </p>

                {originalPrice && (
                  <p className="mb-2 text-lg font-black text-slate-400 line-through">
                    ₹{originalPrice}
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                Add real meals from your admin meal database and checkout
                normally with Razorpay.
              </p>
            </div>

            <div className="mt-6">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.04em]">
                <Sparkles className="text-green-600" size={21} />
                What you get
              </h2>

              <div className="mt-4 space-y-3">
                {perks.map((perk: string) => (
                  <div
                    key={perk}
                    className="flex items-start gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm font-bold leading-6 text-slate-700">
                      {perk}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
              <Flame className="text-green-600" />
              Challenge Rewards
            </h2>

            <div className="mt-4 space-y-3">
              {rewards.map((reward: string) => (
                <div
                  key={reward}
                  className="rounded-[18px] border border-green-100 bg-green-50 p-4 text-sm font-bold leading-6 text-green-800"
                >
                  {reward}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
              <Gift className="text-green-600" />
              How it works
            </h2>

            <div className="mt-4 space-y-3">
              <Step number="01" text="Join the challenge." />
              <Step number="02" text="Add challenge meals to cart." />
              <Step number="03" text="Checkout with your delivery slot." />
              <Step number="04" text="Complete the plan and unlock rewards." />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
        {number}
      </span>

      <p className="text-sm font-bold text-slate-700">{text}</p>
    </div>
  );
}