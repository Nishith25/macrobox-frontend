// frontend/src/pages/Challenges.tsx (FRONTEND)

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  Gift,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { challenges, type Challenge } from "../data/challenges";

const colorClass = (color: Challenge["color"]) => {
  switch (color) {
    case "green":
      return "border-green-200 bg-green-50 text-green-700";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "orange":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "pink":
      return "border-pink-200 bg-pink-50 text-pink-700";
    case "purple":
      return "border-purple-200 bg-purple-50 text-purple-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

export default function Challenges() {
  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
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
              Choose a 7-day goal-based meal challenge for fat loss, muscle
              gain, clean eating, students, couples or office lunch routines.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <MiniFeature icon={<Target size={18} />} title="Goal Based" />
              <MiniFeature icon={<Gift size={18} />} title="Rewards" />
              <MiniFeature icon={<Sparkles size={18} />} title="Viral Cards" />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                Choose your challenge
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                7-Day MacroBox Plans
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

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-green-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.1)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${colorClass(
                      challenge.color
                    )}`}
                  >
                    {challenge.badge}
                  </span>

                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
                    {challenge.goal === "couple" ? (
                      <Users size={20} />
                    ) : challenge.goal === "muscle_gain" ? (
                      <Zap size={20} />
                    ) : (
                      <Flame size={20} />
                    )}
                  </span>
                </div>

                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {challenge.title}
                </h3>

                <p className="mt-2 min-h-[72px] text-sm font-medium leading-6 text-slate-500">
                  {challenge.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InfoBox label="Duration" value={`${challenge.duration} Days`} />
                  <InfoBox
                    label="Meals / Day"
                    value={`${challenge.mealsPerDay}`}
                  />
                  <InfoBox label="Calories" value={challenge.caloriesRange} />
                  <InfoBox label="Protein" value={challenge.proteinRange} />
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Starts from
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
                      ₹{challenge.startingPrice}
                    </p>
                  </div>

                  <Link
                    to={`/challenges/${challenge.id}`}
                    className="inline-flex h-12 items-center gap-2 rounded-[16px] bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700"
                  >
                    Start
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
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