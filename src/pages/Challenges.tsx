// frontend/src/pages/Challenges.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Flame,
  Gift,
  History,
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
  canStartAgain?: boolean;
  userStatus?: "joined" | "in_progress" | "completed" | "cancelled" | null;
  currentAttemptNo?: number | null;
  latestAttemptNo?: number | null;
  completedAttemptsCount?: number;
  latestCompletedAt?: string | null;
  completedDaysCount?: number;
  rewardUnlocked?: boolean;
};

type HistorySummary = {
  challengeId: string;
  title: string;
  badge?: string;
  goal?: string;
  durationDays?: number;
  completedTimes: number;
  latestCompletedAt?: string | null;
};

type HistoryAttempt = {
  _id: string;
  challengeId: string;
  title: string;
  badge?: string;
  goal?: string;
  durationDays?: number;
  attemptNo?: number;
  completedDaysCount?: number;
  rewardUnlocked?: boolean;
  startedAt?: string;
  completedAt?: string;
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

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Challenges() {
  const [challenges, setChallenges] = useState<BackendChallenge[]>([]);
  const [historySummary, setHistorySummary] = useState<HistorySummary[]>([]);
  const [historyAttempts, setHistoryAttempts] = useState<HistoryAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = async () => {
    try {
      setLoading(true);

      const [challengeRes, historyRes] = await Promise.all([
        api.get("/challenges"),
        api.get("/challenges/history/summary"),
      ]);

      setChallenges(Array.isArray(challengeRes.data) ? challengeRes.data : []);
      setHistorySummary(
        Array.isArray(historyRes.data?.summary) ? historyRes.data.summary : []
      );
      setHistoryAttempts(
        Array.isArray(historyRes.data?.attempts) ? historyRes.data.attempts : []
      );
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
    const active = challenges.filter((item) => item.isJoined).length;
    const completedTimes = historyAttempts.length;
    const rewards = historyAttempts.filter((item) => item.rewardUnlocked).length;

    return {
      total: challenges.length,
      active,
      completedTimes,
      rewards,
    };
  }, [challenges, historyAttempts]);

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
                Join a goal-based challenge. Daily progress updates
                automatically after paid challenge orders. Complete 7
                consecutive paid order days to unlock rewards.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MiniFeature icon={<Target size={18} />} title="Goal Based" />
                <MiniFeature icon={<Gift size={18} />} title="Auto Rewards" />
                <MiniFeature icon={<Sparkles size={18} />} title="Auto Progress" />
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
            <HeroStat label="Active" value={`${stats.active}`} />
            <HeroStat label="Completed Times" value={`${stats.completedTimes}`} />
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
            <LoadingCard />
          ) : challenges.length === 0 ? (
            <EmptyCard title="No challenges found" text="Add challenges from admin panel." />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {challenges.map((challenge) => {
                const duration = challenge.durationDays || 7;
                const completed = challenge.completedDaysCount || 0;
                const progress = Math.min(
                  100,
                  Math.round((completed / duration) * 100)
                );

                const price = challenge.trialPrice || challenge.price || 99;

                const statusLabel = challenge.isJoined
                  ? challenge.userStatus === "in_progress"
                    ? "In Progress"
                    : "Joined"
                  : challenge.completedAttemptsCount
                  ? "Completed Before"
                  : "Not Joined";

                const buttonLabel = challenge.isJoined
                  ? "Continue"
                  : challenge.canStartAgain || challenge.completedAttemptsCount
                  ? "Start Again"
                  : "Start";

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
                        "Start your MacroBox challenge and complete progress through paid orders."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox label="Duration" value={`${duration} Days`} />
                      <InfoBox label="Progress" value={`${completed}/${duration}`} />
                      <InfoBox label="Goal" value={goalLabel(challenge.goal)} />
                      <InfoBox label="Status" value={statusLabel} />
                    </div>

                    {challenge.completedAttemptsCount ? (
                      <div className="mt-4 rounded-[16px] border border-green-100 bg-green-50 p-3 text-sm font-black text-green-700">
                        Completed {challenge.completedAttemptsCount} time
                        {challenge.completedAttemptsCount > 1 ? "s" : ""}
                      </div>
                    ) : null}

                    {(challenge.isJoined || completed > 0) && (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                          <span>Current Progress</span>
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
                        {buttonLabel}
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
              <History size={21} />
            </span>

            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                Challenge History
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Completed challenges and number of times you finished each type.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingCard />
          ) : historySummary.length === 0 ? (
            <EmptyCard
              title="No completed challenges yet"
              text="Complete 7 consecutive paid challenge order days to see history here."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
                  <Trophy className="text-green-600" size={20} />
                  Completed Types
                </h3>

                <div className="space-y-3">
                  {historySummary.map((item) => (
                    <div
                      key={item.challengeId}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-slate-950">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {item.badge || goalLabel(item.goal || "")} • Latest:{" "}
                            {formatDate(item.latestCompletedAt)}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                          × {item.completedTimes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
                  <CalendarCheck className="text-green-600" size={20} />
                  Recent Completed Attempts
                </h3>

                <div className="space-y-3">
                  {historyAttempts.slice(0, 8).map((attempt) => (
                    <div
                      key={attempt._id}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {attempt.title}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Attempt {attempt.attemptNo || 1} •{" "}
                            {attempt.completedDaysCount || 0}/
                            {attempt.durationDays || 7} days
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs font-black text-green-700">
                            {attempt.rewardUnlocked ? "Reward unlocked" : "Completed"}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {formatDate(attempt.completedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LoadingCard() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-sm font-black text-slate-600">
        <Loader2 className="animate-spin text-green-600" size={22} />
        Loading challenges...
      </div>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{text}</p>
    </div>
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