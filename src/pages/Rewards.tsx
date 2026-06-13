// frontend/src/pages/Rewards.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Gift,
  Instagram,
  Loader2,
  Lock,
  RefreshCw,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type BackendReward = {
  _id: string;
  rewardId: string;
  title: string;
  description: string;
  type: "free_item" | "discount" | "free_meal" | "challenge_box";
  valueText: string;
  requiredAction:
    | "join_challenge"
    | "post_3_stories"
    | "complete_7_days"
    | "refer_2_friends";
  baseCouponCode?: string;
  couponCode: string;
  couponExpiresAt?: string | null;
  couponUsed?: boolean;
  isActive: boolean;
  unlocked: boolean;
  claimed: boolean;
  claimedAt?: string | null;
  status?: "claimed" | "used" | null;
};

const getRewardIcon = (reward: BackendReward) => {
  if (reward.requiredAction === "post_3_stories") {
    return <Instagram size={22} />;
  }

  if (reward.requiredAction === "refer_2_friends") {
    return <Users size={22} />;
  }

  if (reward.requiredAction === "complete_7_days") {
    return <Trophy size={22} />;
  }

  if (reward.requiredAction === "join_challenge") {
    return <Zap size={22} />;
  }

  return <Gift size={22} />;
};

const formatRequirement = (action: BackendReward["requiredAction"]) => {
  if (action === "join_challenge") return "Join any MacroBox challenge";
  if (action === "post_3_stories") return "Post 3 MacroBox challenge stories";
  if (action === "complete_7_days") return "Complete 7 paid challenge orders";
  if (action === "refer_2_friends") return "Refer 2 friends to MacroBox";

  return "Complete reward requirement";
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

export default function Rewards() {
  const [rewards, setRewards] = useState<BackendReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const claimedCount = useMemo(
    () => rewards.filter((reward) => reward.claimed).length,
    [rewards]
  );

  const unlockedCount = useMemo(
    () => rewards.filter((reward) => reward.unlocked && !reward.claimed).length,
    [rewards]
  );

  const bestCoupon = useMemo(() => {
    const discountReward = rewards.find(
      (reward) => reward.type === "discount" && reward.couponCode
    );

    return discountReward?.valueText || "20% OFF";
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

  const copyCoupon = async (code: string, expired?: boolean) => {
    if (!code) {
      toast.error("Coupon code not available");
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
      toast.error("Complete the requirement first");
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
        await copyCoupon(couponCode, isExpired(couponExpiresAt));
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
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
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
                Complete MacroBox paid challenge orders and unlock user-specific
                reward coupons. Rewards expire within 7 days.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRewards}
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

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <HeroStat label="Rewards Claimed" value={`${claimedCount}`} />
            <HeroStat label="Ready to Claim" value={`${unlockedCount}`} />
            <HeroStat label="Best Coupon" value={bestCoupon} />
          </div>
        </section>

        {loading ? (
          <section className="mt-8 flex min-h-[280px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm font-black text-slate-600">
              <Loader2 className="animate-spin text-green-600" size={22} />
              Loading rewards...
            </div>
          </section>
        ) : rewards.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto text-slate-400" size={40} />

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
              No rewards found
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Rewards will appear here after admin creates active rewards.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2">
            {rewards.map((item) => {
              const isClaimed = Boolean(item.claimed);
              const isUnlocked = Boolean(item.unlocked);
              const isClaiming = claimingId === item.rewardId;
              const expired = isExpired(item.couponExpiresAt);
              const expireDate = formatDate(item.couponExpiresAt);

              return (
                <article
                  key={item.rewardId}
                  className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        isUnlocked
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {getRewardIcon(item)}
                    </div>

                    {isClaimed && expired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                        Expired
                      </span>
                    ) : isClaimed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                        <CheckCircle2 size={14} />
                        Claimed
                      </span>
                    ) : isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <Gift size={14} />
                        Auto Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        <Lock size={14} />
                        Locked
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    {item.title}
                  </h2>

                  <p
                    className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                      isUnlocked
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.valueText || "Reward"}
                  </p>

                  <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                    {item.description}
                  </p>

                  <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Requirement
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {formatRequirement(item.requiredAction)}
                    </p>

                    {isClaimed && expireDate && (
                      <p
                        className={`mt-3 rounded-full px-3 py-1 text-xs font-black ${
                          expired
                            ? "bg-red-50 text-red-600"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {expired
                          ? `Expired on ${expireDate}`
                          : `Expires on ${expireDate}`}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={
                        isClaiming ||
                        expired ||
                        (!isUnlocked && !isClaimed)
                      }
                      onClick={() =>
                        isClaimed
                          ? copyCoupon(item.couponCode, expired)
                          : claimReward(item)
                      }
                      className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isClaimed && !expired
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

                      {isClaimed
                        ? expired
                          ? "Expired"
                          : "Copy Coupon"
                        : isUnlocked
                        ? "Get Reward"
                        : "Locked"}
                    </button>

                    <div
                      className={`flex h-12 items-center justify-center rounded-[16px] border px-4 text-sm font-black ${
                        isClaimed && !expired
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isClaimed ? item.couponCode || "CLAIMED" : "Hidden"}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Star className="text-green-600" />
            How to unlock rewards
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Complete paid challenge orders to unlock rewards. Once unlocked, the
            reward coupon is automatically assigned only to your account and
            expires within 7 days.
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