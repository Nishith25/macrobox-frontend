// frontend/src/pages/Rewards.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  Lock,
  RefreshCw,
  Star,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type BackendReward = {
  _id: string;
  rewardId: string;
  title: string;
  description: string;
  type:
    | "free_item"
    | "discount"
    | "free_meal"
    | "challenge_box"
    | "plan_discount";
  valueText: string;

  // New preferred actions
  requiredAction?: "buy_plan" | "buy_7_day_plan" | "next_plan_reward";

  // Old actions kept for backend compatibility
  baseCouponCode?: string;
  couponCode?: string;
  couponExpiresAt?: string | null;
  couponUsed?: boolean;
  isActive: boolean;
  unlocked: boolean;
  claimed: boolean;
  claimedAt?: string | null;
  status?: "claimed" | "used" | null;
};

const formatRequirement = () => {
  return "Buy any eligible 7-day MacroBox plan";
};

const formatDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isExpired = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return Date.now() > date.getTime();
};

const getRewardStatus = (reward: BackendReward) => {
  const expired = isExpired(reward.couponExpiresAt);

  if (reward.couponUsed || reward.status === "used") return "used";
  if (reward.claimed && expired) return "expired";
  if (reward.claimed) return "active";
  if (reward.unlocked) return "unlocked";

  return "locked";
};

