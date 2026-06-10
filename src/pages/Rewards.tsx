// frontend/src/pages/Rewards.tsx (FRONTEND)

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Gift,
  Instagram,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

type Reward = {
  id: string;
  icon: React.ReactNode;
  title: string;
  reward: string;
  couponCode: string;
  description: string;
  requirement: string;
};

const rewards: Reward[] = [
  {
    id: "complete-3-days",
    icon: <Zap size={22} />,
    title: "Complete 3 Days",
    reward: "Free protein brownie",
    couponCode: "BROWNIE100",
    requirement: "Complete any 3 challenge days",
    description:
      "Finish any 3 days of a MacroBox challenge and unlock a free protein brownie reward.",
  },
  {
    id: "complete-7-days",
    icon: <Trophy size={22} />,
    title: "Complete 7 Days",
    reward: "20% off next plan",
    couponCode: "GLOWUP20",
    requirement: "Complete full 7-day challenge",
    description:
      "Finish a full 7-day challenge and get 20% off your next MacroBox plan.",
  },
  {
    id: "refer-2-friends",
    icon: <Users size={22} />,
    title: "Refer 2 Friends",
    reward: "1 free meal",
    couponCode: "FRIENDMEAL",
    requirement: "Refer 2 friends",
    description:
      "Bring two friends to MacroBox and unlock one free meal coupon.",
  },
  {
    id: "post-3-stories",
    icon: <Instagram size={22} />,
    title: "Post 3 Stories",
    reward: "Story reward coupon",
    couponCode: "STORY15",
    requirement: "Post 3 Instagram stories",
    description:
      "Post your MacroBox challenge progress and tag MacroBox to unlock a reward coupon.",
  },
];

export default function Rewards() {
  const [claimed, setClaimed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("macrobox_claimed_rewards") || "{}");
    } catch {
      return {};
    }
  });

  const claimedCount = useMemo(
    () => Object.values(claimed).filter(Boolean).length,
    [claimed]
  );

  const claimReward = async (reward: Reward) => {
    const next = {
      ...claimed,
      [reward.id]: true,
    };

    setClaimed(next);
    localStorage.setItem("macrobox_claimed_rewards", JSON.stringify(next));

    try {
      await navigator.clipboard.writeText(reward.couponCode);
      toast.success(`${reward.couponCode} copied`);
    } catch {
      toast.success(`${reward.couponCode} claimed`);
    }
  };

  const copyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Unable to copy coupon");
    }
  };

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

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <HeroStat label="Rewards Claimed" value={`${claimedCount}`} />
            <HeroStat label="Active Rewards" value={`${rewards.length}`} />
            <HeroStat label="Best Coupon" value="20% OFF" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {rewards.map((item) => {
            const isClaimed = Boolean(claimed[item.id]);

            return (
              <article
                key={item.id}
                className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
                    {item.icon}
                  </div>

                  {isClaimed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      <CheckCircle2 size={14} />
                      Claimed
                    </span>
                  )}
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

                <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Requirement
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {item.requirement}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      isClaimed
                        ? copyCoupon(item.couponCode)
                        : claimReward(item)
                    }
                    className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] text-sm font-black transition ${
                      isClaimed
                        ? "border border-green-200 bg-white text-green-700 hover:bg-green-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isClaimed ? <Copy size={17} /> : <Gift size={17} />}
                    {isClaimed ? "Copy Coupon" : "Claim Reward"}
                  </button>

                  <div className="flex h-12 items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-800">
                    {item.couponCode}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Star className="text-green-600" />
            Backend Coming Next
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Currently rewards are working using frontend localStorage. Next we
            will connect rewards to backend, user account, challenge progress,
            coupon generation and admin control.
          </p>
        </section>
      </div>
    </main>
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