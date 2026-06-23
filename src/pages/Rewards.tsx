// frontend/src/pages/Rewards.tsx (FRONTEND)

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
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
  TicketPercent,
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

  requiredAction?:
    | "buy_plan"
    | "buy_7_day_plan"
    | "next_plan_reward";

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

type RewardState =
  | "used"
  | "expired"
  | "active"
  | "unlocked"
  | "locked";

const formatRequirement = () =>
  "Buy any eligible 7-day MacroBox plan";

const formatDate = (
  value?: string | null
) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const isExpired = (
  value?: string | null
) => {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() > date.getTime();
};

const getRewardStatus = (
  reward: BackendReward
): RewardState => {
  const expired = isExpired(
    reward.couponExpiresAt
  );

  if (
    reward.couponUsed ||
    reward.status === "used"
  ) {
    return "used";
  }

  if (reward.claimed && expired) {
    return "expired";
  }

  if (reward.claimed) {
    return "active";
  }

  if (reward.unlocked) {
    return "unlocked";
  }

  return "locked";
};

const getRewardTypeLabel = (
  type: BackendReward["type"]
) => {
  if (
    type === "discount" ||
    type === "plan_discount"
  ) {
    return "Plan discount";
  }

  if (type === "free_meal") {
    return "Free meal";
  }

  if (type === "free_item") {
    return "Free item";
  }

  if (type === "challenge_box") {
    return "Special reward";
  }

  return "Reward";
};

