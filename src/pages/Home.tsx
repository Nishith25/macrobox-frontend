// frontend/src/pages/Home.tsx (FRONTEND)

import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Flame,
  ShoppingCart,
  Utensils,
} from "lucide-react";

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

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden">
      <div className="mb-theme-layer">
        <section className="mx-auto flex min-h-[calc(100vh-92px)] max-w-[1180px] items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
            <div>
              <div className="mb-accent-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                <Utensils size={14} />
                MacroBox
              </div>

              <h1 className="mb-text mt-6 max-w-[780px] text-[48px] font-light leading-[0.94] tracking-[-0.075em] sm:text-[70px] lg:text-[88px]">
                Healthy meals.
                <br />
                Clear macros.
              </h1>

              <p className="mb-text-muted mt-6 max-w-xl text-base leading-8 sm:text-lg">
                Order single meals or 7-day meal plans with calories, protein,
                carbs and fat shown clearly.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
                <TrustPoint text="Single meals" />
                <TrustPoint text="Meal plans" />
                <TrustPoint text="Scheduled delivery" />
              </div>
            </div>

            <div className="mb-glass relative overflow-hidden rounded-[30px] p-5 shadow-[var(--mb-shadow-large)] sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--mb-glow-accent)] blur-[90px]" />

              <div className="relative">
                <div>
                  <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.18em]">
                    Start your order
                  </p>

                  <h2 className="mb-text mt-2 text-3xl font-light tracking-[-0.055em]">
                    Choose what you need.
                  </h2>
                </div>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/meals")}
                    className="mb-glass-subtle group flex items-center justify-between rounded-[22px] p-4 text-left transition hover:border-[var(--mb-border-hover)]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <Utensils size={17} />
                      </span>

                      <div>
                        <p className="mb-text text-base font-medium">
                          Meals
                        </p>

                        <p className="mb-text-muted mt-1 text-sm leading-5">
                          Single bowls and healthy meals.
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      size={18}
                      className="mb-text-faint shrink-0 transition group-hover:translate-x-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/plans")}
                    className="mb-glass-subtle group flex items-center justify-between rounded-[22px] p-4 text-left transition hover:border-[var(--mb-border-hover)]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <ClipboardList size={17} />
                      </span>

                      <div>
                        <p className="mb-text text-base font-medium">
                          Meal Plans
                        </p>

                        <p className="mb-text-muted mt-1 text-sm leading-5">
                          7-day meals for your routine.
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      size={18}
                      className="mb-text-faint shrink-0 transition group-hover:translate-x-1"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-glass rounded-[30px] p-5 sm:p-6">
            <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
              How MacroBox works
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FlowStep
                icon={<Utensils size={17} />}
                title="Choose"
                text="Pick meals or plans."
              />

              <FlowStep
                icon={<Flame size={17} />}
                title="View macros"
                text="Check calories and protein."
              />

              <FlowStep
                icon={<ShoppingCart size={17} />}
                title="Add to cart"
                text="Review your food."
              />

              <FlowStep
                icon={<CalendarCheck size={17} />}
                title="Schedule"
                text="Select delivery timing."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TrustPoint({ text }: { text: string }) {
  return (
    <span className="mb-text-soft inline-flex items-center gap-2 text-xs">
      <CheckCircle2 className="mb-accent" size={15} />
      {text}
    </span>
  );
}

function FlowStep({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-glass-subtle rounded-[22px] p-4">
      <span className="mb-accent-surface flex h-10 w-10 items-center justify-center rounded-full">
        {icon}
      </span>

      <p className="mb-text mt-4 text-base font-medium">
        {title}
      </p>

      <p className="mb-text-muted mt-1 text-sm leading-5">
        {text}
      </p>
    </div>
  );
}
