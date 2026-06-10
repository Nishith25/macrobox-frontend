// frontend/src/pages/TransformationWall.tsx (FRONTEND)

import { Camera, Sparkles, Trophy } from "lucide-react";

const stories = [
  {
    name: "Coming Soon",
    challenge: "7-Day Lean Box",
    result: "Real customer progress will appear here.",
    badge: "Day 1/7",
  },
  {
    name: "Coming Soon",
    challenge: "7-Day Bulk Box",
    result: "Protein target and progress stories will be shown here.",
    badge: "Protein Hit",
  },
  {
    name: "Coming Soon",
    challenge: "Fit Girl Clean Box",
    result: "Before/after stories can be added with customer permission.",
    badge: "Glow-Up",
  },
];

export default function TransformationWall() {
  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
            <Camera size={15} />
            Transformation Wall
          </p>

          <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
            Real stories.
            <br />
            <span className="text-green-600">Real progress.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
            Showcase customers completing MacroBox challenges, hitting protein
            goals and building a healthy routine.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {stories.map((story, index) => (
            <article
              key={`${story.name}-${index}`}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
            >
              <div className="flex h-52 items-center justify-center rounded-[22px] bg-slate-100">
                <Camera size={42} className="text-slate-300" />
              </div>

              <span className="mt-4 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                {story.badge}
              </span>

              <h2 className="mt-3 text-xl font-black text-slate-950">
                {story.challenge}
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {story.result}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Trophy className="text-green-600" />
            How to use this later
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            After customers finish a challenge, ask permission to upload their
            story. Add their challenge name, days completed and progress result.
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
            <Sparkles size={16} />
            Coming soon: customer uploads and leaderboard
          </p>
        </section>
      </div>
    </main>
  );
}