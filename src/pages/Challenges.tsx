// frontend/src/pages/Challenges.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  Gift,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

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
  userStatus?: "joined" | "in_progress" | "completed" | "cancelled" | null;
  completedDaysCount?: number;
  rewardUnlocked?: boolean;
};

const goalIcon = (goal: string) => {
  if (goal === "couple") return <Users size={20} />;
  if (goal === "muscle_gain") return <Zap size={20} />;
  return <Flame size={20} />;
};

const goalLabel = (goal: string) => {
  if (goal === "fat_loss") return "Fat Loss";
  if (goal === "muscle_gain") return "Muscle Gain";
  if (goal === "weight_gain") return "Weight Gain";
  if (goal === "clean_eating") return "Clean Eating";
  if (goal === "student_power") return "Student Power";
  if (goal === "couple") return "Couple";
  if (goal === "office_fit") return "Office Fit";
  return "MacroBox";
};

export default function Challenges() {
  const [challenges, setChallenges] = useState<BackendChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = async () => {
    try {
      setLoading(true);

      const res = await api.get("/challenges");
      setChallenges(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const stats = useMemo(() => {
    const joined = challenges.filter((item) => item.isJoined).length;
    const completed = challenges.filter(
      (item) => item.userStatus === "completed"
    ).length;
    const rewards = challenges.filter((item) => item.rewardUnlocked).length;

    return {
      total: challenges.length,
      joined,
      completed,
      rewards,
    };
  }, [challenges]);

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
                <Trophy size={15} />
                MacroBox Challenges
              </p>

              <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
                Eat healthy.
                <br />
                <span className="text-green-600">Complete challenges.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                Join a goal-based challenge, mark your daily progress and
                unlock rewards after completing your plan.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MiniFeature icon={<Target size={18} />} title="Goal Based" />
                <MiniFeature icon={<Gift size={18} />} title="Rewards" />
                <MiniFeature icon={<Sparkles size={18} />} title="Progress" />
              </div>
            </div>

            <button
              type="button"
              onClick={loadChallenges}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-green-200 bg-white px-5 text-sm font-black text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <HeroStat label="Challenges" value={`${stats.total}`} />
            <HeroStat label="Joined" value={`${stats.joined}`} />
            <HeroStat label="Completed" value={`${stats.completed}`} />
            <HeroStat label="Rewards" value={`${stats.rewards}`} />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                Choose your challenge
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                MacroBox Challenge Plans
              </h2>
            </div>

            <Link
              to="/rewards"
              className="inline-flex w-fit items-center gap-2 rounded-[16px] bg-green-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(22,163,74,0.24)]"
            >
              View Rewards
              <ArrowRight size={17} />
            </Link>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 text-sm font-black text-slate-600">
                <Loader2 className="animate-spin text-green-600" size={22} />
                Loading challenges...
              </div>
            </div>
          ) : challenges.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                No challenges found
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Add challenges from admin panel.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {challenges.map((challenge) => {
                const duration = challenge.durationDays || 7;
                const completed = challenge.completedDaysCount || 0;
                const progress = Math.min(
                  100,
                  Math.round((completed / duration) * 100)
                );

                const price =
                  challenge.trialPrice || challenge.price || 99;

                return (
                  <article
                    key={challenge._id}
                    className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-green-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                        {challenge.badge || goalLabel(challenge.goal)}
                      </span>

                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
                        {goalIcon(challenge.goal)}
                      </span>
                    </div>

                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {challenge.title}
                    </h3>

                    <p className="mt-2 min-h-[72px] text-sm font-medium leading-6 text-slate-500">
                      {challenge.description ||
                        "Start your MacroBox challenge and complete daily progress."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox label="Duration" value={`${duration} Days`} />
                      <InfoBox label="Completed" value={`${completed}/${duration}`} />
                      <InfoBox label="Goal" value={goalLabel(challenge.goal)} />
                      <InfoBox
                        label="Status"
                        value={
                          challenge.userStatus === "completed"
                            ? "Completed"
                            : challenge.isJoined
                            ? "Joined"
                            : "Not Joined"
                        }
                      />
                    </div>

                    {challenge.isJoined && (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-green-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {challenge.rewardUnlocked && (
                      <div className="mt-4 rounded-[16px] border border-green-100 bg-green-50 p-3 text-sm font-black text-green-700">
                        🎉 Reward unlocked
                      </div>
                    )}

                    <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Starts from
                        </p>
                        <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
                          ₹{price}
                        </p>
                      </div>

                      <Link
                        to={`/challenges/${challenge.challengeId}`}
                        className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
                      >
                        {challenge.isJoined ? "Continue" : "Start"}
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniFeature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
          {icon}
        </span>
        <p className="text-sm font-black text-slate-950">{title}</p>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-green-700">
        {value}
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}