export default function Rewards() {
  const [rewards, setRewards] =
    useState<BackendReward[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    claimingId,
    setClaimingId,
  ] = useState<string | null>(null);

  const activeRewardsCount =
    useMemo(
      () =>
        rewards.filter((reward) => {
          const status =
            getRewardStatus(reward);

          return (
            status === "active" ||
            status === "unlocked"
          );
        }).length,
      [rewards]
    );

  const usedRewardsCount =
    useMemo(
      () =>
        rewards.filter(
          (reward) =>
            getRewardStatus(
              reward
            ) === "used"
        ).length,
      [rewards]
    );

  const expiredRewardsCount =
    useMemo(
      () =>
        rewards.filter(
          (reward) =>
            getRewardStatus(
              reward
            ) === "expired"
        ).length,
      [rewards]
    );

  const lockedRewardsCount =
    useMemo(
      () =>
        rewards.filter(
          (reward) =>
            getRewardStatus(
              reward
            ) === "locked"
        ).length,
      [rewards]
    );

  const bestCoupon = useMemo(() => {
    const discountReward =
      rewards.find(
        (reward) =>
          (reward.type ===
            "discount" ||
            reward.type ===
              "plan_discount") &&
          reward.couponCode
      );

    return (
      discountReward?.valueText ||
      "10% OFF"
    );
  }, [rewards]);

  const loadRewards = async () => {
    try {
      setLoading(true);

      const response =
        await api.get("/rewards");

      setRewards(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data
          ?.message ||
          "Failed to load rewards."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRewards();
  }, []);

  const copyCoupon = async (
    code?: string,
    expired?: boolean,
    used?: boolean
  ) => {
    if (!code) {
      toast.error(
        "Coupon code is not available."
      );

      return;
    }

    if (used) {
      toast.error(
        "This reward coupon is already used."
      );

      return;
    }

    if (expired) {
      toast.error(
        "This reward coupon has expired."
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        code
      );

      toast.success(
        `${code} copied.`
      );
    } catch {
      toast.error(
        "Unable to copy coupon."
      );
    }
  };

  const claimReward = async (
    reward: BackendReward
  ) => {
    if (!reward.unlocked) {
      toast.error(
        "Buy an eligible plan first."
      );

      return;
    }

    try {
      setClaimingId(
        reward.rewardId
      );

      const response =
        await api.post(
          `/rewards/${reward.rewardId}/claim`
        );

      const couponCode =
        response.data?.couponCode ||
        reward.couponCode;

      const couponExpiresAt =
        response.data
          ?.couponExpiresAt ||
        reward.couponExpiresAt ||
        null;

      setRewards((previous) =>
        previous.map((item) =>
          item.rewardId ===
          reward.rewardId
            ? {
                ...item,
                claimed: true,
                status: "claimed",
                claimedAt:
                  new Date().toISOString(),
                couponCode,
                couponExpiresAt,
              }
            : item
        )
      );

      if (couponCode) {
        await copyCoupon(
          couponCode,
          isExpired(
            couponExpiresAt
          ),
          false
        );
      } else {
        toast.success(
          response.data?.message ||
            "Reward claimed successfully."
        );
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data
          ?.message ||
          "Failed to claim reward."
      );
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden pb-16">
      <div className="relative z-10">
        <section className="mb-divider border-b">
          <div className="mx-auto max-w-[1240px] px-4 pb-9 pt-9 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
                  MacroBox Rewards
                </p>

                <h1 className="mb-text mt-4 max-w-4xl text-[42px] font-light leading-[1.03] tracking-[-0.06em] sm:text-[62px] lg:text-[76px]">
                  Save more on
                  <br />
                  your next plan.
                </h1>

                <p className="mb-text-muted mt-5 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Purchase an eligible
                  MacroBox plan, unlock a
                  personal coupon and apply
                  it to your next meal plan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HeaderSummary
                  label="Active"
                  value={`${activeRewardsCount} ${
                    activeRewardsCount === 1
                      ? "reward"
                      : "rewards"
                  }`}
                  icon={
                    <Trophy size={17} />
                  }
                  accent
                />

                <HeaderSummary
                  label="Best coupon"
                  value={bestCoupon}
                  icon={
                    <TicketPercent
                      size={17}
                    />
                  }
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:flex">
              <Link
                to="/plans"
                className="mb-primary-button inline-flex h-14 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
              >
                View plans
                <ArrowRight size={17} />
              </Link>

              <button
                type="button"
                onClick={loadRewards}
                disabled={loading}
                className="mb-outline-button inline-flex h-14 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
              >
                {loading ? (
                  <Loader2
                    className="animate-spin"
                    size={17}
                  />
                ) : (
                  <RefreshCw
                    size={17}
                  />
                )}

                Refresh
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <RewardsOverview
            active={
              activeRewardsCount
            }
            used={usedRewardsCount}
            expired={
              expiredRewardsCount
            }
            locked={
              lockedRewardsCount
            }
            bestCoupon={bestCoupon}
          />

          <section className="mt-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
                  Your benefits
                </p>

                <h2 className="mb-text mt-2 text-[32px] font-light tracking-[-0.05em] sm:text-[42px]">
                  Available rewards
                </h2>
              </div>

              <p className="mb-text-faint shrink-0 text-xs font-medium">
                {loading
                  ? "Loading"
                  : `${rewards.length} ${
                      rewards.length === 1
                        ? "reward"
                        : "rewards"
                    }`}
              </p>
            </div>

            <div className="mt-6">
              {loading ? (
                <RewardsLoading />
              ) : rewards.length === 0 ? (
                <EmptyRewards />
              ) : (
                <div className="grid gap-4">
                  {rewards.map(
                    (reward) => (
                      <RewardCard
                        key={
                          reward.rewardId
                        }
                        reward={reward}
                        claiming={
                          claimingId ===
                          reward.rewardId
                        }
                        onClaim={() =>
                          claimReward(
                            reward
                          )
                        }
                        onCopy={(
                          code,
                          expired,
                          used
                        ) =>
                          copyCoupon(
                            code,
                            expired,
                            used
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <HowRewardsWork />
        </div>
      </div>
    </main>
  );
}

function HeaderSummary({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mb-glass min-w-0 rounded-[22px] p-4 sm:min-w-[180px]">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent
            ? "mb-accent-surface"
            : "mb-outline-button"
        }`}
      >
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[9px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>

      <p className="mb-text mt-1 truncate text-sm font-medium sm:text-base">
        {value}
      </p>
    </div>
  );
}

function RewardsOverview({
  active,
  used,
  expired,
  locked,
  bestCoupon,
}: {
  active: number;
  used: number;
  expired: number;
  locked: number;
  bestCoupon: string;
}) {
  return (
    <section className="mb-glass overflow-hidden rounded-[30px]">
      <div className="mb-divider flex flex-col gap-5 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <Gift size={21} />
          </span>

          <div>
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
              Rewards wallet
            </p>

            <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
              Rewards & coupons
            </h2>

            <p className="mb-text-muted mt-2 max-w-xl text-sm leading-6">
              Claim unlocked rewards, copy
              personal coupon codes and use
              them before they expire.
            </p>
          </div>
        </div>

        <Link
          to="/plans"
          className="mb-primary-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium sm:w-auto"
        >
          Earn rewards
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5">
        <RewardStat
          label="Active"
          value={String(active)}
          icon={
            <CheckCircle2
              size={16}
            />
          }
          accent
        />

        <RewardStat
          label="Used"
          value={String(used)}
          icon={<Copy size={16} />}
        />

        <RewardStat
          label="Expired"
          value={String(expired)}
          icon={
            <AlertCircle
              size={16}
            />
          }
        />

        <RewardStat
          label="Locked"
          value={String(locked)}
          icon={<Lock size={16} />}
        />

        <RewardStat
          label="Best coupon"
          value={bestCoupon}
          icon={
            <TicketPercent
              size={16}
            />
          }
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </section>
  );
}

function RewardStat({
  label,
  value,
  icon,
  accent = false,
  className = "",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mb-divider min-w-0 border-b border-r p-4 sm:p-5 ${className}`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          accent
            ? "mb-accent-surface"
            : "mb-outline-button"
        }`}
      >
        {icon}
      </span>

      <p className="mb-text-faint mt-4 text-[8px] font-semibold uppercase tracking-[0.15em] sm:text-[9px]">
        {label}
      </p>

      <p className="mb-text mt-2 truncate text-lg font-light sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function RewardCard({
  reward,
  claiming,
  onClaim,
  onCopy,
}: {
  reward: BackendReward;
  claiming: boolean;
  onClaim: () => void;
  onCopy: (
    code?: string,
    expired?: boolean,
    used?: boolean
  ) => void;
}) {
  const status =
    getRewardStatus(reward);

  const claimed = Boolean(
    reward.claimed
  );

  const unlocked = Boolean(
    reward.unlocked
  );

  const expired =
    status === "expired";

  const used = status === "used";

  const active =
    status === "active";

  const expiryDate = formatDate(
    reward.couponExpiresAt
  );

  const title =
    reward.title ||
    "10% OFF Next Plan";

  const valueText =
    reward.valueText ||
    "10% OFF";

  const description =
    reward.description ||
    "Use this coupon on your next eligible MacroBox plan.";

  const canUseCoupon =
    claimed && !expired && !used;

  return (
    <article
      className={`overflow-hidden rounded-[30px] border backdrop-blur-2xl transition duration-300 ${
        active || unlocked
          ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)] shadow-[var(--mb-shadow-small)]"
          : "mb-glass mb-glass-hover"
      }`}
    >
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <RewardIcon
            status={status}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <RewardStatus
                status={status}
              />

              <span className="mb-accent-surface rounded-full px-3 py-1 text-[10px] font-semibold">
                {valueText}
              </span>

              <span className="mb-outline-button rounded-full px-3 py-1 text-[10px] font-medium">
                {getRewardTypeLabel(
                  reward.type
                )}
              </span>
            </div>

            <h3 className="mb-text mt-4 text-[24px] font-light leading-tight tracking-[-0.04em] sm:text-[30px]">
              {title}
            </h3>

            <p className="mb-text-muted mt-3 max-w-2xl text-sm leading-6">
              {description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <MiniTag
                icon={<Gift size={12} />}
              >
                {formatRequirement()}
              </MiniTag>

              {(claimed ||
                active ||
                expired ||
                used) &&
                expiryDate && (
                  <MiniTag
                    icon={
                      expired ? (
                        <AlertCircle
                          size={12}
                        />
                      ) : (
                        <CheckCircle2
                          size={12}
                        />
                      )
                    }
                  >
                    {used
                      ? "Already used"
                      : expired
                      ? `Expired ${expiryDate}`
                      : `Expires ${expiryDate}`}
                  </MiniTag>
                )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <CouponCodeBox
            claimed={claimed}
            available={canUseCoupon}
            code={
              reward.couponCode
            }
            status={status}
          />

          <button
            type="button"
            disabled={
              claiming ||
              expired ||
              used ||
              (!unlocked && !claimed)
            }
            onClick={() =>
              claimed
                ? onCopy(
                    reward.couponCode,
                    expired,
                    used
                  )
                : onClaim()
            }
            className={`mt-3 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
              canUseCoupon
                ? "mb-primary-button"
                : unlocked &&
                  !claimed
                ? "mb-accent-button"
                : "mb-outline-button"
            }`}
          >
            {claiming ? (
              <Loader2
                className="animate-spin"
                size={17}
              />
            ) : used ? (
              <CheckCircle2
                size={17}
              />
            ) : expired ? (
              <AlertCircle
                size={17}
              />
            ) : claimed ? (
              <Copy size={17} />
            ) : unlocked ? (
              <Gift size={17} />
            ) : (
              <Lock size={17} />
            )}

            {used
              ? "Reward used"
              : expired
              ? "Coupon expired"
              : claimed
              ? "Copy coupon"
              : unlocked
              ? "Claim coupon"
              : "Reward locked"}
          </button>

          {!unlocked &&
            !claimed && (
              <p className="mb-text-faint mt-3 text-center text-[11px] leading-5">
                Purchase an eligible plan to
                unlock this reward.
              </p>
            )}
        </div>
      </div>
    </article>
  );
}

function RewardIcon({
  status,
}: {
  status: RewardState;
}) {
  const active =
    status === "active" ||
    status === "unlocked";

  return (
    <span
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] sm:h-16 sm:w-16 ${
        active
          ? "mb-primary-button"
          : status === "expired"
          ? "mb-danger-message"
          : status === "used"
          ? "mb-success-message"
          : "mb-outline-button"
      }`}
    >
      {status === "locked" ? (
        <Lock size={24} />
      ) : status === "expired" ? (
        <AlertCircle size={24} />
      ) : status === "used" ? (
        <CheckCircle2
          size={24}
        />
      ) : (
        <Trophy size={25} />
      )}
    </span>
  );
}

function RewardStatus({
  status,
}: {
  status: RewardState;
}) {
  if (status === "used") {
    return (
      <span className="mb-success-message inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold">
        <CheckCircle2
          size={12}
        />
        Used
      </span>
    );
  }

  if (status === "expired") {
    return (
      <span className="mb-danger-message inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold">
        <AlertCircle
          size={12}
        />
        Expired
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="mb-success-message inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold">
        <CheckCircle2
          size={12}
        />
        Active
      </span>
    );
  }

  if (status === "unlocked") {
    return (
      <span className="mb-highlight-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold">
        <Gift size={12} />
        Ready to claim
      </span>
    );
  }

  return (
    <span className="mb-outline-button inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium">
      <Lock size={12} />
      Locked
    </span>
  );
}

function CouponCodeBox({
  claimed,
  available,
  code,
  status,
}: {
  claimed: boolean;
  available: boolean;
  code?: string;
  status: RewardState;
}) {
  const displayCode =
    claimed
      ? code ||
        "CLAIMED"
      : "••••••••";

  return (
    <div
      className={`rounded-[22px] border p-4 ${
        available
          ? "border-[var(--mb-accent-border)] bg-[var(--mb-accent-soft)]"
          : "mb-glass-subtle"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.16em]">
          Coupon code
        </p>

        <TicketPercent
          size={16}
          className={
            available
              ? "mb-accent"
              : "mb-text-faint"
          }
        />
      </div>

      <p
        className={`mt-3 truncate font-mono text-lg font-semibold tracking-[0.12em] sm:text-xl ${
          available
            ? "mb-text"
            : "mb-text-faint"
        }`}
      >
        {displayCode}
      </p>

      <p className="mb-text-faint mt-2 text-[10px]">
        {status === "used"
          ? "This coupon has already been redeemed."
          : status === "expired"
          ? "This coupon is no longer valid."
          : available
          ? "Copy and use this code during checkout."
          : claimed
          ? "Your coupon has been claimed."
          : "The code appears after claiming."}
      </p>
    </div>
  );
}

function MiniTag({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className="mb-outline-button inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium">
      {icon}
      {children}
    </span>
  );
}

function RewardsLoading() {
  return (
    <div className="grid gap-4">
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <div
          key={index}
          className="mb-glass rounded-[30px] p-5 sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-[20px] bg-[var(--mb-surface-strong)]" />

              <div className="w-full space-y-4">
                <div className="h-5 w-1/3 animate-pulse rounded-full bg-[var(--mb-surface-strong)]" />

                <div className="h-7 w-2/3 animate-pulse rounded-full bg-[var(--mb-surface-strong)]" />

                <div className="h-4 w-full animate-pulse rounded-full bg-[var(--mb-surface)]" />

                <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--mb-surface)]" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-[22px] bg-[var(--mb-surface)]" />

              <div className="h-[52px] animate-pulse rounded-full bg-[var(--mb-surface-strong)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyRewards() {
  return (
    <section className="mb-glass-subtle rounded-[30px] p-9 text-center sm:p-12">
      <span className="mb-primary-button mx-auto flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle size={26} />
      </span>

      <h2 className="mb-text mt-6 text-3xl font-light tracking-[-0.04em]">
        No rewards yet
      </h2>

      <p className="mb-text-muted mx-auto mt-3 max-w-md text-sm leading-6">
        Purchase an eligible 7-day
        MacroBox plan to unlock your next
        plan discount coupon.
      </p>

      <Link
        to="/plans"
        className="mb-primary-button mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium"
      >
        Explore plans
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function HowRewardsWork() {
  const steps = [
    {
      number: "01",
      title: "Buy a plan",
      text: "Purchase any eligible 7-day MacroBox meal plan.",
      icon: <Gift size={18} />,
    },
    {
      number: "02",
      title: "Claim the coupon",
      text: "Open your rewards wallet and claim the unlocked offer.",
      icon: <Trophy size={18} />,
    },
    {
      number: "03",
      title: "Save on the next plan",
      text: "Apply the personal coupon code to your next eligible plan.",
      icon: (
        <TicketPercent
          size={18}
        />
      ),
    },
  ];

  return (
    <section className="mb-glass mt-8 rounded-[30px] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
          <Star size={19} />
        </span>

        <div>
          <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.18em]">
            Reward journey
          </p>

          <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em] sm:text-3xl">
            How plan rewards work
          </h2>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <HowStep
            key={step.number}
            number={step.number}
            title={step.title}
            text={step.text}
            icon={step.icon}
          />
        ))}
      </div>
    </section>
  );
}

function HowStep({
  number,
  title,
  text,
  icon,
}: {
  number: string;
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <article className="mb-glass-subtle rounded-[22px] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="mb-primary-button flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium">
          {number}
        </span>

        <span className="mb-accent-surface flex h-9 w-9 items-center justify-center rounded-full">
          {icon}
        </span>
      </div>

      <h3 className="mb-text mt-5 text-base font-medium">
        {title}
      </h3>

      <p className="mb-text-muted mt-2 text-sm leading-6">
        {text}
      </p>
    </article>
  );
}