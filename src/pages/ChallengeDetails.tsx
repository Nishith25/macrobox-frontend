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

type CompletedDay = {
  day: number;
  completedAt?: string;
  orderDate?: string;
};

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
  canStartAgain?: boolean;
  completedAttemptsCount?: number;
  userChallenge?: {
    _id: string;
    attemptNo?: number;
    status: "joined" | "in_progress" | "completed" | "cancelled";
    completedDays?: CompletedDay[];
    completedOrderDates?: string[];
    rewardUnlocked?: boolean;
    completedAt?: string;
  } | null;
};

type ChallengeCartMeal = {
  _id: string;
  challengeId?: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
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

  const durationDays = challenge?.durationDays || localChallenge?.duration || 7;

  const completedDays = challenge?.userChallenge?.completedDays || [];
  const completedCount = completedDays.length;

  const progress = Math.min(
    100,
    Math.round((completedCount / durationDays) * 100)
  );

  const isCompleted = challenge?.userChallenge?.status === "completed";
  const isActiveAttempt =
    challenge?.isJoined &&
    ["joined", "in_progress"].includes(challenge.userChallenge?.status || "");

  const rewardUnlocked = Boolean(challenge?.userChallenge?.rewardUnlocked);

  const perks: string[] = challenge?.perks?.length
    ? challenge.perks
    : [
        "Goal-based meals",
        "Macro-friendly options",
        "Automatic progress from paid orders",
        "Reward after consecutive order streak",
      ];

  const rewards: string[] = challenge?.rewards?.length
    ? challenge.rewards
    : ["Complete 7 consecutive paid challenge orders and unlock 20% off"];

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

  useEffect(() => {
    if (challengeId) {
      loadChallenge();
    }
  }, [challengeId]);

  const joinChallenge = async () => {
    try {
      setJoining(true);

      const res = await api.post(`/challenges/${challengeId}/join`);

      setChallenge((prev) =>
        prev
          ? {
              ...prev,
              isJoined: true,
              canStartAgain: false,
              userChallenge: res.data.userChallenge,
            }
          : prev
      );

      toast.success(res.data.message || "Challenge started successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start challenge");
    } finally {
      setJoining(false);
    }
  };

  const addChallengeToCart = async () => {
    try {
      setAdding(true);

      const joinRes = await api.post(`/challenges/${challengeId}/join`).catch(
        () => null
      );

      if (joinRes?.data?.userChallenge) {
        setChallenge((prev) =>
          prev
            ? {
                ...prev,
                isJoined: true,
                canStartAgain: false,
                userChallenge: joinRes.data.userChallenge,
              }
            : prev
        );
      }

      const res = await api.get(`/challenges/${challengeId}/cart-meals`);

      const meals: ChallengeCartMeal[] = res.data.meals || [];

      if (!meals.length) {
        toast.error("No meals found for this challenge");
        return;
      }

      meals.forEach((meal) => {
        addToCart({
          _id: meal._id,
          challengeId: challengeId || meal.challengeId || "",
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

  const startButtonText = isActiveAttempt
    ? "Already Joined"
    : challenge?.canStartAgain || isCompleted
    ? "Start Again"
    : "Join Challenge";

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

              <InfoCard label="Progress" value={`${completedCount}/${durationDays}`} />

              <InfoCard
                label="Reward"
                value={rewardUnlocked ? "Unlocked" : "Locked"}
              />
            </div>

            {(challenge?.isJoined || challenge?.userChallenge) && (
              <div className="mt-7 rounded-[22px] border border-green-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                  <span>
                    Attempt {challenge?.userChallenge?.attemptNo || 1} Progress
                  </span>
                  <span>{progress}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {isCompleted ? (
                  <p className="mt-3 rounded-[16px] bg-green-50 px-4 py-3 text-sm font-black text-green-700">
                    🎉 Challenge completed. You can start this challenge again.
                  </p>
                ) : (
                  <p className="mt-3 rounded-[16px] bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                    Progress updates automatically after each paid challenge
                    order.
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={joinChallenge}
                disabled={joining || Boolean(isActiveAttempt)}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] border border-green-200 bg-white px-6 text-sm font-black text-green-700 transition hover:bg-green-50 disabled:opacity-60"
              >
                {joining ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : isActiveAttempt ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Trophy size={18} />
                )}

                {startButtonText}
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
                Order challenge meals on consecutive days to unlock rewards.
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

        <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
            <CheckCircle2 className="text-green-600" />
            Daily Progress
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Daily progress is automatic. It updates only after successful paid
            challenge orders.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: durationDays }).map((_, index) => {
              const day = index + 1;
              const completedDay = completedDays.find(
                (item) => Number(item.day) === day
              );
              const done = Boolean(completedDay);

              return (
                <div
                  key={day}
                  className={`rounded-[18px] border p-4 text-left ${
                    done
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">Day {day}</p>

                    {done ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 border-current" />
                    )}
                  </div>

                  <p className="mt-2 text-xs font-bold opacity-70">
                    {done
                      ? `Completed ${
                          completedDay?.orderDate
                            ? `• ${formatDate(completedDay.orderDate)}`
                            : ""
                        }`
                      : "Waiting for paid order"}
                  </p>
                </div>
              );
            })}
          </div>
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
              <Step number="03" text="Place paid orders on consecutive dates." />
              <Step number="04" text="Complete the streak and get auto reward." />
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