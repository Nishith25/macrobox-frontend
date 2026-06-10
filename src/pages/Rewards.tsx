// frontend/src/pages/Rewards.tsx (FRONTEND)

import { Gift, Instagram, Star, Trophy, Users, Zap } from "lucide-react";

const rewards = [
  {
    icon: <Zap size={22} />,
    title: "Complete 3 Days",
    reward: "Free protein brownie",
    description: "Finish any 3 days of a challenge and unlock a dessert reward.",
  },
  {
    icon: <Trophy size={22} />,
    title: "Complete 7 Days",
    reward: "20% off next plan",
    description: "Finish a full 7-day challenge and get a discount coupon.",
  },
  {
    icon: <Users size={22} />,
    title: "Refer 2 Friends",
    reward: "1 free meal",
    description: "Bring two friends to MacroBox and unlock a free meal.",
  },
  {
    icon: <Instagram size={22} />,
    title: "Post 3 Stories",
    reward: "Reward coupon",
    description: "Post your MacroBox challenge progress and tag MacroBox.",
  },
];

export default function Rewards() {
  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
            <Gift size={15} />
            MacroBox Rewards
          </p>

          <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
            Eat. Track.
            <br />
            <span className="text-green-600">Win rewards.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
            Complete MacroBox challenges, refer friends, post your progress and
            unlock free meals, brownies and coupons.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {rewards.map((item) => (
            <article
              key={item.title}
              className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
                {item.icon}
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                {item.title}
              </h2>

              <p className="mt-2 inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
                {item.reward}
              </p>

              <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                {item.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Star className="text-green-600" />
            Coming Soon
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Automatic reward coupons, challenge badges, leaderboard and
            transformation wall will be connected to user accounts soon.
          </p>
        </section>
      </div>
    </main>
  );
}