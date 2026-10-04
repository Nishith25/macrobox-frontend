// frontend/src/pages/Home.tsx (FRONTEND)

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Utensils,
} from "lucide-react";

/* ================= PAGE ================= */

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="mb-theme-background relative min-h-screen overflow-x-hidden">
      <div className="mb-theme-layer">
        {/* HERO */}
        <section className="mx-auto flex min-h-[calc(100vh-92px)] max-w-[1180px] items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
            <div>
              <div className="mb-accent-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                <Utensils size={14} />
                MacroBox meals
              </div>

              <h1 className="mb-text mt-6 max-w-[760px] text-[48px] font-light leading-[0.94] tracking-[-0.075em] sm:text-[70px] lg:text-[88px]">
                Healthy meals.
                <br />
                Clear macros.
              </h1>

              <p className="mb-text-muted mt-6 max-w-xl text-base leading-8 sm:text-lg">
                Order meals or plans with calories, protein, carbs and fat shown clearly.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate("/meals")}
                  className="mb-primary-button inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-full px-8 text-sm font-medium sm:w-auto"
                >
                  Order meals
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/plans")}
                  className="mb-accent-button inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-full px-8 text-sm font-medium sm:w-auto"
                >
                  <ClipboardList size={17} />
                  View plans
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
                <TrustPoint text="Clear macros" />
                <TrustPoint text="Scheduled delivery" />
                <TrustPoint text="Login at checkout" />
              </div>
            </div>

            <div className="mb-glass relative overflow-hidden rounded-[30px] p-5 shadow-[var(--mb-shadow-large)] sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--mb-glow-accent)] blur-[90px]" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.18em]">
                      Start ordering
                    </p>

                    <h2 className="mb-text mt-2 text-2xl font-light tracking-[-0.045em]">
                      What do you want?
                    </h2>
                  </div>

                  <span className="mb-primary-button flex h-12 w-12 items-center justify-center rounded-full">
                    <ShieldCheck size={20} />
                  </span>
                </div>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/meals")}
                    className="mb-glass-subtle group flex items-center justify-between rounded-[22px] p-4 text-left transition hover:border-[var(--mb-border-hover)]"
                  >
                    <div>
                      <p className="mb-text text-base font-medium">
                        Meals
                      </p>

                      <p className="mb-text-muted mt-1 text-sm leading-5">
                        Single bowls and healthy meals.
                      </p>
                    </div>

                    <ArrowRight
                      size={18}
                      className="mb-text-faint transition group-hover:translate-x-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/plans")}
                    className="mb-glass-subtle group flex items-center justify-between rounded-[22px] p-4 text-left transition hover:border-[var(--mb-border-hover)]"
                  >
                    <div>
                      <p className="mb-text text-base font-medium">
                        Plans
                      </p>

                      <p className="mb-text-muted mt-1 text-sm leading-5">
                        Complete meals for your routine.
                      </p>
                    </div>

                    <ArrowRight
                      size={18}
                      className="mb-text-faint transition group-hover:translate-x-1"
                    />
                  </button>
                </div>

                <div className="mb-divider mt-6 border-t pt-5">
                  <div className="grid grid-cols-3 gap-3">
                    <MiniMetric label="Meals" value="Order now" />
                    <MiniMetric label="Plans" value="7 days" />
                    <MiniMetric label="Pay" value="Checkout" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMPLE CTA */}
        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-glass rounded-[30px] p-5 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
              <div>
                <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Ready to eat?
                </p>

                <h2 className="mb-text mt-3 text-3xl font-light leading-tight tracking-[-0.055em] sm:text-5xl">
                  Choose your food and checkout.
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => navigate("/meals")}
                  className="mb-primary-button inline-flex h-[54px] items-center justify-center gap-2 rounded-full px-7 text-sm font-medium"
                >
                  Order meals
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.open("https://wa.me/918985892525", "_blank")
                  }
                  className="mb-accent-button inline-flex h-[54px] items-center justify-center gap-2 rounded-full px-7 text-sm font-medium"
                >
                  <MessageCircle size={17} />
                  WhatsApp support
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function TrustPoint({ text }: { text: string }) {
  return (
    <span className="mb-text-soft inline-flex items-center gap-2 text-xs">
      <CheckCircle2 className="mb-accent" size={15} />
      {text}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-text-faint text-[8px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>

      <p className="mb-text mt-1 text-xs font-medium sm:text-sm">
        {value}
      </p>
    </div>
  );
}
