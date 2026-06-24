// frontend/src/pages/Home.tsx (FRONTEND)

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Flame,
  Gift,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

/* ================= TYPES ================= */

export type Meal = {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  price: number;
  foodType: "veg" | "nonveg";
  isFeatured?: boolean;
};

/* ================= PAGE ================= */

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goProtected = (path: string) => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: path,
        },
      });
      return;
    }

    navigate(path);
  };

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden">
      <div className="mb-theme-layer">
        {/* HERO */}
        <section className="mx-auto max-w-[1240px] px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8 lg:pb-16 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
            <div>
              <div className="mb-accent-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                <Sparkles size={14} />
                Goal-based healthy meals
              </div>

              <h1 className="mb-text mt-6 max-w-[900px] text-[48px] font-light leading-[0.94] tracking-[-0.075em] sm:text-[68px] lg:text-[86px]">
                Fuel your day
                <br />
                with MacroBox.
              </h1>

              <p className="mb-text-muted mt-6 max-w-2xl text-sm leading-7 sm:text-base sm:leading-8 lg:text-lg">
                Order goal-based meals, choose complete 7-day plans, track your
                macros and build a smarter daily food routine—all in one place.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate("/meals")}
                  className="mb-primary-button inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-medium sm:w-auto"
                >
                  Explore meals
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => goProtected("/plans")}
                  className="mb-accent-button inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-medium sm:w-auto"
                >
                  <ClipboardList size={17} />
                  View meal plans
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <button
                  type="button"
                  onClick={() => goProtected("/macrotrack")}
                  className="mb-outline-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-medium sm:w-auto"
                >
                  <Zap size={16} />
                  MacroTrack
                </button>

                <button
                  type="button"
                  onClick={() => goProtected("/smart-day-planner")}
                  className="mb-outline-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-medium sm:w-auto"
                >
                  <CalendarCheck size={16} />
                  Smart Day Planner
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
                <HeroTrustItem text="Goal-based meals" />
                <HeroTrustItem text="Full macro details" />
                <HeroTrustItem text="Scheduled delivery" />
              </div>
            </div>

            <div className="mb-glass relative overflow-hidden rounded-[30px] p-5 shadow-[var(--mb-shadow-large)] sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--mb-glow-accent)] blur-[90px]" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.18em]">
                      Your healthy routine
                    </p>

                    <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.045em]">
                      One app. Every meal.
                    </h2>
                  </div>

                  <span className="mb-primary-button flex h-12 w-12 items-center justify-center rounded-full">
                    <Utensils size={20} />
                  </span>
                </div>

                <div className="mt-6 grid gap-3">
                  <FeatureRow
                    icon={<Target size={17} />}
                    title="Choose your goal"
                    description="Fat loss, muscle gain, weight gain or clean eating."
                  />

                  <FeatureRow
                    icon={<Flame size={17} />}
                    title="Know every macro"
                    description="Calories, protein, carbs and fat shown clearly."
                  />

                  <FeatureRow
                    icon={<CalendarCheck size={17} />}
                    title="Schedule your meals"
                    description="Select delivery days and time slots in checkout."
                  />
                </div>

                <div className="mb-divider mt-6 border-t pt-5">
                  <div className="grid grid-cols-3 gap-3">
                    <MiniMetric label="Meals" value="Goal-based" />
                    <MiniMetric label="Plans" value="7 days" />
                    <MiniMetric label="Reward" value="10% OFF" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRIAL OFFER */}
        <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-accent-surface relative overflow-hidden rounded-[28px] p-5 sm:p-7">
            <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-white/10 blur-[80px]" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="mb-primary-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <Gift size={20} />
                </span>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">
                    Launch offer
                  </p>

                  <h2 className="mt-2 text-2xl font-light tracking-[-0.045em] sm:text-3xl">
                    Try the ₹99 MacroBox Trial Bowl.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">
                    Start with a goal-based protein bowl designed for fat loss,
                    muscle gain or clean eating.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/meals")}
                className="mb-primary-button inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium lg:w-auto"
              >
                Claim ₹99 bowl
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* PRODUCT FEATURES */}
        <section className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                Built for your goals
              </p>

              <h2 className="mb-text mt-3 max-w-2xl text-3xl font-light tracking-[-0.055em] sm:text-5xl">
                Better choices without complicated planning.
              </h2>
            </div>

            <button
              type="button"
              onClick={() => goProtected("/plans")}
              className="mb-outline-button inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-medium"
            >
              See all plans
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProductFeature
              icon={<Target size={20} />}
              title="Goal-focused meals"
              text="Browse meals prepared around fat loss, muscle gain, weight gain and clean eating."
            />

            <ProductFeature
              icon={<TrendingUp size={20} />}
              title="Macro visibility"
              text="See calories, protein, carbs and fat before adding any meal to your cart."
            />

            <ProductFeature
              icon={<ClipboardList size={20} />}
              title="Complete meal plans"
              text="Choose a plan type and schedule each plan day during checkout."
            />

            <ProductFeature
              icon={<Gift size={20} />}
              title="Plan rewards"
              text="Unlock a next-plan discount after purchasing an eligible MacroBox plan."
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-divider border-t">
          <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.2em]">
                  How it works
                </p>

                <h2 className="mb-text mt-3 text-3xl font-light tracking-[-0.055em] sm:text-5xl">
                  From goal to meal in four steps.
                </h2>
              </div>

              <button
                type="button"
                onClick={() => goProtected("/plans")}
                className="mb-primary-button hidden h-12 items-center gap-2 rounded-full px-6 text-sm font-medium sm:inline-flex"
              >
                Get started
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StepCard
                icon={<Target size={19} />}
                number="01"
                title="Set your goal"
                description="Choose fat loss, muscle gain, weight gain or clean eating."
              />

              <StepCard
                icon={<Flame size={19} />}
                number="02"
                title="Pick your meals"
                description="Browse meals that match your goal and daily macro needs."
              />

              <StepCard
                icon={<ClipboardList size={19} />}
                number="03"
                title="Choose a plan"
                description="Buy a complete meal plan with your preferred meal type."
              />

              <StepCard
                icon={<ShieldCheck size={19} />}
                number="04"
                title="Schedule and save"
                description="Choose delivery slots and unlock rewards on eligible plans."
              />
            </div>

            <button
              type="button"
              onClick={() => goProtected("/plans")}
              className="mb-primary-button mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium sm:hidden"
            >
              Get started
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function HeroTrustItem({ text }: { text: string }) {
  return (
    <span className="mb-text-soft inline-flex items-center gap-2 text-xs">
      <CheckCircle2 className="mb-accent" size={15} />
      {text}
    </span>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-glass-subtle flex items-start gap-3 rounded-[20px] p-4">
      <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>

      <div>
        <p className="mb-text text-sm font-medium">{title}</p>
        <p className="mb-text-muted mt-1 text-xs leading-5">{description}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-text-faint text-[8px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-xs font-medium sm:text-sm">{value}</p>
    </div>
  );
}

function ProductFeature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="mb-glass mb-card-lift rounded-[24px] p-5">
      <span className="mb-accent-surface flex h-11 w-11 items-center justify-center rounded-full">
        {icon}
      </span>

      <h3 className="mb-text mt-5 text-lg font-light tracking-[-0.03em]">
        {title}
      </h3>

      <p className="mb-text-muted mt-2 text-sm leading-6">{text}</p>
    </article>
  );
}

function StepCard({
  icon,
  number,
  title,
  description,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="mb-glass mb-card-lift min-h-[210px] rounded-[24px] p-5">
      <div className="flex items-center justify-between">
        <p className="mb-text-extra-faint text-4xl font-light tracking-[-0.07em]">
          {number}
        </p>

        <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full">
          {icon}
        </span>
      </div>

      <h3 className="mb-text mt-8 text-lg font-light tracking-[-0.035em]">
        {title}
      </h3>

      <p className="mb-text-muted mt-2 text-sm leading-6">{description}</p>
    </article>
  );
}