export default function Rewards() {
  const [rewards, setRewards] = useState<BackendReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const activeRewardsCount = useMemo(
    () =>
      rewards.filter((reward) => {
        const status = getRewardStatus(reward);
        return status === "active" || status === "unlocked";
      }).length,
    [rewards]
  );

  const usedRewardsCount = useMemo(
    () => rewards.filter((reward) => getRewardStatus(reward) === "used").length,
    [rewards]
  );

  const expiredRewardsCount = useMemo(
    () =>
      rewards.filter((reward) => getRewardStatus(reward) === "expired").length,
    [rewards]
  );

  const bestCoupon = useMemo(() => {
    const discountReward = rewards.find(
      (reward) =>
        (reward.type === "discount" || reward.type === "plan_discount") &&
        reward.couponCode
    );

    return discountReward?.valueText || "10% OFF";
  }, [rewards]);

  const loadRewards = async () => {
    try {
      setLoading(true);

      const res = await api.get("/rewards");

      setRewards(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const copyCoupon = async (code?: string, expired?: boolean, used?: boolean) => {
    if (!code) {
      toast.error("Coupon code not available");
      return;
    }

    if (used) {
      toast.error("This reward coupon is already used");
      return;
    }

    if (expired) {
      toast.error("This reward coupon has expired");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Unable to copy coupon");
    }
  };

  const claimReward = async (reward: BackendReward) => {
    if (!reward.unlocked) {
      toast.error("Buy an eligible plan first");
      return;
    }

    try {
      setClaimingId(reward.rewardId);

      const res = await api.post(`/rewards/${reward.rewardId}/claim`);

      const couponCode = res.data?.couponCode || reward.couponCode;
      const couponExpiresAt =
        res.data?.couponExpiresAt || reward.couponExpiresAt || null;

      setRewards((prev) =>
        prev.map((item) =>
          item.rewardId === reward.rewardId
            ? {
                ...item,
                claimed: true,
                status: "claimed",
                claimedAt: new Date().toISOString(),
                couponCode,
                couponExpiresAt,
              }
            : item
        )
      );

      if (couponCode) {
        await copyCoupon(couponCode, isExpired(couponExpiresAt), false);
      } else {
        toast.success(res.data?.message || "Reward claimed successfully");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to claim reward");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
                Plan rewards
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Buy an eligible 7-day MacroBox plan and unlock 10% OFF your
                next plan.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRewards}
              disabled={loading}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="max-w-3xl text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Buy a 7-day plan, unlock 10% OFF next plan
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Rewards are user-specific, one-time use, and expire within 7
                days after claiming.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
              <SmallStat label="Active" value={`${activeRewardsCount}`} />
              <SmallStat label="Used" value={`${usedRewardsCount}`} />
              <SmallStat label="Expired" value={`${expiredRewardsCount}`} />
              <SmallStat label="Best" value={bestCoupon} />
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-8 flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm font-black text-slate-600">
              <Loader2 className="animate-spin text-green-600" size={22} />
              Loading plan rewards...
            </div>
          </section>
        ) : rewards.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto text-slate-400" size={40} />

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
              No plan rewards found
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Buy an eligible 7-day MacroBox plan to unlock your next-plan
              coupon.
            </p>
          </section>
        ) : (
          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                Available rewards
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {rewards.length} reward{rewards.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {rewards.map((item) => {
                const status = getRewardStatus(item);
                const isClaimed = Boolean(item.claimed);
                const isUnlocked = Boolean(item.unlocked);
                const isClaiming = claimingId === item.rewardId;
                const expired = status === "expired";
                const used = status === "used";
                const active = status === "active";
                const expireDate = formatDate(item.couponExpiresAt);

                const title = item.title || "10% OFF Next Plan";
                const valueText = item.valueText || "10% OFF";
                const description =
                  item.description ||
                  "Use this coupon on your next eligible MacroBox plan.";

                return (
                  <article
                    key={item.rewardId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.1)]"
                  >
                    <div className="border-b border-slate-100 bg-gradient-to-br from-green-50 via-white to-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                              isUnlocked || isClaimed
                                ? "bg-green-600 text-white"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Trophy size={21} />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-green-600">
                              MacroBox Reward
                            </p>

                            <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                              {title}
                            </h3>
                          </div>
                        </div>

                        <RewardStatus
                          used={used}
                          expired={expired}
                          active={active}
                          isUnlocked={isUnlocked}
                        />
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-4xl font-black tracking-[-0.06em] text-slate-950">
                            {valueText}
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            {description}
                          </p>
                        </div>

                        <div
                          className={`rounded-2xl border px-4 py-3 text-center ${
                            isClaimed && !expired && !used
                              ? "border-green-200 bg-green-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Coupon
                          </p>

                          <p
                            className={`mt-1 text-sm font-black ${
                              isClaimed && !expired && !used
                                ? "text-green-700"
                                : "text-slate-400"
                            }`}
                          >
                            {isClaimed ? item.couponCode || "CLAIMED" : "Hidden"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Unlock Requirement
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          {formatRequirement()}
                        </p>

                        {(isClaimed || active || expired || used) &&
                        expireDate ? (
                          <p
                            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              used
                                ? "bg-slate-100 text-slate-500"
                                : expired
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {used
                              ? "Already used"
                              : expired
                              ? `Expired on ${expireDate}`
                              : `Expires on ${expireDate}`}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={
                            isClaiming ||
                            expired ||
                            used ||
                            (!isUnlocked && !isClaimed)
                          }
                          onClick={() =>
                            isClaimed
                              ? copyCoupon(item.couponCode, expired, used)
                              : claimReward(item)
                          }
                          className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isClaimed && !expired && !used
                              ? "border border-green-200 bg-white text-green-700 hover:bg-green-50"
                              : isUnlocked
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isClaiming ? (
                            <Loader2 className="animate-spin" size={17} />
                          ) : isClaimed ? (
                            <Copy size={17} />
                          ) : isUnlocked ? (
                            <Gift size={17} />
                          ) : (
                            <Lock size={17} />
                          )}

                          {used
                            ? "Used"
                            : expired
                            ? "Expired"
                            : isClaimed
                            ? "Copy Coupon"
                            : isUnlocked
                            ? "Get Coupon"
                            : "Locked"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            copyCoupon(item.couponCode, expired, used)
                          }
                          disabled={!isClaimed || expired || used}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Copy
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Star className="text-green-600" />
            How plan rewards work
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <HowStep
              number="01"
              title="Buy Plan"
              text="Purchase any eligible 7-day MacroBox plan."
            />

            <HowStep
              number="02"
              title="Claim Reward"
              text="Unlock and claim your 10% OFF coupon."
            />

            <HowStep
              number="03"
              title="Use Next"
              text="Apply it on your next eligible MacroBox plan."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function RewardStatus({
  used,
  expired,
  active,
  isUnlocked,
}: {
  used: boolean;
  expired: boolean;
  active: boolean;
  isUnlocked: boolean;
}) {
  if (used) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
        Used
      </span>
    );
  }

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
        Expired
      </span>
    );
  }

  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
        <CheckCircle2 size={14} />
        Active
      </span>
    );
  }

  if (isUnlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
        <Gift size={14} />
        Ready
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      <Lock size={14} />
      Locked
    </span>
  );
}

function HowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
        {number}
      </span>

      <h3 className="mt-3 text-base font-black text-slate-950">{title}</h3>

      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}